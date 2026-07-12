import test from 'node:test';
import assert from 'node:assert/strict';

import { lookupScholarships, cacheScholarshipLookup, normalizeScholarshipSave, SCHOLARSHIP_TOOLS } from '../scholarship-tools.js';

test('SCHOLARSHIP_TOOLS defines lookup, cache, and save', () => {
  assert.deepEqual(
    SCHOLARSHIP_TOOLS.map(t => t.name).sort(),
    ['cache_scholarship_results', 'lookup_scholarships', 'save_scholarship_interest'].sort(),
  );
});

test('lookupScholarships: a school with nothing cached returns found:false, cached:false (signals web_search next)', async () => {
  const result = await lookupScholarships({ schoolName: `Untested School ${Date.now()}` });
  assert.deepEqual(result, { found: false, scholarships: [], cached: false });
});

test('cacheScholarshipLookup + lookupScholarships round trip for a real, grounded result', async () => {
  const schoolName = `Tool Test University ${Date.now()}`;
  const cached = await cacheScholarshipLookup({
    schoolName,
    scholarships: [{ name: 'Tool Test Award', url: 'https://example.com/tool-test', amountUSD: 2500 }],
  });
  assert.equal(cached.status, 'cached');

  const lookup = await lookupScholarships({ schoolName });
  assert.equal(lookup.found, true);
  assert.equal(lookup.scholarships[0].name, 'Tool Test Award');
});

test('cacheScholarshipLookup rejects entries with no url (hard grounding — never persists a fabricated result)', async () => {
  const result = await cacheScholarshipLookup({ query: `no-url-query-${Date.now()}`, scholarships: [{ name: 'Fabricated Award' }] });
  assert.equal(result.error, 'no_valid_entries');
});

test('normalizeScholarshipSave: requires both name and url', () => {
  const missingUrl = normalizeScholarshipSave({ name: 'Some Scholarship' });
  assert.equal(missingUrl.error, 'missing_name_or_url');

  const missingName = normalizeScholarshipSave({ url: 'https://example.com/x' });
  assert.equal(missingName.error, 'missing_name_or_url');

  const { error, record } = normalizeScholarshipSave({ name: 'Real Scholarship', url: 'https://example.com/real', amountUSD: 1000 }, 1000);
  assert.equal(error, undefined);
  assert.equal(record.name, 'Real Scholarship');
  assert.equal(record.source, 'web');
  assert.equal(record.status, 'interested');
  assert.equal(record.savedAt, 1000);
});
