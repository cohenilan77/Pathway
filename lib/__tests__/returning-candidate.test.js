import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReturningCandidateMessage } from '../returning-candidate.js';

const base = { user: { name: 'Maya Cohen' }, profile: { name: 'Maya Cohen', category: 'Undergraduate' }, scores: { overall: 70 }, chat: [{}, {}, {}] };

test('first login does not receive a returning-candidate message', () => {
  assert.equal(buildReturningCandidateMessage({ user: { name: 'New User' }, chat: [{}, {}] }), null);
});

test('returning undergrad receives the real next action with clickable choices', () => {
  const message = buildReturningCandidateMessage(base);
  assert.match(message, /^Welcome back, Maya\./);
  assert.match(message, /generating your university list/);
  assert.match(message, /→ Generate my school list \| Review my profile$/);
});

test('returning undergrad with a saved session summary gets a welcome-back recap + today focus', () => {
  const message = buildReturningCandidateMessage({
    ...base,
    scores: null,
    undergrad: { lastSessionSummary: { text: 'we mapped out your Math Team leadership story', at: 1 }, nextStep: 'Register for the Math Olympiad' },
  });
  assert.match(message, /^Welcome back, Maya! 👋/);
  assert.match(message, /Last time: we mapped out your Math Team leadership story/);
  assert.match(message, /Today, let's register for the Math Olympiad\./);
  assert.match(message, /→ Let's do it \| Catch me up \| Something changed$/);
});

test('returning undergrad with no saved summary still falls through to the generic next step', () => {
  const message = buildReturningCandidateMessage(base); // no undergrad summary
  assert.match(message, /generating your university list/);
});

test('returning graduate advances from programs to target selection', () => {
  const message = buildReturningCandidateMessage({ ...base, profile: { category: 'Graduate' }, programs: [{ name: 'A' }] });
  assert.match(message, /choosing your target schools/);
});

test('returning personal-development candidate gets a track-appropriate next step', () => {
  const message = buildReturningCandidateMessage({ ...base, profile: { category: 'Personal Development' } });
  assert.match(message, /development strategy/);
  assert.doesNotMatch(message, /school/);
});
