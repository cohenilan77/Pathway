import { getActor } from '../lib/admin.js';
import { ROLES } from '../lib/db.js';
import { getStore } from '../lib/store.js';

function dayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (actor.role !== ROLES.admin) return res.status(403).json({ error: 'Forbidden.' });

  const store = getStore();
  const resetAt = Date.now();

  // The cutoff makes the reset immediate and race-safe: anything created before
  // this instant is hidden from reporting and enforcement, while later calls remain.
  await store.set('usage:resetAt', resetAt);

  const [usageIds, tokenLogIds, alertIds] = await Promise.all([
    store.smembers('usage:all'),
    store.smembers('token_usage_logs:all'),
    store.smembers('usage:alerts'),
  ]);

  let usageRecordsDeleted = 0;
  for (const id of usageIds || []) {
    const record = await store.get(`usage:record:${id}`);
    if (!record || Number(record.createdAt) >= resetAt) continue;
    await Promise.all([
      store.del(`usage:record:${id}`),
      store.srem('usage:all', id),
      store.srem(`usage:byUser:${record.userId}`, id),
      store.srem(`usage:byUser:${record.userId}:${dayKey(record.createdAt)}`, id),
    ]);
    usageRecordsDeleted += 1;
  }

  let tokenLogsDeleted = 0;
  for (const id of tokenLogIds || []) {
    const log = await store.get(`token_usage_log:${id}`);
    if (!log || Number(log.timestamp) >= resetAt) continue;
    await Promise.all([
      store.del(`token_usage_log:${id}`),
      store.srem('token_usage_logs:all', id),
      store.srem(`token_usage_logs:byUser:${log.userId}`, id),
      store.srem(`token_usage_logs:byConversation:${log.conversationId}`, id),
      store.srem(`token_usage_logs:byDay:${dayKey(log.timestamp)}`, id),
    ]);
    tokenLogsDeleted += 1;
  }

  let alertsDeleted = 0;
  for (const id of alertIds || []) {
    const alert = await store.get(`usage:alert:${id}`);
    if (!alert || Number(alert.createdAt) >= resetAt) continue;
    await Promise.all([
      store.del(`usage:alert:${id}`),
      store.srem('usage:alerts', id),
    ]);
    alertsDeleted += 1;
  }

  res.status(200).json({
    ok: true,
    resetAt,
    deleted: { usageRecords: usageRecordsDeleted, tokenLogs: tokenLogsDeleted, alerts: alertsDeleted },
  });
}
