// Regression coverage for the MAX_ITERATIONS bump (6 -> 10): a full
// scholarship chain (get_candidate_state -> lookup_scholarships miss ->
// web_search -> cache_scholarship_results -> save_scholarship_interest ->
// end_turn_response) needs six round trips with zero margin left over, so a
// tighter ceiling silently fell back mid-chain. This pins the new ceiling
// value and the explicit exhaustion logging that ships alongside it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { UndergradAgent } from '../UndergradAgent.js';

function toolUse(name, input, id) {
  return { type: 'tool_use', id, name, input };
}

test('the loop runs up to 10 iterations before falling back, not 6', async () => {
  const agent = new UndergradAgent();
  let calls = 0;
  agent.execute = async () => {
    calls += 1;
    const uses = [toolUse('get_candidate_state', {}, `tu_${calls}`)];
    return { text: '', toolUses: uses, stopReason: 'tool_use', usage: null, raw: { model: 'claude-sonnet-4-6', content: uses } };
  };

  const result = await agent.handle('cand_ceiling', 'find me scholarships for computer science', {
    conversationHistory: [],
    candidateState: { profile: { grade: '10' } },
  });

  assert.equal(calls, 10);
  assert.equal(result.metadata.fallbackUsed, true);
  assert.equal(result.metadata.toolCalls.length, 10);
});

test('exhausting the ceiling logs a warning with the in-flight toolCalls for debugging', async () => {
  const agent = new UndergradAgent();
  agent.execute = async () => {
    const uses = [toolUse('lookup_scholarships', { schoolName: 'MIT' }, 'tu_x')];
    return { text: '', toolUses: uses, stopReason: 'tool_use', usage: null, raw: { model: 'claude-sonnet-4-6', content: uses } };
  };

  const originalWarn = console.warn;
  const warnCalls = [];
  console.warn = (...args) => { warnCalls.push(args); };
  try {
    await agent.handle('cand_ceiling_log', 'find me scholarships', {
      conversationHistory: [],
      candidateState: { profile: { grade: '10' } },
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnCalls.length, 1);
  const [label, details] = warnCalls[0];
  assert.match(label, /iteration ceiling exhausted/i);
  assert.equal(details.candidateId, 'cand_ceiling_log');
  assert.equal(details.maxIterations, 10);
  assert.ok(Array.isArray(details.toolCalls) && details.toolCalls.length === 10);
  assert.deepEqual(new Set(details.toolCalls), new Set(['lookup_scholarships']));
});

test('a terminal response before the ceiling never logs a warning', async () => {
  const agent = new UndergradAgent();
  agent.execute = async () => {
    const uses = [toolUse('end_turn_response', { message: 'All set.', options: [] }, 'tu_end')];
    return { text: '', toolUses: uses, stopReason: 'tool_use', usage: null, raw: { model: 'claude-sonnet-4-6', content: uses } };
  };

  const originalWarn = console.warn;
  const warnCalls = [];
  console.warn = (...args) => { warnCalls.push(args); };
  try {
    const result = await agent.handle('cand_no_warn', 'hi', {
      conversationHistory: [],
      candidateState: { profile: { grade: '10' } },
    });
    assert.equal(result.metadata.fallbackUsed, false);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnCalls.length, 0);
});
