import { getUserIdByToken, getUserData, setUserData, getUserById, publicUser, touchActivity } from '../lib/db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  const token = getToken(req);
  const userId = await getUserIdByToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  if (req.method === 'GET') {
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'This account has been suspended.' });
      return;
    }
    const data = await getUserData(userId);
    await touchActivity(userId);
    res.status(200).json({ user: publicUser(user), data });
    return;
  }

  if (req.method === 'POST') {
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'This account has been suspended.' });
      return;
    }
    const { data } = req.body || {};
    await setUserData(userId, data || {});
    await touchActivity(userId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
