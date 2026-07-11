import test from 'node:test';
import assert from 'node:assert/strict';

import { ROADMAP_MILESTONES, gradeBand, computeRoadmapGaps, applySessionSummary } from '../roadmap-milestones.js';
import { emptyUndergradState } from '../store.js';

test('gradeBand groups 9-10, and separates 11 and 12', () => {
  assert.equal(gradeBand(9), '9-10');
  assert.equal(gradeBand('10th'), '9-10');
  assert.equal(gradeBand(11), '11');
  assert.equal(gradeBand('Grade 12'), '12');
  assert.equal(gradeBand(null), null);
  assert.equal(gradeBand(''), null);
});

test('computeRoadmapGaps returns [] when grade is unknown', () => {
  assert.deepEqual(computeRoadmapGaps({ profile: {} }), []);
});

test('grade 11 candidate with no booked test date has "test date booked" in gaps', () => {
  const gaps = computeRoadmapGaps({
    profile: { grade: 11, subjects: 'Physics' },
    undergrad: { testingPlan: { status: 'in_progress', testDates: [] }, applications: [] },
    programs: [],
    documents: [],
  });
  assert.ok(gaps.includes('test date booked'));
  assert.ok(gaps.includes('school list started (5+ tiered)'));
});

test('grade 11 candidate with everything in place has no gaps', () => {
  const gaps = computeRoadmapGaps({
    profile: { grade: 11, subjects: 'Physics', leadership: ['Debate captain'] },
    undergrad: {
      testingPlan: { status: 'in_progress', testDates: ['2027-06-05'] },
      applications: [{ recommendations: [{ name: 'Ms. Lee', status: 'requested' }] }],
    },
    programs: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }],
    documents: [],
  });
  assert.deepEqual(gaps, []);
});

test('grade 9-10 candidate: story bank counted from saved essay_story documents', () => {
  const withoutStories = computeRoadmapGaps({ profile: { grade: 9 }, documents: [] });
  assert.ok(withoutStories.includes('story bank started'));
  const withStories = computeRoadmapGaps({ profile: { grade: 9 }, documents: [{ type: 'essay_story' }] });
  assert.ok(!withStories.includes('story bank started'));
});

test('grade 12 gaps track applications and confirmed recommenders', () => {
  const gaps = computeRoadmapGaps({
    profile: { grade: 12 },
    undergrad: { applications: [{ recommendations: [{ status: 'requested' }] }] },
    documents: [{ type: 'essay_draft' }],
  });
  assert.ok(!gaps.includes('essays drafted'));
  assert.ok(!gaps.includes('applications tracked'));
  assert.ok(gaps.includes('recommenders confirmed'));
});

test('every milestone in ROADMAP_MILESTONES is reachable by isMilestoneMet (no silent always-gap)', () => {
  for (const band of Object.keys(ROADMAP_MILESTONES)) {
    const grade = band === '9-10' ? 9 : Number(band);
    const gapsWhenEmpty = computeRoadmapGaps({ profile: { grade } });
    assert.deepEqual(gapsWhenEmpty.sort(), [...ROADMAP_MILESTONES[band]].sort());
  }
});

test('applySessionSummary stores a one-line summary and trims to 240 chars', () => {
  const state = emptyUndergradState('cand_1');
  assert.equal(state.lastSessionSummary, null);
  const next = applySessionSummary(state, 'Heading into a robotics competition next week.', 1000);
  assert.equal(next.lastSessionSummary.text, 'Heading into a robotics competition next week.');
  assert.equal(next.lastSessionSummary.at, 1000);

  const long = applySessionSummary(state, 'x'.repeat(500), 1000);
  assert.equal(long.lastSessionSummary.text.length, 240);
});

test('applySessionSummary with empty text keeps the prior summary', () => {
  const state = applySessionSummary(emptyUndergradState('cand_1'), 'First summary', 1000);
  const unchanged = applySessionSummary(state, '   ', 2000);
  assert.equal(unchanged.lastSessionSummary.text, 'First summary');
});
