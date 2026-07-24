// Undergrad Rail v2 — resume by weakest field, never by "last step".
//
// There is deliberately NO sessionType field anywhere in this rail. The
// micro-session "shape" (check-in, explore, converge, deepen, follow-up,
// reality-check, execute) is whatever emerges from pickWeakestField + phase
// gating. Do not add a session-type enum.
import { SPIKE_LADDER, isStale, daysSince } from './state.js';
import { getGating } from './gating.js';

export function pickWeakestField(state) {
  const c = [];

  for (const [dim, cov] of Object.entries(state.coverage)) {
    if (!cov.facts.length)                     c.push({ field: dim, score: 1.0, reason: 'nothing known yet' });
    else if (isStale(dim, cov.lastUpdated))    c.push({ field: dim, score: 0.8, reason: 'stale — worth re-checking' });
    else if (cov.confidence < 0.5)             c.push({ field: dim, score: 0.6, reason: 'low confidence / mostly inferred' });
  }

  // Spike behind its phase target OUTRANKS every coverage gap — it's the product.
  const { phase } = getGating(state);
  const cur = SPIKE_LADDER.indexOf(state.spike.stage);
  const tgt = SPIKE_LADDER.indexOf(phase.spikeTarget);
  if (cur < tgt) c.push({
    field: 'spike',
    score: 1.2 + (tgt - cur) * 0.2,
    reason: `at "${state.spike.stage}" but ${state.phase} needs "${phase.spikeTarget}"`,
  });

  (state.openTasks || []).forEach(t => {
    if (daysSince(t.assignedAt) > (t.followUpAfterDays || 14))
      c.push({ field: 'tasks', score: 0.9, reason: `never followed up: "${t.task}"` });
  });

  if (!c.length) return { field: 'general', score: 0, reason: 'everything current — just check in' };
  return c.sort((a, b) => b.score - a.score)[0];
}
