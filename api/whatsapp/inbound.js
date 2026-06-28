import { getUserById, postWhatsAppMessage, setCandidatePhoneIndex, setCandidateBSUIDIndex } from '../../lib/db.js';
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
      await getUserById(candidateId);
      // Update opt-out flag
      const store = require('../../lib/store.js').getStore();
      const updated = { ...candidate, whatsappOptOut: true };
      await store.set(`user:${candidateId}`, updated);

      await sendViaWhatsApp(phone, 'You have been unsubscribed from Pathway messages.');
      return res.status(200).json({ status: 'opted_out' });
    }

    // --- LOG INBOUND MESSAGE ---
    await postWhatsAppMessage(candidateId, 'candidate', Body, 'whatsapp');

    // --- UPDATE BSUID IF NEW ---
    if (ExternalUserId && !candidate.bsuid) {
      await setCandidateBSUIDIndex(candidateId, ExternalUserId);
      const store = require('../../lib/store.js').getStore();
      const updated = { ...candidate, bsuid: ExternalUserId };
      await store.set(`user:${candidateId}`, updated);
    }

    // --- ENSURE PHONE INDEX ---
    if (!candidate.whatsappNumber && phone) {
      await setCandidatePhoneIndex(candidateId, phone);
      const store = require('../../lib/store.js').getStore();
      const updated = { ...candidate, whatsappNumber: phone };
      await store.set(`user:${candidateId}`, updated);
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
