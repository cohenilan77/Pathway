import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { canAccessCandidate, getActor } from '../../../../lib/admin.js';
import {
  getUserById,
  publicUser,
  setCandidatePhoneIndex,
  updateUserDetails,
} from '../../../../lib/db.js';
import { pause, start } from '../../../../lib/whatsappAiAdvisor/service.js';

function candidateIdFromRequest(req) {
  if (req.body?.candidateId) return req.body.candidateId;
  const pathname = new URL(req.url, 'http://pathway.local').pathname;
  const match = pathname.match(/\/api\/admin\/candidates\/([^/]+)\/whatsapp-ai-advisor-toggle\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function normalizeWhatsAppNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Enter the candidate WhatsApp number.');
  if (!raw.startsWith('+') || !isValidPhoneNumber(raw)) {
    throw new Error('Enter a valid WhatsApp number with country code, for example +972501234567.');
  }
  return parsePhoneNumber(raw).number;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });

  const candidateId = candidateIdFromRequest(req);
  const candidate = candidateId ? await getUserById(candidateId) : null;
  if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
  if (!canAccessCandidate(actor, candidate)) return res.status(403).json({ error: 'Forbidden.' });
  if (typeof req.body?.active !== 'boolean') return res.status(400).json({ error: 'active must be true or false.' });

  try {
    if (req.body.active) {
      const whatsappNumber = normalizeWhatsAppNumber(
        req.body.whatsappNumber || candidate.whatsappNumber || candidate.phone
      );
      const consentConfirmed = candidate.whatsappOptIn === true || req.body.whatsappOptIn === true;
      if (!consentConfirmed) {
        throw new Error('Confirm that the candidate agreed to receive WhatsApp messages.');
      }

      await updateUserDetails(candidateId, {
        whatsappNumber,
        whatsappOptIn: true,
        whatsappOptInTimestamp: candidate.whatsappOptInTimestamp || Date.now(),
      });
      await setCandidatePhoneIndex(candidateId, whatsappNumber);
    }

    const updated = req.body.active
      ? await start(candidateId, actor)
      : await pause(candidateId, actor);
    return res.status(200).json({
      ok: true,
      candidate: publicUser(updated),
      message: req.body.active
        ? 'Kickoff sent. AI Advisor will begin once the candidate replies.'
        : 'AI Advisor paused for this candidate.',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Could not update WhatsApp AI Advisor.' });
  }
}
