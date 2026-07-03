import { newId } from '../auth.js';

// A trace is the full record of one orchestration run: router -> planner ->
// specialists (possibly parallel) -> synthesizer. Every step is timed and,
// where the step involved a model call, carries token/tool-call counts so the
// staging Call Log can render a complete execution timeline instead of just
// the final responding agent.
export function createTrace({ conversationId, userId, feature }) {
  return {
    id: newId(),
    conversationId: conversationId || 'session',
    userId: userId || 'anonymous',
    feature: feature || 'general_chat',
    startedAt: Date.now(),
    finishedAt: null,
    durationMs: null,
    steps: [],
    routingMethod: null, // 'llm' | 'regex_fallback'
    agentsInvoked: [],
    finalConfidence: null,
    error: null,
  };
}

export function startStep(trace, { type, name, input }) {
  const step = {
    id: newId(),
    type, // 'router' | 'planner' | 'specialist' | 'synthesizer'
    name,
    input: input || null,
    startedAt: Date.now(),
    finishedAt: null,
    durationMs: null,
    model: null,
    inputTokens: null,
    outputTokens: null,
    toolCalls: 0,
    confidence: null,
    reasoning: null,
    missingInformation: null,
    suggestedFollowUp: null,
    status: 'running',
    error: null,
    output: null,
  };
  trace.steps.push(step);
  return step;
}

export function finishStep(step, patch = {}) {
  step.finishedAt = Date.now();
  step.durationMs = step.finishedAt - step.startedAt;
  step.status = patch.status || 'ok';
  Object.assign(step, patch, { status: patch.status || 'ok' });
  return step;
}

export function failStep(step, error) {
  step.finishedAt = Date.now();
  step.durationMs = step.finishedAt - step.startedAt;
  step.status = 'error';
  step.error = error?.message || String(error);
  return step;
}

export function finalizeTrace(trace, { error } = {}) {
  trace.finishedAt = Date.now();
  trace.durationMs = trace.finishedAt - trace.startedAt;
  trace.error = error?.message || error || null;
  const specialistSteps = trace.steps.filter((s) => s.type === 'specialist' && typeof s.confidence === 'number');
  trace.finalConfidence = specialistSteps.length
    ? Math.round(specialistSteps.reduce((sum, s) => sum + s.confidence, 0) / specialistSteps.length)
    : null;
  return trace;
}
