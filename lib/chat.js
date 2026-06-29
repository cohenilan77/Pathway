import { getStore } from './store.js';
import { newId } from './auth.js';

console.log('[chat.js] Module loaded');

const ACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

export function shouldRouteStaffMessage(senderRole) {
  return ['consultant', 'admin', 'system'].includes(senderRole);
}

function messagesKey(candidateId) {
  return `chat:${candidateId}:messages`;
}

function isCandidateOnline(candidate, now = Date.now()) {
  const lastActiveAt = Number(candidate?.lastActiveAt || 0);
  return lastActiveAt > 0 && (now - lastActiveAt) < ACTIVITY_TIMEOUT_MS;
}

export async function getMessages(candidateId) {
  const store = getStore();
  const raw = await store.lrange(messagesKey(candidateId), 0, -1);
  return raw || [];
}

export async function appendMessage(candidateId, { senderId, senderRole, text, sourceMessageId = null }) {
  console.log(`[appendMessage] START: candidateId=${candidateId}, senderRole=${senderRole}`);

  const store = getStore();
  if (sourceMessageId) {
    const existing = await getMessages(candidateId);
    const duplicate = existing.find((entry) => entry?.sourceMessageId === sourceMessageId);
    if (duplicate) return duplicate;
  }
  const message = {
    id: newId(),
    senderId,
    senderRole,
    text: String(text || '').trim(),
    sentAt: Date.now(),
    read: false,
    sourceMessageId,
  };
  await store.rpush(messagesKey(candidateId), message);
  console.log(`[appendMessage] Message saved to Redis`);

  if (shouldRouteStaffMessage(senderRole)) {
    const candidate = await store.get(`user:${candidateId}`);
    const now = Date.now();
    const isOnline = isCandidateOnline(candidate, now);

    // Route via Telegram if candidate opted in and is offline
    if (!isOnline && candidate?.telegramOptIn && candidate?.telegramUserId) {
      console.log(`[appendMessage] Routing ${senderRole} message to Telegram for ${candidateId}...`);
      try {
        const { markHumanChatPending, shouldHandleHumanChatInbound } = await import('./telegram/humanChat.js');
        const { sendViaTelegram } = await import('./telegram/outbound.js');

        if (shouldHandleHumanChatInbound(candidate, now)) {
          // Active Telegram session — deliver directly
          const sent = await sendViaTelegram(String(candidate.telegramUserId), message.text);
          console.log(`[appendMessage] Telegram direct: ${sent?.success ? 'OK' : 'FAILED'}`);
          return { ...message, telegramDelivery: { attempted: true, delivered: !!sent?.success } };
        } else {
          // No active session — queue for next inbound
          await markHumanChatPending(candidateId, { sender: senderRole, text: message.text, at: now });
          console.log(`[appendMessage] Telegram message queued`);
          return { ...message, telegramDelivery: { attempted: true, queued: true } };
        }
      } catch (err) {
        console.error(`[appendMessage] Telegram routing error for ${candidateId}:`, err.message);
        return { ...message, telegramDelivery: { attempted: true, delivered: false, error: err.message } };
      }
    }

    // Fall back to WhatsApp
    console.log(`[appendMessage] Routing ${senderRole} message to WhatsApp...`);
    try {
      const { postMessage } = await import('./whatsapp/postMessage.js');
      const routed = await postMessage(candidateId, senderRole, message.text, 'portal');
      console.log(`[appendMessage] WhatsApp routing completed`);
      return { ...message, whatsappDelivery: routed.whatsappDelivery };
    } catch (err) {
      console.error(`[appendMessage] WhatsApp routing error for ${candidateId}:`, err.message, err.stack);
      return {
        ...message,
        whatsappDelivery: { attempted: true, delivered: false, error: err.message },
      };
    }
  } else {
    console.log(`[appendMessage] Skipping routing (senderRole=${senderRole})`);
  }

  console.log(`[appendMessage] END: candidateId=${candidateId}`);
  return message;
}

function readAudience(viewerRole) {
  return viewerRole === 'candidate' ? 'candidate' : 'staff';
}

function readAtKey(candidateId, viewerRole) {
  return `chat:${candidateId}:readAt:${readAudience(viewerRole)}`;
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
  const audience = readAudience(viewerRole);
  return messages.filter((message) => {
    const isUnreadForAudience = audience === 'candidate'
      ? message.senderRole !== 'candidate'
      : message.senderRole === 'candidate';
    return isUnreadForAudience && Number(message.sentAt || 0) > cutoff;
  }).length;
}
