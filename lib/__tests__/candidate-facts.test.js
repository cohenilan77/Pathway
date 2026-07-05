import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateFacts, buildComplementaryQuestion, isAdvanceRequest } from '../candidate-facts.js';

const talProfile = {
  category: 'Graduate',
  degree: 'MBA',
  workYears: 6,
  careerProgression: 'Reached the top of the consulting profession in a small market',
  achievementsImpact: ['$800M M&A transaction'],
  gpa: 3.8,
  gmat: 750,
};

const talHistory = [
  { role: 'user', text: 'motivation is to expand knowledge, get tools and network to transition to PE, as for narrative work later' },
  { role: 'user', text: 'post mba - short term large PE, long term start my own deep tech fund' },
  { role: 'user', text: 'glass ceiling, Israel is a small market, so now is the time to transition' },
  { role: 'user', text: 'military commander in charge of 90 soldiers' },
];

test('extracts MBA motivation, why-now, goal, and command evidence from conversational language', () => {
  const facts = buildCandidateFacts({ profile: talProfile, messages: talHistory, candidateType: 'MBA' });
  assert.match(facts.whyMBA, /motivation/i);
  assert.match(facts.whyNow, /glass ceiling/i);
  assert.match(facts.postMbaGoal, /post mba/i);
  assert.ok(facts.leadershipEvidence.some(item => /90 soldiers/i.test(item)));
  assert.ok(!facts.profileCompleteness.missingFields.includes('whyMBA'));
  assert.ok(!facts.profileCompleteness.missingFields.includes('postMbaGoal'));
});

test('explicit continuation advances with best available facts instead of repeating the checklist', () => {
  const messages = [...talHistory, { role: 'user', text: 'Please advance to the next step of the pipeline and ask the appropriate next question.' }];
  const facts = buildCandidateFacts({ profile: talProfile, messages, candidateType: 'MBA' });
  assert.equal(facts.advanceRequested, true);
  assert.equal(facts.readyForScoring, true);
  assert.equal(buildComplementaryQuestion(facts), '');
});

test('recognizes common continuation and portfolio commands', () => {
  assert.equal(isAdvanceRequest('Continue my analysis.'), true);
  assert.equal(isAdvanceRequest('Recommend my portfolio'), true);
  assert.equal(isAdvanceRequest('extract from cv'), true);
  assert.equal(isAdvanceRequest('What is missing from my profile?'), false);
});

test('retains an MBA choice from chat when profile category is only Graduate', () => {
  const facts = buildCandidateFacts({
    profile: { ...talProfile, degree: undefined },
    messages: [{ role: 'user', text: 'MBA' }, ...talHistory],
    candidateType: 'Graduate',
  });
  assert.equal(facts.selectedCandidateType, 'MBA');
  assert.equal(facts.degree, 'MBA');
  assert.ok(!facts.profileCompleteness.missingFields.includes('narrative'));
});

test('a completed one-time checklist cannot become a permanent hard gate', () => {
  const facts = buildCandidateFacts({
    profile: {
      category: 'Graduate', degree: 'MBA', gpa: 3.8, gmat: 750,
      profileCompleteness: { askedFields: ['workYears', 'leadershipEvidence', 'careerProgression', 'achievementsImpact'] },
    },
    messages: [
      { role: 'user', text: 'motivation is to gain investing tools and network to transition to PE' },
      { role: 'user', text: 'post MBA I want to work in private equity' },
    ],
    candidateType: 'MBA',
  });
  assert.equal(facts.nextMissingFields.length, 0);
  assert.equal(facts.readyForScoring, true);
  assert.equal(buildComplementaryQuestion(facts), '');
});
