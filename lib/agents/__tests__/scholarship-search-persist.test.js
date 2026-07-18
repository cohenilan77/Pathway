import test from 'node:test';
import assert from 'node:assert/strict';

import { MainAgent } from '../MainAgent.js';
import { ScholarshipAgent } from '../sub/ScholarshipAgent.js';
import { SAVE_SCHOLARSHIP_RESULTS_TOOL, normalizeScholarshipResults } from '../tools/scholarship-tools.js';
import { getScholarships } from '../tools/update.js';

test('the bulk save_scholarship_results tool exists (grad-only)', () => {
  assert.equal(SAVE_SCHOLARSHIP_RESULTS_TOOL.name, 'save_scholarship_results');
});

test('normalizeScholarshipResults defaults to suggested, drops missing name/url, de-dupes by name+url', () => {
  const records = normalizeScholarshipResults([
    { name: 'Rhodes Scholarship', url: 'https://rhodes.example/apply', amountUSD: 70000, deadline: '2027-10-01' },
    { name: 'Rhodes Scholarship', url: 'https://rhodes.example/apply' }, // duplicate by name+url
    { name: 'No URL Award' }, // dropped — missing url
    { url: 'https://example.com/no-name' }, // dropped — missing name
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].status, 'suggested');
  assert.equal(records[0].name, 'Rhodes Scholarship');
});

test('ScholarshipAgent.search with chosen schools persists >=1 grounded scholarship (status suggested) to scholarships:${candidateId}', async () => {
  const candidateId = 'cand_scholarship_persist_test';
  const agent = new ScholarshipAgent();

  // Simulate the model: first turn calls save_scholarship_results with grounded
  // matches (one duplicate, one ungrounded), second turn returns a text summary.
  // This exercises search() -> executeWithTools -> handleToolUse -> persistence
  // without a live Anthropic call.
  let turn = 0;
  const originalExecute = ScholarshipAgent.prototype.execute;
  ScholarshipAgent.prototype.execute = async function stub() {
    turn += 1;
    if (turn === 1) {
      const input = {
        scholarships: [
          { name: 'MIT Presidential Fellowship', url: 'https://mit.example/fellowship', amountUSD: 40000, deadline: '2027-12-01', eligibility: 'Graduate students' },
          { name: 'MIT Presidential Fellowship', url: 'https://mit.example/fellowship' }, // dup
          { name: 'Ungrounded Award' }, // dropped
        ],
      };
      const toolUse = { type: 'tool_use', id: 'tu_save', name: 'save_scholarship_results', input };
      return { text: '', toolUses: [toolUse], stopReason: 'tool_use', usage: null, raw: { content: [toolUse] } };
    }
    return { text: 'Saved 1 grounded scholarship for MIT.', toolUses: [], stopReason: 'end_turn', usage: null, raw: { content: [] } };
  };

  try {
    await agent.search(candidateId, { category: 'Graduate', degree: 'MSc', field: 'CS' }, ['MIT']);
  } finally {
    ScholarshipAgent.prototype.execute = originalExecute;
  }

  const saved = await getScholarships(candidateId);
  const match = saved.find(s => s.name === 'MIT Presidential Fellowship');
  assert.ok(match, 'the grounded scholarship must be persisted to the tab store');
  assert.equal(match.status, 'suggested');
  assert.equal(match.url, 'https://mit.example/fellowship');
  // Idempotent across re-runs: dedupe keeps the single ungrounded entry out.
  assert.ok(!saved.some(s => s.name === 'Ungrounded Award'));
});

test('MainAgent scholarship search dispatch passes the chosen schools through to ScholarshipAgent.search', async () => {
  const originalSearch = ScholarshipAgent.prototype.search;
  let receivedSchools = null;
  let receivedProfile = null;
  ScholarshipAgent.prototype.search = async function stub(candidateId, profile, schools) {
    receivedProfile = profile;
    receivedSchools = schools;
    return { text: 'search results', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    await agent.handle('cand_scholarship_schools', 'find scholarships for my schools', {
      forcedAgent: 'scholarship',
      extra: {
        searchScholarships: true,
        profile: { category: 'Graduate', degree: 'MBA' },
        targetSchools: ['Wharton', 'Booth'],
        programs: [{ name: 'Kellogg' }],
      },
    });
    assert.deepEqual(receivedSchools, ['Wharton', 'Booth']);
    assert.deepEqual(receivedProfile, { category: 'Graduate', degree: 'MBA' });
  } finally {
    ScholarshipAgent.prototype.search = originalSearch;
  }
});

test('MainAgent scholarship dispatch falls back to program names when no chosen schools exist', async () => {
  const originalHandle = ScholarshipAgent.prototype.handle;
  let receivedSchools = null;
  ScholarshipAgent.prototype.handle = async function stub(candidateId, message, profile, schools) {
    receivedSchools = schools;
    return { text: 'ok', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    await agent.handle('cand_scholarship_fallback', 'any funding options?', {
      forcedAgent: 'scholarship',
      extra: {
        profile: { category: 'Graduate', degree: 'MSc' },
        programs: [{ name: 'Stanford' }, { name: 'MIT' }, { notName: 'skip' }],
      },
    });
    assert.deepEqual(receivedSchools, ['Stanford', 'MIT']);
  } finally {
    ScholarshipAgent.prototype.handle = originalHandle;
  }
});
