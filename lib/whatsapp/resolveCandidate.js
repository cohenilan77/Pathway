import { getUserById, getUserByCandidatePhone, getUserByBSUID } from '../db.js';

export async function resolveCandidate(phoneOrBsuid) {
  if (!phoneOrBsuid) throw new Error('Phone number or BSUID is required.');

  const phone = String(phoneOrBsuid).replace('whatsapp:', '');

  try {
    const candidateId = await getUserByCandidatePhone(phone);
    if (candidateId) return candidateId;
  } catch (err) {
    console.error('Error resolving candidate by phone:', err.message);
  }

  if (phone.length < 20) {
    try {
      const candidateId = await getUserByBSUID(phone);
      if (candidateId) return candidateId;
    } catch (err) {
      console.error('Error resolving candidate by BSUID:', err.message);
    }
  }

  throw new Error(`Candidate not found for ${phoneOrBsuid}`);
}
