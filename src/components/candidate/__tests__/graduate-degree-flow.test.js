import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, '..', '..', '..', 'App.jsx'), 'utf8');
const chatFirst = readFileSync(path.join(here, '..', 'AdvisorChatFirst.jsx'), 'utf8');

test('App wires the graduate degree sub-choice before the opening-path resolver', () => {
  // The degree capture must run first so a typed "MBA" is saved as a degree,
  // not re-read as a category by resolveOpeningPathChoice.
  assert.match(appSrc, /needsGraduateDegree\(profile\)/);
  assert.match(appSrc, /resolveGraduateDegreeChoice\(raw_t\)/);
  const degreeIdx = appSrc.indexOf('const awaitingGraduateDegree = needsGraduateDegree(profile)');
  const openingIdx = appSrc.indexOf('resolveOpeningPathChoice(raw_t)');
  assert.ok(degreeIdx > -1 && openingIdx > -1 && degreeIdx < openingIdx, 'degree capture must precede opening-path resolution');
});

test('degree capture only fires right after the degree prompt was asked', () => {
  // Regression: a placeholder degree from an older session must not swallow
  // unrelated messages (e.g. a narrative reply). Capture is gated on the last
  // advisor message being the degree prompt.
  assert.match(appSrc, /const lastAiText = \[\.\.\.chat\]\.reverse\(\)\.find\(m => m\.role === 'ai'\)\?\.text/);
  assert.match(appSrc, /awaitingGraduateDegree = needsGraduateDegree\(profile\)\s*\n\s*&& \(lastAiText === GRADUATE_DEGREE_PROMPT \|\| lastAiText === GRADUATE_DEGREE_OTHER_PROMPT\)/);
});

test('App shows the graduate degree bubbles after the Graduate opening choice', () => {
  assert.match(appSrc, /if \(needsGraduateDegree\(requestProfile\)\) \{/);
  assert.match(appSrc, /text: GRADUATE_DEGREE_PROMPT/);
});

test('App keeps the input open and asks for the exact degree on Other', () => {
  assert.match(appSrc, /choice\?\.other/);
  assert.match(appSrc, /text: GRADUATE_DEGREE_OTHER_PROMPT/);
});

test('App saves the typed/clicked degree as category Graduate + degree', () => {
  assert.match(appSrc, /category: 'Graduate', degree: choice\.degree/);
});

test('App enforces stage order via computeStageAdvancement, not ad-hoc text triggers', () => {
  assert.match(appSrc, /computeStageAdvancement\(\{/);
  assert.ok(!appSrc.includes('function getStageAdvancementTrigger'), 'the old text-only trigger must be gone');
  // The stage advancement passes the real state needed to gate CV/essays.
  assert.match(appSrc, /narrative,\s*\n\s*cvText,/);
});

test('App asks the agent to explain when the candidate jumps ahead', () => {
  assert.match(appSrc, /explainIfTooEarly\(/);
  assert.match(appSrc, /STAGE GUARDRAIL/);
});

test('the narrative handoff message uses the Narrative & Strategy wording', () => {
  assert.match(appSrc, /Now let's shape your Narrative & Strategy/);
  assert.match(chatFirst, /Now let's shape your Narrative & Strategy/);
});

test('the chat renders trailing "→ a | b" options as clickable bubbles', () => {
  // Both the graduate degree prompt and any agent question use this contract.
  assert.match(chatFirst, /const OPTIONS_PATTERN = \/→\\s\*\(\[\\s\\S\]\+\)\$\//);
  assert.match(chatFirst, /parseOptions/);
});

test('saved program-list recovery is local and missing lists force generation', () => {
  assert.match(appSrc, /PROGRAM_LIST_RECOVERY/);
  assert.match(appSrc, /isProgramRecovery && hasSavedPrograms/);
  assert.match(appSrc, /PROGRAM LIST RECOVERY:[\s\S]*MUST include a valid <PROGRAMS>/);
  assert.match(appSrc, /setCandTab\('universities'\)/);
  assert.match(appSrc, /gateProgramReadyReply/);
});
