import test from 'node:test';
import assert from 'node:assert/strict';

import { handleUndergradSchoolListRequest } from '../handle-school-list.js';
import { HybridCoordinator } from '../../hybrid-coordinator.js';

test('grade + major present returns 12 tiered schools and populates statePatch.programs', async () => {
  const result = await handleUndergradSchoolListRequest('cand_full', 'show me schools', {
    profile: { grade: '10', intendedMajor: 'Computer Science', gpa: 3.8, satScore: 1450 },
  });
  assert.equal(result.agent, 'UndergradSchoolList');
  assert.equal(result.statePatch.programs.length, 12);
  assert.match(result.message, /Reach:/);
  assert.match(result.message, /Target:/);
  assert.match(result.message, /Likely:/);
  assert.ok(result.statePatch.programs.every(p => p.selectivitySource === 'db' && p.sourceTag === 'hotfix_school_list'));
});

test('missing grade returns a clarifying question and writes no programs', async () => {
  const result = await handleUndergradSchoolListRequest('cand_missing_grade', 'show me schools', { profile: {} });
  assert.match(result.message, /what grade are you in/i);
  assert.equal(result.statePatch.programs, undefined);
  assert.equal(result.metadata.reason, 'missing_grade');
});

test('missing intendedMajor (grade known) asks about interest area, not schools', async () => {
  const result = await handleUndergradSchoolListRequest('cand_missing_major', 'show me schools', { profile: { grade: '11' } });
  assert.match(result.message, /area are you most interested in/i);
  assert.equal(result.statePatch.programs, undefined);
  assert.equal(result.metadata.reason, 'missing_major');
});

test('regex extraction patches grade/gpa/sat/major from the message itself', async () => {
  const result = await handleUndergradSchoolListRequest(
    'cand_extract',
    'show me schools, I am in 10th grade with a GPA of 3.8 and SAT around 1450, interested in coding',
    { profile: {} },
  );
  assert.equal(result.statePatch.profile.grade, '10');
  assert.equal(result.statePatch.profile.gpa, 3.8);
  assert.equal(result.statePatch.profile.satScore, 1450);
  assert.equal(result.statePatch.profile.intendedMajor, 'Computer Science');
  assert.equal(result.statePatch.programs.length, 12);
});

test('regex extraction never overwrites an already-saved profile value', async () => {
  const result = await handleUndergradSchoolListRequest(
    'cand_no_overwrite',
    'show me schools, GPA around 2.1',
    { profile: { grade: '11', intendedMajor: 'Business', gpa: 3.9 } },
  );
  assert.equal(result.statePatch.profile.gpa, 3.9);
});

test('a second school-list request returns a refine prompt instead of regenerating', async () => {
  const first = await handleUndergradSchoolListRequest('cand_repeat', 'show me schools', {
    profile: { grade: '10', intendedMajor: 'Computer Science' },
  });
  const second = await handleUndergradSchoolListRequest('cand_repeat', 'show me schools again', {
    profile: { grade: '10', intendedMajor: 'Computer Science' },
    programs: first.statePatch.programs,
  });
  assert.equal(second.metadata.reason, 'already_has_list');
  assert.match(second.message, /already have a school list/i);
  assert.equal(second.statePatch.programs, undefined);
});

test('coordinator integration: an undergrad school-list message fires the hotfix handler', async () => {
  const coordinator = new HybridCoordinator();
  const result = await coordinator.execute({
    candidateId: 'cand_coord_undergrad',
    message: 'show me schools',
    candidateState: { profile: { category: 'Undergraduate', grade: '11', intendedMajor: 'Engineering' } },
  });
  assert.equal(result.agent, 'UndergradSchoolList');
  assert.equal(result.statePatch.programs.length, 12);
});

test('real transcript typos still trigger school-list generation', async () => {
  for (const phrase of ['list shcools', 'list of shcools pls']) {
    const result = await handleUndergradSchoolListRequest(`cand_${phrase}`, phrase, {
      profile: { grade: '10', intendedMajor: 'Life Sciences', gpa: 3.6 },
    });
    assert.equal(result.agent, 'UndergradSchoolList');
    assert.equal(result.statePatch.programs.length, 12);
    assert.match(result.message, /Reach:/);
    assert.doesNotMatch(result.message, /list is ready|tap below|generate my school list/i);
  }
});

test('real transcript context maps biology and preferences into a saved exploratory list', async () => {
  const history = [
    { role: 'user', text: '10th grade' },
    { role: 'user', text: 'My GPA is 3.6' },
    { role: 'user', text: 'Biology or life sciences' },
    { role: 'user', text: 'Large research university with strong biology and STEM programs' },
    { role: 'user', text: 'Affordability and financial aid' },
    { role: 'user', text: 'Anywhere in the US' },
  ];
  const result = await handleUndergradSchoolListRequest('cand_real_transcript', 'show now', { profile: {} }, history);
  assert.equal(result.statePatch.profile.grade, '10');
  assert.equal(result.statePatch.profile.gpa, 3.6);
  assert.equal(result.statePatch.profile.intendedMajor, 'Life Sciences');
  assert.equal(result.statePatch.profile.universityStyle, 'Large research university');
  assert.equal(result.statePatch.profile.affordabilityPreference, 'Affordability / financial aid');
  assert.equal(result.statePatch.programs.length, 12);
  assert.match(result.message, /early exploratory starting list/i);
  assert.match(result.message, /Johns Hopkins|UCLA|UC San Diego|Cornell|Yale|Brown|Duke/);
});

test('coordinator catches messy show-now and frustration commands with recent school-list context', async () => {
  const coordinator = new HybridCoordinator();
  for (const phrase of ['Show me the list now', 'sho wnow', 'stop asking just fucking show']) {
    const result = await coordinator.execute({
      candidateId: `cand_coord_${phrase}`,
      message: phrase,
      conversationHistory: [{ role: 'user', text: 'list of shcools pls' }],
      candidateState: { profile: { category: 'Undergraduate', grade: '10', intendedMajor: 'Life Sciences', gpa: 3.6 } },
    });
    assert.equal(result.agent, 'UndergradSchoolList');
    assert.equal(result.statePatch.programs.length, 12);
    assert.doesNotMatch(result.message, /which type|which format|ready to see|tap below/i);
  }
});

test('coordinator integration: the same message for a graduate candidate is untouched', async () => {
  const coordinator = new HybridCoordinator();
  const result = await coordinator.execute({
    candidateId: 'cand_coord_grad',
    message: 'show me schools',
    candidateState: { profile: { category: 'Graduate' } },
  });
  assert.notEqual(result.agent, 'UndergradSchoolList');
});
