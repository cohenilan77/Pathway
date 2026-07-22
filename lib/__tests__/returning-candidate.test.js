import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReturningCandidateMessage } from '../returning-candidate.js';

const base = { user: { name: 'Maya Cohen' }, profile: { name: 'Maya Cohen', category: 'Undergraduate' }, scores: { overall: 70 }, chat: [{}, {}, {}] };

test('first login does not receive a returning-candidate message', () => {
  assert.equal(buildReturningCandidateMessage({ user: { name: 'New User' }, chat: [{}, {}] }), null);
});

test('returning undergrad without a saved summary gets a warm coaching welcome, not a school-list push', () => {
  const message = buildReturningCandidateMessage(base);
  assert.match(message, /^Welcome back, Maya! 👋/);
  assert.doesNotMatch(message, /university list|Generate my school list/);
  assert.match(message, /→ What should I focus on\? \| Continue building my profile$/);
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

test('a brand-new undergrad (no summary, no real history) gets no returning message — onboarding handles it', () => {
  const message = buildReturningCandidateMessage({ ...base, scores: null, chat: [{}] });
  assert.equal(message, null);
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
