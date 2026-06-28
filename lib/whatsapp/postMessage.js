import { getUserById, postWhatsAppMessage, getLastInboundFromCandidate } from '../db.js';
import { sendViaWhatsApp, sendTemplateViaWhatsApp } from './outbound.js';

const ACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WHATSAPP_24H_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function postMessage(candidateId, sender, text, originChannel) {
  console.log(`[postMessage] START: candidateId=${candidateId}, sender=${sender}, channel=${originChannel}`);

  if (!candidateId) throw new Error('Candidate ID is required.');
  if (!sender) throw new Error('Sender is required.');
  if (!text || !String(text).trim()) throw new Error('Message text is required.');

  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  console.log(`[postMessage] Candidate found: ${candidate.name}, WhatsApp: ${candidate.whatsappNumber ? 'YES' : 'NO'}, OptIn: ${candidate.whatsappOptIn}, OptOut: ${candidate.whatsappOptOut}`);

  // --- WRITE TO STORE (canonical) ---
  const message = await postWhatsAppMessage(candidateId, sender, text, originChannel);

  // --- DECIDE WHERE TO DELIVER ---

  // If originated from non-portal, mirror to portal (Stream Chat)
  if (originChannel !== 'portal') {
    try {
      await mirrorToPortal(candidateId, message);
    } catch (err) {
      console.error(`Failed to mirror to portal for ${candidateId}:`, err.message);
    }
  }

  // --- CHECK IF CANDIDATE IS LOGGED IN ---
  const now = new Date().getTime();
  const lastActiveAt = candidate.lastActiveAt || 0;
  const isLoggedIn = (now - lastActiveAt) < ACTIVITY_TIMEOUT_MS;
  console.log(`[postMessage] Activity check: lastActiveAt=${lastActiveAt}, now=${now}, diff=${now - lastActiveAt}ms, timeout=${ACTIVITY_TIMEOUT_MS}ms, isLoggedIn=${isLoggedIn}`);

  // --- SEND TO WHATSAPP IF NOT LOGGED IN ---
  if (!isLoggedIn && candidate.whatsappNumber &&
      candidate.whatsappOptIn && !candidate.whatsappOptOut) {

    console.log(`[postMessage] SENDING TO WHATSAPP: ${candidate.whatsappNumber}`);
    const lastInbound = await getLastInboundFromCandidate(candidateId);
    const isIn24h = lastInbound && (now - lastInbound) < WHATSAPP_24H_WINDOW_MS;
    console.log(`[postMessage] 24h window check: lastInbound=${lastInbound}, isIn24h=${isIn24h}`);

    if (sender !== 'ai' && !isIn24h) {
      // Outside 24h window: use template
      console.log(`[postMessage] Using template (outside 24h)`);
      try {
        const result = await sendTemplateViaWhatsApp(
          candidate.whatsappNumber,
          'HT' + sender,
          { text, name: candidate.name }
        );
        if (!result.success) {
          console.warn(`Template send failed for ${candidateId}, falling back to free-form`);
          await sendViaWhatsApp(candidate.whatsappNumber, text);
        }
      } catch (err) {
        console.error(`Error sending template to ${candidateId}:`, err.message);
        await sendViaWhatsApp(candidate.whatsappNumber, text);
      }
    } else {
      // Inside 24h window or AI: free-form
      console.log(`[postMessage] Sending free-form message (inside 24h or AI)`);
      try {
        await sendViaWhatsApp(candidate.whatsappNumber, text);
      } catch (err) {
        console.error(`Error sending WhatsApp to ${candidateId}:`, err.message);
      }
    }
  } else {
    console.log(`[postMessage] SKIPPING WHATSAPP: isLoggedIn=${isLoggedIn}, hasPhone=${!!candidate.whatsappNumber}, optIn=${candidate.whatsappOptIn}, optOut=${candidate.whatsappOptOut}`);
  }

  console.log(`[postMessage] END: candidateId=${candidateId}`);
  return message;
}

async function mirrorToPortal(candidateId, message) {
  // TODO: Integrate with Stream Chat channel
  // For now, this is a placeholder for future integration
  // await streamClient.channel('messaging', `advisor-${candidateId}`)
  //   .sendMessage({
  //     text: message.text,
  //     user_id: message.sender === 'ai' ? 'advisor-bot' : message.sender,
  //     metadata: { origin: message.originChannel }
  //   });
}
