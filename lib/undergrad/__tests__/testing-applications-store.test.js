import test from 'node:test';
import assert from 'node:assert/strict';

import { makeTestingPlan, makeApplication } from '../schemas.js';
import { emptyUndergradState, ensureUndergradState, upsertTestingPlan, upsertApplication } from '../store.js';

test('emptyUndergradState seeds a not_started testing plan and an empty applications list', () => {
  const state = emptyUndergradState('cand-1');
  assert.equal(state.testingPlan.status, 'not_started');
  assert.deepEqual(state.applications, []);
});

test('makeTestingPlan normalizes study plan and test dates', () => {
  const plan = makeTestingPlan({ status: 'in_progress', targetScore: 1450, studyPlan: ['Practice test', ''], testDates: ['2026-11-07'] });
  assert.equal(plan.status, 'in_progress');
  assert.equal(plan.targetScore, 1450);
  assert.deepEqual(plan.studyPlan, ['Practice test']);
  assert.deepEqual(plan.testDates, ['2026-11-07']);
});

test('upsertTestingPlan merges a patch into existing state and logs an event', () => {
  const state = emptyUndergradState('cand-1');
  const next = upsertTestingPlan(state, { status: 'in_progress', targetScore: 1400 });
  assert.equal(next.testingPlan.status, 'in_progress');
  assert.equal(next.testingPlan.targetScore, 1400);
  assert.ok(next.log.some(entry => entry.event === 'testing_plan_updated'));
});

test('makeApplication normalizes deadlines, checklist, and recommendations', () => {
  const app = makeApplication({
    candidateId: 'cand-1',
    schoolName: 'NYU Tisch',
    deadlines: [{ label: 'Early Decision', date: '2026-11-01' }],
    checklist: [{ label: 'Submit transcript' }],
    recommendations: [{ name: 'Drama teacher' }],
  });
  assert.equal(app.schoolName, 'NYU Tisch');
  assert.equal(app.deadlines[0].date, '2026-11-01');
  assert.equal(app.checklist[0].status, 'todo');
  assert.equal(app.recommendations[0].status, 'requested');
  assert.equal(app.submissionStatus, 'not_started');
});

test('upsertApplication adds a new application and is idempotent by content-addressed id', () => {
  const state = emptyUndergradState('cand-1');
  const app = makeApplication({ candidateId: 'cand-1', schoolName: 'NYU Tisch' });
  const once = upsertApplication(state, app);
  const twice = upsertApplication(once, { ...app, submissionStatus: 'in_progress' });
  assert.equal(twice.applications.length, 1);
  assert.equal(twice.applications[0].submissionStatus, 'in_progress');
  assert.ok(twice.log.some(entry => entry.event === 'application_created'));
  assert.ok(twice.log.some(entry => entry.event === 'application_updated'));
});

test('ensureUndergradState backfills testingPlan/applications on legacy stored state', () => {
  const legacy = { candidateId: 'cand-1', tasks: [] };
  const ensured = ensureUndergradState(legacy);
  assert.equal(ensured.testingPlan.status, 'not_started');
  assert.deepEqual(ensured.applications, []);
});
