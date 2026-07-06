import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  UNDERGRAD_PROGRAM_FIELDS,
  buildUndergradPreliminaryPrograms,
  hasUndergradBaseline,
} from '../undergrad-programs.js';
import { buildUndergradPreliminaryScores } from '../undergrad-scoring.js';
import { ensureUndergradFallbackRaw, undergradProgramsCount } from '../undergrad-fallback.js';

const gradeTenProfile = {
  category: 'Undergraduate',
  grade: 'Grade 10',
  curriculum: 'AP',
  gpa: '3.7 / 4.0',
  subjects: ['Math', 'Computer Science'],
  countries: ['USA'],
  activities: ['Coding club', 'Hackathon'],
  leadership: 'Coding club president',
  testing: 'None yet',
};

function block(raw, name) {
  const match = raw.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? JSON.parse(match[1]) : null;
}

test('Grade 10 intake satisfies the deterministic undergrad baseline', () => {
  assert.equal(hasUndergradBaseline(gradeTenProfile), true);
});

test('preliminary list contains complete reach, target, and likely schools', () => {
  const programs = buildUndergradPreliminaryPrograms(gradeTenProfile);
  assert.ok(programs.length >= 12);
  assert.ok(programs.some(({ name }) => name === 'MIT'));
  assert.ok(programs.some(({ name }) => name === 'Stanford University'));
  assert.ok(programs.some(({ name }) => name === 'Carnegie Mellon University'));
  assert.deepEqual(new Set(programs.map(({ tier }) => tier)), new Set(['stretch', 'possible', 'safe']));
  for (const program of programs) {
    for (const field of UNDERGRAD_PROGRAM_FIELDS) assert.ok(field in program, `${program.name} is missing ${field}`);
  }
});

test('preliminary scoring is nonzero and does not over-penalize age-appropriate missing tests', () => {
  const scores = buildUndergradPreliminaryScores(gradeTenProfile);
  assert.ok(scores.overall >= 55 && scores.overall <= 80);
  assert.ok(scores.testing < scores.academic);
  assert.ok(scores.leadership >= 75);
});

test('plain profile-ready response is replaced by complete deterministic state', () => {
  const raw = ensureUndergradFallbackRaw({ raw: 'Your profile is ready.', profile: gradeTenProfile });
  assert.ok(undergradProgramsCount(raw) >= 10);
  for (const name of ['PROFILE', 'SCORES', 'STRENGTHS', 'WEAKNESSES', 'TASKS', 'PROGRAMS']) {
    assert.ok(block(raw, name), `${name} block should exist`);
  }
  assert.ok(block(raw, 'STRENGTHS').length >= 3);
  assert.ok(block(raw, 'WEAKNESSES').length >= 3);
  assert.ok(block(raw, 'TASKS').length >= 3);
});

test('existing complete program output is preserved', () => {
  const programs = buildUndergradPreliminaryPrograms(gradeTenProfile);
  const raw = `<PROGRAMS>${JSON.stringify(programs)}</PROGRAMS>Original response`;
  assert.equal(ensureUndergradFallbackRaw({ raw, profile: gradeTenProfile }), raw);
});

test('graduate and MBA paths never receive the undergrad fallback', () => {
  const mba = { ...gradeTenProfile, category: 'Graduate', degree: 'MBA' };
  assert.equal(ensureUndergradFallbackRaw({ raw: 'MBA response', profile: mba }), 'MBA response');
});

test('candidate UI does not advertise zero verified schools and exposes list recovery', () => {
  const advisor = readFileSync(new URL('../../src/components/candidate/AdvisorConversational.jsx', import.meta.url), 'utf8');
  const portal = readFileSync(new URL('../../src/components/candidate/CandidatePortal.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(advisor, /0 schools verified/);
  assert.match(advisor, /List not built yet/);
  assert.match(portal, /Build Preliminary University List/);
  assert.match(portal, /Regenerate from latest profile/);
});
