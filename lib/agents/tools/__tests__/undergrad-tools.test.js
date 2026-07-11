// Covers what lib/__tests__/undergrad-smart-agent.test.js does not: the
// roadmapGaps/lastSessionSummary additions to get_candidate_state and the
// new save_session_summary tool. The already_saved/profile_incomplete/
// story_bank_only_for_now/no_change/truncation scenarios are already
// covered there and are not repeated here.
import test from 'node:test';
import assert from 'node:assert/strict';

import { executeUndergradTool } from '../undergrad-tools.js';
import { emptyUndergradState } from '../../../undergrad/store.js';

function makeCtx(overrides = {}) {
  return {
    candidateId: 'cand_test_1',
    surface: 'chat',
    now: 1_800_000_000_000,
    workingProfile: {},
    workingUndergrad: emptyUndergradState('cand_test_1'),
    workingPrograms: [],
    knownChannels: new Map(),
    primaryArea: null,
    undergradDirty: false,
    programsDirty: false,
    ...overrides,
  };
}

async function callTool(name, input, ctx) {
  return executeUndergradTool(ctx.candidateId, { name, input }, ctx);
}

test('save_session_summary: writes lastSessionSummary onto workingUndergrad and marks dirty', async () => {
  const ctx = makeCtx();
  const result = await callTool('save_session_summary', { summary: 'Left off mid robotics competition prep.' }, ctx);
  assert.deepEqual(result, { status: 'saved' });
  assert.equal(ctx.undergradDirty, true);
  assert.equal(ctx.workingUndergrad.lastSessionSummary.text, 'Left off mid robotics competition prep.');
});

test('save_session_summary: rejects an empty summary', async () => {
  const ctx = makeCtx();
  const result = await callTool('save_session_summary', { summary: '   ' }, ctx);
  assert.deepEqual(result, { error: 'missing_summary' });
  assert.equal(ctx.undergradDirty, false);
});

test('get_candidate_state: surfaces roadmapGaps and lastSessionSummary', async () => {
  const ctx = makeCtx({
    workingProfile: { grade: 11, subjects: 'Physics' },
    workingUndergrad: { ...emptyUndergradState('cand_test_1'), lastSessionSummary: { text: 'Was prepping for SAT.', at: 1000 } },
  });
  const state = await callTool('get_candidate_state', {}, ctx);
  assert.ok(Array.isArray(state.roadmapGaps));
  assert.ok(state.roadmapGaps.includes('test date booked'));
  assert.equal(state.lastSessionSummary, 'Was prepping for SAT.');
});

test('get_candidate_state: no gaps and no summary for a brand-new candidate with no grade yet', async () => {
  const ctx = makeCtx();
  const state = await callTool('get_candidate_state', {}, ctx);
  assert.deepEqual(state.roadmapGaps, []);
  assert.equal(state.lastSessionSummary, null);
});
