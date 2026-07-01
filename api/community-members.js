import { getUserIdByToken, getAllUserIds, getUserById, ROLES } from '../lib/db.js';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0].toUpperCase();
  const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
  return `${first}${last}`;
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
      if (String(id) === String(requestingUserId)) continue;
      const user = await getUserById(id);
      if (!user || user.role !== ROLES.candidate) continue;

      const memberId = user.uid || user.id || id;
      if (String(memberId) === String(requestingUserId)) continue;

      members.push({
        id: memberId,
        initials: getInitials(user.name),
        residency: user.residency || '',
      });
    }

    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
