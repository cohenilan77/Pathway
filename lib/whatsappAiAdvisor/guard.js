import { normalizeWhatsAppNumber } from '../whatsapp/phone.js';

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getWhatsAppNumber(candidate) {
  return normalizeWhatsAppNumber(candidate?.whatsappNumber || candidate?.phone);
}

export function hasOpenWhatsAppWindow(candidate, now = Date.now()) {
  const lastInbound = Number(candidate?.whatsappLastInboundAt || 0);
  return lastInbound > 0 && now - lastInbound < WHATSAPP_WINDOW_MS;
}

export function getDisabledReason(candidate) {
  if (!getWhatsAppNumber(candidate)) return 'Candidate has no WhatsApp number';
  if (candidate.whatsappOptIn !== true) return 'Candidate has not opted in to WhatsApp';
  if (candidate.whatsappOptOut === true) return 'Candidate opted out of WhatsApp';
  const templateSid = String(process.env.TWILIO_WHATSAPP_ADVISOR_KICKOFF_CONTENT_SID || '').trim();
  if (!templateSid) return 'WhatsApp advisor kickoff template is not configured';
  if (!/^HX[0-9a-f]{32}$/i.test(templateSid)) return 'WhatsApp advisor kickoff template SID is invalid';
  return '';
}

export function canStartWhatsAppAiAdvisor(candidate) {
  return !getDisabledReason(candidate);
}

export function canContinueWhatsAppAiAdvisor(candidate, now = Date.now()) {
  return !!candidate?.whatsappAiAdvisorSessionActive
    && !!getWhatsAppNumber(candidate)
    && candidate.whatsappOptIn === true
    && candidate.whatsappOptOut !== true
    && hasOpenWhatsAppWindow(candidate, now);
}
