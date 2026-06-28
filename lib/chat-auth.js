import { canAccessCandidate, getActor } from './admin.js';
import { getUserById, getUserIdByToken, ROLES } from './db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export async function getChatActor(req) {
  // Supports authenticated consultants/admins and the existing X-Admin-Secret flow.
  const privilegedActor = await getActor(req);
  if (privilegedActor) return privilegedActor;

  // Candidates are intentionally not returned by getActor, so resolve their session here.
  const userId = await getUserIdByToken(getToken(req));
  const user = userId ? await getUserById(userId) : null;
  if (!user || user.suspended) return null;
  return { ...user, role: user.role || ROLES.candidate };
}

export async function authorizeCandidateChat(req, candidateId) {
  const actor = await getChatActor(req);
  if (!actor) return { status: 401, error: 'Not authenticated.' };

  const candidate = await getUserById(candidateId);
  if (!candidate || (candidate.role || ROLES.candidate) !== ROLES.candidate) {
    return { status: 404, error: 'Candidate not found.' };
  }

  if (actor.role === ROLES.candidate) {
    if (actor.id !== candidateId) return { status: 403, error: 'Forbidden.' };
  } else if (!canAccessCandidate(actor, candidate)) {
    return { status: 403, error: 'Forbidden.' };
  }

  return { actor, candidate };
}
