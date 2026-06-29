import {
  getAllUserIds,
  getUserById,
  getUserByCandidatePhone,
  getUserByBSUID,
  ROLES,
  setCandidatePhoneIndex,
} from '../db.js';
import { candidateMatchesWhatsAppNumber, normalizeWhatsAppNumber } from './phone.js';

export async function resolveCandidate(phoneOrBsuid) {
  if (!phoneOrBsuid) throw new Error('Phone number or BSUID is required.');

  const raw = String(phoneOrBsuid).trim();
  const looksLikePhone = /^whatsapp:/i.test(raw) || /^\+?[()\d\s.-]{7,}$/.test(raw);
  const phone = looksLikePhone ? normalizeWhatsAppNumber(raw) : '';

  if (phone) {
    try {
      const candidateId = await getUserByCandidatePhone(phone);
      if (candidateId) return candidateId;
    } catch (err) {
      console.error('Error resolving candidate by phone:', err.message);
    }
  }

  if (raw.length < 40) {
    try {
      const candidateId = await getUserByBSUID(raw.replace(/^whatsapp:/i, ''));
      if (candidateId) return candidateId;
    } catch (err) {
      console.error('Error resolving candidate by BSUID:', err.message);
    }
  }

  // Existing candidates may predate the WhatsApp phone index. Repair the index
  // on the first inbound message so a successful outbound kickoff can always be
  // followed by an inbound START/reply.
  if (phone) {
    const userIds = await getAllUserIds();
    for (const userId of userIds || []) {
      const candidate = await getUserById(userId);
      if (!candidate || (candidate.role || ROLES.candidate) !== ROLES.candidate) continue;
      if (!candidateMatchesWhatsAppNumber(candidate, phone)) continue;
      await setCandidatePhoneIndex(userId, phone);
      return userId;
    }
  }

  throw new Error(`Candidate not found for ${phoneOrBsuid}`);
}
