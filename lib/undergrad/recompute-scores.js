// Shared Undergraduate scoring recompute, used everywhere a candidate's
// profile can change: the chat/coordinator paths (api/advisor.js,
// api/agents/orchestrate.js) and the session-load backfill
// (api/session.js). profile-temperature.js's scoreUndergradProfile already
// scores whatever a partial profile knows right now (see weightedScore's
// partial-dimension weighting) — this just gives every call site the same,
// correct way to invoke it instead of duplicating the normalize+score glue.
import { normalizeProfileFacts } from '../profile-facts.js';
import { scoreCandidateKPIs } from '../kpi-engine.js';

export function isUndergradProfile(profile = {}) {
  return profile?.category === 'Undergraduate';
}

// A profile is "stale-zero" when it has never been scored, or was scored
// before the candidate had any real facts saved. Recomputing is cheap and
// deterministic, so callers can recompute more eagerly than this — this
// helper exists for the specific case of deciding whether an existing,
// already-persisted candidate needs a one-time backfill.
export function scoresAreStale(scores) {
  if (!scores || scores.overall == null) return true;
  return !Number.isFinite(Number(scores.overall));
}

export function recomputeUndergradScores(profile = {}, chosenSchools = []) {
  const normalized = normalizeProfileFacts(profile, {}, { chosenSchools });
  const kpi = scoreCandidateKPIs(normalized, profile);
  return {
    scores: kpi.scores,
    strengths: kpi.strengths,
    weaknesses: kpi.weaknesses,
    tasks: kpi.tasks,
  };
}
