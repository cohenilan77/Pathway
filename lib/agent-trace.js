import { getStore } from './store.js';

function isTraceEnabled() {
  const val = process.env.AGENT_TRACE_ENABLED;
  return val === '1' || val === 'true' || val === true;
}

function truncateString(str, maxLen = 4000) {
  if (typeof str !== 'string') return str;
  return str.length > maxLen ? str.slice(0, maxLen) + '...[truncated]' : str;
}

function deepTruncate(obj, maxLen = 4000) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(item => deepTruncate(item, maxLen));
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'string' ? truncateString(value, maxLen) : value,
    ])
  );
}

async function recordTrace(candidateId, event) {
  try {
    if (!isTraceEnabled()) return;
    if (!candidateId) return;

    const store = getStore();
    const key = `agent:trace:${candidateId}`;

    const trace = {
      at: Date.now(),
      sessionId: event.sessionId || null,
      level: event.level,
      agent: event.agent,
      direction: event.direction,
      data: deepTruncate(event.data || {}),
      meta: deepTruncate(event.meta || {}),
    };

    await store.rpush(key, JSON.stringify(trace));

    // Trim to last 1000 entries
    if (store.ltrim) {
      await store.ltrim(key, -1000, -1);
    }
  } catch (error) {
    console.error('[agent-trace] recordTrace error:', error?.message);
  }
}

async function getTrace(candidateId, { limit = 300, sessionId = null } = {}) {
  try {
    if (!isTraceEnabled()) return [];
    if (!candidateId) return [];

    const store = getStore();
    const key = `agent:trace:${candidateId}`;
    const allRawEvents = await store.lrange(key);

    if (!allRawEvents || allRawEvents.length === 0) return [];

    const rawEvents = allRawEvents.slice(-limit);
    const events = rawEvents
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (sessionId) {
      return events.filter(e => e.sessionId === sessionId);
    }

    return events;
  } catch (error) {
    console.error('[agent-trace] getTrace error:', error?.message);
    return [];
  }
}

async function clearTrace(candidateId) {
  try {
    if (!isTraceEnabled()) return;
    if (!candidateId) return;

    const store = getStore();
    const key = `agent:trace:${candidateId}`;
    await store.del(key);
  } catch (error) {
    console.error('[agent-trace] clearTrace error:', error?.message);
  }
}

export { isTraceEnabled, recordTrace, getTrace, clearTrace };
