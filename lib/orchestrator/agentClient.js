import { createAnthropicClient } from '../anthropic-client.js';

const client = createAnthropicClient();
export const ORCHESTRATOR_MODEL = 'claude-haiku-4-5-20251001';
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };

// Shared low-level completion helper for every orchestrator role (router, planner,
// specialists, synthesizer). Mirrors api/chat.js's createChatCompletion (same
// max_tokens fallback / web_search-unavailable fallback behavior) without importing
// from api/ (routes are not meant to be imported by lib/ code).
export async function runAgentCompletion({ system, messages, useWebSearch = false, maxTokens = 4096, model = ORCHESTRATOR_MODEL }) {
  const params = { model, max_tokens: maxTokens, system, messages };
  if (useWebSearch) params.tools = [WEB_SEARCH_TOOL];
  try {
    return await client.messages.create(params);
  } catch (err) {
    if (/max_tokens|maximum output/i.test(err?.message || '') && maxTokens !== 8192) {
      return runAgentCompletion({ system, messages, useWebSearch, maxTokens: 8192, model });
    }
    if (useWebSearch && /web_search/i.test(err?.message || '')) {
      return runAgentCompletion({ system, messages, useWebSearch: false, maxTokens, model });
    }
    throw err;
  }
}

export function extractText(response) {
  const text = (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text;
}

export function toolCallCount(response) {
  return (response.content || []).filter((b) => b.type === 'server_tool_use' || b.type === 'tool_use').length;
}

export function usageFrom(response) {
  return {
    inputTokens: response?.usage?.input_tokens || 0,
    outputTokens: response?.usage?.output_tokens || 0,
  };
}

// Extracts a trailing <AGENT_META>{...}</AGENT_META> block (confidence, reasoning,
// missingInformation, suggestedFollowUp) that every router/planner/specialist prompt
// is instructed to emit, and returns the visible text with that block stripped out.
export function extractAgentMeta(rawText) {
  const match = /<AGENT_META>([\s\S]*?)<\/AGENT_META>/.exec(rawText || '');
  const text = (rawText || '').replace(/<AGENT_META>[\s\S]*?<\/AGENT_META>/, '').trim();
  if (!match) return { text, meta: null };
  try {
    const meta = JSON.parse(match[1].trim());
    return { text, meta };
  } catch {
    return { text, meta: null };
  }
}

export const AGENT_META_INSTRUCTION = `\n\nAfter your normal reply (including any structured data blocks), append exactly one more block, on its own, with no other text after it:\n<AGENT_META>{"confidence":0-100,"reasoning":"one short sentence on why you're confident or not","missingInformation":["short phrase", "..."],"suggestedFollowUp":"a single clarifying question to ask the candidate, or empty string if none needed"}</AGENT_META>\nThis block is for internal orchestration only and is never shown to the candidate. confidence reflects how complete/reliable your answer is given what you currently know about this candidate.`;
