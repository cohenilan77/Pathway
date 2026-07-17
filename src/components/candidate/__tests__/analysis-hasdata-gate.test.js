import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');
const analysis = read('Analysis.jsx');

// MatchingAgent's specialistPatch only ever returns { programs }, and
// confirmTargetSchools sets chosenSchools client-side — neither depends on
// scores. A candidate who reaches MatchingAgent (e.g. a completed chip-flow
// PhD profile with no CV/scores pass yet) could have a real school list and
// even confirmed targets while scores stays null. Gating the whole Analysis
// tab on `!!scores` hid that already-generated, already-independently-gated
// Strategic School Portfolio section behind "Analysis Not Yet Available."

test('hasData admits a candidate with a program list or chosen targets even without scores', () => {
  assert.match(
    analysis,
    /const hasData = !!scores \|\| \(Array\.isArray\(programs\) && programs\.length > 0\) \|\| \(Array\.isArray\(chosenSchools\) && chosenSchools\.length > 0\);/,
  );
});

test('the overall score banner and its scores.overall read are null-safe', () => {
  assert.match(analysis, /\{scores\?\.overall != null && \(/);
  assert.ok(!analysis.includes('{scores.overall != null && ('), 'must not read scores.overall without optional chaining');
});

test('the score-breakdown / PROFILE BREAKDOWN section only renders once scores exist', () => {
  assert.match(analysis, /\{scores && \(\s*<>\s*<div[^>]*>PROFILE BREAKDOWN/);
});

test('the Strategic School Portfolio section stays independently gated on displayPrograms, not scores', () => {
  assert.match(analysis, /\{displayPrograms\.length > 0 && \(/);
});
