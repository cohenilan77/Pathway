import { getStore } from './store.js';
import { newId } from './auth.js';
import { getAllUserIds, getUserData, setUserData } from './db.js';

// Pricing per model, in dollars per 1,000,000 tokens. Always look prices up from
// this object — never hard-code these numbers anywhere else in the app.
export const PRICING = {
  'claude-haiku-4-5-20251001': { inputPerMillion: 3, outputPerMillion: 15 },
};

const DEFAULT_PRICING = { inputPerMillion: 3, outputPerMillion: 15 };

function pricingFor(model) {
  return PRICING[model] || DEFAULT_PRICING;
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

export async function recordUsage({ userId, conversationId, feature, model, inputTokens, outputTokens }) {
  const store = getStore();
  const pricing = pricingFor(model);
  const safeInputTokens = Number(inputTokens) || 0;
  const safeOutputTokens = Number(outputTokens) || 0;
  const inputCost = (safeInputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (safeOutputTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCost = inputCost + outputCost;
  const id = newId();
  const record = {
    id,
    userId: userId || 'anonymous',
    conversationId: conversationId || 'session',
    feature: feature || 'general_chat',
    model,
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    totalTokens: safeInputTokens + safeOutputTokens,
    inputCost,
    outputCost,
    totalCost,
    createdAt: Date.now(),
  };
  await store.set(`usage:record:${id}`, record);
  await store.sadd('usage:all', id);
  await store.sadd(`usage:byUser:${record.userId}`, id);
  return record;
}

export async function getAllUsageRecords() {
  const store = getStore();
  const ids = await store.smembers('usage:all');
  if (!ids || !ids.length) return [];
  const records = await Promise.all(ids.map((id) => store.get(`usage:record:${id}`)));
  return records.filter(Boolean);
}

export async function getUsageRecordsForUser(userId) {
  const store = getStore();
  const ids = await store.smembers(`usage:byUser:${userId}`);
  if (!ids || !ids.length) return [];
  const records = await Promise.all(ids.map((id) => store.get(`usage:record:${id}`)));
  return records.filter(Boolean);
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
  return alerts.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
}

export async function costForUser(userId) {
  const records = await getUsageRecordsForUser(userId);
  return records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
}

export async function costForConversation(conversationId) {
  const records = await getAllUsageRecords();
  return records
    .filter((r) => r.conversationId === conversationId)
    .reduce((sum, r) => sum + (r.totalCost || 0), 0);
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
