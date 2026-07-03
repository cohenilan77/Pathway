import { getStore } from './store.js';
import { newId } from './auth.js';

const keyFor = (candidateId) => `candidate:activity:${candidateId}`;

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function recordCandidateActivity(candidateId, event = {}) {
  if (!candidateId || candidateId === 'anonymous') return null;
  const entry = {
    id: event.id || newId(),
    at: event.at || Date.now(),
    type: event.type || 'system',
    label: event.label || 'System activity',
    status: event.status || 'success',
    agent: event.agent || '',
    model: event.model || '',
    architecture: event.architecture || '',
    inputTokens: finite(event.inputTokens),
    outputTokens: finite(event.outputTokens),
    cacheTokens: finite(event.cacheTokens),
    totalTokens: finite(event.totalTokens),
    latencyMs: finite(event.latencyMs),
    detail: event.detail || '',
    metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
  };
  await getStore().rpush(keyFor(candidateId), entry);
  return entry;
}

export async function getCandidateActivity(candidateId) {
  if (!candidateId) return [];
  return (await getStore().lrange(keyFor(candidateId), 0, -1)) || [];
}
