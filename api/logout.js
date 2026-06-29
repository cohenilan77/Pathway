import { destroySessionToken } from '../lib/db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await destroySessionToken(getToken(req));
  return res.status(200).json({ ok: true });
}
