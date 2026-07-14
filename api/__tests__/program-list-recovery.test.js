import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleClaimsProgramListReady, programListRecoveryRaw, parsedProgramsCount, requestsProgramListExpansion, mergeExpandedProgramsRaw, shouldRecoverProgramList } from '../chat.js';

// Regression test for the PhD "it's live in the University List tab" bug:
// the model's confirmation sentence (STEP 4 BRANCH B/C in the system prompt)
// is unenforced prompt text, so a malformed/omitted <PROGRAMS> block could
// still ship with a false readiness claim. These functions are the
// track-agnostic counterpart of the existing Undergrad-only safety net.

test('visibleClaimsProgramListReady detects the exact confirmation phrasings from the prompt', () => {
  assert.equal(visibleClaimsProgramListReady("Your recommended programs are ready — I'm showing the full list directly below and in the University List tab."), true);
  assert.equal(visibleClaimsProgramListReady('Your shortlist is live in the Analysis tab — take a look and tell me what to adjust.'), true);
  assert.equal(visibleClaimsProgramListReady('Updated list is in the University List tab.'), true);
  assert.equal(visibleClaimsProgramListReady("Your targets are locked in. Now let's shape your Narrative & Strategy."), true);
  assert.equal(visibleClaimsProgramListReady('Your recommendations are ready. Select from the list.'), true);
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
  assert.match(recovered, /saved your profile/i);
  assert.doesNotMatch(recovered, /retry generation/i);
});

test('requestsProgramListExpansion recognizes common "more schools" phrasings', () => {
  assert.equal(requestsProgramListExpansion('show me more schools'), true);
  assert.equal(requestsProgramListExpansion('can you give me a few more options?'), true);
  assert.equal(requestsProgramListExpansion('expand my list please'), true);
  assert.equal(requestsProgramListExpansion('add a few more schools'), true);
  assert.equal(requestsProgramListExpansion('any additional programs?'), true);
});

test('requestsProgramListExpansion does not false-positive on the initial recommend request', () => {
  assert.equal(requestsProgramListExpansion('Please recommend my portfolio.'), false);
  assert.equal(requestsProgramListExpansion('I want to apply to Harvard and Wharton.'), false);
});

test('mergeExpandedProgramsRaw unions the new PROGRAMS block with the existing list, deduped by name', () => {
  const existing = [{ name: 'Harvard' }, { name: 'Wharton' }];
  const raw = `<PROGRAMS>${JSON.stringify([{ name: 'Wharton' }, { name: 'Booth' }, { name: 'Kellogg' }])}</PROGRAMS>Here are more options.`;
  const merged = mergeExpandedProgramsRaw(raw, existing);
  const parsed = JSON.parse(merged.match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/)[1]);
  const names = parsed.map(p => p.name).sort();
  // Union, not a replace: both originals plus only the genuinely new ones.
  assert.deepEqual(names, ['Booth', 'Harvard', 'Kellogg', 'Wharton'].sort());
});

test('mergeExpandedProgramsRaw is a no-op when there is no existing list or no new PROGRAMS block', () => {
  const raw = '<PROGRAMS>[{"name":"Booth"}]</PROGRAMS>text';
  assert.equal(mergeExpandedProgramsRaw(raw, []), raw);
  assert.equal(mergeExpandedProgramsRaw('no programs block here', [{ name: 'Harvard' }]), 'no programs block here');
});

test('shouldRecoverProgramList: claimsReady with a short real list ships the starter portfolio', () => {
  assert.equal(shouldRecoverProgramList({ claimsReady: true, programsCount: 3, schoolChoice: 'recommendations' }), false);
  assert.equal(shouldRecoverProgramList({ claimsReady: true, programsCount: 3, schoolChoice: undefined }), false);
});

test('shouldRecoverProgramList: claimsReady with only 3 schools but a Branch A (named schools) signal does not trigger recovery', () => {
  assert.equal(shouldRecoverProgramList({ claimsReady: true, programsCount: 3, schoolChoice: 'specific' }), false);
});

test('shouldRecoverProgramList: claimsReady with 12 schools passes through unchanged regardless of branch', () => {
  assert.equal(shouldRecoverProgramList({ claimsReady: true, programsCount: 12, schoolChoice: 'recommendations' }), false);
  assert.equal(shouldRecoverProgramList({ claimsReady: true, programsCount: 12, schoolChoice: 'specific' }), false);
});

test('shouldRecoverProgramList: zero schools always triggers recovery regardless of branch, not-ready never does', () => {
  assert.equal(shouldRecoverProgramList({ claimsReady: true, programsCount: 0, schoolChoice: 'specific' }), true);
  assert.equal(shouldRecoverProgramList({ claimsReady: false, programsCount: 3, schoolChoice: 'recommendations' }), false);
});
