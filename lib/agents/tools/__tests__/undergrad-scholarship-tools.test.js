import test from 'node:test';
import assert from 'node:assert/strict';

import { executeUndergradTool } from '../undergrad-tools.js';
import { emptyUndergradState } from '../../../undergrad/store.js';

function makeCtx(overrides = {}) {
  return {
    candidateId: 'cand_scholarship_test',
    surface: 'chat',
    now: Date.parse('2026-07-12T00:00:00Z'),
    workingProfile: { category: 'Undergraduate' },
    workingUndergrad: emptyUndergradState('cand_scholarship_test'),
    workingPrograms: [],
    workingScholarships: [],
    knownChannels: new Map(),
    primaryArea: null,
    undergradDirty: false,
    programsDirty: false,
    scholarshipsDirty: false,
    ...overrides,
  };
}

async function callTool(name, input, ctx) {
  return executeUndergradTool(ctx.candidateId, { name, input }, ctx);
}

test('lookup_scholarships: nothing cached yet returns found:false, cached:false', async () => {
  const ctx = makeCtx();
  const result = await callTool('lookup_scholarships', { schoolName: `Never Cached School ${Date.now()}` }, ctx);
  assert.deepEqual(result, { found: false, scholarships: [], cached: false });
});

test('cache_scholarship_results then lookup_scholarships: round trip through the real cache', async () => {
  const ctx = makeCtx();
  const schoolName = `Undergrad Tool School ${Date.now()}`;
  const cached = await callTool('cache_scholarship_results', {
    schoolName,
    scholarships: [{ name: 'Undergrad Tool Award', url: 'https://example.com/undergrad-tool', amountUSD: 3000 }],
  }, ctx);
  assert.equal(cached.status, 'cached');

  const lookup = await callTool('lookup_scholarships', { schoolName }, ctx);
  assert.equal(lookup.found, true);
  assert.equal(lookup.scholarships[0].name, 'Undergrad Tool Award');
});

test('cache_scholarship_results: rejects entries missing a url (never caches a fabricated result)', async () => {
  const ctx = makeCtx();
  const result = await callTool('cache_scholarship_results', {
    query: `fabrication-test-${Date.now()}`,
    scholarships: [{ name: 'Made Up Award' }],
  }, ctx);
  assert.equal(result.error, 'no_valid_entries');
});

test('save_scholarship_interest: saves the record, marks dirty, and schedules a calendar deadline', async () => {
  const ctx = makeCtx();
  const result = await callTool('save_scholarship_interest', {
    name: 'Test Undergrad Scholarship', url: 'https://example.com/undergrad-test', deadline: '2027-06-01',
  }, ctx);
  assert.equal(result.status, 'saved');
  assert.equal(ctx.scholarshipsDirty, true);
  assert.equal(ctx.workingScholarships.length, 1);
  assert.equal(ctx.workingScholarships[0].name, 'Test Undergrad Scholarship');
  assert.equal(ctx.undergradDirty, true);
  const event = ctx.workingUndergrad.calendar.find(e => e.type === 'scholarship_deadline');
  assert.ok(event, 'a scholarship_deadline calendar event should have been created');
  assert.match(event.title, /Test Undergrad Scholarship/);
});

test('save_scholarship_interest: saving the same scholarship twice dedupes instead of duplicating', async () => {
  const ctx = makeCtx();
  await callTool('save_scholarship_interest', { name: 'Dedup Award', url: 'https://example.com/dedup' }, ctx);
  await callTool('save_scholarship_interest', { name: 'Dedup Award', url: 'https://example.com/dedup', status: 'applying' }, ctx);
  assert.equal(ctx.workingScholarships.length, 1);
  assert.equal(ctx.workingScholarships[0].status, 'applying');
});

test('save_scholarship_interest: rejects a save missing a name or url (never fabricates a source)', async () => {
  const ctx = makeCtx();
  const result = await callTool('save_scholarship_interest', { name: 'Some Scholarship' }, ctx);
  assert.equal(result.error, 'missing_name_or_url');
  assert.equal(ctx.scholarshipsDirty, false);
});
