import { getStore } from './store.js';

// Staging-only telemetry for the multi-agent orchestrator's Call Log. Mirrors the
// storage pattern used by lib/usage.js and lib/token-usage-logger.js. Never used
// when MULTI_AGENT_ORCHESTRATOR is off, and never touched by the production
// single-agent chat path in api/chat.js.
const MAX_RUNS = 200;

export async function logOrchestrationRun(trace) {
  if (!trace?.id) return null;
  const store = getStore();
  await store.set(`orchestration:run:${trace.id}`, trace);
  await store.sadd('orchestration:all', trace.id);
  await store.sadd(`orchestration:byConversation:${trace.conversationId}`, trace.id);

  const ids = await store.smembers('orchestration:all');
  if (ids.length > MAX_RUNS) {
    const runs = (await Promise.all(ids.map((id) => store.get(`orchestration:run:${id}`))))
      .filter(Boolean)
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
    const toDrop = runs.slice(0, runs.length - MAX_RUNS);
    for (const run of toDrop) {
      await store.srem?.('orchestration:all', run.id);
      await store.srem?.(`orchestration:byConversation:${run.conversationId}`, run.id);
    }
  }
  return trace;
}

export async function getRecentOrchestrationRuns(limit = 50) {
  const store = getStore();
  const ids = await store.smembers('orchestration:all');
  if (!ids || !ids.length) return [];
  const runs = (await Promise.all(ids.map((id) => store.get(`orchestration:run:${id}`)))).filter(Boolean);
  return runs.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)).slice(0, limit);
}

export async function getOrchestrationRun(runId) {
  if (!runId) return null;
  return getStore().get(`orchestration:run:${runId}`);
}
