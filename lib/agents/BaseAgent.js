import { createAnthropicClient } from '../anthropic-client.js';
import { recordAgentMetric } from '../agent-metrics.js';
import { getAgentArchitecture } from '../agent-architecture.js';
import { getAgentConfig } from '../agent-config.js';
import { agentIdFromName } from '../agent-metrics.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 8192;

export function normalizeAnthropicMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).flatMap((message) => {
    const rawRole = String(message?.role || '').toLowerCase();
    if (rawRole === 'system') return [];
    const role = rawRole === 'ai' || rawRole === 'assistant'
      ? 'assistant'
      : rawRole === 'user' || rawRole === 'candidate'
        ? 'user'
        : null;
    if (!role) return [];
    const content = message.content ?? message.text;
    const hasContent = Array.isArray(content)
      ? content.length > 0
      : typeof content === 'string'
        ? content.trim().length > 0
        : content !== undefined && content !== null;
    return hasContent ? [{ role, content }] : [];
  });
}

export class BaseAgent {
  constructor({ name, systemPrompt, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS }) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model = model;
    this.maxTokens = maxTokens;
    this.client = createAnthropicClient();
  }

  async execute(messages, { tools = [], context = {} } = {}) {
    let runtime = null;
    if ((await getAgentArchitecture()).mode === 'hybrid') {
      const record = await getAgentConfig(agentIdFromName(this.name));
      if (record.status !== 'active') throw new Error(`${this.name} is disabled.`);
      runtime = record.publishedConfig;
    }
    const allowedTools = runtime?.tools?.length ? tools.filter(tool => runtime.tools.includes(tool.name)) : tools;
    const params = {
      model: runtime?.model || this.model,
      max_tokens: runtime?.maxTokens || this.maxTokens,
      system: runtime?.systemPrompt || this.buildSystemPrompt(context),
      messages: normalizeAnthropicMessages(messages),
    };
    if (allowedTools.length) params.tools = allowedTools;

    const startedAt = Date.now();
    try {
      const request = this.client.messages.create(params);
      const specialistMinimum = ['ProfileAgent', 'DocumentAgent', 'MatchingAgent', 'SearchAgent'].includes(this.name) ? 60000 : 0;
      const timeoutMs = Math.max(Number(runtime?.timeoutMs || 0), specialistMinimum);
      const response = timeoutMs
        ? await Promise.race([request, new Promise((_, reject) => setTimeout(() => reject(new Error(`${this.name} timed out after ${timeoutMs} ms.`)), timeoutMs))])
        : await request;
      await recordAgentMetric({
        agentName: this.name,
        model: this.model,
        usage: response.usage,
        latencyMs: Date.now() - startedAt,
      });
      return this.parseResponse(response);
    } catch (err) {
      await recordAgentMetric({
        agentName: this.name,
        model: this.model,
        latencyMs: Date.now() - startedAt,
        error: true,
      });
      throw err;
    }
  }

  buildSystemPrompt(context) {
    if (!context || !Object.keys(context).length) return this.systemPrompt;
    const contextStr = Object.entries(context)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
    return `${this.systemPrompt}\n\n<context>\n${contextStr}\n</context>`;
  }

  parseResponse(response) {
    const textBlocks = response.content.filter(b => b.type === 'text');
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const text = textBlocks.map(b => b.text).join('');
    return {
      text,
      toolUses,
      stopReason: response.stop_reason,
      usage: response.usage,
      raw: response,
    };
  }

  async executeWithTools(messages, tools, maxIterations = 5) {
    const history = [...messages];
    let iterations = 0;

    while (iterations < maxIterations) {
      const result = await this.execute(history, { tools });
      iterations++;

      if (result.stopReason !== 'tool_use' || !result.toolUses.length) {
        return { ...result, history };
      }

      history.push({ role: 'assistant', content: result.raw.content });

      const toolResults = await Promise.all(
        result.toolUses.map(async (toolUse) => {
          const output = await this.handleToolUse(toolUse);
          return {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: typeof output === 'string' ? output : JSON.stringify(output),
          };
        })
      );

      history.push({ role: 'user', content: toolResults });
    }

    return await this.execute(history, { tools });
  }

  async handleToolUse(toolUse) {
    return `Tool ${toolUse.name} called with: ${JSON.stringify(toolUse.input)}`;
  }
}
