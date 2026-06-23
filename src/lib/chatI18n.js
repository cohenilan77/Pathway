// Shared Live Chat translation/localization helpers.
// Both the candidate Chat.jsx and the consultant Live Chat section in
// AdminPortal.jsx must consume these — never duplicate chat strings.
//
// RTL note: never build a sentence by concatenating two translated
// fragments with raw punctuation (": ", " — "). Mixing a translated
// RTL fragment with a literal LTR punctuation mark confuses the
// Unicode bidi algorithm and the punctuation jumps to the wrong side.
// Compose full natural sentences per-language instead (see
// `emptyChatState` / `viewingConsultant`), and wrap any dynamic LTR
// content embedded in RTL text (names, etc.) in <bdi> at the call site.

export const CHAT_TEXT = {
  English: {
    liveChat: 'Live Chat',
    chat: 'Chat',
    send: 'Send',
    typeMessage: 'Type a message...',
    writeMessageToConsultant: 'Write a message to your consultant...',
    noMessagesYet: 'No messages yet',
    startConversation: 'Start the conversation',
    emptyChatState: 'No messages yet. Start the conversation.',
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
    viewingConsultant: 'Conversation with your consultant',
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
    emptyChatState: 'אין הודעות עדיין. התחל את השיחה.',
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
    viewingConsultant: 'שיחה עם היועץ שלך',
    noCandidateSelected: 'לא נבחר מועמד.',
    openCandidateFromList: 'פתח מועמד מרשימת המועמדים כדי לצפות בצ\'אט החי שלו.',
  },
  Arabic: {
    liveChat: 'الدردشة المباشرة',
    chat: 'دردشة',
    send: 'إرسال',
    typeMessage: 'اكتب رسالة...',
    writeMessageToConsultant: 'اكتب رسالة إلى مستشارك...',
    noMessagesYet: 'لا توجد رسائل بعد',
    startConversation: 'ابدأ المحادثة',
    emptyChatState: 'لا توجد رسائل بعد. ابدأ المحادثة.',
    loadingMessages: 'جارٍ تحميل الرسائل...',
    failedToLoadMessages: 'فشل تحميل الرسائل',
    messageSent: 'تم إرسال الرسالة',
    failedToSendMessage: 'فشل إرسال الرسالة',
    newMessage: 'رسالة جديدة',
    today: 'اليوم',
    yesterday: 'أمس',
    consultant: 'مستشار',
    candidate: 'مرشح',
    assignedConsultant: 'المستشار المخصص',
    noConsultantAssigned: 'لم يتم تعيين مستشار',
    conversation: 'محادثة',
    online: 'متصل',
    offline: 'غير متصل',
    typing: 'يكتب الآن...',
    viewing: 'عرض',
    viewingConsultant: 'محادثة مع مستشارك',
    noCandidateSelected: 'لم يتم اختيار مرشح.',
    openCandidateFromList: 'افتح مرشحًا من قائمة المرشحين لعرض الدردشة المباشرة الخاصة به.',
  },
  Chinese: {
    liveChat: '实时聊天',
    chat: '聊天',
    send: '发送',
    typeMessage: '输入消息...',
    writeMessageToConsultant: '给您的顾问写消息...',
    noMessagesYet: '暂无消息',
    startConversation: '开始对话',
    emptyChatState: '暂无消息，开始对话吧。',
    loadingMessages: '正在加载消息...',
    failedToLoadMessages: '加载消息失败',
    messageSent: '消息已发送',
    failedToSendMessage: '消息发送失败',
    newMessage: '新消息',
    today: '今天',
    yesterday: '昨天',
    consultant: '顾问',
    candidate: '候选人',
    assignedConsultant: '已分配顾问',
    noConsultantAssigned: '未分配顾问',
    conversation: '对话',
    online: '在线',
    offline: '离线',
    typing: '正在输入...',
    viewing: '查看',
    viewingConsultant: '与您的顾问的对话',
    noCandidateSelected: '未选择候选人。',
    openCandidateFromList: '从候选人列表中打开一位候选人以查看其实时聊天。',
  },
  French: {
    liveChat: 'Chat en direct',
    chat: 'Chat',
    send: 'Envoyer',
    typeMessage: 'Tapez un message...',
    writeMessageToConsultant: 'Écrivez un message à votre consultant...',
    noMessagesYet: 'Aucun message pour le moment',
    startConversation: 'Démarrez la conversation',
    emptyChatState: 'Aucun message pour le moment. Démarrez la conversation.',
    loadingMessages: 'Chargement des messages...',
    failedToLoadMessages: 'Échec du chargement des messages',
    messageSent: 'Message envoyé',
    failedToSendMessage: "Échec de l'envoi du message",
    newMessage: 'Nouveau message',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    consultant: 'Consultant',
    candidate: 'Candidat',
    assignedConsultant: 'Consultant assigné',
    noConsultantAssigned: 'Aucun consultant assigné',
    conversation: 'Conversation',
    online: 'En ligne',
    offline: 'Hors ligne',
    typing: "En train d'écrire...",
    viewing: 'Affichage',
    viewingConsultant: 'Conversation avec votre consultant',
    noCandidateSelected: 'Aucun candidat sélectionné.',
    openCandidateFromList: 'Ouvrez un candidat depuis la liste des candidats pour voir son chat en direct.',
  },
  Spanish: {
    liveChat: 'Chat en vivo',
    chat: 'Chat',
    send: 'Enviar',
    typeMessage: 'Escribe un mensaje...',
    writeMessageToConsultant: 'Escribe un mensaje a tu consultor...',
    noMessagesYet: 'Aún no hay mensajes',
    startConversation: 'Inicia la conversación',
    emptyChatState: 'Aún no hay mensajes. Inicia la conversación.',
    loadingMessages: 'Cargando mensajes...',
    failedToLoadMessages: 'No se pudieron cargar los mensajes',
    messageSent: 'Mensaje enviado',
    failedToSendMessage: 'No se pudo enviar el mensaje',
    newMessage: 'Nuevo mensaje',
    today: 'Hoy',
    yesterday: 'Ayer',
    consultant: 'Consultor',
    candidate: 'Candidato',
    assignedConsultant: 'Consultor asignado',
    noConsultantAssigned: 'Sin consultor asignado',
    conversation: 'Conversación',
    online: 'En línea',
    offline: 'Desconectado',
    typing: 'Escribiendo...',
    viewing: 'Viendo',
    viewingConsultant: 'Conversación con tu consultor',
    noCandidateSelected: 'Ningún candidato seleccionado.',
    openCandidateFromList: 'Abre un candidato desde la lista de candidatos para ver su chat en vivo.',
  },
  Portuguese: {
    liveChat: 'Chat em tempo real',
    chat: 'Chat',
    send: 'Enviar',
    typeMessage: 'Digite uma mensagem...',
    writeMessageToConsultant: 'Escreva uma mensagem para o seu consultor...',
    noMessagesYet: 'Ainda não há mensagens',
    startConversation: 'Inicie a conversa',
    emptyChatState: 'Ainda não há mensagens. Inicie a conversa.',
    loadingMessages: 'Carregando mensagens...',
    failedToLoadMessages: 'Falha ao carregar mensagens',
    messageSent: 'Mensagem enviada',
    failedToSendMessage: 'Falha ao enviar a mensagem',
    newMessage: 'Nova mensagem',
    today: 'Hoje',
    yesterday: 'Ontem',
    consultant: 'Consultor',
    candidate: 'Candidato',
    assignedConsultant: 'Consultor atribuído',
    noConsultantAssigned: 'Nenhum consultor atribuído',
    conversation: 'Conversa',
    online: 'Online',
    offline: 'Offline',
    typing: 'Digitando...',
    viewing: 'Visualizando',
    viewingConsultant: 'Conversa com o seu consultor',
    noCandidateSelected: 'Nenhum candidato selecionado.',
    openCandidateFromList: 'Abra um candidato na lista de candidatos para ver o chat em tempo real.',
  },
};

// Only true RTL scripts. Everything else (incl. Chinese, French,
// Spanish, Portuguese) stays LTR — they were previously rendered with
// no translations at all (silently falling back to English), which is
// the "mixed language" bug; full dictionaries above fix that.
const RTL_LANGUAGES = new Set(['Hebrew', 'Arabic']);
const LOCALE_BY_LANGUAGE = {
  Hebrew: 'he-IL', Arabic: 'ar', Spanish: 'es', Chinese: 'zh-CN', French: 'fr', Portuguese: 'pt-PT', English: 'en-US',
};

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
