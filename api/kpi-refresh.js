import { getActor } from '../lib/admin.js';
import { ROLES } from '../lib/db.js';
import { getLiveKpiDatabase, refreshLiveKpiDatabase } from '../lib/admissions-kpi.js';

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor || actor.role !== ROLES.admin) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  if (req.method === 'GET') {
    const live = await getLiveKpiDatabase();
    res.status(200).json({
      importedAt: live?.importedAt || null,
      sourceFile: live?.sourceFile || 'data/admissions_kpi_universe_expanded.xlsx',
      counts: live?.counts || null,
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const live = await refreshLiveKpiDatabase();
      res.status(200).json({
        ok: true,
        importedAt: live.importedAt,
        sourceFile: live.sourceFile,
        counts: live.counts,
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to refresh KPI database.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
