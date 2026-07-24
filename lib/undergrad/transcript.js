// Undergrad Rail v2 — per-session transcript buffer.
//
// A lightweight Redis list holding the in-progress session's turns so the
// Run agent has conversational history and the Track agent has something to
// extract from at session end. Cleared when the session closes. This is
// separate from the durable candidate chat log (lib/chat.js) — it is only the
// working buffer for the currently-open session.
import { getStore } from '../store.js';

const key = userId => `undergrad:transcript:${userId}`;

export async function getTranscript(userId, store = getStore(), { asText = false } = {}) {
  const raw = (await store.lrange(key(userId), 0, -1)) || [];
  const turns = raw.map(e => (typeof e === 'string' ? JSON.parse(e) : e));
  if (asText) return turns.map(t => `${t.role === 'assistant' ? 'Advisor' : 'Student'}: ${t.content}`).join('\n');
  // Anthropic-style messages for the Run agent's history.
  return turns.map(t => ({ role: t.role, content: t.content }));
}

export async function appendTranscript(userId, userMessage, aiMessage, store = getStore()) {
  if (userMessage) await store.rpush(key(userId), JSON.stringify({ role: 'user', content: String(userMessage) }));
  if (aiMessage)   await store.rpush(key(userId), JSON.stringify({ role: 'assistant', content: String(aiMessage) }));
}

export async function clearTranscript(userId, store = getStore()) {
  await store.del(key(userId));
}
