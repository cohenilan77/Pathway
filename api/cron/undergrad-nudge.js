// Undergrad Rail v2 — nudge cron. TEMPLATED, zero model calls.
// vercel.json: { "path": "/api/cron/undergrad-nudge", "schedule": "0 15 * * 3" }
//
// One question · rotate · max 1 per 10 days · after 3 unanswered, stop and
// leave it for the consultant (never escalate). Replying opens a normal
// one-exchange session via the chat.
import { getStore } from '../../lib/store.js';
import { loadState, saveState, daysSince, ACTIVE_SET_KEY } from '../../lib/undergrad/state.js';
import { pickWeakestField } from '../../lib/undergrad/resume.js';
import { TEMPLATES, pick, interpolate, sendNudge } from '../../lib/undergrad/nudge.js';

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  const store = getStore();
  const ids = (await store.smembers(ACTIVE_SET_KEY)) || [];
  let sent = 0;

  for (const userId of ids) {
    const state = await loadState(userId, store);
    if (!state) continue;
    if (daysSince(state.nudges.lastSentAt) < 10) continue;   // never spam
    if (state.nudges.unanswered >= 3) continue;              // back off, do NOT escalate

    const weakest = pickWeakestField(state);
    const pool = TEMPLATES[weakest.field] || TEMPLATES.general;
    const q = interpolate(pick(pool, state.nudges.lastQuestion), state);   // no LLM call

    await sendNudge(userId, q, store);
    state.nudges = {
      lastSentAt: new Date().toISOString(),
      lastQuestion: q,
      unanswered: state.nudges.unanswered + 1,
    };
    await saveState(state, store);
    sent++;
  }
  return res.json({ sent, checked: ids.length });
}
