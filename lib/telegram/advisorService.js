import { getUserById, getUserData, setUserData } from '../db.js';
import { getStore } from '../store.js';
import { sendViaTelegram } from './outbound.js';
import { advisorTurn } from '../whatsapp/advisorTurn.js';

function advisorMessage({ role, channel, text, sourceMessageId = null, actorUserId = null }) {
  return {
    role,
    channel,
    text: String(text || '').trim(),
    timestamp: Date.now(),
    sourceMessageId,
    actorUserId,
  };
}

async function appendAdvisorMessage(candidateId, message) {
  const data = (await getUserData(candidateId)) || {};
  const chat = Array.isArray(data.chat) ? data.chat : [];
  if (message.sourceMessageId && chat.some((entry) => entry?.sourceMessageId === message.sourceMessageId)) {
    return chat.find((entry) => entry?.sourceMessageId === message.sourceMessageId);
  }
  await setUserData(candidateId, { ...data, chat: [...chat, message] });
  return message;
}

async function saveCandidate(candidate) {
  await getStore().set(`user:${candidate.id}`, candidate);
  return candidate;
}

export async function start(candidateId, actorUser) {
  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  if (candidate.telegramAiAdvisorSessionActive) {
    throw new Error('AI Advisor is already running on Telegram for this candidate.');
  }

  if (!candidate.telegramUserId) {
    throw new Error('Candidate does not have a Telegram user ID configured.');
  }
  if (candidate.telegramOptIn !== true || candidate.telegramOptOut === true) {
    throw new Error('Candidate has not enabled Telegram in Settings.');
  }

  const telegramUserId = String(candidate.telegramUserId);
  const kickoffMessage = `Hi ${candidate.name || 'there'},\n\nYour AI advisor is now available on Telegram. Feel free to ask any questions about your application or the programs you're interested in!`;

  const sent = await sendViaTelegram(telegramUserId, kickoffMessage);
  if (!sent?.success) throw new Error(sent?.error || 'Could not send the Telegram kickoff message.');

  const now = Date.now();
  const updated = await saveCandidate({
    ...candidate,
    telegramAiAdvisorSessionActive: true,
    telegramAiAdvisorSessionStartedAt: now,
    telegramAiAdvisorSessionPausedAt: null,
    telegramAiAdvisorSessionStartedBy: actorUser.id,
  });

  await appendAdvisorMessage(candidateId, advisorMessage({
    role: 'system',
    channel: 'system',
    text: 'Consultant started AI Advisor on Telegram.',
    sourceMessageId: sent.messageId || null,
    actorUserId: actorUser.id,
  }));

  return updated;
}

export async function pause(candidateId, actorUser) {
  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  if (!candidate.telegramAiAdvisorSessionActive) return candidate;

  const now = Date.now();
  const updated = await saveCandidate({
    ...candidate,
    telegramAiAdvisorSessionActive: false,
    telegramAiAdvisorSessionPausedAt: now,
  });

  await appendAdvisorMessage(candidateId, advisorMessage({
    role: 'system',
    channel: 'system',
    text: 'Consultant paused AI Advisor on Telegram.',
    actorUserId: actorUser.id,
  }));

  return updated;
}

export async function handleInbound(candidate, inboundMessage) {
  if (!candidate?.telegramAiAdvisorSessionActive
      || candidate?.telegramOptIn !== true
      || candidate?.telegramOptOut === true) {
    return { status: 'ai_advisor_inactive' };
  }

  const store = getStore();
  const sourceMessageId = inboundMessage.sourceMessageId || null;
  const dedupeKey = sourceMessageId ? `telegram:advisor-inbound:${candidate.id}:${sourceMessageId}` : null;

  if (dedupeKey && await store.get(dedupeKey)) {
    return { duplicate: true };
  }

  await saveCandidate({ ...candidate, telegramLastInboundAt: Date.now() });

  await appendAdvisorMessage(candidate.id, advisorMessage({
    role: 'user',
    channel: 'telegram',
    text: inboundMessage.text,
    sourceMessageId,
  }));

  const result = await advisorTurn(candidate.id, inboundMessage.text, { channel: 'Telegram' });

  const sent = await sendViaTelegram(
    String(candidate.telegramUserId),
    result.reply
  );

  if (!sent?.success) {
    console.error('Failed to send advisor response:', sent?.error);
    return { success: false, error: sent?.error };
  }

  await appendAdvisorMessage(candidate.id, advisorMessage({
    role: 'ai',
    channel: 'telegram',
    text: result.reply,
    sourceMessageId: sent.messageId || null,
  }));

  if (dedupeKey) {
    await store.set(dedupeKey, { status: 'done' }, { ex: 7 * 24 * 60 * 60 });
  }

  return { success: true, replied: true, reply: result.reply };
}
