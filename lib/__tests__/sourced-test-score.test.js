import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateFacts } from '../candidate-facts.js';
import { normalizeProfileFacts } from '../profile-facts.js';
import { scoreCandidateKPIs } from '../kpi-engine.js';
import { mergeSourcedTestScore } from '../deterministic-kpi-response.js';

// Regression: a standardized test score present in the candidate's resume must
// count toward scoring even when the model fails to echo it into its <PROFILE>
// patch. Previously the deterministic extraction (buildCandidateFacts) had the
// GMAT but the scorer read only profile.gmat, so the score stayed `incomplete`
// and the candidate was asked to confirm a test that was already in their CV.
const RESUME = `TAL YOGEV
EDUCATION
Reichman University, BA Business Administration
EXPERIENCE
EY Senior Transaction Diligence 2022-Present
GMAT 750
LANGUAGES
Hebrew and English`;

test('a resume-extracted GMAT the model did not echo is still scored', () => {
  const profile = { category: 'Graduate', degree: 'MBA' }; // no gmat echoed
  const candidateFacts = buildCandidateFacts({
    cvExtraction: RESUME,
    profileSources: { fileText: RESUME },
    profile,
    candidateType: 'Graduate',
  });
  assert.equal(candidateFacts.gmat, 750, 'extraction reads the GMAT from the resume');

  // Without the bridge the scorer sees no test score:
  const before = normalizeProfileFacts(profile, {}, {});
  assert.equal(before.testing.testScore, null);
  assert.equal(before.testing.missingTest, true);

  // With the bridge the extracted GMAT reaches the scorer:
  const bridged = mergeSourcedTestScore(profile, candidateFacts);
  const facts = normalizeProfileFacts(bridged, {}, {});
  assert.equal(facts.testing.testScore, 750);
  assert.equal(facts.testing.missingTest, false);

  const scored = scoreCandidateKPIs(facts, bridged);
  assert.equal(scored.scoreDetails.testScore.status, 'scored');
  assert.ok(!scored.confirmationsNeeded.includes('testScore'), 'no longer asks to confirm a score already in the resume');
});

test('mergeSourcedTestScore never overrides a test signal the profile already carries', () => {
  assert.equal(mergeSourcedTestScore({ gmat: 700 }, { gmat: 750 }).gmat, 700);
  assert.equal(mergeSourcedTestScore({ testOptional: true }, { gmat: 750 }).gmat, undefined);
  assert.equal(mergeSourcedTestScore({ testScore: 'GRE 320' }, { gmat: 750 }).gmat, undefined);
});

test('mergeSourcedTestScore bridges only the test score, never soft evidence', () => {
  const candidateFacts = { gmat: 750, leadershipEvidence: ['Led a team of 10'], achievementsImpact: ['Grew revenue 20%'] };
  const bridged = mergeSourcedTestScore({ category: 'Graduate' }, candidateFacts);
  assert.equal(bridged.gmat, 750);
  assert.equal(bridged.leadershipEvidence, undefined);
  assert.equal(bridged.achievementsImpact, undefined);
});

test('the strongest single test is bridged when several are present', () => {
  assert.equal(mergeSourcedTestScore({}, { gmat: 750, gre: 328 }).gmat, 750);
  assert.equal(mergeSourcedTestScore({}, { gre: 328, sat: 1500 }).gre, 328);
  assert.equal(mergeSourcedTestScore({}, {}).gmat, undefined);
});
