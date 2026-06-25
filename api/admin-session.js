import { canAccessCandidate, getActor } from '../lib/admin.js';
import { getUserById, getUserData, setUserData, publicUser } from '../lib/db.js';
import { normalizeProgramList } from '../lib/program-normalizer.js';

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  if (req.method === 'GET') {
    const userId = new URL(req.url, 'http://x').searchParams.get('userId');
    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (!canAccessCandidate(actor, user)) {
      res.status(403).json({ error: 'You do not have access to this candidate.' });
      return;
    }
    const data = await getUserData(userId);
    if (data?.programs) data.programs = normalizeProgramList(data.programs);
    res.status(200).json({ user: publicUser(user), data });
    return;
  }

  if (req.method === 'POST') {
    const { userId, patch } = req.body || {};
    if (!userId || !patch) {
      res.status(400).json({ error: 'userId and patch are required.' });
      return;
    }
    const user = await getUserById(userId);
    if (!canAccessCandidate(actor, user)) {
      res.status(403).json({ error: 'You do not have access to this candidate.' });
      return;
    }
    const existing = (await getUserData(userId)) || {};
    const updated = { ...existing, ...patch };
    if (updated?.programs) updated.programs = normalizeProgramList(updated.programs);
    await setUserData(userId, updated);
    res.status(200).json({ ok: true, data: updated });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
