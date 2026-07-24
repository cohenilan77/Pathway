// Undergrad Rail v2 — HTTP endpoint.
//
// Actions: open | turn | end | review. The acting user is resolved from their
// session token (getChatActor) — the body's userId is NEVER trusted for
// candidate calls, so a candidate can only ever operate on their own state.
// The internal idle-sweep cron authenticates with CRON_SECRET and may pass an
// explicit userId to close a specific abandoned session.
import { getChatActor } from '../lib/chat-auth.js';
import { openSession, turnSession, endSession, reviewPS } from '../lib/undergrad/rail.js';

function bearer(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer (.+)$/i);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const { action } = body;

  // Internal path: the idle sweep closes a specific session with CRON_SECRET.
  const cronSecret = process.env.CRON_SECRET;
  const isInternal = action === 'end' && cronSecret && bearer(req) === cronSecret && body.userId;
  if (isInternal) {
    try {
      return res.status(200).json(await endSession(String(body.userId)));
    } catch (err) {
      console.error('[undergrad] internal end failed:', err.message);
      return res.status(500).json({ error: 'end_failed' });
    }
  }

  // Candidate path: identity comes from the session token, never the body.
  const actor = await getChatActor(req);
  if (!actor) return res.status(401).json({ error: 'Not authenticated.' });
  const userId = actor.id;
  const name = actor.name || 'there';

  try {
    if (action === 'open')   return res.status(200).json(await openSession(userId, { name }));
    if (action === 'end')    return res.status(200).json(await endSession(userId));
    if (action === 'review') return res.status(200).json(await reviewPS(userId, { psText: body.psText }));
    // default: a conversational turn
    return res.status(200).json(await turnSession(userId, { userMessage: body.userMessage, name }));
  } catch (err) {
    console.error(`[undergrad] action=${action || 'turn'} failed:`, err.message);
    return res.status(500).json({ error: 'undergrad_turn_failed' });
  }
}
