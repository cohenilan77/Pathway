import { getUserById, postWhatsAppMessage, setCandidatePhoneIndex, setCandidateBSUIDIndex } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/whatsapp/resolveCandidate.js';
import { advisorTurn } from '../../lib/whatsapp/advisorTurn.js';
import { sendViaWhatsApp } from '../../lib/whatsapp/outbound.js';
import { postMessage } from '../../lib/whatsapp/postMessage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { From, To, Body, ExternalUserId } = req.body;

  try {
    if (!From || !Body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- RESOLVE CANDIDATE ---
    const phoneOrBsuid = ExternalUserId || From.replace('whatsapp:', '');
    let candidateId;

    try {
      candidateId = await resolveCandidate(phoneOrBsuid);
    } catch (err) {
      console.error(`Candidate resolution failed: ${err.message}`);
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = await getUserById(candidateId);
    const phone = From.replace('whatsapp:', '');

    // --- HANDLE OPT-OUT (STOP) ---
    if (Body.trim().toUpperCase() === 'STOP') {
      const store = getStore();
      const updated = { ...candidate, whatsappOptOut: true };
      await store.set(`user:${candidateId}`, updated);
      await sendViaWhatsApp(phone, 'You have been unsubscribed from Pathway messages.');
      return res.status(200).json({ status: 'opted_out' });
    }

    // --- LOG INBOUND MESSAGE ---
    await postWhatsAppMessage(candidateId, 'candidate', Body, 'whatsapp');

    // --- UPDATE BSUID IF NEW ---
    if (ExternalUserId && !candidate.bsuid) {
      const store = getStore();
      await setCandidateBSUIDIndex(candidateId, ExternalUserId);
      await store.set(`user:${candidateId}`, { ...candidate, bsuid: ExternalUserId });
    }

    // --- ENSURE PHONE INDEX ---
    if (!candidate.whatsappNumber && phone) {
      const store = getStore();
      await setCandidatePhoneIndex(candidateId, phone);
      await store.set(`user:${candidateId}`, { ...candidate, whatsappNumber: phone });
    }

    // --- GET AI REPLY ---
    let reply;
    try {
      const result = await advisorTurn(candidateId, Body);
      reply = result.reply;
    } catch (err) {
      console.error(`AI advisor error: ${err.message}`);
      reply = 'Thanks for your message! Our team will get back to you soon.';
    }

    // --- SEND REPLY ---
    await sendViaWhatsApp(phone, reply);

    // --- LOG AI REPLY ---
    await postMessage(candidateId, 'ai', reply, 'whatsapp');

    return res.status(200).json({ status: 'success', reply });
  } catch (err) {
    console.error(`Inbound webhook error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
