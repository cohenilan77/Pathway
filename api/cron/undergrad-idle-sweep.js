// Undergrad Rail v2 — idle sweep. A closed tab must not lose the session.
// vercel.json: { "path": "/api/cron/undergrad-idle-sweep", "schedule": "*/15 * * * *" }
//
// Any session idle > IDLE_MINUTES is closed through the exact same path a
// tapped Goodbye uses (endSession → tracker → summary), so state is captured
// even when the student just walks away.
import { getStore } from '../../lib/store.js';
import { loadState, ACTIVE_SET_KEY } from '../../lib/undergrad/state.js';
import { getTranscript } from '../../lib/undergrad/transcript.js';
import { endSession } from '../../lib/undergrad/rail.js';

const IDLE_MINUTES = 30;

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  const store = getStore();
  const ids = (await store.smembers(ACTIVE_SET_KEY)) || [];
  let closed = 0;

  for (const userId of ids) {
    const t = await getTranscript(userId, store, { asText: true });
    if (!t) continue;                                   // no open session
    const state = await loadState(userId, store);
    if (!state) continue;
    const idleMin = (Date.now() - new Date(state.lastActivityAt || 0).getTime()) / 60000;
    if (idleMin < IDLE_MINUTES) continue;

    try {
      await endSession(userId, { store });              // identical close path
      closed++;
    } catch (err) {
      console.error(`[undergrad-idle-sweep] end failed for ${userId}:`, err.message);
    }
  }
  return res.json({ closed, checked: ids.length });
}
