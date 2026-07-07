import test from 'node:test';
import assert from 'node:assert/strict';

import { getStore } from '../../../store.js';
import { getCandidateProfile } from '../search.js';

const CID = 'test_getCandidateProfile_cand_1';

test('getCandidateProfile merges the real journey profile (userdata:<id>) on top of the bare account record (user:<id>)', async () => {
  const store = getStore();
  await store.set(`user:${CID}`, { id: CID, name: 'Dana', email: 'dana@example.com', role: 'candidate', plan: 'ai' });
  await store.set(`userdata:${CID}`, {
    profile: { category: 'Undergraduate', grade: 10, intendedMajor: 'Computer Science', destination: 'USA', pathwayType: 'exploring' },
    scores: { overall: 62 },
    chosenSchools: ['MIT', 'CMU'],
  });

  const profile = await getCandidateProfile(CID);

  // Account fields still present.
  assert.equal(profile.name, 'Dana');
  assert.equal(profile.email, 'dana@example.com');
  assert.equal(profile.plan, 'ai');

  // Real journey data — this is what was missing before the fix, leaving
  // ChatAgent/SimulationAgent/InterviewAgent/SettingsAgent/CommunityAgent/
  // NaggerAgent/MatchingAgent with an effectively empty candidate profile.
  assert.equal(profile.category, 'Undergraduate');
  assert.equal(profile.grade, 10);
  assert.equal(profile.intendedMajor, 'Computer Science');
  assert.equal(profile.destination, 'USA');
  assert.equal(profile.pathwayType, 'exploring');
  assert.deepEqual(profile.scores, { overall: 62 });
  assert.deepEqual(profile.targetPrograms, ['MIT', 'CMU']);
  assert.equal(profile.journeyType, 'Undergraduate');

  await store.del(`user:${CID}`);
  await store.del(`userdata:${CID}`);
});

test('getCandidateProfile returns null when neither the account nor journey record exists', async () => {
  const profile = await getCandidateProfile('test_getCandidateProfile_does_not_exist');
  assert.equal(profile, null);
});

test('getCandidateProfile still works for a bare account with no journey data yet', async () => {
  const cid = 'test_getCandidateProfile_cand_bare';
  const store = getStore();
  await store.set(`user:${cid}`, { id: cid, name: 'Noam', email: 'noam@example.com', plan: 'free' });

  const profile = await getCandidateProfile(cid);
  assert.equal(profile.name, 'Noam');
  assert.equal(profile.category, undefined);
  assert.deepEqual(profile.targetPrograms, []);

  await store.del(`user:${cid}`);
});
