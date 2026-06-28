import { getUserById, getUserData, setUserData } from '../db.js';
import { sendViaWhatsApp } from './outbound.js';
import { canContinueWhatsAppAiAdvisor } from '../whatsappAiAdvisor/guard.js';

export async function postMessage(candidateId, sender, text, originChannel) {
  if (!candidateId) throw new Error('Candidate ID is required.');
  if (!sender) throw new Error('Sender is required.');
  if (!text || !String(text).trim()) throw new Error('Message text is required.');

  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  const data = (await getUserData(candidateId)) || {};
  const message = {
    role: sender === 'candidate' ? 'user' : sender,
    channel: originChannel === 'portal' ? 'web' : originChannel,
    text: String(text).trim(),
    timestamp: Date.now(),
    sourceMessageId: null,
  };
  await setUserData(candidateId, {
    ...data,
    chat: [...(Array.isArray(data.chat) ? data.chat : []), message],
  });

  if (sender === 'ai' && canContinueWhatsAppAiAdvisor(candidate)) {
    const sent = await sendViaWhatsApp(candidate.whatsappNumber, message.text);
    if (!sent?.success) throw new Error(sent?.error || 'Could not send WhatsApp message.');
    return { ...message, sourceMessageId: sent.sid || null };
  }
  return message;
}
