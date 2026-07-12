// Regression coverage for item #5 (undergrad question-ladder rebuild):
// grade -> curriculum (IB/AP/etc) -> subjects, then free-form; never repeat a
// question; short sessions; tappable reply chips; a Goodbye option always
// available. This pins the prompt rules that encode that behavior (the
// undergrad path is LLM-driven, so a source-text assertion is the practical
// way to lock in the contract — same convention this suite already uses for
// the readiness-card anchor and firewall guards).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_UNDERGRAD_PROMPT } from '../UndergradAgent.js';

test('first-ever session asks exactly grade -> curriculum -> subjects, one per turn, then goes free-form', () => {
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /ask exactly three things, one per turn/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /\(1\) grade, \(2\) curriculum system \(IB\/AP\/A-Levels\/National\/Other\), \(3\) main subjects and favorite/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /go fully freestyle/i);
});

test('never repeats a question the student already answered', () => {
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /NEVER ASK TWICE/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /A recently covered area is off-limits unless the student raises it/i);
});

test('sessions stay short: brief replies, one question max, wraps up on a high turn count', () => {
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /2–3 sentences max in chat\. One question max/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /If conversationTurnsToday is high, wrap up, open nothing new/i);
});

test('reply options are tappable, conversational chips — never fake action buttons', () => {
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /2–4 specific choices tied to THIS student/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /NO DEAD CHIPS/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /Options must be conversational replies the kid could plausibly type/i);
});

test('a "Goodbye" option is always the last one offered, and wraps the session up', () => {
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /GOODBYE ALWAYS AVAILABLE/i);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /make the last one "Goodbye 👋"/);
  assert.match(DEFAULT_UNDERGRAD_PROMPT, /save_session_summary with a one-line summary of where the session left off/i);
});
