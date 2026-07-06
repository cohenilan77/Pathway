import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');

const advisor = read('Advisor.jsx');
const chatFirst = read('AdvisorChatFirst.jsx');
const conversational = read('AdvisorConversational.jsx');

test('Advisor routes every track to the production conversational layout', () => {
  assert.match(advisor, /const ADAPTIVE_GRAD = true/);
  assert.match(advisor, /if \(ADAPTIVE_GRAD\)/);
  assert.match(advisor, /<AdvisorConversational/);
});

test('chat-first and legacy layouts remain explicit fallbacks', () => {
  assert.match(advisor, /if \(!LEGACY_ADVISOR_LAYOUT\)/);
  assert.match(advisor, /<AdvisorChatFirst/);
});

test('legacy layout still renders the stepper and tasks rail', () => {
  assert.match(advisor, /\{\/\* stepper \*\/\}/);
  assert.match(advisor, /\{\/\* tasks rail \*\/\}/);
});

test('chat-first fallback renders its analysis grid and rail', () => {
  assert.match(chatFirst, /pw-advisor-grid/);
  assert.match(chatFirst, /pw-advisor-rail/);
});

test('chat-first shows the ambient status bar with stage position', () => {
  assert.match(chatFirst, /Stage \{Math\.min\(stepIdx \+ 1, STEPS\.length\)\} of \{STEPS\.length\}/);
  assert.match(chatFirst, /function DesignStepper/);
});

test('chat-first renders inline artifacts: readiness and programs', () => {
  assert.match(chatFirst, /function ReadinessCard/);
  assert.match(chatFirst, /function ProgramsCard/);
  assert.match(chatFirst, /RECOMMENDED PROGRAMS/);
});

test('no task checklist inside the chat stream', () => {
  assert.ok(!chatFirst.includes('ChecklistCard'), 'chat-first must not render a task checklist');
  assert.ok(!chatFirst.includes('ACTION CHECKLIST'), 'chat-first must not show an action checklist card');
});

test('program selection writes through shared state and advances the journey', () => {
  assert.match(chatFirst, /confirmTargetSchools\?\.\(selected\)/);
  assert.ok(!chatFirst.includes('send(`I\'d like to move forward with:'), 'checkbox confirmation must not depend on an AI request');
});

test('program artifacts remain visible through school selection and recovery', () => {
  assert.match(chatFirst, /const needsSelectionRecovery = hasPrograms/);
  assert.match(chatFirst, /const showPrograms = hasPrograms && \(!narrative \|\| !chosenSchools\?\.length \|\| needsSelectionRecovery\)/);
  assert.match(chatFirst, /\{showPrograms && \(/);
});

test('old stuck sessions reopen the saved list without restarting', () => {
  assert.match(chatFirst, /TARGET_SELECTION_LOOP\.test\(lastAiText\)/);
  assert.match(chatFirst, /needsSelectionRecovery/);
  assert.match(chatFirst, /useState\(\(\) => chosenSchools \|\| \[\]\)/);
});

test('saved targets can be reopened for checkbox selection without typing names', () => {
  assert.match(chatFirst, /reopenProgramSelection/);
  assert.match(chatFirst, />\s*Change school selection\s*</);
});

test('confirmed targets continue narrative instead of asking for names again', () => {
  assert.match(chatFirst, /Continue narrative/);
  assert.match(chatFirst, /using my confirmed target schools/);
  assert.ok(!chatFirst.includes("label: 'Choose my narrative'"));
  assert.match(chatFirst, /TARGET_SELECTION_LOOP/);
  assert.match(chatFirst, /NARRATIVE_START/);
});

test('chat-first has contextual chips and the analyzing state', () => {
  assert.match(chatFirst, /function contextualChips/);
  assert.match(chatFirst, /Advisor is analyzing/);
});

test('production conversational advisor parses multiline fixed choices inline', () => {
  assert.match(conversational, /const OPTIONS_PATTERN = \/→\\s\*\(\[\\s\\S\]\+\)\$\//);
  assert.match(conversational, /OPTIONS_TRAILING_PROMPT/);
  assert.match(conversational, /parsed\.options\.map/);
});

test('em-dashes in chat-first are limited to empty numeric placeholders', () => {
  const stringLiterals = chatFirst.match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g) || [];
  const offenders = stringLiterals.filter(s => s.includes('—'));
  assert.ok(offenders.length > 0);
  assert.ok(offenders.every(value => value === "'—'"));
});
