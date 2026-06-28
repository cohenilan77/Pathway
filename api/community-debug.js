import { getActor } from '../lib/admin.js';
import { getAllUserIds, getUserById, ROLES } from '../lib/db.js';

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor || actor.role !== ROLES.candidate) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const ids = await getAllUserIds();
    console.log('[DEBUG] Total IDs in database:', ids?.length);

    const candidates = [];
    for (const id of ids) {
      const user = await getUserById(id);
      if (user && user.role === ROLES.candidate && id !== actor.uid) {
        candidates.push({
          id: user.id || user.uid,
          name: user.name,
          email: user.email,
          residency: user.residency,
        });
      }
    }

    res.status(200).json({
      totalIds: ids?.length || 0,
      candidateCount: candidates.length,
      currentUserId: actor.uid,
      candidates,
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
