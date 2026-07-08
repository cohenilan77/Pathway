import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfileFacts } from '../profile-facts.js';
import { scoreCandidateKPIs } from '../kpi-engine.js';

test('work years above the per-track ceiling flag needsConfirmation instead of an inflated score', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MSc', gpa: 3.6, workYears: 25 });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scores.professional, undefined, 'an implausible year count must not auto-score');
  assert.equal(result.scoreDetails.professional.needsConfirmation, true);
  assert.match(result.scoreDetails.professional.reason, /unusually high for Graduate/);
  assert.ok(result.confirmationsNeeded.includes('professional'));
});

test('a KPI scored 50 with medium confidence flags needsConfirmation', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MSc', gpa: 3.6, activities: ['Chess club'] });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scoreDetails.activities.score, 50);
  assert.equal(result.scoreDetails.activities.confidence, 'medium');
  assert.equal(result.scoreDetails.activities.needsConfirmation, true);
  assert.ok(result.confirmationsNeeded.includes('activities'));
});

test('a confirmed-absent low score with high confidence does not need re-confirmation', () => {
  const facts = normalizeProfileFacts({
    category: 'Graduate', degree: 'MBA', gpa: 3.6, gmat: 700, workYears: 5, leadershipEvidence: 'none',
  });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scoreDetails.leadership.score, 40);
  assert.equal(result.scoreDetails.leadership.confidence, 'high');
  assert.equal(result.scoreDetails.leadership.needsConfirmation, undefined);
  assert.ok(!result.confirmationsNeeded.includes('leadership'));
});
