import { getStore } from './store.js';
import { newId } from './auth.js';

function messagesKey(candidateId) {
  return `chat:${candidateId}:messages`;
}

export async function getMessages(candidateId) {
  const store = getStore();
  const raw = await store.lrange(messagesKey(candidateId), 0, -1);
  return raw || [];
}

export async function appendMessage(candidateId, { senderId, senderRole, text }) {
  const store = getStore();
  const message = {
    id: newId(),
    senderId,
    senderRole,
    text: String(text || '').trim(),
    sentAt: Date.now(),
    read: false,
  };
  await store.rpush(messagesKey(candidateId), message);
  return message;
}

export async function markAllRead(candidateId, viewerRole) {
  const store = getStore();
  const key = messagesKey(candidateId);
  const messages = await getMessages(candidateId);
  const updated = messages.map((m) => (m.senderRole !== viewerRole ? { ...m, read: true } : m));
  await store.del(key);
  for (const m of updated) await store.rpush(key, m);
  return updated;
}

export async function countUnread(candidateId, viewerRole) {
  const messages = await getMessages(candidateId);
  return messages.filter((m) => m.senderRole !== viewerRole && !m.read).length;
}
