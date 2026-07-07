import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateFacts, buildComplementaryQuestion, isAdvanceRequest, isSchoolListRequest } from '../candidate-facts.js';

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
      category: 'Graduate', degree: 'MBA', workYears: 6,
      leadershipEvidence: 'Led a team', careerProgression: 'Promoted twice', achievementsImpact: 'Built a new product',
      schoolChoice: 'recommendations',
      profileCompleteness: { askedFields: ['targetGeography', 'postMbaGoal', 'schoolChoice'] },
    },
    profileSources: { fileText: 'MBA candidate with six years of experience, two promotions, team leadership, and product-launch impact.' },
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

test('strong source-backed MBA profile scores without GMAT or exact GPA', () => {
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    profileSources: { fileText: 'EY consultant from 2018 to present. Promoted twice. Led a 12-person diligence team and closed a major transaction.' },
    profile: {
      category: 'Graduate', degree: 'MBA', workYears: 6,
      leadershipEvidence: 'Led a 12-person diligence team', careerProgression: 'Promoted twice',
      achievementsImpact: 'Closed a major transaction', whyMBA: 'Build investing skills',
      postMbaGoal: 'Join a large private equity fund', schoolChoice: 'recommendations', destination: 'USA',
    },
  });
  assert.equal(facts.hasStrongProfileBaseline, true);
  assert.equal(facts.readyForScoring, true);
  assert.equal(facts.readyForPrograms, true);
  assert.equal(facts.gmat, undefined);
  assert.equal(facts.gpa, undefined);
});

test('missing recommender titles and exception screening never block MBA scoring', () => {
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    profileSources: { additionalText: 'Senior operator. Led 30 people, earned two promotions, and delivered $20m impact.' },
    profile: {
      category: 'Graduate', degree: 'MBA', workYears: 7,
      leadershipEvidence: 'Led 30 people', careerProgression: 'Two promotions', achievementsImpact: '$20m impact',
      whyMBA: 'Transition into investing', postMbaGoal: 'Private equity investor', destination: 'USA',
      schoolChoice: 'recommendations',
    },
  });
  assert.equal(facts.readyForScoring, true);
  assert.ok(!facts.profileCompleteness.missingFields.includes('recommenders'));
  assert.ok(!facts.profileCompleteness.missingFields.includes('exceptionType'));
});

test('school-list intent unlocks recommendations immediately after scoring', () => {
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    profileSources: { pastedText: 'Consultant with 6 years experience, promotions, transaction impact, and military leadership.' },
    profile: {
      category: 'Graduate', degree: 'MBA', workYears: 6,
      leadershipEvidence: 'Military commander', careerProgression: 'Promoted', achievementsImpact: 'Major transaction',
      whyMBA: 'Move into investing', postMbaGoal: 'Large PE fund', destination: 'USA',
    },
    messages: [{ role: 'user', text: 'show my school list' }],
  });
  assert.equal(isSchoolListRequest('show my school list'), true);
  assert.equal(facts.schoolChoice, 'recommendations');
  assert.equal(facts.advanceRequested, true);
  assert.equal(facts.readyForPrograms, true);
  assert.equal(buildComplementaryQuestion(facts), '');
});

test('PhD follow-ups skip CV-known research KPIs and ask one question at a time', () => {
  const phdCv = 'PhD applicant. MSc thesis on graph neural networks for protein folding. Publications: two first-author papers at NeurIPS. Research assistant, computational biology lab, 3 years.';
  const facts = buildCandidateFacts({
    candidateType: 'Postgraduate / Doctoral',
    profileSources: { fileText: phdCv },
    profile: { category: 'Postgraduate / Doctoral', degree: 'PhD', thesis: 'Graph neural networks for protein folding', research: phdCv, publications: 'Two first-author NeurIPS papers' },
  });
  // Field/thesis/publications are in the CV — never re-asked.
  assert.ok(!facts.profileCompleteness.criticalMissingFields.includes('researchField'));
  // Exactly one question per turn, starting with the highest-priority gap.
  assert.equal(facts.nextQuestionFields.length, 1);
  const question = buildComplementaryQuestion(facts);
  assert.match(question, /research interests|problems or questions/i);
  assert.doesNotMatch(question, /field or specialization/i);
});

test('PhD follow-ups move to the next missing KPI once one was asked', () => {
  const phdCv = 'PhD applicant. MSc thesis on graph neural networks. Two publications.';
  const facts = buildCandidateFacts({
    candidateType: 'Postgraduate / Doctoral',
    profileSources: { fileText: phdCv },
    profile: { category: 'Postgraduate / Doctoral', degree: 'PhD', thesis: 'Graph neural networks', publications: 'Two papers' },
    messages: [{ role: 'ai', text: 'Research interests — what problems or questions do you want to work on?' }],
  });
  assert.equal(facts.nextQuestionFields.length, 1);
  assert.notEqual(facts.nextQuestionFields[0], 'researchDirection');
});

test('sparse PhD profile starts the one-at-a-time flow with the research field', () => {
  const facts = buildCandidateFacts({
    candidateType: 'Postgraduate / Doctoral',
    profile: { category: 'Postgraduate / Doctoral', degree: 'PhD' },
  });
  assert.deepEqual(facts.nextQuestionFields, ['researchField']);
  assert.match(buildComplementaryQuestion(facts), /field or specialization/i);
});

test('consolidated follow-up contains at most three matching-critical bullets', () => {
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    profileSources: { fileText: 'Senior consultant with promotions, deal impact, and team leadership.' },
    profile: {
      category: 'Graduate', degree: 'MBA', workYears: 5,
      leadershipEvidence: 'Led a team', careerProgression: 'Promoted', achievementsImpact: 'Deal impact', whyMBA: 'Career transition',
    },
  });
  const question = buildComplementaryQuestion(facts);
  assert.ok((question.match(/^• /gm) || []).length <= 3);
  assert.match(question, /Target geography/i);
  assert.match(question, /Post-degree goal/i);
  assert.match(question, /School path/i);
  assert.doesNotMatch(question, /recommender|exception|language|international/i);
});
