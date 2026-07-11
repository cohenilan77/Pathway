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

test('a genuinely missing (never-provided) relevant KPI is flagged for confirmation, not silently dropped', () => {
  // MBA never mentions recommenders, international exposure, or community —
  // those KPIs must surface in confirmationsNeeded instead of just vanishing
  // from the final scores with no question ever asked.
  const facts = normalizeProfileFacts({
    category: 'Graduate', degree: 'MBA', gpa: 3.6, gmat: 700, workYears: 5,
    currentRole: 'Manager', currentCompany: 'Acme Corp', achievementsImpact: 'Grew revenue',
    leadershipEvidence: 'Led a team', careerProgression: 'Promoted twice',
    whyMBA: 'Ready to lead at scale', postMbaGoal: 'Become a strategy director',
  });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scores.recommenders, undefined);
  assert.equal(result.scoreDetails.recommenders.incomplete, true);
  assert.ok(result.confirmationsNeeded.includes('recommenders'));
  assert.ok(result.confirmationsNeeded.includes('internationalExposure'));
  assert.ok(result.confirmationsNeeded.includes('community'));
});

test('a track-irrelevant KPI never surfaces in confirmationsNeeded even if incomplete', () => {
  // facultyFit/publications/research are computed for every track but only
  // relevant (weighted) for Postgraduate/Doctoral — an MBA candidate must
  // never be asked to confirm them.
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MBA', gpa: 3.6, gmat: 700, workYears: 5 });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scoreDetails.facultyFit?.incomplete, true);
  assert.ok(!result.confirmationsNeeded.includes('facultyFit'));
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

test('Tal\'s real bug, unconfirmed-but-now-plausible: 11 years of Graduate experience needs no confirmation at all', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MSc', gpa: 3.6, workYears: 11 });
  const result = scoreCandidateKPIs(facts, {});
  assert.ok(Number.isFinite(result.scores.professional), 'professional must resolve to a finite score — 11 years is within the raised Graduate ceiling of 20');
});

test('still-implausible but already confirmed: professional resolves with medium confidence instead of staying blocked forever', () => {
  const facts = normalizeProfileFacts({
    category: 'Graduate', degree: 'MSc', gpa: 3.6, workYears: 25,
    profileCompleteness: { askedFields: ['professional'] },
  });
  const result = scoreCandidateKPIs(facts, {});
  assert.ok(Number.isFinite(result.scores.professional), 'professional must resolve once the candidate has already been asked once');
  assert.equal(result.scoreDetails.professional.confidence, 'medium');
  assert.ok(!result.confirmationsNeeded.includes('professional'), 'must not be asked to confirm the same KPI twice');
});

test('still-implausible, never asked: the ceiling guard itself still gates professional (regression guard)', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MSc', gpa: 3.6, workYears: 25 });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scores.professional, undefined, 'an implausible, never-confirmed year count must still gate');
  assert.equal(result.scoreDetails.professional.needsConfirmation, true);
});

test('generic safety net: any KPI already asked once resolves to a conservative score instead of staying blocked forever', () => {
  const facts = normalizeProfileFacts({
    category: 'Graduate', degree: 'MBA', gpa: 3.6, gmat: 700, workYears: 5,
    profileCompleteness: { askedFields: ['leadership'] },
  });
  const result = scoreCandidateKPIs(facts, {});
  assert.equal(result.scores.leadership, 55, 'the catch-all must resolve any relevant KPI once already asked, not just professional');
  assert.equal(result.scoreDetails.leadership.needsConfirmation, false);
  assert.ok(!result.confirmationsNeeded.includes('leadership'));
});
