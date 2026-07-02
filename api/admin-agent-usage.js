import { getActor } from '../lib/admin.js';
import { ROLES } from '../lib/db.js';
import { getAgentMetrics, resetAgentMetrics } from '../lib/agent-metrics.js';

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (actor.role !== ROLES.admin) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'GET') {
    return res.status(200).json(await getAgentMetrics());
  }
  if (req.method === 'POST') {
    const resetAt = await resetAgentMetrics();
    return res.status(200).json({ ok: true, resetAt, agents: [] });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
