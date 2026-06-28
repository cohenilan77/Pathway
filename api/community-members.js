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
    const actorData = await getUserData(actor.uid);
    const actorCategory = actorData?.profile?.category || '';
    const actorGrade = actorData?.profile?.grade || '';

    console.log(`[Community] User ${actor.uid} - Category: ${actorCategory}, Grade: ${actorGrade}`);

    // Get all candidates
    const ids = await getAllUserIds();
    console.log(`[Community] Total user IDs: ${ids.length}`);

    const members = await Promise.all(
      ids.map(async (id) => {
        if (id === actor.uid) return null;

        const user = await getUserById(id);
        if (!user || user.role !== ROLES.candidate) return null;

        const data = await getUserData(id);
        const category = data?.profile?.category || '';
        const grade = data?.profile?.grade || '';
        const programs = data?.programs || [];

        // Log filtering decisions
        if (category !== actorCategory) {
          console.log(`[Community] ${id} excluded: category ${category} != ${actorCategory}`);
          return null;
        }
        if (actorCategory === 'Undergraduate' && grade !== actorGrade) {
          console.log(`[Community] ${id} excluded: grade ${grade} != ${actorGrade}`);
          return null;
        }

        console.log(`[Community] ${id} included - ${user.email}`);

        // Extract name from email for display
        const name = user.displayName || user.email?.split('@')[0] || 'Member';
        const email = user.email || '';
        const [namePart] = email.split('@');
        const first = namePart?.split('.')?.[0] || '';
        const last = namePart?.split('.')?.[1] || '';

        return {
          id: user.uid,
          name: `${first} ${last}`.trim() || name,
          residency: data?.profile?.country || 'Unknown',
          programs: programs,
          category: category,
          grade: grade,
        };
      })
    );

    const filtered = members.filter(Boolean);
    console.log(`[Community] Returning ${filtered.length} members to ${actor.uid}`);
    res.status(200).json({ members: filtered });
  } catch (error) {
    console.error('Error fetching community members:', error);
    res.status(500).json({ error: error.message });
  }
}
