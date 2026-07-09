import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSpecialistWithContinuation } from '../advisor.js';

test('preserves the specialist\'s fresh programs/chosenSchools when the continuation reply has none', () => {
  // This is the exact shape of the bug: the specialist (e.g. MatchingAgent)
  // computes fresh schools, then the AdvisorAgent continuation call produces
  // plain conversational text with no <PROGRAMS>/<CHOSEN_SCHOOLS> blocks, so
  // its own statePatch never carries those keys at all.
  const specialistPatch = { programs: [{ name: 'Wharton' }, { name: 'Booth' }], scores: { overall: 70 } };
  const continuationPatch = { insights: { note: 'conversational only' } };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.programs, specialistPatch.programs);
  assert.deepEqual(merged.insights, continuationPatch.insights);
});

test('does not let an empty continuation array silently blank out specialist schools', () => {
  const specialistPatch = { chosenSchools: ['Wharton', 'Booth'] };
  const continuationPatch = { chosenSchools: [] };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.chosenSchools, ['Wharton', 'Booth']);
});

test('a genuinely updated (non-empty) continuation value still wins', () => {
  const specialistPatch = { programs: [{ name: 'Wharton' }] };
  const continuationPatch = { programs: [{ name: 'Wharton' }, { name: 'INSEAD' }] };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.programs, continuationPatch.programs);
});

test('other fields still take the continuation\'s value as before (normal object-spread precedence)', () => {
  const specialistPatch = { scores: { overall: 60 } };
  const continuationPatch = { scores: { overall: 65 } };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.scores, { overall: 65 });
});

test('handles missing patches gracefully', () => {
  assert.deepEqual(mergeSpecialistWithContinuation(), {});
  assert.deepEqual(mergeSpecialistWithContinuation({ programs: [{ name: 'X' }] }), { programs: [{ name: 'X' }] });
});
