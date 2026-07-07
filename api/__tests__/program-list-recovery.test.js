import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleClaimsProgramListReady, programListRecoveryRaw, parsedProgramsCount } from '../chat.js';

// Regression test for the PhD "it's live in the University List tab" bug:
// the model's confirmation sentence (STEP 4 BRANCH B/C in the system prompt)
// is unenforced prompt text, so a malformed/omitted <PROGRAMS> block could
// still ship with a false readiness claim. These functions are the
// track-agnostic counterpart of the existing Undergrad-only safety net.

test('visibleClaimsProgramListReady detects the exact confirmation phrasings from the prompt', () => {
  assert.equal(visibleClaimsProgramListReady("Your recommended programs are ready — I'm showing the full list directly below and in the University List tab."), true);
  assert.equal(visibleClaimsProgramListReady('Your shortlist is live in the Analysis tab — take a look and tell me what to adjust.'), true);
  assert.equal(visibleClaimsProgramListReady('Updated list is in the University List tab.'), true);
});

test('visibleClaimsProgramListReady does not false-positive on unrelated confirmations', () => {
  assert.equal(visibleClaimsProgramListReady('Your analysis is ready. Do you want me to recommend a school portfolio, or do you already have specific schools?'), false);
  assert.equal(visibleClaimsProgramListReady('Great, tell me more about your research interests.'), false);
});

test('parsedProgramsCount returns 0 for missing or malformed PROGRAMS blocks', () => {
  assert.equal(parsedProgramsCount('No block here at all.'), 0);
  assert.equal(parsedProgramsCount('<PROGRAMS>{not valid json</PROGRAMS>'), 0);
});

test('parsedProgramsCount counts a valid block', () => {
  const raw = `<PROGRAMS>${JSON.stringify([{ name: 'A' }, { name: 'B' }])}</PROGRAMS>`;
  assert.equal(parsedProgramsCount(raw), 2);
});

test('programListRecoveryRaw preserves earlier structured blocks and replaces the false confirmation', () => {
  const raw = '<SCORES>{"overall":80}</SCORES>Your recommended programs are ready — showing the full list below and in the University List tab.';
  const recovered = programListRecoveryRaw(raw);
  assert.match(recovered, /<SCORES>/);
  assert.doesNotMatch(recovered, /University List tab/);
  assert.match(recovered, /wasn't able to generate/i);
});
