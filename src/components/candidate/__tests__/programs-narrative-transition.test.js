import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, '..', '..', '..', 'App.jsx'), 'utf8');

test('the early target-selection setStepIdx(4) shortcut is removed', () => {
  // The Programs → Narrative move must not fire just because the message text
  // looks like a target selection.
  assert.ok(
    !appSrc.includes('if (isTargetSelection && !isLegacyCandidateCategory(profile))'),
    'the isTargetSelection → setStepIdx(4) shortcut must be gone',
  );
});

test('confirmTargetSchools stays the deterministic Programs → Narrative gate', () => {
  assert.match(appSrc, /const confirmTargetSchools = useCallback\(\(schools\) => \{/);
  assert.match(appSrc, /setChosenSchools\(confirmed\);/);
  assert.match(appSrc, /setStepIdx\(prev => Math\.max\(prev, 4\)\);/);
  assert.match(appSrc, /Now let's shape your Narrative & Strategy\./);
});

test('parsed chosenSchools saves first, then advances to the Narrative step', () => {
  assert.match(appSrc, /const narrativeProgramValidation = validateProgramList\(parsed\.programs\?\.length \? parsed\.programs : programs\);/);
  assert.match(appSrc, /const confirmedFromList = \[\.\.\.new Set/);
  assert.match(appSrc, /setChosenSchools\(confirmedFromList\);/);
  assert.match(appSrc, /setStepIdx\(prev => Math\.max\(prev, STEPS\.indexOf\('Narrative'\)\)\)/);
});
