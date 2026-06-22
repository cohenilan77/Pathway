// Shared Live Chat translation/localization helpers.
// Both the candidate Chat.jsx and the consultant Live Chat section in
// AdminPortal.jsx must consume these — never duplicate chat strings.

export const CHAT_TEXT = {
  English: {
    liveChat: 'Live Chat',
    chat: 'Chat',
    send: 'Send',
    typeMessage: 'Type a message...',
    writeMessageToConsultant: 'Write a message to your consultant...',
    noMessagesYet: 'No messages yet',
    startConversation: 'Start the conversation',
    loadingMessages: 'Loading messages...',
    failedToLoadMessages: 'Failed to load messages',
    messageSent: 'Message sent',
    failedToSendMessage: 'Failed to send message',
    newMessage: 'New message',
    today: 'Today',
    yesterday: 'Yesterday',
    consultant: 'Consultant',
    candidate: 'Candidate',
    assignedConsultant: 'Assigned consultant',
    noConsultantAssigned: 'No consultant assigned',
    conversation: 'Conversation',
    online: 'Online',
    offline: 'Offline',
    typing: 'Typing...',
    viewing: 'Viewing',
    noCandidateSelected: 'No candidate selected.',
    openCandidateFromList: 'Open a candidate from the Candidates list to view their live chat.',
  },
  Hebrew: {
    liveChat: 'צ\'אט חי',
    chat: 'צ\'אט',
    send: 'שלח',
    typeMessage: 'הקלד הודעה...',
    writeMessageToConsultant: 'כתוב הודעה ליועץ שלך...',
    noMessagesYet: 'אין הודעות עדיין',
    startConversation: 'התחל את השיחה',
    loadingMessages: 'טוען הודעות...',
    failedToLoadMessages: 'טעינת ההודעות נכשלה',
    messageSent: 'ההודעה נשלחה',
    failedToSendMessage: 'שליחת ההודעה נכשלה',
    newMessage: 'הודעה חדשה',
    today: 'היום',
    yesterday: 'אתמול',
    consultant: 'יועץ',
    candidate: 'מועמד',
    assignedConsultant: 'יועץ מוקצה',
    noConsultantAssigned: 'לא הוקצה יועץ',
    conversation: 'שיחה',
    online: 'מחובר',
    offline: 'לא מחובר',
    typing: 'מקליד...',
    viewing: 'מציג',
    noCandidateSelected: 'לא נבחר מועמד.',
    openCandidateFromList: 'פתח מועמד מרשימת המועמדים כדי לצפות בצ\'אט החי שלו.',
  },
};

const RTL_LANGUAGES = new Set(['Hebrew', 'Arabic']);
const LOCALE_BY_LANGUAGE = { Hebrew: 'he-IL', Arabic: 'ar', Spanish: 'es', Chinese: 'zh-CN', French: 'fr' };

export function chatT(language, key) {
  const dict = CHAT_TEXT[language] || CHAT_TEXT.English;
  return dict[key] ?? CHAT_TEXT.English[key] ?? key;
}

export function chatDir(language) {
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
}

export function chatLocale(language) {
  return LOCALE_BY_LANGUAGE[language] || 'en-US';
}

// Formats a message timestamp as "Today"/"Yesterday" (localized) or a
// locale-formatted date, matching the selected UI language.
export function formatChatDate(timestamp, language) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return chatT(language, 'today');
  if (diffDays === 1) return chatT(language, 'yesterday');
  return new Intl.DateTimeFormat(chatLocale(language), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatChatTime(timestamp, language) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat(chatLocale(language), { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}
