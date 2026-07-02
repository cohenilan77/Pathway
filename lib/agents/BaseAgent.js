import { createAnthropicClient } from '../anthropic-client.js';
import { recordAgentMetric } from '../agent-metrics.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 8192;

export class BaseAgent {
  constructor({ name, systemPrompt, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS }) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model = model;
    this.maxTokens = maxTokens;
    this.client = createAnthropicClient();
  }

  async execute(messages, { tools = [], context = {} } = {}) {
    const params = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: this.buildSystemPrompt(context),
      messages,
    };
    if (tools.length) params.tools = tools;

    const startedAt = Date.now();
    try {
      const response = await this.client.messages.create(params);
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
