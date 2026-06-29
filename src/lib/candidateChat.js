export function isCandidateChatMessageVisible(message, whatsappEnabled = false) {
  if (!message || message.role === 'system' || message.channel === 'system') return false;
  if (message.channel === 'whatsapp' && whatsappEnabled !== true) return false;
  return message.role === 'user' || message.role === 'ai';
}

export function visibleCandidateChat(messages, whatsappEnabled = false) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => isCandidateChatMessageVisible(message, whatsappEnabled));
}
