const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasOpenWhatsAppWindow(candidate, now = Date.now()) {
  const lastInbound = Number(candidate?.whatsappLastInboundAt || 0);
  return lastInbound > 0 && now - lastInbound < WHATSAPP_WINDOW_MS;
}

export function getDisabledReason(candidate) {
  if (!candidate?.whatsappNumber) return 'Candidate has no WhatsApp number';
  if (candidate.whatsappOptIn !== true) return 'Candidate has not opted in to WhatsApp';
  if (candidate.whatsappOptOut === true) return 'Candidate opted out of WhatsApp';
  if (!process.env.TWILIO_WHATSAPP_ADVISOR_KICKOFF_CONTENT_SID) return 'WhatsApp advisor kickoff template is not configured';
  return '';
}

export function canStartWhatsAppAiAdvisor(candidate) {
  return !getDisabledReason(candidate);
}

export function canContinueWhatsAppAiAdvisor(candidate, now = Date.now()) {
  return !!candidate?.whatsappAiAdvisorSessionActive
    && !!candidate?.whatsappNumber
    && candidate.whatsappOptIn === true
    && candidate.whatsappOptOut !== true
    && hasOpenWhatsAppWindow(candidate, now);
}
