import { getActor } from '../lib/admin.js';
import { ROLES } from '../lib/db.js';
import { saveUsageSettings } from '../lib/usage.js';

const VALID_LIMIT_ACTIONS = ['warn_user', 'block_messages', 'notify_admin'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const actor = await getActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  if (actor.role !== ROLES.admin) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const body = req.body || {};
  if (body.limitAction != null && !VALID_LIMIT_ACTIONS.includes(body.limitAction)) {
    res.status(400).json({ error: `limitAction must be one of: ${VALID_LIMIT_ACTIONS.join(', ')}` });
    return;
  }

  const patch = {};
  if (typeof body.usageLimitsEnabled === 'boolean') patch.usageLimitsEnabled = body.usageLimitsEnabled;
  if (body.monthlyBudget != null) patch.monthlyBudget = Number(body.monthlyBudget) || 0;
  if (body.dailyBudget != null) patch.dailyBudget = Number(body.dailyBudget) || 0;
  if (body.maxCostPerUser != null) patch.maxCostPerUser = Number(body.maxCostPerUser) || 0;
  if (body.maxCostPerSession != null) patch.maxCostPerSession = Number(body.maxCostPerSession) || 0;
  if (body.limitAction != null) patch.limitAction = body.limitAction;
  if (typeof body.systemSuspended === 'boolean') patch.systemSuspended = body.systemSuspended;
  if (typeof body.suspensionMessage === 'string') patch.suspensionMessage = body.suspensionMessage;

  try {
    const settings = await saveUsageSettings(patch);
    res.status(200).json({ settings });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save usage settings.' });
  }
}
