import { getStore } from './store.js';

const EVENTS_KEY = 'agent:metrics:events';
const RESET_AT_KEY = 'agent:metrics:reset-at';

export function agentIdFromName(name = '') {
  const normalized = String(name).replace(/Agent$/i, '').toLowerCase();
  return normalized === 'settings' ? 'settings-agent' : normalized;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function usageTotals(usage = {}) {
  const inputTokens = number(usage.input_tokens);
  const outputTokens = number(usage.output_tokens);
  const cacheCreationInputTokens = number(usage.cache_creation_input_tokens);
  const cacheReadInputTokens = number(usage.cache_read_input_tokens);
  return {
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    totalTokens: inputTokens + outputTokens + cacheCreationInputTokens + cacheReadInputTokens,
  };
}

export async function recordAgentMetric({ agentName, model, usage, latencyMs, error = false }) {
  try {
    const event = {
      agentId: agentIdFromName(agentName),
      agentName,
      model: model || '',
      ...usageTotals(usage),
      latencyMs: Math.max(0, number(latencyMs)),
      error: !!error,
      createdAt: Date.now(),
    };
    await getStore().rpush(EVENTS_KEY, event);
  } catch (err) {
    // Metrics must never interrupt a candidate-facing agent response.
    console.error('[agent-metrics] Failed to record usage:', err?.message || err);
  }
}

export function aggregateAgentMetrics(events = []) {
  const byAgent = {};
  for (const event of events || []) {
    if (!event?.agentId) continue;
    const bucket = byAgent[event.agentId] || {
      agentId: event.agentId,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      totalTokens: 0,
      totalLatencyMs: 0,
      errors: 0,
      model: event.model || '',
    };
    bucket.calls += 1;
    bucket.inputTokens += number(event.inputTokens);
    bucket.outputTokens += number(event.outputTokens);
    bucket.cacheCreationInputTokens += number(event.cacheCreationInputTokens);
    bucket.cacheReadInputTokens += number(event.cacheReadInputTokens);
    bucket.totalTokens += number(event.totalTokens);
    bucket.totalLatencyMs += number(event.latencyMs);
    bucket.errors += event.error ? 1 : 0;
    if (event.model) bucket.model = event.model;
    byAgent[event.agentId] = bucket;
  }
  return Object.values(byAgent).map(({ totalLatencyMs, ...bucket }) => ({
    ...bucket,
    avgLatencyMs: bucket.calls ? Math.round(totalLatencyMs / bucket.calls) : 0,
  }));
}

export async function getAgentMetrics() {
  const store = getStore();
  const [events, resetAt] = await Promise.all([
    store.lrange(EVENTS_KEY, 0, -1),
    store.get(RESET_AT_KEY),
  ]);
  return { agents: aggregateAgentMetrics(events), resetAt: resetAt || null };
}

export async function resetAgentMetrics() {
  const resetAt = Date.now();
  const store = getStore();
  await store.del(EVENTS_KEY);
  await store.set(RESET_AT_KEY, resetAt);
  return resetAt;
}
