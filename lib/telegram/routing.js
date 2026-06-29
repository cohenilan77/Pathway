// Magic text commands for Telegram
const ADVISOR_TRIGGER = /^(?:\/advisor|!advisor|!ai|\/start)\b/i;
const LIVE_CHAT_TRIGGER = /^\/livechat\b/i;
const HELP_TRIGGER = /^(?:\/help|!help|\?)\b/i;

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

export function isHelpTrigger(text) {
  return HELP_TRIGGER.test(String(text || '').trim());
}

export const TELEGRAM_HELP_TEXT = `🤖 **Pathway Telegram Help**

**Magic Text Commands:**

1️⃣  **Talk to AI Advisor**
   \`/advisor your question here\`
   \`/ai what should I write about?\`

2️⃣  **Chat with Consultant/Admin**
   \`/livechat your message here\`
   \`/livechat Can you review my essay?\`

3️⃣  **Get Help**
   \`/help\`
   \`?\`

**Without a command**, your message goes to whoever was talking to you most recently.

**Quick Switch:**
- Type \`/advisor\` anytime to switch to AI
- Type \`/livechat\` anytime to switch to your consultant
- Type \`/stop\` to turn off notifications

💡 **Tips:**
- Be specific in your questions for better answers
- AI Advisor is available 24/7
- Your consultant sees all messages when they log in
`;
