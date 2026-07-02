import { getStore } from '../../store.js';

export async function agentGet(key) {
  return getStore().get(key);
}

export async function agentSet(key, value, ttlSeconds) {
  const store = getStore();
  if (ttlSeconds) return store.set(key, value, { ex: ttlSeconds });
  return store.set(key, value);
}

export async function agentDel(key) {
  return getStore().del(key);
}

export async function agentListPush(key, value) {
  return getStore().rpush(key, value);
}

export async function agentListRange(key, start = 0, end = -1) {
  return getStore().lrange(key, start, end);
}

export async function getAgentMemory(agentName, candidateId) {
  return agentGet(`agent:memory:${agentName}:${candidateId}`);
}

export async function setAgentMemory(agentName, candidateId, memory, ttlSeconds = 86400 * 7) {
  return agentSet(`agent:memory:${agentName}:${candidateId}`, memory, ttlSeconds);
}
