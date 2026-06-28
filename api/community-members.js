import { getAllUserIds, getUserById, ROLES } from '../lib/db.js';

export default async function handler(req, res) {
  try {
    const ids = await getAllUserIds();
    const members = [];

    for (const id of ids) {
      const user = await getUserById(id);
      if (!user || user.role !== ROLES.candidate) continue;

      members.push({
        id: user.uid || user.id,
        name: user.name || 'Member',
        email: user.email || '',
        residency: user.residency || 'Unknown',
      });
    }

    res.json({ members });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
