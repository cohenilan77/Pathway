import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDeterministicKpiToResponse } from '../deterministic-kpi-response.js';

function withDeterministicFlag(fn) {
  const previous = process.env.DETERMINISTIC_KPI_ENGINE;
  try {
    process.env.DETERMINISTIC_KPI_ENGINE = 'true';
    return fn();
  } finally {
    if (previous === undefined) delete process.env.DETERMINISTIC_KPI_ENGINE;
    else process.env.DETERMINISTIC_KPI_ENGINE = previous;
  }
}

test('readyForScoring is a hard gate: a high-confidence score never bypasses a genuine candidateFacts readiness gap', () => withDeterministicFlag(() => {
  // Missing careerProgression (a candidateFacts-required MBA field) even
  // though assessScoringConfidence's own narrower checklist is fully covered
  // and reports 'high' confidence — this is exactly the loophole where the
  // old `confidence !== 'high' && !readyForScoring` gate let scoring through.
  const profile = {
    category: 'Graduate', degree: 'MBA', gpa: 3.7, gmat: 720, workYears: 6,
    currentRole: 'Manager', currentCompany: 'Acme Corp',
    achievementsImpact: 'Raised revenue 20%',
    leadershipEvidence: 'Led a six-person team',
    whyMBA: 'I need an MBA now to move into strategy leadership.',
    postMbaGoal: 'After the MBA I want to become a strategy director.',
  };
  const response = {
    raw: '<SCORES>{"overall":70}</SCORES>Here is your analysis.',
    message: 'Here is your analysis.',
    statePatch: { profile, scores: { overall: 70 } },
    metadata: {},
  };
  const transformed = applyDeterministicKpiToResponse(response, {
    candidateState: { profile, message: 'Please score me' },
  });
  assert.equal(transformed.statePatch.scores, undefined);
  assert.equal(transformed.metadata.reason, 'missing_kpi_facts');
  assert.match(transformed.message, /geography|school path/i);
}));

test('a KPI that needs confirmation (inflated work years) blocks scoring with a consolidated question', () => withDeterministicFlag(() => {
  const profile = {
    category: 'Graduate', degree: 'MBA', gpa: 3.7, gmat: 720, workYears: 23,
    currentRole: 'Manager', currentCompany: 'Acme Corp',
    achievementsImpact: 'Raised revenue 20%',
    leadershipEvidence: 'Led a six-person team',
    careerProgression: 'Promoted twice',
    whyMBA: 'I need an MBA now to move into strategy leadership.',
    postMbaGoal: 'After the MBA I want to become a strategy director.',
    targetCountries: ['USA'], targetSchools: ['INSEAD'], schoolChoice: 'specific',
  };
  const response = {
    raw: '<SCORES>{"overall":70}</SCORES>Here is your analysis.',
    message: 'Here is your analysis.',
    statePatch: { profile, scores: { overall: 70 } },
    metadata: {},
  };
  const transformed = applyDeterministicKpiToResponse(response, {
    candidateState: { profile, chosenSchools: ['INSEAD'], message: 'Please score me' },
  });
  assert.equal(transformed.statePatch.scores, undefined);
  assert.equal(transformed.metadata.reason, 'needs_confirmation');
  // recommenders/internationalExposure/community were never provided in this
  // profile — genuinely missing (not just low-scoring) MBA KPIs must also
  // surface here instead of silently dropping out of the final scores.
  assert.deepEqual(transformed.metadata.confirmationsNeeded, ['professional', 'recommenders', 'internationalExposure', 'community']);
  assert.match(transformed.message, /unusually high for MBA/);
  assert.deepEqual(transformed.statePatch.profile.profileCompleteness.askedFields, ['professional', 'recommenders', 'internationalExposure', 'community']);
}));

test('a field already asked once is accepted as final instead of being asked again', () => withDeterministicFlag(() => {
  const baseProfile = {
    category: 'Graduate', degree: 'MBA', gpa: 3.7, gmat: 720, workYears: 23,
    currentRole: 'Manager', currentCompany: 'Acme Corp',
    achievementsImpact: 'Raised revenue 20%',
    leadershipEvidence: 'Led a six-person team',
    careerProgression: 'Promoted twice',
    whyMBA: 'I need an MBA now to move into strategy leadership.',
    postMbaGoal: 'After the MBA I want to become a strategy director.',
    targetCountries: ['USA'], targetSchools: ['INSEAD'], schoolChoice: 'specific',
  };
  const profile = { ...baseProfile, profileCompleteness: { askedFields: ['professional', 'recommenders', 'internationalExposure', 'community'] } };
  const response = {
    raw: '<SCORES>{"overall":70}</SCORES>Here is your analysis.',
    message: 'Here is your analysis.',
    statePatch: { profile, scores: { overall: 70 } },
    metadata: {},
  };
  const transformed = applyDeterministicKpiToResponse(response, {
    candidateState: { profile, chosenSchools: ['INSEAD'], message: 'Please score me' },
  });
  assert.notEqual(transformed.statePatch.scores, undefined);
  assert.equal(transformed.metadata.reason, 'high_confidence_scored');
  // Previously this stayed permanently undefined even after the candidate was
  // asked and the flow moved on — a KPI once flagged needsConfirmation could
  // never actually resolve. Now that the field has been asked once, it scores
  // with the real (candidate-confirmed) years at medium confidence instead of
  // staying blocked forever.
  assert.ok(Number.isFinite(transformed.statePatch.scores.professional), 'an already-asked field must resolve to a real score instead of staying blocked forever');
}));
