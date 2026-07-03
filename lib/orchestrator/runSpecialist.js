import { runAgentCompletion, extractText, extractAgentMeta, usageFrom, toolCallCount } from './agentClient.js';
import { getAgent } from './specialists.js';

const MAX_OUTPUT_TOKENS = 4096;

// Runs one specialist agent for this turn. Reuses the same message-role mapping
// api/chat.js uses for the single-agent path so specialists see the identical
// conversation history the monolithic AdvisorAgent would have seen.
export async function runSpecialist(agentId, ctx) {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Unknown specialist agent: ${agentId}`);

  const systemPrompt = agent.buildSystem(ctx);
  const anthropicMessages = (ctx.messages || [])
    .filter((m) => m?.role !== 'system' && m?.text)
    .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

  const response = await runAgentCompletion({
    system: [{ type: 'text', text: systemPrompt }],
    messages: anthropicMessages,
    useWebSearch: !!agent.useWebSearch,
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  const rawText = extractText(response);
  const { text, meta } = extractAgentMeta(rawText);

  return {
    agentId,
    label: agent.label,
    ownsBlocks: agent.ownsBlocks,
    text,
    confidence: meta?.confidence ?? null,
    reasoning: meta?.reasoning || null,
    missingInformation: meta?.missingInformation || [],
    suggestedFollowUp: meta?.suggestedFollowUp || '',
    usage: usageFrom(response),
    toolCalls: toolCallCount(response),
  };
}
