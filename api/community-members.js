import { getActor } from '../lib/admin.js';
import { getAllUserIds, getUserById, getUserData, publicUser, ROLES } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const actor = await getActor(req);
  if (!actor || actor.role !== ROLES.candidate) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Get all candidates and return them - no filtering
    const ids = await getAllUserIds();

    const members = await Promise.all(
      ids.map(async (id) => {
        if (id === actor.uid) return null; // Exclude self only

        const user = await getUserById(id);
        if (!user || user.role !== ROLES.candidate) return null;

        const data = await getUserData(id);

        // Extract name from email for display
        const email = user.email || '';
        const [namePart] = email.split('@');
        const first = namePart?.split('.')?.[0] || '';
        const last = namePart?.split('.')?.[1] || '';

        return {
          id: user.uid,
          name: `${first} ${last}`.trim() || user.displayName || 'Member',
          residency: data?.profile?.country || 'Unknown',
          programs: data?.programs || [],
          category: data?.profile?.category || '',
          grade: data?.profile?.grade || '',
        };
      })
    );

    const filtered = members.filter(Boolean);
    res.status(200).json({ members: filtered });
  } catch (error) {
    console.error('Error fetching community members:', error);
    res.status(500).json({ error: error.message });
  }
}
