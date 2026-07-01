import { getUserIdByToken, getUserById, ROLES } from '../../lib/db.js';
import { MainAgent } from '../../lib/agents/MainAgent.js';
import { GradAgent } from '../../lib/agents/journey/GradAgent.js';
import { getJourney, patchJourney } from '../../lib/agents/journey/state.js';
import { isAdaptiveCategory, normalizeJourneyCategory, runJourneyGate } from '../../lib/agents/journey/gate.js';
import { isAdaptiveGradEnabled } from '../../lib/adaptive-grad.js';

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
    return res.status(200).json({ enabled: isAdaptiveGradEnabled() });
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
    if (isAdaptiveGradEnabled() && extra?.getJourneyState) {
      const journeyState = await getJourney(candidateId);
      return res.status(200).json({ ok: true, journeyState });
    }

    if (isAdaptiveGradEnabled()) {
      const suppliedCategory = normalizeJourneyCategory(extra?.profile?.category || extra?.category);
      const existingJourney = await getJourney(candidateId);
      if (!existingJourney.category && suppliedCategory) {
        await patchJourney(candidateId, {
          category: suppliedCategory,
          flags: { stage: isAdaptiveCategory(suppliedCategory) ? 'profile' : 'intake' },
        });
      }

      const gate = await runJourneyGate(candidateId, message);
      if (gate.action === 'ask') {
        return res.status(200).json({ ok: true, raw: gate.text, text: gate.text, journey: gate.journey, journeyStage: 'intake' });
      }
      if (gate.action === 'legacy') {
        return res.status(200).json({ ok: true, fallThrough: true, category: gate.category });
      }
      if (gate.action === 'adaptive') {
        const gradAgent = new GradAgent();
        const result = await gradAgent.chat(candidateId, message || '', {
          conversationHistory,
          profile: extra.profile || {},
          scores: extra.scores || {},
          kpiSummary: extra.kpiSummary || '',
        });
        return res.status(200).json({
          ok: true,
          agent: 'grad',
          text: result.text,
          raw: result.raw,
          toolUses: result.toolUses,
          usage: result.usage,
          journey: result.journey,
          journeyStage: result.journeyStage,
          pendingTasks: result.pendingTasks,
          ui: result.ui,
          openScreen: result.ui?.tab || null,
          openModal: result.ui?.modal || null,
        });
      }
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
