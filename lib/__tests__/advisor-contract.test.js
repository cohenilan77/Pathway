import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdvisorResponse, statePatchFromRaw, validateStatePatch } from '../advisor-contract.js';
import { buildExecutionPlan, inferSpecialist, looksLikeProfileText } from '../hybrid-coordinator.js';

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
  assert.equal(inferSpecialist('Here is my uploaded CV file:\nGalit Cohen, MBA applicant, GMAT 750'), 'profile');
  assert.equal(inferSpecialist('Attached transcript and additional background information'), 'profile');
  assert.equal(inferSpecialist('List the documents I uploaded'), 'document');
  const pastedResume = `TAL YOGEV\nEDUCATION\nReichman University, BA Business Administration, GPA 91.6/100\nEXPERIENCE\nEY Senior Transaction Diligence 2022-Present\nKPMG Tax Associate 2021-2022\nGMAT 750\nVOLUNTEER SERVICE\nPaamonim financial mentor\nLANGUAGES\nHebrew and English\n${'Leadership and transaction experience. '.repeat(12)}`;
  assert.equal(looksLikeProfileText(pastedResume), true);
  assert.equal(inferSpecialist(pastedResume), 'profile');
});

test('stage orchestrator chains internal specialists before advisor continuation', () => {
  assert.deepEqual(buildExecutionPlan('Here is my uploaded CV file:\nEDUCATION\nEXPERIENCE'), ['document', 'profile']);
  assert.deepEqual(buildExecutionPlan('Recommend a tailored school portfolio'), ['search', 'matching']);
  assert.deepEqual(buildExecutionPlan('Help me review my essay'), ['essay']);
  assert.deepEqual(buildExecutionPlan('MBA'), ['advisor']);
});
