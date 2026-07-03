import { runAgentCompletion, extractText, usageFrom, toolCallCount } from './agentClient.js';
import { getAgent } from './specialists.js';

// Static dependency graph used to layer agents into parallel execution groups when
// the LLM planner call is unavailable/malformed, and to validate whatever grouping
// the LLM planner proposes. An agent only actually depends on another THIS turn if
// that other agent was also selected by the router this turn — e.g. "scholarship"
// alone (schools already chosen earlier in the conversation) has nothing to wait on.
const DEPENDS_ON = {
  university_match: ['profile'],
  scholarship: ['university_match'],
  strategy: ['university_match'],
  essay: ['strategy'],
  interview: ['essay'],
};

function layerByDependency(agentIds) {
  const remaining = new Set(agentIds);
  const scheduled = new Set();
  const steps = [];
  let guard = 0;
  while (remaining.size && guard < agentIds.length + 2) {
    guard += 1;
    const ready = [...remaining].filter((id) => {
      const deps = DEPENDS_ON[id] || [];
      return deps.every((dep) => !remaining.has(dep) || scheduled.has(dep));
    });
    const batch = ready.length ? ready : [...remaining]; // safety net against cycles
    batch.forEach((id) => { remaining.delete(id); scheduled.add(id); });
    steps.push({ agents: batch, parallel: batch.length > 1 });
  }
  return steps;
}

export function deterministicPlan(agentIds) {
  return {
    method: 'deterministic',
    steps: layerByDependency(agentIds),
    missingInformation: [],
    followUpQuestion: '',
    proceed: true,
    confidence: null,
    usage: { inputTokens: 0, outputTokens: 0 },
    toolCalls: 0,
  };
}

function lastMessagesText(messages, n = 6) {
  return (messages || [])
    .filter((m) => m?.text)
    .slice(-n)
    .map((m) => `${m.role === 'ai' ? 'Advisor' : 'Candidate'}: ${m.text}`)
    .join('\n');
}

// LLM-driven planning stage: decides execution order/parallel grouping for the
// agents the Router selected, flags missing information, and can choose to ask a
// clarifying question instead of running specialists on an under-specified turn.
export async function buildPlan({ messages, latestMessageText, routerResult }) {
  const agentIds = routerResult.agents;
  const agentDescriptions = agentIds
    .map((id) => getAgent(id))
    .filter(Boolean)
    .map((a) => `- ${a.id}: ${a.description}`)
    .join('\n');

  const system = `You are the Planner inside Pathway's multi-agent admissions advisory system. The Router has already selected these specialist agents for this turn:\n${agentDescriptions}\n\nBuild an execution plan: group agents that can run in parallel (they read the same conversation independently) into ordered steps, respecting that "university_match" needs "profile" done first if both are present, "scholarship"/"strategy" need "university_match" done first if present, "essay" needs "strategy" first if present, and "interview" needs "essay" first if present. Also decide whether there is enough information in the conversation to proceed, or whether a clarifying question should be asked instead.\nRespond with ONLY strict JSON, no prose, no markdown fences:\n{"steps":[{"agents":["profile"],"parallel":false},{"agents":["university_match","admissions"],"parallel":true}],"missingInformation":["short phrase","..."],"proceed":true,"followUpQuestion":"","confidence":0-100}\nSet proceed:false and fill followUpQuestion only when the turn is genuinely too ambiguous/underspecified for these agents to produce a useful answer.`;

  const userContent = `CONVERSATION (most recent turns):\n${lastMessagesText(messages)}\n\nLATEST MESSAGE:\n${latestMessageText}\n\nROUTER REASONING: ${routerResult.reasoning || '(none)'}`;

  try {
    const response = await runAgentCompletion({
      system: [{ type: 'text', text: system }],
      messages: [{ role: 'user', content: userContent }],
      useWebSearch: false,
      maxTokens: 768,
    });
    const text = extractText(response);
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (!jsonMatch) throw new Error('Planner returned no JSON');
    const parsed = JSON.parse(jsonMatch[0]);

    const validIds = new Set(agentIds);
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps
        .map((step) => ({ agents: (step.agents || []).filter((id) => validIds.has(id)), parallel: !!step.parallel }))
        .filter((step) => step.agents.length)
      : [];
    const coveredIds = new Set(steps.flatMap((s) => s.agents));
    const missedIds = agentIds.filter((id) => !coveredIds.has(id));
    if (missedIds.length) steps.push({ agents: missedIds, parallel: missedIds.length > 1 });
    if (!steps.length) throw new Error('Planner produced no usable steps');

    return {
      method: 'llm',
      steps,
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
      followUpQuestion: parsed.proceed === false ? (parsed.followUpQuestion || '') : '',
      proceed: parsed.proceed !== false,
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : null,
      usage: usageFrom(response),
      toolCalls: toolCallCount(response),
    };
  } catch (err) {
    return { ...deterministicPlan(agentIds), fallbackReason: err.message };
  }
}
