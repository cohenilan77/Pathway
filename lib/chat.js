import { getStore } from './store.js';
import { newId } from './auth.js';

console.log('[chat.js] Module loaded');

function messagesKey(candidateId) {
  return `chat:${candidateId}:messages`;
}

export async function getMessages(candidateId) {
  const store = getStore();
  const raw = await store.lrange(messagesKey(candidateId), 0, -1);
  return raw || [];
}

export async function appendMessage(candidateId, { senderId, senderRole, text }) {
  console.log(`[appendMessage] START: candidateId=${candidateId}, senderRole=${senderRole}`);

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
  console.log(`[appendMessage] Message saved to Redis`);

  // Route to WhatsApp if consultant/system message and candidate is offline
  if (senderRole === 'consultant' || senderRole === 'system') {
    console.log(`[appendMessage] Routing ${senderRole} message to WhatsApp...`);
    try {
      const { postMessage } = await import('./whatsapp/postMessage.js');
      console.log(`[appendMessage] postMessage imported, calling...`);
      await postMessage(candidateId, senderRole, message.text, 'portal');
      console.log(`[appendMessage] WhatsApp routing completed`);
    } catch (err) {
      console.error(`[appendMessage] WhatsApp routing error for ${candidateId}:`, err.message, err.stack);
      // Don't throw - message is already saved in portal
    }
  } else {
    console.log(`[appendMessage] Skipping WhatsApp (senderRole=${senderRole})`);
  }

  console.log(`[appendMessage] END: candidateId=${candidateId}`);
  return message;
}

function readAtKey(candidateId, viewerRole) {
  return `chat:${candidateId}:readAt:${viewerRole}`;
}

export async function markAllRead(candidateId, viewerRole) {
  await getStore().set(readAtKey(candidateId, viewerRole), Date.now());
  return getMessages(candidateId);
}

export async function countUnread(candidateId, viewerRole) {
  const store = getStore();
  const [messages, readAt] = await Promise.all([
    getMessages(candidateId),
    store.get(readAtKey(candidateId, viewerRole)),
  ]);
  const cutoff = Number(readAt || 0);
  return messages.filter((message) =>
    message.senderRole !== viewerRole
    && Number(message.sentAt || 0) > cutoff
  ).length;
}
