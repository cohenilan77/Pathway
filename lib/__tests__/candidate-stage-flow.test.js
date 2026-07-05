import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRADUATE_DEGREE_OPTIONS,
  GRADUATE_DEGREE_PROMPT,
  GRADUATE_DEGREE_OTHER_PROMPT,
  needsGraduateDegree,
  resolveGraduateDegreeChoice,
  computeStageAdvancement,
  narrativeHasStarted,
  requiredNextStage,
  requestedStage,
  explainIfTooEarly,
} from '../candidate-stage-flow.js';

const STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV', 'Essay', 'Interview'];
// The same "→ a | b | c" bubble parser the chat UI uses.
function parseBubbles(text) {
  const match = /→\s*(.+)$/.exec(text || '');
  if (!match) return null;
  return match[1].split('|').map((o) => o.trim()).filter(Boolean);
}

// --- 1. Graduate bubbles render correctly ----------------------------------

test('graduate degree prompt renders the requested clickable bubbles', () => {
  assert.deepEqual(GRADUATE_DEGREE_OPTIONS, ['MBA', 'LLM', 'MA', 'MSc', "Master's", 'MD', 'Other']);
  const bubbles = parseBubbles(GRADUATE_DEGREE_PROMPT);
  assert.deepEqual(bubbles, ['MBA', 'LLM', 'MA', 'MSc', "Master's", 'MD', 'Other']);
});

test('graduate track waits for a specific degree before proceeding', () => {
  assert.equal(needsGraduateDegree({ category: 'Graduate', degree: 'Graduate' }), true);
  assert.equal(needsGraduateDegree({ category: 'Graduate', degree: '' }), true);
  assert.equal(needsGraduateDegree({ category: 'Graduate', degree: 'MBA' }), false);
  assert.equal(needsGraduateDegree({ category: 'Undergraduate', degree: 'Undergraduate' }), false);
  assert.equal(needsGraduateDegree({}), false);
});

// --- 2. Free-text degree works ---------------------------------------------

test('clicked graduate bubbles save category + degree', () => {
  assert.deepEqual(resolveGraduateDegreeChoice('MBA'), { category: 'Graduate', degree: 'MBA' });
  assert.deepEqual(resolveGraduateDegreeChoice("Master's"), { category: 'Graduate', degree: "Master's" });
});

test('free-text degrees outside the bubbles are accepted verbatim', () => {
  assert.deepEqual(resolveGraduateDegreeChoice('MFin'), { category: 'Graduate', degree: 'MFin' });
  assert.deepEqual(resolveGraduateDegreeChoice('Data Science'), { category: 'Graduate', degree: 'Data Science' });
  assert.deepEqual(resolveGraduateDegreeChoice('  Finance  '), { category: 'Graduate', degree: 'Finance' });
});

test('Other asks for the exact degree and keeps waiting', () => {
  assert.deepEqual(resolveGraduateDegreeChoice('Other'), { other: true });
  assert.equal(resolveGraduateDegreeChoice(''), null);
  assert.match(GRADUATE_DEGREE_OTHER_PROMPT, /exact degree or field/i);
});

// --- 3. Programs → choose schools → narrative ------------------------------

test('analysis advances to the school list once programs exist', () => {
  const next = computeStageAdvancement({
    stepIdx: 2, steps: STEPS, parsed: { programs: [{ name: 'A' }] },
  });
  assert.equal(next, STEPS.indexOf('Programs'));
});

test('the school list advances to narrative only after schools are chosen', () => {
  const before = computeStageAdvancement({ stepIdx: 3, steps: STEPS, parsed: {}, chosenSchools: [] });
  assert.equal(before, null, 'no chosen schools yet → stay on the program list');

  const after = computeStageAdvancement({ stepIdx: 3, steps: STEPS, parsed: { chosenSchools: ['MIT'] } });
  assert.equal(after, STEPS.indexOf('Narrative'));

  const afterState = computeStageAdvancement({ stepIdx: 3, steps: STEPS, parsed: {}, chosenSchools: ['MIT'] });
  assert.equal(afterState, STEPS.indexOf('Narrative'));
});

test('target-selection-looking text alone does NOT move to Narrative', () => {
  // A message that reads like a selection, but no chosen schools saved yet,
  // must keep the candidate on the program list.
  const next = computeStageAdvancement({
    stepIdx: 3, steps: STEPS,
    userText: "I'd like to move forward with: MIT | Stanford",
    aiText: 'Great picks — want to lock these in?',
    parsed: {}, chosenSchools: [], narrative: null,
  });
  assert.equal(next, null);
});

test('saved chosenSchools DOES move to Narrative (parsed or state)', () => {
  const viaParsed = computeStageAdvancement({ stepIdx: 3, steps: STEPS, parsed: { chosenSchools: ['MIT'] } });
  assert.equal(viaParsed, STEPS.indexOf('Narrative'));
  const viaState = computeStageAdvancement({ stepIdx: 3, steps: STEPS, parsed: {}, chosenSchools: ['MIT'] });
  assert.equal(viaState, STEPS.indexOf('Narrative'));
});

test('after schools are chosen the narrative & strategy message is shown', () => {
  const required = requiredNextStage({ scores: { overall: 70 }, programs: [{ name: 'A' }], chosenSchools: ['MIT'], narrative: null });
  assert.equal(required.stage, 'Narrative & Strategy');
  assert.match(required.message, /Now let’s shape your Narrative & Strategy\./);
});

// --- 4. CV cannot start before narrative -----------------------------------

test('narrativeHasStarted keys off chosen schools or a chosen narrative', () => {
  assert.equal(narrativeHasStarted({ chosenSchools: [], narrative: null }), false);
  assert.equal(narrativeHasStarted({ chosenSchools: ['MIT'], narrative: null }), true);
  assert.equal(narrativeHasStarted({ chosenSchools: [], narrative: 'upgrade' }), true);
});

test('CV never starts before the narrative stage, even if the reply mentions CV', () => {
  // On the program list, no chosen schools: an advisor reply mentioning "CV"
  // and "resume" must not jump the candidate to the CV stage.
  const stuck = computeStageAdvancement({
    stepIdx: 3, steps: STEPS,
    aiText: 'Have you updated your CV or resume recently?',
    userText: 'ok', parsed: {}, chosenSchools: [], narrative: null,
  });
  assert.equal(stuck, null);

  // Even standing on the narrative step, an incidental CV mention in the reply
  // (with no candidate intent) must not advance.
  const incidental = computeStageAdvancement({
    stepIdx: 4, steps: STEPS,
    aiText: 'This story will strengthen your CV and resume.',
    userText: 'tell me more', parsed: {}, chosenSchools: ['MIT'], narrative: null,
  });
  assert.equal(incidental, null);
});

test('CV starts once the narrative stage began and the candidate asks for it', () => {
  const next = computeStageAdvancement({
    stepIdx: 4, steps: STEPS,
    aiText: 'Great, let us look at your CV.',
    userText: 'Help me optimize my CV for my target schools.',
    parsed: {}, chosenSchools: ['MIT'], narrative: 'upgrade',
  });
  assert.equal(next, STEPS.indexOf('CV'));
});

test('explainIfTooEarly guards a CV request made before narrative', () => {
  const msg = explainIfTooEarly(
    { scores: { overall: 70 }, programs: [{ name: 'A' }], chosenSchools: [], narrative: null },
    'Can we work on my CV now?',
  );
  assert.match(msg, /choose your target schools/i);
});

// --- 5. Essay cannot start before CV unlock --------------------------------

test('essays do not start before the CV stage is unlocked', () => {
  const early = computeStageAdvancement({
    stepIdx: 4, steps: STEPS,
    aiText: 'Let us talk essays.', userText: 'Start my essays', parsed: {},
    chosenSchools: ['MIT'], narrative: 'upgrade',
  });
  assert.equal(early, null, 'essays must wait for the CV stage');

  const unlocked = computeStageAdvancement({
    stepIdx: STEPS.indexOf('CV'), steps: STEPS,
    aiText: 'Your CV is ready — next are essays.', userText: 'What essays do I need?', parsed: {},
    chosenSchools: ['MIT'], narrative: 'upgrade',
  });
  assert.equal(unlocked, STEPS.indexOf('Essay'));
});

test('requestedStage recognizes jump-ahead intents; explainIfTooEarly blocks them', () => {
  assert.equal(requestedStage('help me start my essays'), 'Essays');
  assert.equal(requestedStage('can we do interview prep'), 'Interviews');
  assert.equal(requestedStage('just chatting'), null);

  const essayTooEarly = explainIfTooEarly(
    { scores: { overall: 70 }, programs: [{ name: 'A' }], chosenSchools: ['MIT'], narrative: 'upgrade', cvUnlocked: false },
    'let us start essays',
  );
  assert.match(essayTooEarly, /CV/i);
});
