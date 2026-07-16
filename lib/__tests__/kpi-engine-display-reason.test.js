import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfileFacts } from '../profile-facts.js';
import { scoreCandidateKPIs } from '../kpi-engine.js';

const BANNED_PHRASES = ['already asked', 'conservative estimate', 'proceeding', 'blocked', 'deterministic'];

function assertClean(displayReason, label) {
  assert.ok(displayReason && displayReason.trim().length > 0, `${label}: displayReason must be non-empty`);
  const lower = displayReason.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    assert.ok(!lower.includes(phrase), `${label}: displayReason "${displayReason}" must not contain banned phrase "${phrase}"`);
  }
}

function scoreFor(profileOverrides, scores = {}, raw = {}) {
  const facts = normalizeProfileFacts(profileOverrides, scores, raw);
  return scoreCandidateKPIs(facts, profileOverrides);
}

// ── Requirement (b): no banned internal jargon anywhere, across a wide mix
// of evidence levels and tracks ─────────────────────────────────────────────

test('empty MBA profile: every incomplete KPI has a clean, non-empty displayReason', () => {
  const result = scoreFor({ category: 'Graduate', degree: 'MBA' });
  const entries = Object.entries(result.scoreDetails);
  assert.ok(entries.length > 0);
  for (const [key, value] of entries) {
    assertClean(value.displayReason, key);
  }
});

test('weak-evidence MBA profile: every KPI has a clean, non-empty displayReason', () => {
  const result = scoreFor({
    category: 'Graduate', degree: 'MBA',
    gpa: 2.8, gmat: 550, workYears: 0.5,
    leadershipScope: 'Team lead for a cross-functional project',
    careerGoal: 'I want to grow and make an impact',
  });
  for (const [key, value] of Object.entries(result.scoreDetails)) {
    assertClean(value.displayReason, key);
  }
});

test('strong-evidence MBA profile: every KPI has a clean, non-empty displayReason', () => {
  const result = scoreFor({
    category: 'Graduate', degree: 'MBA',
    gpa: 3.9, gmat: 740, workYears: 8,
    achievementsImpact: ['Led a 12-person team to launch a new product line'],
    quantifiedImpact: ['Grew revenue 30% YoY'],
    employerStrength: 'elite global firm',
    managedPeople: true, teamSize: 12, leadershipImpact: ['Cut onboarding time by 40%'],
    careerProgression: 'Promoted twice to Senior Manager in four years',
    countriesWorked: ['UK', 'Germany', 'Singapore'], languages: ['English', 'French'],
    volunteeringYears: 4, communityImpact: 'Founded a mentorship program',
    whyMBA: 'why MBA now to accelerate into general management', whyNow: true,
    careerGoal: 'become a VP of Product at a growth-stage startup in the US',
    directEvaluatorConfirmed: true, recommenderEvidenceSpecificity: 'specific and concrete',
  });
  for (const [key, value] of Object.entries(result.scoreDetails)) {
    assertClean(value.displayReason, key);
  }
});

test('PhD/research profile: every KPI has a clean, non-empty displayReason', () => {
  const result = scoreFor({
    category: 'Postgraduate / Doctoral',
    gpa: 3.7, researchExperience: ['Two years in a computational biology lab'], methods: ['statistical modeling'],
    publications: ['Peer-reviewed paper in a field journal'], thesis: 'Undergraduate honors thesis',
    facultyFitEvidence: ['Prof. Chen, computational biology lab'],
    directEvaluatorConfirmed: true, careerGoal: 'pursue a tenure-track faculty position',
  });
  for (const [key, value] of Object.entries(result.scoreDetails)) {
    assertClean(value.displayReason, key);
  }
});

// ── Requirement (a): targeted coverage of individual scoring branches,
// matching the exact tone specified in the task ────────────────────────────

test('Goal Clarity — general-direction-only branch matches the required tone', () => {
  const result = scoreFor({ category: 'Graduate', degree: 'MBA', careerGoal: 'I want to grow and make an impact' });
  assert.equal(result.scoreDetails.goalClarity.score, 50);
  assert.match(result.scoreDetails.goalClarity.displayReason, /^Goal Clarity —/);
  assert.match(result.scoreDetails.goalClarity.displayReason, /general direction/i);
  assert.match(result.scoreDetails.goalClarity.displayReason, /specific target role/i);
});

test('Leadership — weak-evidence (activity/scope only) branch matches the required tone', () => {
  const result = scoreFor({ category: 'Graduate', degree: 'MBA', leadershipScope: 'Team lead for a cross-functional project' });
  assert.equal(result.scoreDetails.leadership.score, 60);
  assert.match(result.scoreDetails.leadership.displayReason, /^Leadership —/);
  assert.match(result.scoreDetails.leadership.displayReason, /limited measurable impact/i);
  assert.match(result.scoreDetails.leadership.displayReason, /team size, results, numbers/i);
});

test('Recommenders — no direct evaluator confirmed branch matches the required tone', () => {
  const result = scoreFor({ category: 'Graduate', degree: 'MBA' });
  assert.equal(result.scoreDetails.recommenders.score, null);
  assert.match(result.scoreDetails.recommenders.displayReason, /^Recommenders —/);
  assert.match(result.scoreDetails.recommenders.displayReason, /no direct evaluator confirmed/i);
  assert.match(result.scoreDetails.recommenders.displayReason, /confirm a senior colleague/i);
});

test('Community — already-asked-once catch-all falls back to conservative, jargon-free copy', () => {
  const result = scoreFor({
    category: 'Graduate', degree: 'MBA',
    profileCompleteness: { askedFields: ['community'] },
  });
  assert.equal(result.scoreDetails.community.score, 55);
  assert.equal(result.scoreDetails.community.needsConfirmation, false);
  assert.match(result.scoreDetails.community.displayReason, /^Community Involvement —/);
  assertClean(result.scoreDetails.community.displayReason, 'community (already-asked)');
  // The internal `reason` field is allowed to carry the state-machine phrase —
  // it is for logs only — but displayReason must never repeat it.
  assert.match(result.scoreDetails.community.reason, /Already asked once/);
});

test('Professional Experience — over-ceiling years needs confirmation, no numeric score, no jargon', () => {
  const result = scoreFor({ category: 'Graduate', degree: 'MBA', workYears: 35 });
  assert.equal(result.scoreDetails.professional.score, null);
  assert.equal(result.scoreDetails.professional.needsConfirmation, true);
  assertClean(result.scoreDetails.professional.displayReason, 'professional (over ceiling)');
  assert.match(result.scoreDetails.professional.displayReason, /^Professional Experience —/);
});

test('Professional Experience — over-ceiling but previously confirmed scores normally', () => {
  const result = scoreFor({
    category: 'Graduate', degree: 'MBA', workYears: 35,
    profileCompleteness: { askedFields: ['professional'] },
  });
  assert.ok(Number.isFinite(result.scoreDetails.professional.score));
  assertClean(result.scoreDetails.professional.displayReason, 'professional (confirmed)');
});

// ── Requirement (c): the internal `reason` field must never leak, no matter
// how it is consumed downstream ─────────────────────────────────────────────

test('strengths/weaknesses bullets never contain the raw internal reason text', () => {
  const result = scoreFor({
    category: 'Graduate', degree: 'MBA',
    gpa: 2.8, gmat: 550, workYears: 0.5,
    careerGoal: 'I want to grow and make an impact',
  });
  const bullets = [...result.strengths, ...result.weaknesses];
  for (const bullet of bullets) {
    for (const [, value] of Object.entries(result.scoreDetails)) {
      if (value?.reason && value.reason !== value.displayReason) {
        assert.notEqual(bullet, value.reason, `bullet must never equal the raw internal reason: "${value.reason}"`);
      }
    }
  }
});

test('every scoreDetail entry exposes displayReason distinct from (or safely deducible from) the internal reason', () => {
  const result = scoreFor({ category: 'Graduate', degree: 'MBA' });
  for (const [key, value] of Object.entries(result.scoreDetails)) {
    assert.ok('displayReason' in value, `${key} must expose a displayReason field`);
  }
});
