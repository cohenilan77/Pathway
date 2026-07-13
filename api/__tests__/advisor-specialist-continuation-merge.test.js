import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSpecialistWithContinuation } from '../advisor.js';

function programs(count, prefix = 'School') {
  return Array.from({ length: count }, (_, index) => ({ name: `${prefix} ${index + 1}`, fit: 70 }));
}

test('preserves the specialist\'s fresh programs/chosenSchools when the continuation reply has none', () => {
  // This is the exact shape of the bug: the specialist (e.g. MatchingAgent)
  // computes fresh schools, then the AdvisorAgent continuation call produces
  // plain conversational text with no <PROGRAMS>/<CHOSEN_SCHOOLS> blocks, so
  // its own statePatch never carries those keys at all.
  const specialistPatch = { programs: programs(10), scores: { overall: 70 } };
  const continuationPatch = { insights: { note: 'conversational only' } };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.programs.map(program => program.name), specialistPatch.programs.map(program => program.name));
  assert.deepEqual(merged.insights, continuationPatch.insights);
});

test('does not let an empty continuation array silently blank out specialist schools', () => {
  const specialistPatch = { chosenSchools: ['Wharton', 'Booth'] };
  const continuationPatch = { chosenSchools: [] };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.chosenSchools, ['Wharton', 'Booth']);
});

test('a genuinely updated (non-empty) continuation value still wins', () => {
  const specialistPatch = { programs: programs(8, 'Original') };
  const continuationPatch = { programs: programs(10, 'Updated') };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.programs, continuationPatch.programs);
});

test('does not let a shorter continuation downgrade a valid specialist list', () => {
  const specialistPatch = { programs: programs(10, 'Specialist') };
  const continuationPatch = { programs: programs(8, 'Continuation') };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.programs.map(program => program.name), specialistPatch.programs.map(program => program.name));
});

test('other fields still take the continuation\'s value as before (normal object-spread precedence)', () => {
  const specialistPatch = { scores: { overall: 60 } };
  const continuationPatch = { scores: { overall: 65 } };
  const merged = mergeSpecialistWithContinuation(specialistPatch, continuationPatch);
  assert.deepEqual(merged.scores, { overall: 65 });
});

test('handles missing patches gracefully', () => {
  assert.deepEqual(mergeSpecialistWithContinuation(), {});
  assert.deepEqual(mergeSpecialistWithContinuation({ programs: programs(8) }).programs.map(program => program.name), programs(8).map(program => program.name));
});
