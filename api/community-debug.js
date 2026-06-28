import { getActor } from '../lib/admin.js';
import { getAllUserIds, getUserById, ROLES } from '../lib/db.js';

export default async function handler(req, res) {
  try {
    const ids = await getAllUserIds();
    console.log('[DEBUG] Total IDs in database:', ids?.length);

    const candidates = [];
    for (const id of ids) {
      const user = await getUserById(id);
      if (user && user.role === ROLES.candidate) {
        candidates.push({
          id: user.id || user.uid,
          name: user.name,
          email: user.email,
          residency: user.residency,
          role: user.role,
        });
      }
    }

    res.status(200).json({
      totalIds: ids?.length || 0,
      candidateCount: candidates.length,
      candidates,
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
