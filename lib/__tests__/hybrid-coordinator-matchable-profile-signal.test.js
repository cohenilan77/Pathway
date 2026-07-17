import test from 'node:test';
import assert from 'node:assert/strict';

import { hasMatchableProfileSignal } from '../hybrid-coordinator.js';

test('a completed PhD chip-flow profile with no scores is matchable', () => {
  const candidateState = {
    profile: {
      category: 'Postgraduate / Doctoral',
      degree: 'PhD',
      field: 'Finance',
      researchInterests: 'asset pricing',
      goals: 'faculty',
      destination: 'Open / Global',
      gpa: '3.8',
    },
  };
  assert.equal(hasMatchableProfileSignal(candidateState), true);
});

test('a bare name/category profile is not matchable', () => {
  const candidateState = { profile: { name: 'Alex', category: 'Postgraduate / Doctoral' } };
  assert.equal(hasMatchableProfileSignal(candidateState), false);
});

test('a scores object is always a fast-path match regardless of profile content', () => {
  assert.equal(hasMatchableProfileSignal({ scores: { overall: 70 }, profile: {} }), true);
});

test('an explicit hasStrongProfileBaseline flag on profileCompleteness is a fast-path match', () => {
  const candidateState = { profile: { name: 'Alex', profileCompleteness: { hasStrongProfileBaseline: true } } };
  assert.equal(hasMatchableProfileSignal(candidateState), true);
});

test('an explicit hasStrongProfileBaseline flag on candidateFacts is a fast-path match', () => {
  const candidateState = { profile: { name: 'Alex', candidateFacts: { hasStrongProfileBaseline: true } } };
  assert.equal(hasMatchableProfileSignal(candidateState), true);
});

test('placeholder-like values ("none", "unknown", "n/a", empty string) do not count as filled fields', () => {
  const candidateState = {
    profile: {
      name: 'Alex', category: 'Postgraduate / Doctoral',
      field: 'none', goals: 'unknown', destination: 'n/a', gpa: '',
    },
  };
  assert.equal(hasMatchableProfileSignal(candidateState), false);
});

test('exactly 3 real filled fields (excluding name/category/exceptionType) is enough', () => {
  const candidateState = {
    profile: {
      name: 'Alex', category: 'Postgraduate / Doctoral', exceptionType: 'none',
      field: 'Finance', researchInterests: 'asset pricing', goals: 'faculty',
    },
  };
  assert.equal(hasMatchableProfileSignal(candidateState), true);
});

test('an empty candidateState is not matchable', () => {
  assert.equal(hasMatchableProfileSignal({}), false);
  assert.equal(hasMatchableProfileSignal(), false);
});
