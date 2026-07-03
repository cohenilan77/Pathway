import { runAgentCompletion, extractText, usageFrom, toolCallCount } from './agentClient.js';
import { AGENT_REGISTRY, DEFAULT_AGENT_ID, allAgentIds } from './specialists.js';

function agentMenu() {
  return AGENT_REGISTRY.map((a) => `- ${a.id}: ${a.description}`).join('\n');
}

function lastMessagesText(messages, n = 6) {
  return (messages || [])
    .filter((m) => m?.text)
    .slice(-n)
    .map((m) => `${m.role === 'ai' ? 'Advisor' : 'Candidate'}: ${m.text}`)
    .join('\n');
}

// Regex routing is now strictly the emergency fallback (per the rebuild spec) — it
// only runs when the LLM router call fails or returns something unusable, never as
// the primary mechanism.
export function regexFallbackRoute(latestMessageText) {
  const text = latestMessageText || '';
  const matched = AGENT_REGISTRY.filter((a) => a.keywords.test(text)).map((a) => a.id);
  const looksLikeCvDump = text.length > 400 && /experience|education|university|worked|skills/i.test(text);
  if (looksLikeCvDump && !matched.includes('profile')) matched.unshift('profile');
  return matched.length ? Array.from(new Set(matched)) : [DEFAULT_AGENT_ID];
}

// LLM-driven router: a single small model call classifies which specialist(s) this
// turn needs. Every routing decision — LLM or fallback — is returned with a method
// tag and reasoning so the orchestrator can log it into the Call Log trace.
export async function routeRequest({ messages, latestMessageText }) {
  const system = `You are the Router inside Pathway's multi-agent admissions advisory system. Given the conversation so far, decide which specialist agent(s) should handle the candidate's latest message. Available agents:\n${agentMenu()}\n\nRules:\n- Select every agent genuinely needed this turn — a single message can legitimately need several (e.g. a shortlist request needs profile + university_match; "find me scholarships for these schools and help me prep for the visa" needs scholarship + visa).\n- Prefer the narrowest correct set — do not select agents whose domain the message doesn't touch.\n- If the candidate hasn't shared enough for you to tell, pick your best single guess and reflect the uncertainty in confidence.\nRespond with ONLY strict JSON, no prose, no markdown fences: {"agents":["id1","id2"],"reasoning":"one short sentence","confidence":0-100}`;

  const userContent = `CONVERSATION (most recent turns):\n${lastMessagesText(messages)}\n\nLATEST MESSAGE:\n${latestMessageText}`;

  try {
    const response = await runAgentCompletion({
      system: [{ type: 'text', text: system }],
      messages: [{ role: 'user', content: userContent }],
      useWebSearch: false,
      maxTokens: 512,
    });
    const text = extractText(response);
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (!jsonMatch) throw new Error('Router returned no JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    const valid = allAgentIds();
    const agents = Array.isArray(parsed.agents) ? parsed.agents.filter((id) => valid.includes(id)) : [];
    if (!agents.length) throw new Error('Router returned no valid agents');
    return {
      method: 'llm',
      agents,
      reasoning: parsed.reasoning || '',
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : null,
      usage: usageFrom(response),
      toolCalls: toolCallCount(response),
      fallbackReason: null,
    };
  } catch (err) {
    const agents = regexFallbackRoute(latestMessageText);
    return {
      method: 'regex_fallback',
      agents,
      reasoning: `Fallback keyword match: ${agents.join(', ')}`,
      confidence: null,
      usage: { inputTokens: 0, outputTokens: 0 },
      toolCalls: 0,
      fallbackReason: err.message,
    };
  }
}
