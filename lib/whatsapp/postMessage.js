import { getUserById, postWhatsAppMessage } from '../db.js';
import { sendViaWhatsApp, sendTemplateViaWhatsApp } from './outbound.js';
import { normalizeWhatsAppNumber } from './phone.js';
import {
  buildHumanChatTemplateVariables,
  isHumanChatStaff,
  markHumanChatActive,
  markHumanChatPending,
} from './humanChat.js';

const ACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes — session polling keeps lastActiveAt fresh
const WHATSAPP_24H_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isCandidateOnline(candidate, now = Date.now()) {
  const lastActiveAt = Number(candidate?.lastActiveAt || 0);
  return lastActiveAt > 0 && (now - lastActiveAt) < ACTIVITY_TIMEOUT_MS;
}

export async function postMessage(candidateId, sender, text, originChannel) {
  console.log(`[postMessage] START: candidateId=${candidateId}, sender=${sender}, channel=${originChannel}`);

  if (!candidateId) throw new Error('Candidate ID is required.');
  if (!sender) throw new Error('Sender is required.');
  if (!text || !String(text).trim()) throw new Error('Message text is required.');

  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  console.log(`[postMessage] Candidate found: ${candidate.name}, WhatsApp: ${candidate.whatsappNumber ? 'YES' : 'NO'}, OptIn: ${candidate.whatsappOptIn}, OptOut: ${candidate.whatsappOptOut}`);

  // --- WRITE TO STORE (canonical) ---
  const message = await postWhatsAppMessage(candidateId, sender, text, originChannel);

  // --- DECIDE WHERE TO DELIVER ---

  // --- CHECK IF CANDIDATE IS LOGGED IN ---
  const now = new Date().getTime();
  const lastActiveAt = Number(candidate.lastActiveAt || 0);
  const isLoggedIn = isCandidateOnline(candidate, now);
  console.log(`[postMessage] Activity check: lastActiveAt=${lastActiveAt}, now=${now}, diff=${now - lastActiveAt}ms, timeout=${ACTIVITY_TIMEOUT_MS}ms, isLoggedIn=${isLoggedIn}`);

  // --- SEND TO WHATSAPP IF NOT LOGGED IN ---
  const whatsappNumber = normalizeWhatsAppNumber(candidate.whatsappNumber || candidate.phone);
  let whatsappDelivery = { attempted: false, delivered: false, reason: 'candidate_online' };
  if (!isLoggedIn && whatsappNumber &&
      candidate.whatsappOptIn && !candidate.whatsappOptOut) {

    console.log(`[postMessage] SENDING TO WHATSAPP: ${whatsappNumber}`);
    const lastInbound = Number(candidate.whatsappLastInboundAt || 0);
    const isIn24h = lastInbound && (now - lastInbound) < WHATSAPP_24H_WINDOW_MS;
    console.log(`[postMessage] 24h window check: lastInbound=${lastInbound}, isIn24h=${isIn24h}`);

    let result;
    if (isHumanChatStaff(sender) && !isIn24h) {
      const templateSid = process.env.TWILIO_WHATSAPP_LIVE_CHAT_CONTENT_SID
        || process.env.TWILIO_CONTENT_SID;
      if (!templateSid) {
        throw new Error('TWILIO_WHATSAPP_LIVE_CHAT_CONTENT_SID is required to notify an offline candidate outside the 24-hour WhatsApp window.');
      }
      if (candidate.whatsappHumanChatPending) {
        await markHumanChatPending(candidateId, { sender, text, at: now });
        result = { success: true, sid: null, queued: true };
      } else {
        result = await sendTemplateViaWhatsApp(
          whatsappNumber,
          templateSid,
          buildHumanChatTemplateVariables(candidate)
        );
        if (result?.success) {
          await markHumanChatPending(candidateId, { sender, text, at: now });
        }
      }
    } else {
      // Inside the 24-hour window, deliver the human message directly.
      console.log(`[postMessage] Sending free-form message (inside 24h or AI)`);
      result = await sendViaWhatsApp(whatsappNumber, text);
      if (isHumanChatStaff(sender) && result?.success) {
        await markHumanChatActive(candidateId, lastInbound || now);
      }
    }
    if (!result?.success) throw new Error(result?.error || 'WhatsApp delivery failed.');
    whatsappDelivery = {
      attempted: true,
      delivered: true,
      sid: result.sid || null,
      kind: result.queued ? 'queued_for_human_reply' : (isIn24h ? 'direct' : 'template_notification'),
    };
  } else {
    const reason = isLoggedIn
      ? 'candidate_online'
      : !whatsappNumber
        ? 'missing_phone'
        : !candidate.whatsappOptIn
          ? 'not_opted_in'
          : 'opted_out';
    whatsappDelivery = { attempted: false, delivered: false, reason };
    console.log(`[postMessage] SKIPPING WHATSAPP: isLoggedIn=${isLoggedIn}, hasPhone=${!!whatsappNumber}, optIn=${candidate.whatsappOptIn}, optOut=${candidate.whatsappOptOut}`);
  }

  console.log(`[postMessage] END: candidateId=${candidateId}`);
  return { ...message, whatsappDelivery };
}
