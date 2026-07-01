import { getUserIdByToken, getUserById, ROLES } from '../../lib/db.js';
import { MainAgent } from '../../lib/agents/MainAgent.js';
import { JourneyAdvisor } from '../../lib/agents/journey/advisor.js';
import { getJourneyState } from '../../lib/agents/journey/state.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.status(200).json({ enabled: process.env.ADAPTIVE_GRAD === 'true' });
  }

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
    // When ADAPTIVE_GRAD is on and the target is a grad/PhD candidate,
    // expose the journey state for staff queries.
    if (process.env.ADAPTIVE_GRAD === 'true' && extra?.getJourneyState) {
      const journeyState = await getJourneyState(candidateId);
      return res.status(200).json({ ok: true, journeyState });
    }

    const agent = new MainAgent();
    const response = await agent.handle(candidateId, message || '', {
      conversationHistory,
      extra,
    });

    return res.status(200).json({
      ok: true,
      agent: response.agent,
      intent: response.intent,
      text: response.result?.text || '',
      toolUses: response.result?.toolUses || [],
      usage: response.result?.usage || null,
      latencyMs: response.latencyMs,
    });
  } catch (err) {
    console.error('[agents/orchestrate] error', { candidateId, error: err.message });
    return res.status(500).json({ error: 'Agent error', detail: err.message });
  }
}
