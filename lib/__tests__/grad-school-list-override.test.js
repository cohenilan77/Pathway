// Regression coverage for the top-level grad/MBA/PhD school-list override
// (Commit 5): a candidate explicitly asking to see/generate their school
// list must win over every in-progress specialist flow (narrative coaching,
// community/study-partner matching, or any other stage-lock) — mirrors the
// Undergraduate branch's looksLikeUndergradSchoolListRequest check, which
// already has this same unconditional priority.
import test from 'node:test';
import assert from 'node:assert/strict';

import { HybridCoordinator, isGradSchoolListOverrideRequest } from '../hybrid-coordinator.js';
import { NarrativeCoachAgent } from '../agents/NarrativeCoachAgent.js';
import { CommunityAgent } from '../agents/sub/CommunityAgent.js';
import { SearchAgent } from '../agents/sub/SearchAgent.js';
import { MatchingAgent } from '../agents/sub/MatchingAgent.js';

test('isGradSchoolListOverrideRequest recognizes the transcript trigger phrases', () => {
  assert.equal(isGradSchoolListOverrideRequest('Generate my complete school list now. I cannot see any schools in Chat or Analysis.'), true);
  assert.equal(isGradSchoolListOverrideRequest("Where's my list?"), true);
  assert.equal(isGradSchoolListOverrideRequest('Where is my school list?'), true);
  assert.equal(isGradSchoolListOverrideRequest('Show me my school list.'), true);
  assert.equal(isGradSchoolListOverrideRequest('I want to pivot from consulting to private equity.'), false);
  assert.equal(isGradSchoolListOverrideRequest('find me a study partner'), false);
});

const NARRATIVE_STATE = {
  profile: { category: 'Graduate' },
  chosenSchools: ['Wharton'],
  scores: { overall: 72 },
  narrativeCoaching: { rawGoal: 'Pivot to PE', sessionContext: { pivotRisk: null, schoolContext: null, outcomeContext: null } },
};

function stubMatchingPlan(programs) {
  const originalSearch = SearchAgent.prototype.search;
  const originalMatch = MatchingAgent.prototype.match;
  let matchCalled = false;
  SearchAgent.prototype.search = async () => ({ text: '{}', toolUses: [], usage: null, raw: null });
  MatchingAgent.prototype.match = async () => {
    matchCalled = true;
    return { text: JSON.stringify({ matches: programs }), toolUses: [], usage: null, raw: null };
  };
  return {
    called: () => matchCalled,
    restore() {
      SearchAgent.prototype.search = originalSearch;
      MatchingAgent.prototype.match = originalMatch;
    },
  };
}

function tenPrograms(prefix = 'School') {
  return Array.from({ length: 10 }, (_, i) => ({ name: `${prefix} ${i + 1}`, fit: 60 }));
}

test('an explicit school-list request escapes narrative coaching and generates a fresh portfolio', async () => {
  process.env.NARRATIVE_COACHING_V2 = 'true';
  const originalCoach = NarrativeCoachAgent.prototype.handle;
  let coachCalled = false;
  NarrativeCoachAgent.prototype.handle = async () => { coachCalled = true; return { agent: 'NarrativeCoachAgent', message: '', statePatch: {}, metadata: {} }; };
  const stub = stubMatchingPlan(tenPrograms());
  try {
    const coordinator = new HybridCoordinator();
    const result = await coordinator.execute({
      candidateId: 'cand_override_narrative',
      message: 'Generate my complete school list now. I cannot see any schools in Chat or Analysis.',
      candidateState: NARRATIVE_STATE,
    });
    assert.equal(coachCalled, false, 'NarrativeCoachAgent must never be invoked for an explicit school-list override');
    assert.ok(stub.called(), 'MatchingAgent should have been invoked to generate the list');
    assert.equal(result.agent, 'matching');
    assert.equal(result.statePatch.programs.length, 10);
  } finally {
    stub.restore();
    NarrativeCoachAgent.prototype.handle = originalCoach;
    delete process.env.NARRATIVE_COACHING_V2;
  }
});

test('an explicit school-list request escapes a community/study-partner-matching context', async () => {
  const originalCommunity = CommunityAgent.prototype.handle;
  let communityCalled = false;
  CommunityAgent.prototype.handle = async () => { communityCalled = true; return { text: 'Which schools are you targeting?', toolUses: [], usage: null, raw: null }; };
  const stub = stubMatchingPlan(tenPrograms());
  try {
    const coordinator = new HybridCoordinator();
    const result = await coordinator.execute({
      candidateId: 'cand_override_community',
      message: 'Generate my complete school list now, I cannot see any schools.',
      conversationHistory: [
        { role: 'user', text: 'find me a study partner' },
        { role: 'ai', text: 'Which schools are you targeting, what is your GMAT timeline, and what is your journey type?' },
      ],
      candidateState: { profile: { category: 'Graduate' }, scores: { overall: 72 } },
    });
    assert.equal(communityCalled, false, 'CommunityAgent must never be invoked for an explicit school-list override');
    assert.ok(stub.called(), 'MatchingAgent should have been invoked to generate the list');
    assert.equal(result.agent, 'matching');
  } finally {
    stub.restore();
    CommunityAgent.prototype.handle = originalCommunity;
  }
});

test('an existing 10+ school list is re-surfaced instead of regenerated (no agent calls at all)', async () => {
  const stub = stubMatchingPlan(tenPrograms('Should Not Be Called'));
  try {
    const coordinator = new HybridCoordinator();
    const existing = tenPrograms('Existing School');
    const result = await coordinator.execute({
      candidateId: 'cand_override_resurface',
      message: 'Where is my school list? I cannot see it anywhere.',
      candidateState: { profile: { category: 'Graduate' }, scores: { overall: 72 }, programs: existing },
    });
    assert.equal(stub.called(), false, 'an existing list should be re-surfaced, never regenerated');
    assert.equal(result.agent, 'matching');
    assert.deepEqual(result.statePatch.programs, existing);
    assert.match(result.message, /again/i);
  } finally {
    stub.restore();
  }
});

test('a school-list request with no real profile/scores yet falls through instead of forcing a bare portfolio call', async () => {
  const stub = stubMatchingPlan(tenPrograms());
  try {
    const coordinator = new HybridCoordinator();
    const result = await coordinator.execute({
      candidateId: 'cand_override_no_signal',
      message: 'show me schools',
      candidateState: { profile: { category: 'Graduate' } },
    });
    assert.equal(stub.called(), false, 'no scores/baseline yet — must not force a real MatchingAgent call');
    assert.notEqual(result.agent, 'matching');
  } finally {
    stub.restore();
  }
});

test('the override is a one-turn escape valve: narrative coaching resumes normally on the very next turn', async () => {
  process.env.NARRATIVE_COACHING_V2 = 'true';
  const originalCoach = NarrativeCoachAgent.prototype.handle;
  let coachCalledWith = null;
  NarrativeCoachAgent.prototype.handle = async (candidateId, message, opts) => {
    coachCalledWith = { message, narrativeCoaching: opts.candidateState.narrativeCoaching };
    return { agent: 'NarrativeCoachAgent', message: 'Tell me more.', statePatch: {}, metadata: { narrativeLocked: false } };
  };
  const stub = stubMatchingPlan(tenPrograms());
  try {
    const coordinator = new HybridCoordinator();
    const overrideTurn = await coordinator.execute({
      candidateId: 'cand_override_resume',
      message: 'Generate my complete school list now.',
      candidateState: NARRATIVE_STATE,
    });
    assert.equal(overrideTurn.agent, 'matching');
    assert.equal(overrideTurn.statePatch.narrativeCoaching, undefined, 'the override must never touch narrativeCoaching state');

    // Next turn: same persisted narrativeCoaching (untouched by the
    // override), an ordinary follow-up message — coaching must resume.
    const nextTurn = await coordinator.execute({
      candidateId: 'cand_override_resume',
      message: 'Because I built real deal-evaluation skills.',
      candidateState: NARRATIVE_STATE,
    });
    assert.ok(coachCalledWith, 'NarrativeCoachAgent should have been invoked on the following turn');
    assert.equal(nextTurn.agent, 'NarrativeCoachAgent');
    assert.deepEqual(coachCalledWith.narrativeCoaching, NARRATIVE_STATE.narrativeCoaching);
  } finally {
    stub.restore();
    NarrativeCoachAgent.prototype.handle = originalCoach;
    delete process.env.NARRATIVE_COACHING_V2;
  }
});
