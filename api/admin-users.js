import { canAccessCandidate, getActor } from '../lib/admin.js';
import { ensureSuperAdminAccount, getAllUserIds, getUserById, getUserData, publicUser, ROLES } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const actor = await getActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  if (actor.role === ROLES.admin) await ensureSuperAdminAccount();
  const ids = await getAllUserIds();
  const users = await Promise.all(
    ids.map(async (id) => {
      const user = await getUserById(id);
      if (!user) return null;
      if (actor.role === ROLES.consultant && !canAccessCandidate(actor, user)) return null;
      const data = await getUserData(id);
      return {
        ...publicUser(user),
        chatLength: Array.isArray(data?.chat) ? data.chat.length : 0,
        sessionActive: Array.isArray(data?.chat) && data.chat.length > 1,
        stepIdx: data?.stepIdx || 0,
        scores: data?.scores || null,
        degree: data?.profile?.degree || null,
        category: data?.profile?.category || null,
        topInsight: data?.strengths?.[0] || null,
        suspended: !!user.suspended,
        lastLoginAt: user.lastLoginAt || null,
        lastActiveAt: user.lastActiveAt || null,
        loginCount: user.loginCount || 0,
        loginHistory: user.loginHistory || [],
        sessionDurationMs: (user.lastLoginAt && user.lastActiveAt)
          ? Math.max(0, user.lastActiveAt - user.lastLoginAt)
          : null,
      };
    })
  );
  res.status(200).json({ actor: publicUser(actor), users: users.filter(Boolean) });
}
