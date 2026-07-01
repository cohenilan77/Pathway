import { destroySessionToken, getUserIdByToken, markCandidateLoggedOut, getUserById } from '../lib/db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getToken(req);

  // Track logout for Telegram routing
  if (token) {
    try {
      const userId = await getUserIdByToken(token);
      if (userId) {
        const user = await getUserById(userId);
        if (user && user.role === 'candidate') {
          await markCandidateLoggedOut(userId);
        }
      }
    } catch (err) {
      console.error('Error tracking logout:', err.message);
      // Continue with logout even if tracking fails
    }
  }

  await destroySessionToken(token);
  return res.status(200).json({ ok: true });
}
