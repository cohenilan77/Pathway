import { appendMessage } from '../chat.js';
import { getStore } from '../store.js';
import { sendViaTelegram } from './outbound.js';

const HUMAN_CHAT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING_MESSAGES = 10;
const MAX_TELEGRAM_TEXT = 4000;

export function isHumanChatStaff(sender) {
  return sender === 'consultant' || sender === 'admin';
}

export function shouldHandleHumanChatInbound(candidate, now = Date.now()) {
  if (candidate?.telegramOptIn !== true || candidate?.telegramOptOut === true) return false;
  if (candidate?.telegramHumanChatPending === true) return true;
  const lastStaffAt = Number(candidate?.telegramHumanChatLastStaffAt || 0);
  return candidate?.telegramHumanChatActive === true
    && lastStaffAt > 0
    && now - lastStaffAt < HUMAN_CHAT_WINDOW_MS;
}

export function buildHumanChatMessage(candidate) {
  return { '1': String(candidate?.name || 'there').trim() || 'there' };
}

export function buildPendingHumanChatReply(messages) {
  const text = (messages || [])
    .map((message) => String(message?.text || '').trim())
    .filter(Boolean)
    .join('\n\n');
  if (!text) return '';
  return text.length <= MAX_TELEGRAM_TEXT ? text : `${text.slice(0, MAX_TELEGRAM_TEXT - 1).trim()}…`;
}

async function updateCandidate(candidateId, patch) {
  const store = getStore();
  const candidate = await store.get(`user:${candidateId}`);
  if (!candidate) throw new Error('Candidate not found.');
  const updated = { ...candidate, ...patch };
  await store.set(`user:${candidateId}`, updated);
  return updated;
}

export async function markHumanChatPending(candidateId, { sender, text, at = Date.now() }) {
  const store = getStore();
  const candidate = await store.get(`user:${candidateId}`);
  if (!candidate) throw new Error('Candidate not found.');
  const pending = Array.isArray(candidate.telegramHumanChatPendingMessages)
    ? candidate.telegramHumanChatPendingMessages.slice(-(MAX_PENDING_MESSAGES - 1))
    : [];
  pending.push({ sender, text: String(text || '').trim(), at });
  return updateCandidate(candidateId, {
    telegramHumanChatPending: true,
    telegramHumanChatPendingAt: candidate.telegramHumanChatPendingAt || at,
    telegramHumanChatPendingMessages: pending,
  });
}

export async function markHumanChatActive(candidateId, lastInboundAt) {
  return updateCandidate(candidateId, {
    telegramHumanChatActive: true,
    telegramHumanChatPending: false,
    telegramHumanChatPendingAt: null,
    telegramHumanChatPendingMessages: [],
    telegramLastInboundAt: lastInboundAt,
  });
}

export async function handleHumanChatInbound(candidate, inboundMessage) {
  const store = getStore();
  const sourceMessageId = inboundMessage.sourceMessageId || null;
  const dedupeKey = sourceMessageId ? `telegram:human-inbound:${candidate.id}:${sourceMessageId}` : null;
  if (dedupeKey && await store.get(dedupeKey)) {
    return { duplicate: true, replied: false };
  }

  const current = await store.get(`user:${candidate.id}`) || candidate;
  await appendMessage(candidate.id, {
    senderId: candidate.id,
    senderRole: 'candidate',
    text: inboundMessage.text,
    sourceMessageId,
  });
  const now = Date.now();
  await updateCandidate(candidate.id, {
    telegramHumanChatActive: true,
    telegramLastInboundAt: now,
  });

  const pendingMessages = Array.isArray(current.telegramHumanChatPendingMessages)
    ? current.telegramHumanChatPendingMessages
    : [];
  const reply = buildPendingHumanChatReply(pendingMessages);
  if (reply) {
    const sent = await sendViaTelegram(
      String(current.telegramUserId),
      reply
    );
    if (!sent?.success) throw new Error(sent?.error || 'Could not deliver the pending Live Chat message.');
  }

  await updateCandidate(candidate.id, {
    telegramHumanChatActive: true,
    telegramHumanChatPending: false,
    telegramHumanChatPendingAt: null,
    telegramHumanChatPendingMessages: [],
    telegramHumanChatLastDeliveredAt: reply ? Date.now() : current.telegramHumanChatLastDeliveredAt || null,
  });
  if (dedupeKey) await store.set(dedupeKey, { status: 'done' }, { ex: 7 * 24 * 60 * 60 });
  return { duplicate: false, replied: !!reply, reply: reply || null };
}
