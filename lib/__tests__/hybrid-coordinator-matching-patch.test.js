import test from 'node:test';
import assert from 'node:assert/strict';

import { specialistPatch } from '../hybrid-coordinator.js';
import { MatchingAgent } from '../agents/sub/MatchingAgent.js';

function canonicalProgram(index) {
  const fit = index % 3 === 0 ? 84 : index % 3 === 1 ? 66 : 42;
  return {
    name: `PhD Program ${index + 1}`,
    tier: fit >= 80 ? 'safe' : fit >= 50 ? 'possible' : 'stretch',
    fit,
    location: 'United States',
    programGroup: 'PhD in Computer Science',
    admissionStatus: fit >= 80 ? 'Strong Fit' : fit >= 50 ? 'Competitive' : 'Reach',
    evidenceGaps: [],
    riskFlags: [],
    fitDrivers: ['Research alignment', 'Faculty fit'],
    programInfo: 'This doctoral program aligns with the candidate research direction and offers relevant faculty mentorship, strong laboratory resources, and an active publication culture. The recommendation balances academic fit with realistic admissions selectivity while preserving room to verify current faculty availability.',
    notes: 'Confirm faculty availability before applying.',
  };
}

test('specialistPatch(matching) accepts a realistic canonical eight-program response wrapped in prose', () => {
  const matches = Array.from({ length: 8 }, (_, index) => canonicalProgram(index));
  const result = { text: `Here are the matches:\n${JSON.stringify({ matches })}\nEnd of results.` };

  const patch = specialistPatch('matching', result);

  assert.equal(patch.programs.length, 8);
  assert.deepEqual(patch.programs.map(program => program.name).sort(), matches.map(program => program.name).sort());
  assert.ok(patch.programs.every(program => ['safe', 'possible', 'stretch'].includes(program.tier)));
});

test('specialistPatch(matching) ships a nonempty list below the generated minimum', () => {
  const matches = Array.from({ length: 3 }, (_, index) => canonicalProgram(index));
  const patch = specialistPatch('matching', { text: JSON.stringify({ matches }) });

  assert.equal(patch.programs.length, 3);
});

test('MatchingAgent uses the raised output budget and forces final JSON after a dangling tool turn', async () => {
  const agent = new MatchingAgent();
  let synthesisMessages = null;
  agent.executeWithTools = async () => ({ text: '', stopReason: 'tool_use', history: [{ role: 'user', content: 'original request' }] });
  agent.execute = async (messages) => {
    synthesisMessages = messages;
    return { text: '{"matches":[]}', stopReason: 'end_turn' };
  };

  const result = await agent.executeMatching([{ role: 'user', content: 'match me' }]);

  assert.equal(agent.maxTokens, 16000);
  assert.equal(result.stopReason, 'end_turn');
  assert.match(synthesisMessages.at(-1).content, /Do not call any tools/);
});

test('MatchingAgent falls back to the coordinator profile when stored profile data is unavailable', async () => {
  const agent = new MatchingAgent();
  let prompt = '';
  agent.executeMatching = async (messages) => {
    prompt = messages[0].content;
    return { text: '{"matches":[]}', stopReason: 'end_turn' };
  };

  await agent.match(`missing-profile-${Date.now()}`, { destination: 'USA' }, { degree: 'PhD', researchDirection: 'AI safety' });

  assert.match(prompt, /"degree": "PhD"/);
  assert.match(prompt, /"researchDirection": "AI safety"/);
});
