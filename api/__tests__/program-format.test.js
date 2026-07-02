import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceProgramFormatInRaw,
  programMatchesRequestedFormat,
  requestedProgramFormat,
} from '../../lib/program-format.js';

test('detects a two-year full-time MBA constraint from the saved profile', () => {
  assert.deepEqual(requestedProgramFormat({ degree: 'MBA — 2-year, full-time' }), {
    family: 'mba',
    attendance: 'full-time',
    durationYears: 2,
  });
});

test('two-year full-time MBA excludes executive, part-time, online, and one-year programs', () => {
  const constraint = { family: 'mba', attendance: 'full-time', durationYears: 2 };
  assert.equal(programMatchesRequestedFormat({ name: 'Wharton Executive MBA' }, constraint), false);
  assert.equal(programMatchesRequestedFormat({ name: 'Kellogg Evening & Weekend MBA' }, constraint), false);
  assert.equal(programMatchesRequestedFormat({ name: 'Online MBA' }, constraint), false);
  assert.equal(programMatchesRequestedFormat({ name: 'INSEAD MBA', duration: '10 months' }, constraint), false);
  assert.equal(programMatchesRequestedFormat({ name: 'Wharton MBA', studyFormat: 'full-time', durationYears: 2 }, constraint), true);
});

test('filters mismatched programs from the PROGRAMS block before returning it to the UI', () => {
  const raw = `<PROGRAMS>${JSON.stringify([
    { name: 'Wharton MBA', studyFormat: 'full-time', durationYears: 2 },
    { name: 'Wharton Executive MBA', studyFormat: 'executive', durationYears: 2 },
    { name: 'INSEAD MBA', studyFormat: 'full-time', duration: '10 months' },
    { name: 'Chicago Booth MBA', studyFormat: 'full-time', durationYears: 2 },
  ])}</PROGRAMS>Portfolio ready.`;
  const filtered = enforceProgramFormatInRaw(raw, { degree: 'MBA — 2-year, full-time' });
  const programs = JSON.parse(filtered.match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/)[1]);
  assert.deepEqual(programs.map((program) => program.name), ['Wharton MBA', 'Chicago Booth MBA']);
});

test('leaves non-MBA program blocks unchanged', () => {
  const raw = '<PROGRAMS>[{"name":"Oxford MSc"}]</PROGRAMS>';
  assert.equal(enforceProgramFormatInRaw(raw, { degree: 'MSc — full-time' }), raw);
});
