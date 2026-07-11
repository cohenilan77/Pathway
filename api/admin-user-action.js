import { canAccessCandidate, canManageUsers, getActor } from '../lib/admin.js';
import { createManagedUser, deleteUser, getUserById, getUserData, publicUser, resetUserPassword, setUserData, setUserSuspended, updateManagedUser, ROLES } from '../lib/db.js';
import { NARRATIVE_TEXT_MIN, NARRATIVE_TEXT_MAX } from '../lib/agents/tools/narrative-coach-tools.js';

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

// Candidate self-edit of the Narrative Coaching v2 sharpened pitch
// (candidateState.narrativeText). Candidates may edit their own; a
// consultant/admin may edit an assigned candidate's via the same
// canAccessCandidate rule set_ai_instruction above already uses.
async function saveNarrativeEdit(req, res, actor) {
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
  const isSelf = actor.id === userId && actor.role === ROLES.candidate;
  if (!isSelf && !canAccessCandidate(actor, candidate)) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }
  const text = String(req.body?.text || '').trim();
  if (text.length < NARRATIVE_TEXT_MIN || text.length > NARRATIVE_TEXT_MAX) {
    res.status(400).json({ error: `Narrative text must be ${NARRATIVE_TEXT_MIN}-${NARRATIVE_TEXT_MAX} characters.` });
    return;
  }
  const data = (await getUserData(userId)) || {};
  const updatedAt = Date.now();
  await setUserData(userId, { ...data, narrativeText: text, narrativeTextUpdatedAt: updatedAt, narrativeTextUpdatedBy: actor.id, updatedAt });
  res.status(200).json({ ok: true, narrativeText: text, updatedAt });
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
  if (action === 'save_narrative_edit') {
    await saveNarrativeEdit(req, res, actor);
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
