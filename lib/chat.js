import { getStore } from './store.js';
import { newId } from './auth.js';
import { postMessage as routeMessage } from './whatsapp/postMessage.js';

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

  // Route to WhatsApp if consultant/system message and candidate is offline
  if (senderRole === 'consultant' || senderRole === 'system') {
    try {
      await routeMessage(candidateId, senderRole, message.text, 'portal');
    } catch (err) {
      console.error(`WhatsApp routing error for ${candidateId}:`, err.message);
      // Don't throw - message is already saved in portal
    }
  }

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
