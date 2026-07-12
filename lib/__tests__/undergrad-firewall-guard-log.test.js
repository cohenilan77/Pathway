// Phase 1D: measures how often a turn WOULD have escaped to a grad-shaped
// specialist under the pre-firewall logic, without changing routing — the
// firewall already structurally prevents all of these while the smart agent
// is on. This just confirms the passive measurement fires (or doesn't) on
// the right messages, and never changes what agent actually handles the turn.
import test from 'node:test';
import assert from 'node:assert/strict';

import { HybridCoordinator } from '../hybrid-coordinator.js';
import { UndergradAgent } from '../agents/UndergradAgent.js';
import { getCandidateActivity } from '../candidate-activity.js';

async function runTurn(candidateId, message) {
  const originalHandle = UndergradAgent.prototype.handle;
  UndergradAgent.prototype.handle = async function stub() {
    return { agent: 'UndergradAgent', message: '', statePatch: {}, metadata: { routedAgent: 'UndergradAgent' } };
  };
  try {
    const coordinator = new HybridCoordinator();
    return await coordinator.execute({
      candidateId,
      message,
      candidateState: { profile: { category: 'Undergraduate', grade: '10' } },
    });
  } finally {
    UndergradAgent.prototype.handle = originalHandle;
  }
}

test('firewall guard-hit log fires for a message that would have escaped, but still routes to UndergradAgent', async () => {
  const candidateId = `cand_firewall_log_${Date.now()}`;
  const result = await runTurn(candidateId, 'I want to see my full profile');
  assert.equal(result.agent, 'UndergradAgent');
  const activity = await getCandidateActivity(candidateId);
  const hit = activity.find(entry => entry.type === 'undergrad_firewall_guard_hit');
  assert.ok(hit, 'a guard-hit activity entry should have been recorded');
  assert.ok(hit.metadata.reasons.includes('wantsProfileAnalysis'));
});

test('firewall guard-hit log does not fire for ordinary conversation', async () => {
  const candidateId = `cand_firewall_log_ordinary_${Date.now()}`;
  await runTurn(candidateId, 'I joined robotics club this week');
  const activity = await getCandidateActivity(candidateId);
  const hit = activity.find(entry => entry.type === 'undergrad_firewall_guard_hit');
  assert.equal(hit, undefined);
});
