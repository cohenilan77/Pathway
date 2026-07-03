import { getStore } from './store.js';

const KEY = 'agent:architecture:events';

export async function recordArchitectureEvent(event) {
  try { await getStore().rpush(KEY, { at: Date.now(), ...event }); } catch { /* telemetry never blocks requests */ }
}

export async function getArchitectureMetrics() {
  const events = await getStore().lrange(KEY, 0, -1);
  const summary = { total: 0, legacy: 0, hybrid: 0, fallbacks: 0, errors: 0, avgLatencyMs: 0, lastSuccessAt: null };
  let latency = 0;
  for (const event of events || []) {
    summary.total += 1;
    if (event.architecture === 'hybrid') summary.hybrid += 1; else summary.legacy += 1;
    if (event.fallbackUsed) summary.fallbacks += 1;
    if (event.error) summary.errors += 1;
    if (Number.isFinite(Number(event.latencyMs))) latency += Number(event.latencyMs);
    if (!event.error) summary.lastSuccessAt = Math.max(summary.lastSuccessAt || 0, event.at || 0);
  }
  summary.avgLatencyMs = summary.total ? Math.round(latency / summary.total) : 0;
  summary.fallbackRate = summary.total ? summary.fallbacks / summary.total : 0;
  return summary;
}
