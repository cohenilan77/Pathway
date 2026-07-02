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

test('chat-first renders inline artifacts: readiness, programs, checklist', () => {
  assert.match(chatFirst, /function ReadinessCard/);
  assert.match(chatFirst, /function ProgramsCard/);
  assert.match(chatFirst, /function ChecklistCard/);
  assert.match(chatFirst, /RECOMMENDED PROGRAMS/);
});

test('program selection writes through the shared chosenSchools state', () => {
  assert.match(chatFirst, /setChosenSchools && setChosenSchools\(selected\)/);
  assert.match(chatFirst, /I'd like to move forward with:/);
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
