import { getUserIdByToken, getUserById, ROLES } from '../../lib/db.js';
import { MainAgent } from '../../lib/agents/MainAgent.js';
import { getAgentArchitecture } from '../../lib/agent-architecture.js';
import { isUndergradProfile, recomputeUndergradScores } from '../../lib/undergrad/recompute-scores.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserIdByToken(token);
  if (!userId) return res.status(401).json({ error: 'Invalid session' });

  const user = await getUserById(userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const isCandidate = user.role === ROLES.candidate;
  const isStaff = user.role === ROLES.consultant || user.role === ROLES.admin;
  if (!isCandidate && !isStaff) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const architecture = await getAgentArchitecture();
  if (architecture.mode !== 'hybrid') {
    return res.status(409).json({
      error: 'Multi-agent architecture is disabled.',
      architecture: 'legacy',
    });
  }

  const {
    message,
    candidateId: requestedCandidateId,
    conversationHistory = [],
    extra = {},
  } = req.body || {};

  if (!message && !extra) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Candidates can only operate on their own profile
  // Staff can specify a candidateId to operate on behalf of a candidate
  const candidateId = isCandidate
    ? userId
    : (requestedCandidateId || userId);

  try {
    const agent = new MainAgent();
    const response = await agent.handle(candidateId, message || '', {
      conversationHistory,
      extra,
    });

    // PRODUCTION HOTFIX (see commit message): this is the actual primary
    // path authenticated Undergraduate candidates use (src/App.jsx routes
    // them here, not to /api/advisor, whenever a token is present). Neither
    // this handler nor MainAgent.handle()/UndergradAgent.handle() ever
    // computed scores, so the client's scores state never updated and the
    // debounced /api/session save persisted the same stale (usually empty)
    // scores forever — the profile-percentage card stayed blank regardless
    // of how many facts UndergradAgent's save_profile_fact tool had saved.
    // Recompute live from whatever the profile knows right now, same as the
    // /api/advisor path (lib/undergrad/recompute-scores.js).
    let statePatch = response.result?.statePatch || null;
    const mergedProfile = { ...(extra?.profile || {}), ...(statePatch?.profile || {}) };
    if (isUndergradProfile(mergedProfile)) {
      const kpi = recomputeUndergradScores(mergedProfile, extra?.chosenSchools || []);
      statePatch = { ...(statePatch || {}), profile: mergedProfile, ...kpi };
    }

    return res.status(200).json({
      ok: true,
      agent: response.agent,
      intent: response.intent,
      text: response.result?.text || '',
      toolUses: response.result?.toolUses || [],
      usage: response.result?.usage || null,
      // Only ever set by the Undergraduate deterministic path today (e.g. the
      // stage tracker's lastTopics bookkeeping); every other agent's result
      // has no statePatch field, so this stays undefined for them exactly as
      // before this field was added.
      statePatch,
      latencyMs: response.latencyMs,
      architecture: 'hybrid',
    });
  } catch (err) {
    console.error('[agents/orchestrate] error', { candidateId, error: err.message });
    return res.status(500).json({ error: 'Agent error', detail: err.message });
  }
}
