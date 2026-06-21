import { getUserById, getUserIdByToken, ROLES, SUPER_ADMIN_EMAIL } from './db.js';
import { normalizeEmail } from './auth.js';

export function checkAdminSecret(req) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  const provided = req.headers['x-admin-secret'];
  return provided && provided === expected;
}

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export function isSuperAdmin(user) {
  return normalizeEmail(user?.email) === SUPER_ADMIN_EMAIL || !!user?.isSuperAdmin;
}

export async function getActor(req) {
  if (checkAdminSecret(req)) {
    return { id: 'legacy-admin', role: ROLES.admin, isLegacyAdmin: true, isSuperAdmin: false };
  }
  const userId = await getUserIdByToken(getToken(req));
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user || user.suspended) return null;
  const role = user.role || ROLES.candidate;
  if (![ROLES.consultant, ROLES.admin].includes(role)) return null;
  return { ...user, role, isSuperAdmin: isSuperAdmin(user) };
}

export function canManageUsers(actor) {
  return actor?.role === ROLES.admin;
}

export function canAccessCandidate(actor, candidate) {
  if (!actor || !candidate) return false;
  if (actor.role === ROLES.admin) return true;
  if (actor.role === ROLES.consultant) return candidate.role === ROLES.candidate && candidate.consultantId === actor.id;
  return false;
}
