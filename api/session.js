import { getUserIdByToken, getUserData, setUserData, getUserById, publicUser } from '../lib/db.js';

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
    const data = await getUserData(userId);
    res.status(200).json({ user: publicUser(user), data });
    return;
  }

  if (req.method === 'POST') {
    const { data } = req.body || {};
    await setUserData(userId, data || {});
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
