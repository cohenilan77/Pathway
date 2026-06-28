import { getAllUserIds, getUserById, ROLES } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get all candidates - just return user info, no filtering
    const ids = await getAllUserIds();
    console.log('[community-members] Total IDs:', ids?.length || 0);

    const members = await Promise.all(
      ids.map(async (id) => {

        const user = await getUserById(id);
        if (!user) {
          console.log('[community-members] User not found:', id);
          return null;
        }

        if (user.role !== ROLES.candidate) {
          console.log('[community-members] Not a candidate:', id, user.role);
          return null;
        }

        // Extract name from email
        const email = user.email || '';
        const [namePart] = email.split('@');
        const first = namePart?.split('.')?.[0] || '';
        const last = namePart?.split('.')?.[1] || '';

        const member = {
          id: user.uid,
          name: `${first} ${last}`.trim() || user.name || 'Member',
          residency: user.residency || 'Unknown',
          programs: [],
          category: '',
          grade: '',
        };

        console.log('[community-members] Including member:', member.name);
        return member;
      })
    );

    const filtered = members.filter(Boolean);
    console.log('[community-members] Returning', filtered.length, 'members');
    res.status(200).json({ members: filtered });
  } catch (error) {
    console.error('[community-members] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
