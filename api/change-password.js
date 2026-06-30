import { changeUserPassword, getUserIdByToken } from '../lib/db.js';
import { safeError } from '../lib/api-error.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const userId = await getUserIdByToken(getToken(req));
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { currentPassword, newPassword } = req.body || {};
  try {
    await changeUserPassword(userId, currentPassword, newPassword);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err, 'Could not change password.') });
  }
}
