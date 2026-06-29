const ADVISOR_TRIGGER = /^(?:\/advisor|!advisor|!ai|\/start)\b/i;
const LIVE_CHAT_TRIGGER = /^\/livechat\b/i;

export function isAdvisorTrigger(text) {
  return ADVISOR_TRIGGER.test(String(text || '').trim());
}

export function advisorTriggerMessage(text) {
  return String(text || '').trim().replace(ADVISOR_TRIGGER, '').trim() || 'Hello';
}

export function isLiveChatTrigger(text) {
  return LIVE_CHAT_TRIGGER.test(String(text || '').trim());
}

export function liveChatTriggerMessage(text) {
  return String(text || '').trim().replace(LIVE_CHAT_TRIGGER, '').trim();
}
