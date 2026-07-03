import { getActor } from '../lib/admin.js';
import { getUserById, ROLES } from '../lib/db.js';
import { getStore } from '../lib/store.js';
import { normalizeEmail } from '../lib/auth.js';
import { isTraceEnabled, getTrace, clearTrace } from '../lib/agent-trace.js';

export default async function handler(req, res) {
  if (!isTraceEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  const actor = await getActor(req);
  if (!actor) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (actor.role !== ROLES.admin) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const email = req.query?.email || new URL(req.url || '/', 'http://localhost').searchParams.get('email');
  const candidateId = req.query?.candidateId || new URL(req.url || '/', 'http://localhost').searchParams.get('candidateId');
  const limit = parseInt(req.query?.limit || '300', 10);
  const sessionId = req.query?.sessionId || new URL(req.url || '/', 'http://localhost').searchParams.get('sessionId');

  let resolvedCandidateId = candidateId;
  let resolvedEmail = email;

  if (!resolvedCandidateId && email) {
    try {
      const store = getStore();
      const normalized = normalizeEmail(email);
      resolvedCandidateId = await store.get(`user:byEmail:${normalized}`);
      if (resolvedCandidateId) {
        resolvedEmail = email;
      }
    } catch (error) {
      console.error('[admin-agent-trace] email lookup failed:', error?.message);
    }
  }

  if (!resolvedCandidateId) {
    return res.status(400).json({ error: 'Candidate not found. Provide candidateId or email.' });
  }

  try {
    const candidate = await getUserById(resolvedCandidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    if (req.method === 'GET') {
      const events = await getTrace(resolvedCandidateId, { limit, sessionId });
      return res.status(200).json({
        candidateId: resolvedCandidateId,
        email: candidate.email || resolvedEmail || null,
        events,
      });
    }

    if (req.method === 'DELETE') {
      await clearTrace(resolvedCandidateId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin-agent-trace] error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
