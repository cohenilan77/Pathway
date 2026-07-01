export function isCandidateChatMessageVisible(message, channels = {}) {
  if (!message || message.role === 'system' || message.channel === 'system') return false;
  if (message.channel === 'whatsapp' && channels.whatsapp !== true) return false;
  if (message.channel === 'telegram' && channels.telegram !== true) return false;
  return message.role === 'user' || message.role === 'ai';
}

export function visibleCandidateChat(messages, channels = {}) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => isCandidateChatMessageVisible(message, channels));
}
