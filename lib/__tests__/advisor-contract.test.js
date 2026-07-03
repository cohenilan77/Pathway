import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdvisorResponse, statePatchFromRaw, validateStatePatch } from '../advisor-contract.js';
import { inferSpecialist } from '../hybrid-coordinator.js';

test('converts legacy structured blocks into a typed state patch', () => {
  const raw = '<PROFILE>{"name":"Galit","category":"Graduate"}</PROFILE><PROGRAMS>[{"name":"Booth","fit":80}]</PROGRAMS>Your list is ready.';
  const patch = statePatchFromRaw(raw);
  assert.equal(patch.profile.name, 'Galit');
  assert.equal(patch.programs[0].name, 'Booth');
  const response = makeAdvisorResponse({ architecture: 'legacy', raw });
  assert.equal(response.message, 'Your list is ready.');
  assert.equal(response.nextAction.type, 'select_programs');
});

test('sanitizes chosen schools and rejects invalid stages', () => {
  assert.deepEqual(validateStatePatch({ chosenSchools: ['Booth', 'Booth', ''] }).chosenSchools, ['Booth']);
  assert.throws(() => validateStatePatch({ journeyStage: 'broken' }), /Invalid journey stage/);
});

test('hybrid coordinator maps bounded requests to specialists', () => {
  assert.equal(inferSpecialist('Add my Wharton deadline to the calendar'), 'calendar');
  assert.equal(inferSpecialist('Review my MBA essay'), 'essay');
  assert.equal(inferSpecialist('What should I do next?'), 'advisor');
});
