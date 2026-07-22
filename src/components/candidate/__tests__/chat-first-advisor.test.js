import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deriveNarrativeProgress } from '../../../lib/narrativeProgress.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');

// Mirrors the NARRATIVE_START constant in AdvisorChatFirst.jsx (the exact
// deterministic message confirmTargetSchools() injects in App.jsx).
const NARRATIVE_START = "Your targets are locked in. Now let's shape your Narrative & Strategy. What's the specific moment or experience that convinced you this is the right path?";

const advisor = read('Advisor.jsx');
const chatFirst = read('AdvisorChatFirst.jsx');
const conversational = read('AdvisorConversational.jsx');
const kpiPanel = read('UndergradKpiPanel.jsx');

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
  assert.match(chatFirst, /\{showPrograms && \(/);
});

test('ProgramsCard hides once target schools are confirmed, regardless of narrative state', () => {
  // Narrative starting (or not) must not keep the recommended-schools card
  // pinned below newer chat messages once schools are actually confirmed.
  assert.match(chatFirst, /const showPrograms = hasPrograms && \(!chosenSchools\?\.length \|\| needsSelectionRecovery\)/);
  assert.ok(!/showPrograms = hasPrograms && \(!narrative/.test(chatFirst), 'showPrograms must not gate on !narrative');
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

test('narrative CTA is state-based, not a string match on the AI reply', () => {
  assert.ok(!chatFirst.includes("lastAiText.includes('Narrative Strategy tab')"), 'CTA must not gate on a literal phrase the deterministic N1 message never contains');
  assert.match(chatFirst, /import \{ deriveNarrativeProgress \} from '\.\.\/\.\.\/lib\/narrativeProgress\.js'/);
  assert.match(chatFirst, /const \{ narrativeQnAComplete \} = deriveNarrativeProgress\(visibleChat, NARRATIVE_START\)/);
  assert.match(chatFirst, /const showNarrativeCTA = !isUndergrad && !busy && chosenSchools\?\.length > 0 && \(narrativeQnAComplete \? !narrative : narrativeDataIntegrityIssue\)/);
});

test('the narrative CTA and modal are never shown to Undergraduate candidates', () => {
  assert.match(chatFirst, /\{showNarrativeModal && !isUndergrad && \(/);
});

test('"Continue narrative" chip cannot fire before N1-N4 are answered', () => {
  assert.match(chatFirst, /if \(!narrativeQnAComplete\) return \[\];/);
  assert.match(chatFirst, /narrativeQnAComplete \}\)/);
});

test('a stale non-null narrative without answered N1-N4 cannot skip to CV/essay chips', () => {
  // Data-integrity guard: narrative carried over from a prior/reset session
  // (non-null) but N1-N4 were never answered in *this* chat must not unlock
  // the post-narrative CV/essay chips, and must instead route back to the CTA
  // that reopens the Pivot/Upgrade modal.
  assert.match(chatFirst, /const narrativeDataIntegrityIssue = !!narrative && !narrativeQnAComplete;/);
  assert.match(chatFirst, /if \(!narrative \|\| !narrativeQnAComplete\) \{/);
});

test('deriveNarrativeProgress: CTA readiness right after confirmTargetSchools (0/4 answered)', () => {
  const chatRightAfterConfirm = [
    { role: 'user', text: 'I confirm these target schools: Wharton | INSEAD.' },
    { role: 'ai', text: NARRATIVE_START },
  ];
  const { narrativeAnswerCount, narrativeQnAComplete } = deriveNarrativeProgress(chatRightAfterConfirm, NARRATIVE_START);
  assert.equal(narrativeAnswerCount, 0);
  assert.equal(narrativeQnAComplete, false);
});

test('deriveNarrativeProgress: complete once N1-N4 are all answered', () => {
  const chatAfterFourAnswers = [
    { role: 'user', text: 'I confirm these target schools: Wharton | INSEAD.' },
    { role: 'ai', text: NARRATIVE_START },
    { role: 'user', text: 'Answer to N1.' },
    { role: 'ai', text: 'N2 question text.' },
    { role: 'user', text: 'Answer to N2.' },
    { role: 'ai', text: 'N3 question text.' },
    { role: 'user', text: 'Answer to N3.' },
    { role: 'ai', text: 'N4 question text.' },
    { role: 'user', text: 'Answer to N4.' },
  ];
  const { narrativeAnswerCount, narrativeQnAComplete } = deriveNarrativeProgress(chatAfterFourAnswers, NARRATIVE_START);
  assert.equal(narrativeAnswerCount, 4);
  assert.equal(narrativeQnAComplete, true);
});

test('production conversational advisor parses multiline fixed choices inline', () => {
  assert.match(conversational, /const OPTIONS_PATTERN = \/→\\s\*\(\[\\s\\S\]\+\)\$\//);
  assert.match(conversational, /OPTIONS_TRAILING_PROMPT/);
  assert.match(conversational, /parsed\.options\.map/);
});

test('production advisor renders a missing-program recovery card', () => {
  assert.match(conversational, /needsProgramRecovery/);
  assert.match(conversational, /The list has not been generated yet/);
  assert.match(conversational, /Generate my school list/);
});

test('undergrad advisor exposes state-driven tab navigation (KPI scorecard lives in Dashboard/Workspace, not chat)', () => {
  // The KPI scorecard is intentionally NOT rendered inside the chat anymore.
  assert.ok(!/UndergradKpiPanel/.test(conversational));
  assert.match(conversational, /'View University List': 'universities'/);
  for (const label of ['Academic Base', 'Subject Direction', 'Activity Depth', 'Leadership', 'Testing Readiness', 'Initiative / Projects', 'Consistency / Momentum']) {
    assert.ok(kpiPanel.includes(label));
  }
  assert.match(kpiPanel, /Needs update/);
});

test('em-dashes in chat-first are limited to empty numeric placeholders', () => {
  const stringLiterals = chatFirst.match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g) || [];
  const offenders = stringLiterals.filter(s => s.includes('—'));
  assert.ok(offenders.length > 0);
  assert.ok(offenders.every(value => value === "'—'"));
});
