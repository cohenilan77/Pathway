import { getUserById, getUserData, setUserData } from '../db.js';
import { getStore } from '../store.js';
import { advisorTurn } from '../whatsapp/advisorTurn.js';
import { sendTemplateViaWhatsApp, sendViaWhatsApp } from '../whatsapp/outbound.js';
import { canContinueWhatsAppAiAdvisor, getDisabledReason } from './guard.js';
import { buildAdvisorKickoffVariables, getAdvisorKickoffContentSid } from './templates.js';
import { recordWhatsAppAiAdvisorAudit } from './audit.js';

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

  if (candidate.whatsappAiAdvisorSessionActive) {
    throw new Error('AI Advisor is already running on WhatsApp for this candidate.');
  }
  const disabledReason = getDisabledReason(candidate);
  if (disabledReason) throw new Error(disabledReason);

  const sent = await sendTemplateViaWhatsApp(
    candidate.whatsappNumber,
    getAdvisorKickoffContentSid(),
    buildAdvisorKickoffVariables(candidate)
  );
  if (!sent?.success) throw new Error(sent?.error || 'Could not send the WhatsApp kickoff template.');

  const now = Date.now();
  const updated = await saveCandidate({
    ...candidate,
    whatsappAiAdvisorSessionActive: true,
    whatsappAiAdvisorSessionStartedAt: now,
    whatsappAiAdvisorSessionPausedAt: null,
    whatsappAiAdvisorSessionStartedBy: actorUser.id,
    whatsappAiAdvisorLastTemplateSentAt: now,
  });
  await appendAdvisorMessage(candidateId, advisorMessage({
    role: 'system',
    channel: 'system',
    text: 'Consultant started AI Advisor on WhatsApp.',
    sourceMessageId: sent.sid || null,
    actorUserId: actorUser.id,
  }));
  await recordWhatsAppAiAdvisorAudit({
    candidateId,
    actorUserId: actorUser.id,
    action: 'start',
    metadata: { templateMessageSid: sent.sid || null },
  });
  return updated;
}

export async function pause(candidateId, actorUser) {
  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  if (!candidate.whatsappAiAdvisorSessionActive) return candidate;

  const now = Date.now();
  const updated = await saveCandidate({
    ...candidate,
    whatsappAiAdvisorSessionActive: false,
    whatsappAiAdvisorSessionPausedAt: now,
  });
  await appendAdvisorMessage(candidateId, advisorMessage({
    role: 'system',
    channel: 'system',
    text: 'Consultant paused AI Advisor on WhatsApp.',
    actorUserId: actorUser.id,
  }));
  await recordWhatsAppAiAdvisorAudit({
    candidateId,
    actorUserId: actorUser.id,
    action: 'pause',
  });
  return updated;
}

export async function handleInbound(candidate, inboundMessage) {
  const store = getStore();
  const sourceMessageId = inboundMessage.sourceMessageId || null;
  const dedupeKey = sourceMessageId ? `whatsapp:inbound:${sourceMessageId}` : null;
  if (dedupeKey && await store.get(dedupeKey)) {
    return { duplicate: true, replied: false };
  }
  if (dedupeKey) {
    await store.set(dedupeKey, { status: 'processing' }, { ex: 5 * 60 });
  }

  try {
    const now = Date.now();
    const updated = await saveCandidate({ ...candidate, whatsappLastInboundAt: now });
    await appendAdvisorMessage(candidate.id, advisorMessage({
      role: 'user',
      channel: 'whatsapp',
      text: inboundMessage.text,
      sourceMessageId,
    }));

    if (!canContinueWhatsAppAiAdvisor(updated, now)) {
      if (dedupeKey) await store.set(dedupeKey, { status: 'done' }, { ex: 7 * 24 * 60 * 60 });
      return { duplicate: false, replied: false };
    }

    const result = await advisorTurn(candidate.id, inboundMessage.text);
    const sent = await sendViaWhatsApp(updated.whatsappNumber, result.reply);
    if (!sent?.success) throw new Error(sent?.error || 'Could not send the AI Advisor WhatsApp reply.');

    await appendAdvisorMessage(candidate.id, advisorMessage({
      role: 'ai',
      channel: 'whatsapp',
      text: result.reply,
      sourceMessageId: sent.sid || null,
    }));
    if (dedupeKey) await store.set(dedupeKey, { status: 'done' }, { ex: 7 * 24 * 60 * 60 });
    return { duplicate: false, replied: true, reply: result.reply };
  } catch (error) {
    if (dedupeKey) await store.del(dedupeKey);
    throw error;
  }
}

export async function sendKickoffTemplate(candidate) {
  return sendTemplateViaWhatsApp(
    candidate.whatsappNumber,
    getAdvisorKickoffContentSid(),
    buildAdvisorKickoffVariables(candidate)
  );
}

export default { start, pause, handleInbound, sendKickoffTemplate };
