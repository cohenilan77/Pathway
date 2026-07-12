import test from 'node:test';
import assert from 'node:assert/strict';

import { ScholarshipAgent } from '../ScholarshipAgent.js';
import { getScholarships, getCalendarEvents } from '../../tools/update.js';

function toolUse(name, input, id = `tu_${name}`) {
  return { type: 'tool_use', id, name, input };
}

test('ScholarshipAgent.handleToolUse: lookup_scholarships returns found:false when nothing is cached', async () => {
  const agent = new ScholarshipAgent();
  const result = await agent.handleToolUse(toolUse('lookup_scholarships', { schoolName: `Never Cached Grad School ${Date.now()}` }));
  assert.deepEqual(result, { found: false, scholarships: [], cached: false });
});

test('ScholarshipAgent.handleToolUse: cache_scholarship_results then lookup_scholarships round trip', async () => {
  const agent = new ScholarshipAgent();
  const schoolName = `Grad Test School ${Date.now()}`;
  const cached = await agent.handleToolUse(toolUse('cache_scholarship_results', {
    schoolName,
    scholarships: [{ name: 'Grad Test Fellowship', url: 'https://example.com/grad-test', amountUSD: 8000 }],
  }));
  assert.equal(cached.status, 'cached');

  const lookup = await agent.handleToolUse(toolUse('lookup_scholarships', { schoolName }));
  assert.equal(lookup.found, true);
  assert.equal(lookup.scholarships[0].name, 'Grad Test Fellowship');
});

test('ScholarshipAgent.handleToolUse: save_scholarship_interest persists directly and schedules a calendar deadline', async () => {
  const candidateId = `cand_grad_scholarship_${Date.now()}`;
  const agent = new ScholarshipAgent();
  agent._candidateId = candidateId;
  const result = await agent.handleToolUse(toolUse('save_scholarship_interest', {
    name: 'Grad Test Fellowship', url: 'https://example.com/grad-test', deadline: '2027-04-01',
  }));
  assert.equal(result.status, 'saved');

  const saved = await getScholarships(candidateId);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, 'Grad Test Fellowship');

  const events = await getCalendarEvents(candidateId);
  const deadlineEvent = events.find(e => e.type === 'scholarship_deadline');
  assert.ok(deadlineEvent, 'a scholarship_deadline calendar event should have been created');
});

test('ScholarshipAgent.handleToolUse: rejects a save missing a url without persisting anything', async () => {
  const agent = new ScholarshipAgent();
  agent._candidateId = 'cand_grad_reject';
  const result = await agent.handleToolUse(toolUse('save_scholarship_interest', { name: 'Some Fellowship' }));
  assert.equal(result.error, 'missing_name_or_url');
});

test('cache_scholarship_results rejects entries with no url even through the agent', async () => {
  const agent = new ScholarshipAgent();
  const result = await agent.handleToolUse(toolUse('cache_scholarship_results', {
    query: `grad-fabrication-test-${Date.now()}`,
    scholarships: [{ name: 'Fabricated Fellowship' }],
  }));
  assert.equal(result.error, 'no_valid_entries');
});
