import { getUserIdByToken, touchActivity } from '../lib/db.js';
import { recordCandidateActivity } from '../lib/candidate-activity.js';

function getToken(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/i);
  return match ? match[1] : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = await getUserIdByToken(getToken(req));
  if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
  await touchActivity(userId);
  const event = req.body?.event;
  if (event === 'navigation') {
    const tab = String(req.body?.tab || 'workspace').slice(0, 80);
    await recordCandidateActivity(userId, {
      type: 'navigation',
      label: `Opened ${tab}`,
      detail: `Candidate navigated to the ${tab} area.`,
      metadata: { tab },
    }).catch(() => {});
  }
  return res.status(200).json({ ok: true });
}
