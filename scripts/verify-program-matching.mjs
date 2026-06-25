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
    name: 'Darden',
    tier: 'safe',
    fit: 49,
    admissionStatus: 'Competitive',
    programGroup: 'MBA',
    avgGMAT: 720,
    acceptanceRate: 35,
  },
  {
    name: 'Michigan Ross',
    tier: 'safe',
    fit: 80,
    admissionStatus: 'Competitive',
    programGroup: 'MBA',
    avgGMAT: 720,
    acceptanceRate: 40,
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
  assert.equal(byName.get(name).selectivityLabel, 'Ultra competitive', `${name} should carry Ultra competitive tag`);
  assert.equal(byName.get(name).selectivitySource, 'm7_rule', `${name} should use M7 selectivity rule`);
}

assert.equal(byName.get('Harvard MBA').tier, 'safe', 'Harvard MBA synonym should normalize to STRONG FIT');
assert.equal(byName.get('Harvard MBA').selectivityLabel, 'Ultra competitive', 'formula/M7 rule should override wrong provided selectivity');
assert.equal(byName.get('Harvard MBA').selectivitySource, 'm7_rule', 'formula should run before LLM fallback');

assert.equal(byName.get('Darden').tier, 'safe', 'Darden should normalize to STRONG FIT when more selective MBA programs are Strong Fit and no specific mismatch exists');
assert.equal(byName.get('Darden').admissionStatus, 'Strong', 'Darden visible fit status should normalize to Strong Fit');
assert.equal(byName.get('Michigan Ross').tier, 'safe', 'Ross should normalize to STRONG FIT when more selective MBA programs are Strong Fit and no specific mismatch exists');
assert.equal(byName.get('Michigan Ross').admissionStatus, 'Strong', 'Ross visible fit status should normalize to Strong Fit');

const orderedTiers = adamMbaPrograms.map((program) => program.tier);
assert.deepEqual(
  [...new Set(orderedTiers)],
  ['safe'],
  'programs should sort green first, then yellow, then red; locked would come last',
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

console.log('Program matching regression checks passed.');
