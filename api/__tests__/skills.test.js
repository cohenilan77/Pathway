import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ANTHROPIC_API_KEY ||= 'test-key';
process.env.SKILLS_ENABLED = 'true';
process.env.SKILL_CV_REVIEW = 'skill_01Y3s9Fhqq9EZGNTot1i9Xiw';

const { BaseAgent } = await import('../../lib/agents/BaseAgent.js');

class SkillTestAgent extends BaseAgent {
  constructor() {
    super({ name: 'SkillTestAgent', systemPrompt: 'test' });
    this.skillBundle = 'cvCoaching';
  }
}

const response = (text) => ({
  content: [{ type: 'text', text }],
  stop_reason: 'end_turn',
  usage: {},
});

test('enabled Skill bundles use the beta Messages endpoint', async () => {
  const agent = new SkillTestAgent();
  let betaParams;
  agent.client = {
    beta: { messages: { create: async (params) => { betaParams = params; return response('beta'); } } },
    messages: { create: async () => { throw new Error('stable endpoint should not be used'); } },
  };

  const result = await agent.execute([{ role: 'user', content: 'review' }]);

  assert.equal(result.text, 'beta');
  assert.deepEqual(betaParams.container.skills, [{ type: 'custom', skill_id: process.env.SKILL_CV_REVIEW, version: 'latest' }]);
  assert.ok(betaParams.betas.includes('skills-2025-10-02'));
  assert.ok(betaParams.tools.some((tool) => tool.type === 'code_execution_20250825'));
});

test('Skill API errors retry safely on the stable endpoint', async () => {
  const agent = new SkillTestAgent();
  let stableParams;
  agent.client = {
    beta: { messages: { create: async () => { throw new Error('invalid Skill configuration'); } } },
    messages: { create: async (params) => { stableParams = params; return response('fallback'); } },
  };

  const result = await agent.execute([{ role: 'user', content: 'review' }]);

  assert.equal(result.text, 'fallback');
  assert.equal(stableParams.container, undefined);
  assert.equal(stableParams.betas, undefined);
  assert.equal(stableParams.tools, undefined);
});
