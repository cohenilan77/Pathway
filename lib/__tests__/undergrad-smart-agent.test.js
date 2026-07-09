import test from 'node:test';
import assert from 'node:assert/strict';

import { executeUndergradTool, UNDERGRAD_TOOLS } from '../agents/tools/undergrad-tools.js';
import { UndergradAgent } from '../agents/UndergradAgent.js';
import { ensureUndergradState } from '../undergrad/store.js';
import { HybridCoordinator } from '../hybrid-coordinator.js';
import { UndergradMasterAgent } from '../agents/UndergradMasterAgent.js';
import { getStore } from '../store.js';

function makeCtx(overrides = {}) {
  return {
    candidateId: 'cand_1',
    surface: 'chat',
    now: Date.parse('2026-07-09T00:00:00Z'),
    workingProfile: {},
    workingUndergrad: ensureUndergradState(null, 'cand_1'),
    workingPrograms: [],
    knownChannels: new Map(),
    primaryArea: null,
    undergradDirty: false,
    programsDirty: false,
    ...overrides,
  };
}

function toolUse(name, input, id = `tu_${name}`) {
  return { type: 'tool_use', id, name, input };
}

test('UNDERGRAD_TOOLS registers all twelve tools', () => {
  const names = UNDERGRAD_TOOLS.map(t => t.name).sort();
  assert.deepEqual(names, [
    'end_turn_response', 'find_community_group', 'get_candidate_state', 'get_document',
    'lookup_school_data', 'save_calendar_event', 'save_community_join_intent',
    'save_essay_material', 'save_profile_fact', 'save_progress_snapshot',
    'save_task', 'save_university_list',
  ].sort());
});

test('save_profile_fact rejects a duplicate value with already_saved, and does not overwrite', async () => {
  const ctx = makeCtx({ workingProfile: { activities: 'Robotics club' } });
  const result = await executeUndergradTool('cand_1', toolUse('save_profile_fact', { field: 'activities', value: 'Robotics club' }), ctx);
  assert.equal(result.status, 'already_saved');
  assert.equal(ctx.workingProfile.activities, 'Robotics club');
});

test('save_profile_fact saves a new value and rejects a non-whitelisted field', async () => {
  const ctx = makeCtx();
  const saved = await executeUndergradTool('cand_1', toolUse('save_profile_fact', { field: 'grade', value: '10' }), ctx);
  assert.equal(saved.status, 'saved');
  assert.equal(ctx.workingProfile.grade, '10');

  const rejected = await executeUndergradTool('cand_1', toolUse('save_profile_fact', { field: 'role', value: 'admin' }), ctx);
  assert.equal(rejected.error, 'invalid_field');
  assert.equal(ctx.workingProfile.role, undefined);
});

test('save_university_list rejects when profile is incomplete, then accepts once grade + major are known', async () => {
  const ctx = makeCtx();
  const incomplete = await executeUndergradTool('cand_1', toolUse('save_university_list', {
    schools: [{ name: 'MIT', tier: 'reach', selectivitySource: 'db' }],
  }), ctx);
  assert.equal(incomplete.error, 'profile_incomplete');
  assert.ok(incomplete.missing.includes('grade'));
  assert.equal(ctx.programsDirty, false);

  ctx.workingProfile = { grade: '11', intendedMajor: 'Computer Science' };
  const missingSource = await executeUndergradTool('cand_1', toolUse('save_university_list', {
    schools: [{ name: 'MIT', tier: 'reach' }],
  }), ctx);
  assert.equal(missingSource.error, 'missing_selectivity_source');

  const saved = await executeUndergradTool('cand_1', toolUse('save_university_list', {
    schools: [
      { name: 'MIT', tier: 'reach', selectivitySource: 'db' },
      { name: 'Northeastern University', tier: 'likely', selectivitySource: 'estimate' },
    ],
  }), ctx);
  assert.equal(saved.status, 'saved');
  assert.equal(saved.count, 2);
  assert.equal(ctx.workingPrograms.length, 2);
  assert.ok(ctx.workingPrograms.every(p => p.admitRateSource));
});

test('save_essay_material rejects kind:draft below grade 11 but accepts kind:story', async () => {
  const ctx = makeCtx({ candidateId: 'cand_essay', workingProfile: { grade: '10' } });
  const draft = await executeUndergradTool('cand_essay', toolUse('save_essay_material', {
    kind: 'draft', title: 'My Common App essay', content: 'Draft text',
  }), ctx);
  assert.equal(draft.error, 'story_bank_only_for_now');

  const story = await executeUndergradTool('cand_essay', toolUse('save_essay_material', {
    kind: 'story', title: 'The summer I built a robot', content: 'It started when...',
  }), ctx);
  assert.equal(story.status, 'saved');
  assert.ok(story.id);
});

test('save_progress_snapshot reports no_change when no dimension moved', async () => {
  const ctx = makeCtx({ candidateId: 'cand_progress' });
  const first = await executeUndergradTool('cand_progress', toolUse('save_progress_snapshot', { scores: { academics: 60 } }), ctx);
  assert.equal(first.status, 'saved');
  assert.equal(ctx.workingUndergrad.progress.length, 1);

  const repeat = await executeUndergradTool('cand_progress', toolUse('save_progress_snapshot', { scores: { academics: 60 } }), ctx);
  assert.equal(repeat.status, 'no_change');
  assert.equal(ctx.workingUndergrad.progress.length, 1);
});

test('find_community_group never fabricates: returns found:false with no real groups seeded', async () => {
  const ctx = makeCtx({ candidateId: 'cand_no_groups' });
  const result = await executeUndergradTool('cand_no_groups', toolUse('find_community_group', { topic: 'soccer', level: '10th' }), ctx);
  assert.equal(result.found, false);
  assert.deepEqual(result.alternatives, []);
  assert.equal(ctx.knownChannels.size, 0);
});

test('find_community_group returns only real seeded groups, and save_community_join_intent rejects an unknown channelId', async () => {
  const store = getStore();
  await store.sadd('community:groups:all', 'grp_debate_1');
  await store.set('community:group:grp_debate_1', {
    name: 'Debate Club Network', school: 'Northeastern University', program: null, category: 'Undergraduate', grade: '11th',
  });

  const ctx = makeCtx({ candidateId: 'cand_groups' });
  const found = await executeUndergradTool('cand_groups', toolUse('find_community_group', { topic: 'debate' }), ctx);
  assert.equal(found.found, true);
  assert.equal(found.groups.length, 1);
  assert.equal(found.groups[0].id, 'grp_debate_1');
  assert.equal(ctx.knownChannels.get('grp_debate_1').name, 'Debate Club Network');

  const rejected = await executeUndergradTool('cand_groups', toolUse('save_community_join_intent', { channelId: 'grp_made_up' }), ctx);
  assert.equal(rejected.error, 'unknown_channel');
  assert.equal(ctx.undergradDirty, false);

  const accepted = await executeUndergradTool('cand_groups', toolUse('save_community_join_intent', { channelId: 'grp_debate_1' }), ctx);
  assert.equal(accepted.status, 'saved');
  assert.equal(accepted.groupName, 'Debate Club Network');
  assert.equal(ctx.undergradDirty, true);
  assert.equal(ctx.workingUndergrad.tasks.length, 1);
  assert.match(ctx.workingUndergrad.tasks[0].title, /Debate Club Network/);
});

test('end_turn_response truncates at a sentence boundary past 400 chars on the chat surface', async () => {
  const longSentence = `${'This is a very long sentence about the student progress. '.repeat(10)}Final sentence.`;
  assert.ok(longSentence.length > 400);
  const ctx = makeCtx({ surface: 'chat' });
  const result = await executeUndergradTool('cand_1', toolUse('end_turn_response', { message: longSentence, options: ['A', 'B'] }), ctx);
  assert.equal(result.terminal, true);
  assert.ok(result.message.length <= 400);
  assert.ok(/[.!?]$/.test(result.message.trim()));

  const ctxVoice = makeCtx({ surface: 'voice' });
  const untouched = await executeUndergradTool('cand_1', toolUse('end_turn_response', { message: longSentence, options: [] }), ctxVoice);
  assert.equal(untouched.message, longSentence.trim());
});

test('UndergradAgent.handle() saves facts, returns an arrow-pipe message, and pushes lastTopics', async () => {
  const agent = new UndergradAgent();
  let call = 0;
  agent.execute = async () => {
    call += 1;
    if (call === 1) {
      const uses = [
        toolUse('save_profile_fact', { field: 'grade', value: '10' }, 'tu1'),
        toolUse('save_profile_fact', { field: 'activities', value: 'Robotics club' }, 'tu2'),
      ];
      return { text: '', toolUses: uses, stopReason: 'tool_use', usage: { input_tokens: 10, output_tokens: 5 }, raw: { model: 'claude-sonnet-4-6', content: uses } };
    }
    const uses = [toolUse('end_turn_response', { message: 'Robotics is a great start!', options: ['Tell me more', 'What else are you doing'] }, 'tu3')];
    return { text: '', toolUses: uses, stopReason: 'tool_use', usage: { input_tokens: 8, output_tokens: 4 }, raw: { model: 'claude-sonnet-4-6', content: uses } };
  };

  const result = await agent.handle('cand_handle', 'I joined robotics club, I am in grade 10', {
    conversationHistory: [],
    candidateState: { profile: { grade: '9' } },
  });

  assert.equal(result.agent, 'UndergradAgent');
  assert.equal(result.message, 'Robotics is a great start! → Tell me more | What else are you doing');
  assert.equal(result.statePatch.profile.grade, '10');
  assert.equal(result.statePatch.profile.activities, 'Robotics club');
  assert.deepEqual(result.statePatch.profile.undergradStageTracker.lastTopics, ['smart_turn:grade']);
  assert.equal(result.metadata.fallbackUsed, false);
  assert.deepEqual(result.metadata.toolCalls, ['save_profile_fact', 'save_profile_fact', 'end_turn_response']);
  assert.equal(call, 2);
});

test('flag off routes Undergraduate turns to UndergradMasterAgent, not UndergradAgent', async () => {
  delete process.env.UNDERGRAD_SMART_AGENT;
  let calledMaster = false;
  let calledSmart = false;
  const originalMasterHandle = UndergradMasterAgent.prototype.handle;
  const originalSmartHandle = UndergradAgent.prototype.handle;
  UndergradMasterAgent.prototype.handle = async function stubMaster() {
    calledMaster = true;
    return { agent: 'Stub', message: '', statePatch: {}, metadata: {} };
  };
  UndergradAgent.prototype.handle = async function stubSmart() {
    calledSmart = true;
    return { agent: 'Stub', message: '', statePatch: {}, metadata: {} };
  };
  try {
    const coordinator = new HybridCoordinator();
    await coordinator.execute({
      candidateId: 'cand_flag_off',
      message: 'hello',
      candidateState: { profile: { category: 'Undergraduate' } },
    });
  } finally {
    UndergradMasterAgent.prototype.handle = originalMasterHandle;
    UndergradAgent.prototype.handle = originalSmartHandle;
  }
  assert.equal(calledMaster, true);
  assert.equal(calledSmart, false);
});

test('flag on routes Undergraduate turns to UndergradAgent', async () => {
  process.env.UNDERGRAD_SMART_AGENT = 'true';
  let calledMaster = false;
  let calledSmart = false;
  const originalMasterHandle = UndergradMasterAgent.prototype.handle;
  const originalSmartHandle = UndergradAgent.prototype.handle;
  UndergradMasterAgent.prototype.handle = async function stubMaster() {
    calledMaster = true;
    return { agent: 'Stub', message: '', statePatch: {}, metadata: {} };
  };
  UndergradAgent.prototype.handle = async function stubSmart() {
    calledSmart = true;
    return { agent: 'Stub', message: '', statePatch: {}, metadata: {} };
  };
  try {
    const coordinator = new HybridCoordinator();
    await coordinator.execute({
      candidateId: 'cand_flag_on',
      message: 'hello',
      candidateState: { profile: { category: 'Undergraduate' } },
    });
  } finally {
    delete process.env.UNDERGRAD_SMART_AGENT;
    UndergradMasterAgent.prototype.handle = originalMasterHandle;
    UndergradAgent.prototype.handle = originalSmartHandle;
  }
  assert.equal(calledSmart, true);
  assert.equal(calledMaster, false);
});

// Router-escape regression coverage: with the flag on, none of the legacy
// text-content escapes (wantsProfileAnalysis, isSchoolListRequest's
// forceMatching) may divert a turn away from UndergradAgent to the
// grad-shaped AdvisorAgent/MatchingAgent flow — that is exactly what leaked
// <PROFILE>/<PROGRAMS> blocks into a real undergrad session on 2026-07-09.
for (const escapingMessage of [
  'I want to see my full profile',
  'show me possible list of schools based on my profile',
]) {
  test(`flag on: "${escapingMessage}" still reaches UndergradAgent, not the grad-shaped router`, async () => {
    process.env.UNDERGRAD_SMART_AGENT = 'true';
    let calledSmart = false;
    const originalSmartHandle = UndergradAgent.prototype.handle;
    UndergradAgent.prototype.handle = async function stubSmart() {
      calledSmart = true;
      return { agent: 'UndergradAgent', message: '', statePatch: {}, metadata: { routedAgent: 'UndergradAgent' } };
    };
    let result;
    try {
      const coordinator = new HybridCoordinator();
      result = await coordinator.execute({
        candidateId: 'cand_escape',
        message: escapingMessage,
        candidateState: { profile: { category: 'Undergraduate', grade: '10' } },
      });
    } finally {
      delete process.env.UNDERGRAD_SMART_AGENT;
      UndergradAgent.prototype.handle = originalSmartHandle;
    }
    assert.equal(calledSmart, true);
    assert.equal(result.agent, 'UndergradAgent');
  });
}

test('flag off: a profile-reveal request still escapes to the generic advisor path (legacy behavior preserved)', async () => {
  delete process.env.UNDERGRAD_SMART_AGENT;
  let calledMaster = false;
  let calledSmart = false;
  const originalMasterHandle = UndergradMasterAgent.prototype.handle;
  const originalSmartHandle = UndergradAgent.prototype.handle;
  UndergradMasterAgent.prototype.handle = async function stubMaster() { calledMaster = true; return { agent: 'Stub', message: '', statePatch: {}, metadata: {} }; };
  UndergradAgent.prototype.handle = async function stubSmart() { calledSmart = true; return { agent: 'Stub', message: '', statePatch: {}, metadata: {} }; };
  let result;
  try {
    const coordinator = new HybridCoordinator();
    result = await coordinator.execute({
      candidateId: 'cand_legacy_escape',
      message: 'I want to see my full profile',
      candidateState: { profile: { category: 'Undergraduate', grade: '10' } },
    });
  } finally {
    UndergradMasterAgent.prototype.handle = originalMasterHandle;
    UndergradAgent.prototype.handle = originalSmartHandle;
  }
  assert.equal(calledMaster, false);
  assert.equal(calledSmart, false);
  assert.equal(result.delegateToAdvisor, true);
  assert.equal(result.agent, 'advisor');
});
