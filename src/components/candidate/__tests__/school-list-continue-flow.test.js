import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, '..', '..', '..', 'App.jsx'), 'utf8');

// Regression: once a school list exists, a bare "continue"/"continue my
// analysis" used to fall into the (isSchoolListRequest||isProgramRecovery)
// && hasSavedPrograms branch, which re-printed the list and force-switched
// to the University List tab instead of advancing the journey. These tests
// pull the exact regex literals out of App.jsx's send handler (there is no
// JSX execution harness in this repo — see the sibling test files' source-
// pattern convention) so the classification itself is exercised for real,
// not just asserted to be present in the source.

function extractRegexSource(varName) {
  const match = appSrc.match(new RegExp(`const ${varName} = (\\/(?:[^\\/\\\\]|\\\\.)+\\/[a-z]*)`));
  assert.ok(match, `could not find "const ${varName} = /.../" in App.jsx`);
  // eslint-disable-next-line no-eval
  return eval(match[1]);
}

const isBareAdvanceRegex = extractRegexSource('isBareAdvance');

test('isBareAdvance matches bare continuation phrasing, including "continue my analysis"', () => {
  for (const text of ['next', 'continue', 'proceed', 'move on', 'advance', 'go on', 'keep going', 'continue my analysis', 'continue analysis', 'continue my narrative', 'Continue my analysis.', 'continue!']) {
    assert.ok(isBareAdvanceRegex.test(text), `expected isBareAdvance to match "${text}"`);
  }
});

test('isBareAdvance does not match an explicit list request', () => {
  for (const text of ['open my school list', 'where is my list', 'show me my school list', 'Recommend a balanced portfolio']) {
    assert.ok(!isBareAdvanceRegex.test(text), `expected isBareAdvance to NOT match "${text}"`);
  }
});

test('targets locked + "Continue my analysis" routes to the Narrative branch, not list recovery', () => {
  const narrativeIdx = appSrc.indexOf('if (isPostTargetNarrativeContinue && !explicitRegenerateProgramList)');
  const targetsPromptIdx = appSrc.indexOf('if (hasSavedPrograms && isBareAdvance && !hasLockedTargets)');
  const recoveryIdx = appSrc.indexOf('if (isExplicitListRequest && hasSavedPrograms && !explicitRegenerateProgramList)');
  assert.ok(narrativeIdx > -1 && targetsPromptIdx > -1 && recoveryIdx > -1);
  // isPostTargetNarrativeContinue = hasLockedTargets && isBareAdvance, and its
  // branch must be checked before either of the other two so a locked-target
  // "continue" can never fall through to a re-surface/prompt branch.
  assert.ok(narrativeIdx < targetsPromptIdx && targetsPromptIdx < recoveryIdx);
});

test('a saved list with no locked targets + bare "continue" stays on the advisor tab and prompts target selection', () => {
  const block = appSrc.slice(
    appSrc.indexOf('if (hasSavedPrograms && isBareAdvance && !hasLockedTargets)'),
    appSrc.indexOf('if (isExplicitListRequest && hasSavedPrograms && !explicitRegenerateProgramList)'),
  );
  assert.match(block, /Pick the 3-5 schools that excite you most to lock your targets/);
  assert.ok(!block.includes("setCandTab('universities')"), 'must not force-switch to the University List tab on a bare continue');
});

test('only an explicit list request re-surfaces the list and switches to the University List tab', () => {
  assert.match(appSrc, /isExplicitListRequest && hasSavedPrograms && !explicitRegenerateProgramList/);
  const recoveryIdx = appSrc.indexOf('if (isExplicitListRequest && hasSavedPrograms && !explicitRegenerateProgramList)');
  const nextBlockEnd = appSrc.indexOf('setCandTab(\'universities\');', recoveryIdx);
  assert.ok(nextBlockEnd > recoveryIdx && nextBlockEnd - recoveryIdx < 800, 'setCandTab(\'universities\') must belong to the explicit-list-request branch');
});

test('with no saved list yet, a bare "continue" still triggers first-list generation', () => {
  assert.match(appSrc, /const requestsFirstProgramList = \(isExplicitListRequest \|\| isBareAdvance\) && !hasSavedPrograms;/);
});
