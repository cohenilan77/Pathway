import test from 'node:test';
import assert from 'node:assert/strict';

import { MainAgent, ROUTER_AGENT_IDS } from '../MainAgent.js';
import { ScholarshipAgent } from '../sub/ScholarshipAgent.js';

test('ROUTER_AGENT_IDS includes scholarship', () => {
  assert.ok(ROUTER_AGENT_IDS.has('scholarship'));
});

test('MainAgent.handle(): forcedAgent scholarship calls ScholarshipAgent.handle with the profile', async () => {
  const originalHandle = ScholarshipAgent.prototype.handle;
  let receivedProfile = null;
  ScholarshipAgent.prototype.handle = async function stub(candidateId, message, profile) {
    receivedProfile = profile;
    return { text: 'Here are some matches.', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    const result = await agent.handle('cand_scholarship_route', 'find scholarships that fit me', {
      forcedAgent: 'scholarship',
      extra: { profile: { category: 'Graduate', degree: 'MBA' } },
    });
    assert.equal(result.agent, 'scholarship');
    assert.deepEqual(receivedProfile, { category: 'Graduate', degree: 'MBA' });
    assert.equal(result.result.text, 'Here are some matches.');
  } finally {
    ScholarshipAgent.prototype.handle = originalHandle;
  }
});

test('MainAgent.handle(): extra.searchScholarships routes to ScholarshipAgent.search instead of handle', async () => {
  const originalSearch = ScholarshipAgent.prototype.search;
  let searchCalled = false;
  ScholarshipAgent.prototype.search = async function stub() {
    searchCalled = true;
    return { text: 'search results', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    await agent.handle('cand_scholarship_search', 'ignored', {
      forcedAgent: 'scholarship',
      extra: { searchScholarships: true, profile: { category: 'Undergraduate' } },
    });
    assert.equal(searchCalled, true);
  } finally {
    ScholarshipAgent.prototype.search = originalSearch;
  }
});
