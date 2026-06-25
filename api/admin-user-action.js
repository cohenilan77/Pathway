import { canManageUsers, getActor } from '../lib/admin.js';
import { createManagedUser, deleteUser, publicUser, resetUserPassword, setUserSuspended, updateManagedUser } from '../lib/db.js';
import { safeError } from '../lib/api-error.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const actor = await getActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  if (!canManageUsers(actor)) {
    res.status(403).json({ error: 'Only admins can manage users.' });
    return;
  }
  const { userId, action, user, patch, password } = req.body || {};
  if (!action) {
    res.status(400).json({ error: 'action is required.' });
    return;
  }
  try {
    if (action === 'create') {
      const created = await createManagedUser(user || {});
      res.status(200).json({ ok: true, user: publicUser(created) });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }
    if (action === 'suspend') {
      await setUserSuspended(userId, true);
    } else if (action === 'unsuspend') {
      await setUserSuspended(userId, false);
    } else if (action === 'delete') {
      await deleteUser(userId);
    } else if (action === 'update' || action === 'assign') {
      await updateManagedUser(userId, patch || {});
    } else if (action === 'resetPassword') {
      await resetUserPassword(userId, password);
    } else {
      res.status(400).json({ error: 'Unknown action.' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err, 'Action failed.') });
  }
}
