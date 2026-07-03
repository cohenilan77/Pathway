import { getActor } from '../lib/admin.js';
import { ROLES } from '../lib/db.js';
import { getAgentArchitecture, getAgentArchitectureAudit, setAgentArchitecture } from '../lib/agent-architecture.js';

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (actor.role !== ROLES.admin) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'GET') {
    const [config, audit] = await Promise.all([getAgentArchitecture(), getAgentArchitectureAudit()]);
    return res.status(200).json({ config, audit: (audit || []).slice(-20).reverse() });
  }
  if (req.method === 'POST') {
    try {
      const config = await setAgentArchitecture({ mode: req.body?.mode, updatedBy: actor.email || actor.id });
      return res.status(200).json({ ok: true, config });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
