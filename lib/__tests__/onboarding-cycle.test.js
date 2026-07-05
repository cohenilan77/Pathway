import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENING_PATH_OPTIONS, resolveOpeningPathChoice, responseAttemptsScoring } from '../onboarding.js';

test('opening cycle exposes the four requested candidate paths', () => {
  assert.deepEqual(OPENING_PATH_OPTIONS, ['Undergraduate', 'Graduate', 'PhD', 'Personal Development']);
});

test('opening path choices map immediately to the production profile schema', () => {
  assert.deepEqual(resolveOpeningPathChoice('Undergraduate'), { category: 'Undergraduate', degree: 'Undergraduate' });
  assert.deepEqual(resolveOpeningPathChoice('Graduate'), { category: 'Graduate', degree: 'Graduate' });
  assert.deepEqual(resolveOpeningPathChoice('PhD'), { category: 'Postgraduate / Doctoral', degree: 'PhD' });
  assert.deepEqual(resolveOpeningPathChoice('Personal Development'), { category: 'Personal Development', degree: 'Personal Development' });
});

test('discovery replies do not trigger scoring gates before the scoring boundary', () => {
  assert.equal(responseAttemptsScoring({ raw: '<PROFILE>{"category":"Graduate"}</PROFILE>Which program?' }), false);
  assert.equal(responseAttemptsScoring({ raw: '<SCORES>{"academic":80}</SCORES>Done' }), true);
  assert.equal(responseAttemptsScoring({ statePatch: { programs: [{ name: 'Example' }] } }), true);
});
