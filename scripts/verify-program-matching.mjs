import assert from 'node:assert/strict';
import { normalizeProgramList } from '../lib/program-normalizer.js';
import { computeFit } from '../lib/scoring.js';

const adamMbaPrograms = normalizeProgramList([
  {
    name: 'Harvard Business School',
    tier: 'stretch',
    fit: 82,
    admissionStatus: 'Strong',
    programGroup: 'MBA',
    avgGMAT: 730,
    avgGPA: 3.7,
    acceptanceRate: 12,
    evidenceGaps: [],
    riskFlags: [],
  },
  {
    name: 'Stanford GSB',
    tier: 'stretch',
    fit: 84,
    admissionStatus: 'Strong',
    programGroup: 'MBA',
    avgGMAT: 738,
    avgGPA: 3.8,
    acceptanceRate: 6,
  },
  {
    name: 'Wharton',
    tier: 'possible',
    fit: 83,
    admissionStatus: 'Strong',
    programGroup: 'MBA',
    avgGMAT: 728,
    avgGPA: 3.6,
    acceptanceRate: 20,
  },
  {
    name: 'Indiana Kelley',
    tier: 'safe',
    fit: 58,
    admissionStatus: 'Plausible',
    programGroup: 'MBA',
    avgGMAT: 685,
    acceptanceRate: 38,
    notes: 'Lower strategic value for PE/deep-tech outcomes.',
  },
  {
    name: 'Emory Goizueta',
    tier: 'safe',
    fit: 60,
    admissionStatus: 'Plausible',
    programGroup: 'MBA',
    avgGMAT: 700,
    acceptanceRate: 37,
    notes: 'Less aligned with top-tier private equity recruiting.',
  },
  {
    name: 'Regional Part-Time MBA',
    tier: 'safe',
    fit: 65,
    admissionStatus: 'Competitive',
    programGroup: 'MBA',
    avgGMAT: 650,
    acceptanceRate: 70,
    riskFlags: ['Format mismatch for full-time global outcome'],
  },
  {
    name: 'Harvard MBA',
    tier: 'stretch',
    fit: 82,
    admissionStatus: 'Strong',
    programGroup: 'MBA',
    selectivityLabel: 'Accessible',
    selectivitySource: 'llm_wrong',
  },
]);

const byName = new Map(adamMbaPrograms.map((program) => [program.name, program]));

for (const name of ['Harvard Business School', 'Stanford GSB', 'Wharton']) {
  assert.equal(byName.get(name).tier, 'safe', `${name} should be STRONG FIT when fit > 80`);
  assert.equal(byName.get(name).selectivityLabel, 'Ultra Competitive', `${name} should carry Ultra Competitive tag`);
  assert.equal(byName.get(name).selectivitySource, 'weighted_selectivity', `${name} should use weighted selectivity`);
}

assert.equal(byName.get('Harvard MBA').tier, 'safe', 'Harvard MBA synonym should normalize to STRONG FIT');
assert.equal(byName.get('Harvard MBA').selectivityLabel, 'Ultra Competitive', 'weighted formula should override wrong provided selectivity');
assert.equal(byName.get('Harvard MBA').selectivitySource, 'weighted_reputation', 'weighted reputation should run before LLM fallback');

assert.equal(byName.get('Indiana Kelley').tier, 'safe', 'Indiana should become STRONG FIT when HBS is strong and no real mismatch exists');
assert.equal(byName.get('Indiana Kelley').fit, 81, 'Indiana should be raised to a strong-fit floor');
assert.equal(byName.get('Indiana Kelley').admissionStatus, 'Strong', 'Indiana should not remain Plausible merely because it is less selective');
assert.match(byName.get('Indiana Kelley').notes, /lower strategic value|weaker strategic fit/i, 'Indiana should explain strategic-fit caveat in notes');
assert.equal(byName.get('Emory Goizueta').tier, 'safe', 'Emory should become STRONG FIT when HBS is strong and no real mismatch exists');
assert.equal(byName.get('Regional Part-Time MBA').tier, 'possible', 'real format mismatch should preserve weaker fit');

const orderedTiers = adamMbaPrograms.map((program) => program.tier);
assert.deepEqual(
  [...new Set(orderedTiers)],
  ['safe', 'possible'],
  'programs should sort green first, then yellow; red and locked would follow if present',
);

const strongAdamFit = computeFit({
  gpa: 4.0,
  testScore: 760,
  exceptionType: 'true',
  softScores: {
    professional: 95,
    leadership: 100,
    volunteering: 95,
    uniqueness: 100,
    diversity: 80,
    goalClarity: 95,
  },
}, {
  medianGPA: 3.7,
  medianTest: 730,
  acceptanceRate: 12,
});

assert.equal(strongAdamFit.tier, 'safe', 'high-fit Adam MBA profile should compute as STRONG FIT');
assert.ok(strongAdamFit.fit > 80, 'high-fit Adam MBA profile should remain >80 despite HBS selectivity');

const partialExceptionGap = computeFit({
  gpa: 3.0,
  testScore: 650,
  exceptionType: 'partial',
  softScores: {
    professional: 100,
    leadership: 100,
    volunteering: 100,
    uniqueness: 100,
    diversity: 100,
    goalClarity: 100,
  },
}, {
  medianGPA: 3.7,
  medianTest: 730,
});

assert.equal(partialExceptionGap.tier, 'stretch', 'partial exceptions with severe gates should stay LOW FIT');
assert.ok(partialExceptionGap.fit < 50, 'partial exceptions with severe gates should not normalize to WORKABLE/STRONG FIT');

const lowEvidenceLawPrograms = normalizeProgramList([
  {
    name: 'Yale Law LLM',
    fit: 75,
    tier: 'possible',
    admissionStatus: 'Competitive',
    programGroup: 'LLM',
    admitRate: 6.9,
    selectivityLabel: 'Ultra Competitive',
    evidenceGaps: ['Recommendation strategy pending'],
  },
  {
    name: 'Harvard Law LLM',
    fit: 78,
    tier: 'possible',
    admissionStatus: 'Competitive',
    programGroup: 'LLM',
    admitRate: 7.7,
    selectivityLabel: 'Ultra Competitive',
  },
], {
  scores: { overall: 63 },
  scoreDetails: {
    research: { status: 'incomplete' },
    recommenders: { status: 'incomplete' },
    narrative: { status: 'incomplete' },
    testScore: { status: 'incomplete' },
  },
});
const yaleLaw = lowEvidenceLawPrograms.find(program => program.name === 'Yale Law LLM');
const harvardLaw = lowEvidenceLawPrograms.find(program => program.name === 'Harvard Law LLM');
assert.ok(yaleLaw.fit < 40, 'Yale Law under 8% admit rate and under-65 overall should be capped below 40');
assert.equal(yaleLaw.fitIndex, yaleLaw.fit, 'fitIndex should mirror the calibrated fit');
assert.equal(yaleLaw.tier, 'stretch', 'Yale Law should not remain Competitive Fit after calibration');
assert.equal(yaleLaw.admissionStatus, 'Reach', 'Sub-50 calibrated programs should be admissionStatus Reach');
assert.ok(harvardLaw.fit < 40, 'Harvard Law under 8% admit rate and under-65 overall should be capped below 40');

console.log('Program matching regression checks passed.');
