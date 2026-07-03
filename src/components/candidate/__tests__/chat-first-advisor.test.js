import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');

const advisor = read('Advisor.jsx');
const chatFirst = read('AdvisorChatFirst.jsx');

test('Advisor routes graduate tracks to the chat-first layout', () => {
  assert.match(advisor, /isGradChatFirst\(profile\)/);
  assert.match(advisor, /<AdvisorChatFirst/);
});

test('Undergraduate and Personal Development keep the legacy layout', () => {
  assert.match(advisor, /track !== 'Undergraduate' && track !== 'Personal Development'/);
  // No category chosen yet also stays on the legacy layout
  assert.match(advisor, /!profile\?\.category\) return false/);
});

test('legacy layout still renders the stepper and tasks rail', () => {
  assert.match(advisor, /\{\/\* stepper \*\/\}/);
  assert.match(advisor, /\{\/\* tasks rail \*\/\}/);
});

test('chat-first layout has no stepper grid and no tasks rail', () => {
  assert.ok(!chatFirst.includes('pw-advisor-grid'), 'chat-first must not use the two-column grid');
  assert.ok(!chatFirst.includes('pw-advisor-rail'), 'chat-first must not render the side rail');
});

test('chat-first shows the ambient status bar with stage position', () => {
  assert.match(chatFirst, /Stage \{.*\+ 1\} of \{STEPS\.length\}/);
  assert.match(chatFirst, /function StatusBar/);
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

test('confirmed targets remove old program artifacts so the narrative question stays visible', () => {
  assert.match(chatFirst, /const needsSelectionRecovery = hasPrograms/);
  assert.match(chatFirst, /const showPrograms = hasPrograms && \(!chosenSchools\?\.length \|\| needsSelectionRecovery\)/);
  assert.match(chatFirst, /\{showPrograms && \(/);
  assert.ok(!chatFirst.includes('{hasPrograms && (\n              <ProgramsCard'), 'confirmed targets must not leave the program card below the latest chat reply');
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

test('no em-dashes in chat-first user-visible copy', () => {
  const stringLiterals = chatFirst.match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g) || [];
  const offenders = stringLiterals.filter(s => s.includes('—'));
  assert.deepEqual(offenders, []);
});
