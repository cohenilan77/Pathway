import { checkAdminSecret } from '../lib/admin.js';
import { setUserSuspended, deleteUser } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!checkAdminSecret(req)) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const { userId, action } = req.body || {};
  if (!userId || !action) {
    res.status(400).json({ error: 'userId and action are required.' });
    return;
  }
  try {
    if (action === 'suspend') {
      await setUserSuspended(userId, true);
    } else if (action === 'unsuspend') {
      await setUserSuspended(userId, false);
    } else if (action === 'delete') {
      await deleteUser(userId);
    } else {
      res.status(400).json({ error: 'Unknown action.' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Action failed.' });
  }
}
