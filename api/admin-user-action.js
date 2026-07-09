import { canAccessCandidate, canManageUsers, getActor } from '../lib/admin.js';
import { createManagedUser, deleteUser, getUserById, getUserData, publicUser, resetUserPassword, setUserData, setUserSuspended, updateManagedUser } from '../lib/db.js';

const AI_INSTRUCTION_MAX_LENGTH = 500;

// Consultant-facing per-candidate steer for the Undergraduate smart agent
// (lib/agents/UndergradAgent.js reads it as candidateState.profile.
// consultantNotes.aiInstruction). Lives outside the admin-only actions below
// since both admins and the candidate's assigned consultant may set it —
// same access rule api/admin-candidate-logs.js already uses.
async function setAiInstruction(req, res, actor) {
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: 'userId is required.' });
    return;
  }
  const candidate = await getUserById(userId);
  if (!candidate) {
    res.status(404).json({ error: 'Candidate not found.' });
    return;
  }
  if (!canAccessCandidate(actor, candidate)) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }
  const aiInstruction = String(req.body?.aiInstruction ?? '').trim().slice(0, AI_INSTRUCTION_MAX_LENGTH);
  const data = (await getUserData(userId)) || {};
  const profile = { ...(data.profile || {}), consultantNotes: { ...(data.profile?.consultantNotes || {}), aiInstruction } };
  await setUserData(userId, { ...data, profile, updatedAt: Date.now() });
  res.status(200).json({ ok: true, aiInstruction });
}

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
  const { userId, action, user, patch, password } = req.body || {};
  if (!action) {
    res.status(400).json({ error: 'action is required.' });
    return;
  }
  if (action === 'set_ai_instruction') {
    await setAiInstruction(req, res, actor);
    return;
  }
  if (!canManageUsers(actor)) {
    res.status(403).json({ error: 'Only admins can manage users.' });
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
    res.status(400).json({ error: err.message || 'Action failed.' });
  }
}
