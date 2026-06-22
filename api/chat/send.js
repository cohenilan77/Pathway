import { getUserIdByToken, getUserById, ROLES } from '../../lib/db.js';
import { canAccessCandidate } from '../../lib/admin.js';
import { appendMessage } from '../../lib/chat.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const userId = await getUserIdByToken(getToken(req));
  const user = userId ? await getUserById(userId) : null;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  const { candidateId, text } = req.body || {};
  if (!candidateId || !String(text || '').trim()) {
    res.status(400).json({ error: 'candidateId and text are required.' });
    return;
  }
  const role = user.role || ROLES.candidate;
  if (role === ROLES.candidate) {
    if (user.id !== candidateId) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
  } else {
    const candidate = await getUserById(candidateId);
    if (!canAccessCandidate({ ...user, role }, candidate)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
  }
  const message = await appendMessage(candidateId, { senderId: user.id, senderRole: role, text });
  res.status(200).json({ ok: true, message });
}
