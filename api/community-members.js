import { getUserIdByToken, getAllUserIds, getUserById, ROLES } from '../lib/db.js';

function toInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return first && last ? `${first.toUpperCase()}. ${last.toUpperCase()}.` : '?. ?.';
}

export default async function handler(req, res) {
  const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  if (!match) return res.status(401).json({ error: 'Unauthorized' });

  const requestingUserId = await getUserIdByToken(match[1]);
  if (!requestingUserId) return res.status(401).json({ error: 'Invalid session' });

  try {
    const ids = await getAllUserIds();
    const members = [];

    for (const id of ids) {
      const user = await getUserById(id);
      if (!user || user.role !== ROLES.candidate) continue;

      members.push({
        id: user.uid || user.id,
        display: `${toInitials(user.name)} · ${user.residency || 'Unknown'}`,
        residency: user.residency || 'Unknown',
      });
    }

    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
