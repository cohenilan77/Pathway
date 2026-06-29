import { getUserById, setCandidatePhoneIndex, setCandidateBSUIDIndex } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/whatsapp/resolveCandidate.js';
import { sendViaWhatsApp } from '../../lib/whatsapp/outbound.js';
import { handleInbound } from '../../lib/whatsappAiAdvisor/service.js';
import { normalizeWhatsAppNumber } from '../../lib/whatsapp/phone.js';
import {
  handleHumanChatInbound,
  shouldHandleHumanChatInbound,
} from '../../lib/whatsapp/humanChat.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { From, Body, ButtonText, ButtonPayload, ExternalUserId, MessageSid } = req.body || {};
  const inboundText = String(Body || ButtonText || ButtonPayload || '').trim();
  if (!From || !inboundText) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const phone = normalizeWhatsAppNumber(From);
    let candidateId;
    try {
      candidateId = await resolveCandidate(ExternalUserId || phone);
    } catch (error) {
      if (ExternalUserId) {
        try {
          candidateId = await resolveCandidate(phone);
        } catch {
          console.error(`Candidate resolution failed: ${error.message}`);
          return res.status(404).json({ error: 'Candidate not found' });
        }
      } else {
        console.error(`Candidate resolution failed: ${error.message}`);
        return res.status(404).json({ error: 'Candidate not found' });
      }
    }

    const candidate = await getUserById(candidateId);
    const store = getStore();

    if (inboundText.toUpperCase() === 'STOP') {
      const optedOut = {
        ...candidate,
        whatsappNumber: candidate.whatsappNumber || phone,
        whatsappOptOut: true,
        whatsappAiAdvisorSessionActive: false,
        whatsappAiAdvisorSessionPausedAt: Date.now(),
      };
      await handleInbound(optedOut, {
        text: inboundText,
        sourceMessageId: MessageSid || null,
        from: phone,
      });
      await sendViaWhatsApp(phone, 'You have been unsubscribed from Pathway messages.');
      return res.status(200).json({ status: 'opted_out' });
    }

    let indexedCandidate = candidate;
    if (ExternalUserId && !indexedCandidate.bsuid) {
      await setCandidateBSUIDIndex(candidateId, ExternalUserId);
      indexedCandidate = { ...indexedCandidate, bsuid: ExternalUserId };
    }
    if (phone) {
      await setCandidatePhoneIndex(candidateId, phone);
      if (!indexedCandidate.whatsappNumber) indexedCandidate = { ...indexedCandidate, whatsappNumber: phone };
    }
    if (indexedCandidate !== candidate) {
      await store.set(`user:${candidateId}`, indexedCandidate);
    }

    const inboundMessage = {
      text: inboundText,
      sourceMessageId: MessageSid || null,
      from: phone,
    };
    const result = shouldHandleHumanChatInbound(indexedCandidate)
      ? await handleHumanChatInbound(indexedCandidate, inboundMessage)
      : await handleInbound(indexedCandidate, inboundMessage);
    return res.status(200).json({
      status: result.duplicate ? 'duplicate' : result.replied ? 'replied' : 'saved',
      reply: result.reply || null,
    });
  } catch (error) {
    console.error(`Inbound webhook error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}
