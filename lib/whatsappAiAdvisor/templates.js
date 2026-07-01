export function getAdvisorKickoffContentSid() {
  return process.env.TWILIO_WHATSAPP_ADVISOR_KICKOFF_CONTENT_SID || '';
}

export function buildAdvisorKickoffVariables(candidate) {
  return { '1': String(candidate?.name || 'there').trim() || 'there' };
}
