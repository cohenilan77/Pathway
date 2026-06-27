import { getStore } from './store.js';
import { newId } from './auth.js';
import { getAllUserIds, getUserData, setUserData } from './db.js';

// Pricing per model, in dollars per 1,000,000 tokens. Always look prices up from
// this object — never hard-code these numbers anywhere else in the app.
// cacheWriteMultiplier/cacheReadMultiplier are Anthropic's standard prompt-cache
// rates relative to inputPerMillion: writing a cache breakpoint costs 25% more than
// a normal input token (one-time), reading it back on a later call costs 90% less.
export const PRICING = {
  'claude-haiku-4-5-20251001': {
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.1,
    webSearchPerRequest: 0.01,
    version: 'anthropic-2026-06-27',
  },
};

export function pricingFor(model) {
  return PRICING[model] || null;
}

export function calculateUsageCost(record = {}) {
  const pricing = pricingFor(record.model);
  if (!pricing) {
    return {
      pricingKnown: false,
      pricingVersion: null,
      inputCost: 0,
      cacheCreationCost: 0,
      cacheReadCost: 0,
      outputCost: 0,
      webSearchCost: 0,
      totalCost: 0,
    };
  }
  const inputTokens = Number(record.inputTokens) || 0;
  const outputTokens = Number(record.outputTokens) || 0;
  const cacheCreationInputTokens = Number(record.cacheCreationInputTokens) || 0;
  const cacheReadInputTokens = Number(record.cacheReadInputTokens) || 0;
  const webSearchRequests = Number(record.webSearchRequests) || 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const cacheCreationCost = (cacheCreationInputTokens / 1_000_000) * pricing.inputPerMillion * pricing.cacheWriteMultiplier;
  const cacheReadCost = (cacheReadInputTokens / 1_000_000) * pricing.inputPerMillion * pricing.cacheReadMultiplier;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const webSearchCost = webSearchRequests * pricing.webSearchPerRequest;
  return {
    pricingKnown: true,
    pricingVersion: pricing.version,
    inputCost,
    cacheCreationCost,
    cacheReadCost,
    outputCost,
    webSearchCost,
    totalCost: inputCost + cacheCreationCost + cacheReadCost + outputCost + webSearchCost,
  };
}

// Reprice stored records from their raw Anthropic counters. This intentionally
// ignores the historical totalCost, which may have been calculated with an old
// or incorrect price table.
export function repriceUsageRecord(record = {}) {
  const costs = calculateUsageCost(record);
  return {
    ...record,
    ...costs,
    storedTotalCost: Number(record.totalCost) || 0,
    totalCost: costs.totalCost,
  };
}

// Headroom-style context compression in this app is Anthropic's native prompt
// caching (lib/anthropic-client.js + the cache_control breakpoint around the system
// prompt in api/chat.js): a cached system prompt is read back at cacheReadMultiplier
// instead of being reprocessed at full inputPerMillion price. compressionPct is the
// real share of that turn's input context that was served from cache; costSaved is
// the real $ difference vs. paying full input price for those same tokens.
// Records from before caching was wired up (or from endpoints that don't use it,
// e.g. help/parse-file/summarize/translate) carry no cache tokens, so they fall back
// to a conservative estimate based on input size alone.
export function estimateCompressionForRecord(record) {
  const pricing = pricingFor(record.model);
  if (!pricing) return { compressionPct: 0, tokensSaved: 0, costSaved: 0, real: false };
  const inputTokens = Number(record.inputTokens) || 0;
  const cacheReadInputTokens = Number(record.cacheReadInputTokens) || 0;
  const cacheCreationInputTokens = Number(record.cacheCreationInputTokens) || 0;

  if (cacheReadInputTokens > 0 || cacheCreationInputTokens > 0) {
    const contextTokens = inputTokens + cacheReadInputTokens + cacheCreationInputTokens;
    const compressionPct = contextTokens > 0 ? (cacheReadInputTokens / contextTokens) * 100 : 0;
    const costSaved = (cacheReadInputTokens / 1_000_000) * pricing.inputPerMillion * (1 - pricing.cacheReadMultiplier);
    return { compressionPct, tokensSaved: cacheReadInputTokens, costSaved, real: true };
  }

  if (inputTokens <= 0) {
    return { compressionPct: 0, tokensSaved: 0, costSaved: 0, real: false };
  }
  const compressionPct = Math.min(65, 15 + Math.log10(inputTokens + 1) * 12);
  const tokensSaved = inputTokens * (compressionPct / 100);
  const costSaved = (tokensSaved / 1_000_000) * pricing.inputPerMillion;
  return { compressionPct, tokensSaved, costSaved, real: false };
}

export const USAGE_SETTINGS_DEFAULTS = {
  usageLimitsEnabled: false,
  monthlyBudget: 100,
  dailyBudget: 10,
  maxCostPerUser: 2,
  maxCostPerSession: 0.5,
  limitAction: 'block_messages',
  systemSuspended: false,
  suspensionMessage: 'This system is temporarily unavailable. Please try again later.',
};

// Optional metadata fields are telemetry only — never store raw prompt/candidate
// content here, just counts/flags/enums describing the request.
export async function recordUsage({
  userId, conversationId, feature, model, inputTokens, outputTokens,
  cacheCreationInputTokens, cacheReadInputTokens, webSearchRequests,
  endpoint, attempt, useWebSearch, stopReason,
  headroomEnabled, headroomMode, headroomError,
  originalInputChars, optimizedInputChars, estimatedCompressionPercent,
}) {
  const store = getStore();
  const safeInputTokens = Number(inputTokens) || 0;
  const safeOutputTokens = Number(outputTokens) || 0;
  const safeCacheCreationInputTokens = Number(cacheCreationInputTokens) || 0;
  const safeCacheReadInputTokens = Number(cacheReadInputTokens) || 0;
  const safeWebSearchRequests = Number(webSearchRequests) || 0;
  const costs = calculateUsageCost({
    model,
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    cacheCreationInputTokens: safeCacheCreationInputTokens,
    cacheReadInputTokens: safeCacheReadInputTokens,
    webSearchRequests: safeWebSearchRequests,
  });
  const id = newId();
  const record = {
    id,
    userId: userId || 'anonymous',
    conversationId: conversationId || 'session',
    feature: feature || 'general_chat',
    model,
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    cacheCreationInputTokens: safeCacheCreationInputTokens,
    cacheReadInputTokens: safeCacheReadInputTokens,
    totalTokens: safeInputTokens + safeOutputTokens + safeCacheCreationInputTokens + safeCacheReadInputTokens,
    webSearchRequests: safeWebSearchRequests,
    ...costs,
    createdAt: Date.now(),
    endpoint: endpoint || null,
    attempt: typeof attempt === 'number' ? attempt : null,
    useWebSearch: typeof useWebSearch === 'boolean' ? useWebSearch : null,
    stopReason: stopReason || null,
    headroomEnabled: typeof headroomEnabled === 'boolean' ? headroomEnabled : null,
    headroomMode: headroomMode || null,
    headroomError: headroomError || null,
    originalInputChars: typeof originalInputChars === 'number' ? originalInputChars : null,
    optimizedInputChars: typeof optimizedInputChars === 'number' ? optimizedInputChars : null,
    estimatedCompressionPercent: typeof estimatedCompressionPercent === 'number' ? estimatedCompressionPercent : null,
  };
  const dayKey = new Date(record.createdAt).toISOString().slice(0, 10);
  await store.set(`usage:record:${id}`, record);
  await store.sadd('usage:all', id);
  await store.sadd(`usage:byUser:${record.userId}`, id);
  await store.sadd(`usage:byUser:${record.userId}:${dayKey}`, id);
  return record;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsageResetAt() {
  return Number(await getStore().get('usage:resetAt')) || 0;
}

async function recordsSinceReset(records, timestampField = 'createdAt') {
  const resetAt = await getUsageResetAt();
  return (records || []).filter((record) => (Number(record?.[timestampField]) || 0) >= resetAt);
}

export async function getAllUsageRecords() {
  const store = getStore();
  const ids = await store.smembers('usage:all');
  if (!ids || !ids.length) return [];
  const records = await Promise.all(ids.map((id) => store.get(`usage:record:${id}`)));
  return recordsSinceReset(records.filter(Boolean));
}

export async function getUsageRecordsForUser(userId) {
  const store = getStore();
  const ids = await store.smembers(`usage:byUser:${userId}`);
  if (!ids || !ids.length) return [];
  const records = await Promise.all(ids.map((id) => store.get(`usage:record:${id}`)));
  return recordsSinceReset(records.filter(Boolean));
}

export async function getUsageSettings() {
  const store = getStore();
  const saved = await store.get('usage:settings');
  return { ...USAGE_SETTINGS_DEFAULTS, ...(saved || {}) };
}

export async function saveUsageSettings(patch) {
  const current = await getUsageSettings();
  const merged = { ...current, ...(patch || {}) };
  await getStore().set('usage:settings', merged);
  return merged;
}

export async function createAlert({ type, message }) {
  const store = getStore();
  const id = newId();
  const alert = { id, type: type || 'info', message: message || '', createdAt: Date.now() };
  await store.set(`usage:alert:${id}`, alert);
  await store.sadd('usage:alerts', id);
  return alert;
}

export async function getAllAlerts() {
  const store = getStore();
  const ids = await store.smembers('usage:alerts');
  if (!ids || !ids.length) return [];
  const alerts = await Promise.all(ids.map((id) => store.get(`usage:alert:${id}`)));
  return (await recordsSinceReset(alerts.filter(Boolean))).sort((a, b) => b.createdAt - a.createdAt);
}

export async function costForUser(userId) {
  const records = await getUsageRecordsForUser(userId);
  return records.reduce((sum, r) => sum + repriceUsageRecord(r).totalCost, 0);
}

// Daily counter used for the admin's "max daily per user" limit — keyed by
// userId + today's date, so it naturally resets at midnight (new key, no record carries over).
export async function getUsageRecordsForUserToday(userId) {
  const store = getStore();
  const ids = await store.smembers(`usage:byUser:${userId}:${todayKey()}`);
  if (!ids || !ids.length) return [];
  const records = await Promise.all(ids.map((id) => store.get(`usage:record:${id}`)));
  return recordsSinceReset(records.filter(Boolean));
}

export async function costForUserToday(userId) {
  const records = await getUsageRecordsForUserToday(userId);
  return records.reduce((sum, r) => sum + repriceUsageRecord(r).totalCost, 0);
}

export async function tokensForUserToday(userId) {
  const records = await getUsageRecordsForUserToday(userId);
  return records.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
}

export async function costForConversation(conversationId) {
  const records = await getAllUsageRecords();
  return records
    .filter((r) => r.conversationId === conversationId)
    .reduce((sum, r) => sum + repriceUsageRecord(r).totalCost, 0);
}

// Injects a system/advisor message into every user's stored chat history, so the
// notice (e.g. a suspension or resume announcement) shows up next time they open chat.
export async function broadcastChatMessage(text) {
  if (!text) return;
  const userIds = await getAllUserIds();
  await Promise.all(
    (userIds || []).map(async (userId) => {
      const data = await getUserData(userId);
      if (!data) return;
      const chat = Array.isArray(data.chat) ? data.chat : [];
      await setUserData(userId, { ...data, chat: [...chat, { role: 'ai', text }] });
    })
  );
}
