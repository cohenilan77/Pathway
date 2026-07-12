import test from 'node:test';
import assert from 'node:assert/strict';

import { getCachedScholarships, cacheScholarshipResults, sanitizeScholarshipEntries, slugify } from '../scholarship-cache.js';

test('slugify normalizes names consistently', () => {
  assert.equal(slugify('Example University'), 'example-university');
  assert.equal(slugify('MIT'), 'mit');
});

test('getCachedScholarships: a school with nothing cached returns found:false, cached:false', async () => {
  const result = await getCachedScholarships({ schoolName: `Never Searched School ${Date.now()}` });
  assert.deepEqual(result, { found: false, scholarships: [], cached: false });
});

test('getCachedScholarships: neither schoolName nor query given returns found:false safely', async () => {
  const result = await getCachedScholarships({});
  assert.deepEqual(result, { found: false, scholarships: [], cached: false });
});

test('sanitizeScholarshipEntries: drops entries missing a name or url (hard grounding)', () => {
  const clean = sanitizeScholarshipEntries([
    { name: 'Real Scholarship', url: 'https://example.com/real' },
    { name: 'Missing URL Scholarship' },
    { url: 'https://example.com/missing-name' },
    null,
    { name: 'Second Real', url: 'https://example.com/second', amountUSD: '5000' },
  ]);
  assert.equal(clean.length, 2);
  assert.equal(clean[0].name, 'Real Scholarship');
  assert.equal(clean[1].amountUSD, 5000);
});

test('cache round trip: caching valid results makes them findable, invalid ones are rejected', async () => {
  const schoolName = `Cache Test University ${Date.now()}`;
  const rejected = await cacheScholarshipResults({ schoolName, scholarships: [{ name: 'No URL Award' }] });
  assert.equal(rejected.error, 'no_valid_entries');

  const cached = await cacheScholarshipResults({
    schoolName,
    scholarships: [{ name: 'Founders Award', url: 'https://example.com/founders', amountUSD: 10000 }],
  });
  assert.equal(cached.status, 'cached');
  assert.equal(cached.count, 1);

  const lookup = await getCachedScholarships({ schoolName });
  assert.equal(lookup.found, true);
  assert.equal(lookup.cached, true);
  assert.equal(lookup.stale, false);
  assert.equal(lookup.scholarships[0].name, 'Founders Award');
});

test('cacheScholarshipResults requires a schoolName or query', async () => {
  const result = await cacheScholarshipResults({ scholarships: [{ name: 'X', url: 'https://example.com/x' }] });
  assert.equal(result.error, 'missing_school_or_query');
});

test('query-based cache works the same way as school-based cache', async () => {
  const query = `first-gen engineering ${Date.now()}`;
  await cacheScholarshipResults({ query, scholarships: [{ name: 'Engineering First-Gen Award', url: 'https://example.com/first-gen' }] });
  const lookup = await getCachedScholarships({ query });
  assert.equal(lookup.found, true);
  assert.equal(lookup.scholarships[0].name, 'Engineering First-Gen Award');
});
