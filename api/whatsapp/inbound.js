import { getUserById, setCandidatePhoneIndex, setCandidateBSUIDIndex } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/whatsapp/resolveCandidate.js';
import { sendViaWhatsApp } from '../../lib/whatsapp/outbound.js';
import { handleInbound } from '../../lib/whatsappAiAdvisor/service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { From, Body, ExternalUserId, MessageSid } = req.body || {};
  if (!From || !Body) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const phoneOrBsuid = ExternalUserId || From.replace('whatsapp:', '');
    let candidateId;
    try {
      candidateId = await resolveCandidate(phoneOrBsuid);
    } catch (error) {
      console.error(`Candidate resolution failed: ${error.message}`);
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = await getUserById(candidateId);
    const phone = From.replace('whatsapp:', '');
    const store = getStore();

    if (Body.trim().toUpperCase() === 'STOP') {
      const optedOut = {
        ...candidate,
        whatsappNumber: candidate.whatsappNumber || phone,
        whatsappOptOut: true,
        whatsappAiAdvisorSessionActive: false,
        whatsappAiAdvisorSessionPausedAt: Date.now(),
      };
      await handleInbound(optedOut, {
        text: Body,
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
    if (!indexedCandidate.whatsappNumber && phone) {
      await setCandidatePhoneIndex(candidateId, phone);
      indexedCandidate = { ...indexedCandidate, whatsappNumber: phone };
    }
    if (indexedCandidate !== candidate) {
      await store.set(`user:${candidateId}`, indexedCandidate);
    }

    const result = await handleInbound(indexedCandidate, {
      text: Body,
      sourceMessageId: MessageSid || null,
      from: phone,
    });
    return res.status(200).json({
      status: result.duplicate ? 'duplicate' : result.replied ? 'replied' : 'saved',
      reply: result.reply || null,
    });
  } catch (error) {
    console.error(`Inbound webhook error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}
