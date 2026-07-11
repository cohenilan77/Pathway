import test from 'node:test';
import assert from 'node:assert/strict';

import { scorePivot } from '../narrative/pivot-risk-table.js';
import { executeNarrativeCoachTool } from '../agents/tools/narrative-coach-tools.js';
import { finalizeCoachingSession } from '../narrative/coaching-session.js';
import { HybridCoordinator, NARRATIVE_KICKOFF_QUESTION } from '../hybrid-coordinator.js';
import { NarrativeCoachAgent } from '../agents/NarrativeCoachAgent.js';
import { UndergradAgent } from '../agents/UndergradAgent.js';
import { EssayAgent } from '../agents/sub/EssayAgent.js';

function toolUse(name, input, id = `tu_${name}`) {
  return { type: 'tool_use', id, name, input };
}

const LONG_ENOUGH_TEXT = 'I am pivoting from consulting into private equity because I have spent three years building deal-evaluation muscle on live client engagements, and this MBA closes the technical gap between advisory work and principal investing.';

test('scorePivot flags a steep pivot (chef/hospitality -> pilot) as risky', () => {
  const result = scorePivot('chef_hospitality', 'pilot');
  assert.equal(result.band, 'risky');
  assert.ok(result.score >= 8, `expected score >= 8, got ${result.score}`);
});

test('scorePivot recognizes a well-worn pivot (consulting -> private equity) as credible', () => {
  const result = scorePivot('consulting', 'private_equity');
  assert.equal(result.band, 'credible');
  assert.ok(result.score <= 3, `expected score <= 3, got ${result.score}`);
});

test('save_narrative_text rejects strings under 200 characters with too_short', async () => {
  const ctx = { workingNarrativeText: '', narrativeTextDirty: false };
  const result = await executeNarrativeCoachTool(toolUse('save_narrative_text', { text: 'Too short.' }), ctx);
  assert.equal(result.error, 'too_short');
  assert.equal(ctx.narrativeTextDirty, false);
});

test('save_narrative_text rejects strings over 800 characters with too_long', async () => {
  const ctx = { workingNarrativeText: '', narrativeTextDirty: false };
  const result = await executeNarrativeCoachTool(toolUse('save_narrative_text', { text: 'x'.repeat(801) }), ctx);
  assert.equal(result.error, 'too_long');
  assert.equal(ctx.narrativeTextDirty, false);
});

test('save_narrative_text saves a 200-800 character pitch', async () => {
  const ctx = { workingNarrativeText: '', narrativeTextDirty: false };
  const result = await executeNarrativeCoachTool(toolUse('save_narrative_text', { text: LONG_ENOUGH_TEXT }), ctx);
  assert.equal(result.status, 'saved');
  assert.equal(ctx.workingNarrativeText, LONG_ENOUGH_TEXT);
  assert.equal(ctx.narrativeTextDirty, true);
});

test('finalizeCoachingSession advances stage from narrative to cv', async () => {
  const result = await finalizeCoachingSession('cand_finalize', { textLength: LONG_ENOUGH_TEXT.length, pivotRiskBand: 'credible' });
  assert.equal(result.statePatch.journeyStage, 'cv');
  assert.match(result.message, /Workspace.*Documents.*Narrative/);
  assert.ok(Array.isArray(result.options) && result.options.length > 0);
});

test('coordinator with NARRATIVE_COACHING_V2 off never invokes NarrativeCoachAgent (legacy handoff path unchanged)', async () => {
  delete process.env.NARRATIVE_COACHING_V2;
  let calledCoach = false;
  const original = NarrativeCoachAgent.prototype.handle;
  NarrativeCoachAgent.prototype.handle = async function stub() { calledCoach = true; return { agent: 'NarrativeCoachAgent', message: '', statePatch: {}, metadata: {} }; };
  try {
    const coordinator = new HybridCoordinator();
    await coordinator.execute({
      candidateId: 'cand_flag_off',
      message: "I've chosen the Upgrade narrative. Please craft my complete narrative strategy now for my chosen schools.",
      candidateState: { profile: { category: 'Graduate' }, chosenSchools: ['Wharton'] },
    });
  } finally {
    NarrativeCoachAgent.prototype.handle = original;
  }
  assert.equal(calledCoach, false);
});

test('coordinator with NARRATIVE_COACHING_V2 on and no rawGoal returns the kickoff question', async () => {
  process.env.NARRATIVE_COACHING_V2 = 'true';
  try {
    const coordinator = new HybridCoordinator();
    const result = await coordinator.execute({
      candidateId: 'cand_kickoff',
      message: '__idle_checkin__',
      candidateState: { profile: { category: 'Graduate' }, chosenSchools: ['Wharton'], narrativeCoaching: null },
    });
    assert.equal(result.agent, 'NarrativeCoachAgent');
    assert.equal(result.message, NARRATIVE_KICKOFF_QUESTION);
  } finally {
    delete process.env.NARRATIVE_COACHING_V2;
  }
});

test('coordinator with NARRATIVE_COACHING_V2 on and an active coaching session routes to NarrativeCoachAgent', async () => {
  process.env.NARRATIVE_COACHING_V2 = 'true';
  let calledWith = null;
  const original = NarrativeCoachAgent.prototype.handle;
  NarrativeCoachAgent.prototype.handle = async function stub(candidateId, message, opts) {
    calledWith = { candidateId, message, opts };
    return { agent: 'NarrativeCoachAgent', message: 'Sharp follow-up question.', statePatch: {}, metadata: { narrativeLocked: false } };
  };
  try {
    const coordinator = new HybridCoordinator();
    const result = await coordinator.execute({
      candidateId: 'cand_active',
      message: 'I want to lead product at a growth-stage startup.',
      candidateState: {
        profile: { category: 'Graduate' },
        chosenSchools: ['Wharton'],
        narrativeCoaching: { rawGoal: 'Product leadership at a startup', sessionContext: { pivotRisk: null, schoolContext: null, outcomeContext: null } },
      },
    });
    assert.ok(calledWith, 'NarrativeCoachAgent.handle should have been invoked');
    assert.equal(result.agent, 'NarrativeCoachAgent');
    assert.equal(result.message, 'Sharp follow-up question.');
  } finally {
    NarrativeCoachAgent.prototype.handle = original;
    delete process.env.NARRATIVE_COACHING_V2;
  }
});

test('EssayAgent prepends the candidate narrative as context when present, omits it when absent', async () => {
  const agent = new EssayAgent();
  let captured = null;
  agent.execute = async (messages) => { captured = messages; return { text: '{}', toolUses: [], usage: null, raw: null }; };

  await agent.review('essay body', 'prompt text', 'HBS', LONG_ENOUGH_TEXT);
  assert.match(captured[0].content, /CANDIDATE NARRATIVE \(source of truth for all essays\)/);
  assert.ok(captured[0].content.includes(LONG_ENOUGH_TEXT));

  await agent.review('essay body', 'prompt text', 'HBS');
  assert.ok(!captured[0].content.includes('CANDIDATE NARRATIVE'));
});

test('Undergraduate candidates never reach narrative coaching v2, even with the flag on and chosenSchools present', async () => {
  process.env.NARRATIVE_COACHING_V2 = 'true';
  let calledCoach = false;
  let calledUndergrad = false;
  const originalCoach = NarrativeCoachAgent.prototype.handle;
  const originalUndergrad = UndergradAgent.prototype.handle;
  NarrativeCoachAgent.prototype.handle = async function stubCoach() { calledCoach = true; return { agent: 'NarrativeCoachAgent', message: '', statePatch: {}, metadata: {} }; };
  UndergradAgent.prototype.handle = async function stubUndergrad() {
    calledUndergrad = true;
    return { agent: 'UndergradAgent', message: '', statePatch: {}, metadata: { usage: null, model: null } };
  };
  try {
    const coordinator = new HybridCoordinator();
    await coordinator.execute({
      candidateId: 'cand_undergrad',
      message: 'What should I do next?',
      candidateState: { profile: { category: 'Undergraduate' }, chosenSchools: ['State U'] },
    });
  } finally {
    NarrativeCoachAgent.prototype.handle = originalCoach;
    UndergradAgent.prototype.handle = originalUndergrad;
    delete process.env.NARRATIVE_COACHING_V2;
  }
  assert.equal(calledCoach, false);
  assert.equal(calledUndergrad, true);
});
