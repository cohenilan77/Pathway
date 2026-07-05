import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');

const advisor = read('Advisor.jsx');
const conversational = read('AdvisorConversational.jsx');

// --- Advisor wrapper: every track renders the conversational workspace ---

test('Advisor renders the conversational workspace for every track', () => {
  assert.match(advisor, /<AdvisorConversational/);
  assert.ok(!advisor.includes('<AdvisorChatFirst'), 'Advisor must not route to the retired chat-first layout');
  assert.ok(!advisor.includes('VITE_ADAPTIVE_GRAD'), 'the redesign must not hide behind a build flag');
  assert.ok(!advisor.includes('VITE_LEGACY_ADVISOR_LAYOUT'), 'no legacy-layout fallback flag in production');
});

test('Advisor keeps the idle re-engagement nudge', () => {
  assert.match(advisor, /sendIdleCheckin/);
  assert.match(advisor, /MAX_IDLE_FIRES/);
});

test('Advisor passes narrative and school write-through props down', () => {
  assert.match(advisor, /narrative=\{narrative\}/);
  assert.match(advisor, /setChosenSchools=\{setChosenSchools\}/);
  assert.match(advisor, /confirmTargetSchools=\{confirmTargetSchools\}/);
});

// --- Conversational workspace: real data, real send flow ---

test('conversational renders normalized program cards from real props', () => {
  assert.match(conversational, /normalizeProgramList\(programs\)/);
  assert.match(conversational, /<ProgramCard/);
  assert.match(conversational, /confirmTargetSchools\(picks\)/);
});

test('quick replies are parsed from the brain’s option marker', () => {
  // The Advisor brain ends fixed-choice questions with "→ A | B | C"
  // (api/chat.js contract). The UI must strip the marker from the shown text
  // and render the options as tappable buttons.
  assert.match(conversational, /OPTIONS_PATTERN = \/→\\s\*\(\.\+\)\$\//);
  assert.match(conversational, /parseOptions\(/);
  assert.match(conversational, /parsed \? parsed\.mainText : m\.text/);
});

test('quick-reply buttons submit through the real send flow', () => {
  assert.match(conversational, /const handleQuickReply = \(opt\) => \{\s*\n\s*send\(opt\);/);
  assert.match(conversational, /onClick=\{\(\) => handleQuickReply\(opt\)\}/);
});

test('brain-supplied options replace the generic suggestion chips for that turn', () => {
  assert.match(conversational, /const chips = !busy && !lastParsed \? contextualChips/);
});

test('free-text input stays available alongside quick replies', () => {
  assert.match(conversational, /placeholder="Ask your advisor anything…"/);
  assert.match(conversational, /onChange=\{e => setInput\(e\.target\.value\)\}/);
});

test('contextual chips are state-driven, not substring-matched', () => {
  assert.match(conversational, /function contextualChips\(\{ scores, programs, chosenSchools, narrative \}\)/);
});

test('no mock data in the conversational workspace', () => {
  const mockMarkers = /mockPrograms|MOCK_|fakeData|dummyData|placeholder(?:Schools|Programs|Candidate)/;
  assert.ok(!mockMarkers.test(conversational), 'conversational workspace must render only real props');
});

test('no banner-style debug or alert strips', () => {
  assert.ok(!conversational.includes('ACTIVE:'), 'no route-verification banners');
  assert.ok(!advisor.includes('ACTIVE:'), 'no route-verification banners');
  assert.ok(!/position:\s*'fixed'.*top:\s*0.*background:\s*'#(f00|0000ff|ff0000|00ff00)/.test(conversational), 'no full-width colored strips');
});
