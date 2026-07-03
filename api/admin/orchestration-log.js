import { getActor } from '../../lib/admin.js';
import { ROLES } from '../../lib/db.js';
import { isOrchestratorEnabled } from '../../lib/orchestrator/flags.js';
import { getRecentOrchestrationRuns, getOrchestrationRun } from '../../lib/orchestration-log.js';

// Staging-only view into the multi-agent orchestrator's execution traces (Router ->
// Planner -> Specialists -> Synthesizer). Admin-only, and returns enabled:false with
// no data when MULTI_AGENT_ORCHESTRATOR is off so the Call Log tab can explain that
// clearly instead of showing an empty/broken table.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (actor.role !== ROLES.admin) return res.status(403).json({ error: 'Forbidden.' });

  const enabled = isOrchestratorEnabled();
  if (!enabled) return res.status(200).json({ enabled: false, runs: [], run: null });

  const runId = req.query?.runId || new URL(req.url || '/', 'http://localhost').searchParams.get('runId');
  if (runId) {
    const run = await getOrchestrationRun(runId);
    return res.status(200).json({ enabled: true, run });
  }

  const runs = await getRecentOrchestrationRuns(100);
  return res.status(200).json({ enabled: true, runs });
}
