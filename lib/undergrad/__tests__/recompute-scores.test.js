import test from 'node:test';
import assert from 'node:assert/strict';

import { isUndergradProfile, scoresAreStale, recomputeUndergradScores } from '../recompute-scores.js';

test('isUndergradProfile only matches category Undergraduate', () => {
  assert.equal(isUndergradProfile({ category: 'Undergraduate' }), true);
  assert.equal(isUndergradProfile({ category: 'Graduate' }), false);
  assert.equal(isUndergradProfile({}), false);
  assert.equal(isUndergradProfile(undefined), false);
});

test('scoresAreStale treats missing/non-numeric overall as stale', () => {
  assert.equal(scoresAreStale(undefined), true);
  assert.equal(scoresAreStale({}), true);
  assert.equal(scoresAreStale({ overall: null }), true);
  assert.equal(scoresAreStale({ overall: 'n/a' }), true);
  assert.equal(scoresAreStale({ overall: 0 }), false);
  assert.equal(scoresAreStale({ overall: 62 }), false);
});

test('recomputeUndergradScores scores a partial profile without every field known', () => {
  const kpi = recomputeUndergradScores({
    category: 'Undergraduate',
    grade: '10',
    gpa: 3.9,
    activities: ['Robotics club', 'Track'],
  });
  assert.ok(Number.isFinite(kpi.scores.overall));
  assert.ok(kpi.scores.overall > 0);
  assert.ok(Array.isArray(kpi.strengths));
  assert.ok(Array.isArray(kpi.weaknesses));
  assert.ok(Array.isArray(kpi.tasks));
});

test('recomputeUndergradScores on an empty profile does not throw', () => {
  // profile-temperature.js's development-mode dimensions have neutral floor
  // scores (e.g. testingAwareness=55 when no plan is expected yet at this
  // stage) even with zero known facts, so a real (if low) overall is
  // expected here — not null. The point of this test is that recompute
  // never throws on a bare/empty profile.
  const kpi = recomputeUndergradScores({ category: 'Undergraduate' });
  assert.ok(Number.isFinite(kpi.scores.overall) || kpi.scores.overall === null);
});
