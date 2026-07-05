// ProfileProgressAgent — records score/progress history over time across the
// undergrad progress dimensions and computes the delta vs the previous snapshot.

import { makeProgressSnapshot } from '../schemas.js';
import { addProgress } from '../store.js';
import { PROGRESS_DIMENSIONS } from '../constants.js';

function normalizeScores(scores = {}) {
  const out = {};
  for (const dim of PROGRESS_DIMENSIONS) {
    const v = Number(scores[dim]);
    if (Number.isFinite(v)) out[dim] = Math.round(v);
  }
  // Allow overall too, if present.
  if (Number.isFinite(Number(scores.overall))) out.overall = Math.round(Number(scores.overall));
  return out;
}

export function latestProgress(state) {
  const list = state?.progress || [];
  return list.length ? list[list.length - 1] : null;
}

function diff(prevScores = {}, nextScores = {}) {
  const changes = {};
  for (const key of Object.keys(nextScores)) {
    const before = Number(prevScores[key]);
    const after = Number(nextScores[key]);
    if (!Number.isFinite(after)) continue;
    if (!Number.isFinite(before) || before !== after) {
      changes[key] = { from: Number.isFinite(before) ? before : null, to: after, delta: Number.isFinite(before) ? after - before : after };
    }
  }
  return changes;
}

// Append a progress snapshot (only when scores exist). Records the delta and
// logs profile_score_changed when anything moved.
export function recordProgress(state, scores, { candidateId = null, now = Date.now(), note = '' } = {}) {
  const normalized = normalizeScores(scores);
  if (!Object.keys(normalized).length) return state;
  const prev = latestProgress(state);
  const changes = diff(prev?.scores || {}, normalized);
  // Skip a duplicate snapshot when nothing changed and we already have history.
  if (prev && Object.keys(changes).length === 0) return state;
  const snapshot = makeProgressSnapshot({ candidateId, scores: normalized, changes, note }, now);
  return addProgress(state, snapshot, now);
}

// Series for a single dimension: [{ at, value }] — feeds the admin progress charts.
export function progressSeries(state, dimension) {
  return (state?.progress || [])
    .map(s => ({ at: s.at, value: s.scores?.[dimension] }))
    .filter(p => Number.isFinite(Number(p.value)));
}
