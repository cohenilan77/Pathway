import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionFromMessage, ensureSelectionContinuity, N1_QUESTION } from '../selection-continuity.js';

const CARD_MSG = "I'd like to move forward with: Harvard Business School, Stanford GSB, Wharton, MIT Sloan, Kellogg, Columbia Business School, Chicago Booth. Take me to the next step of my journey.";
const TAB_MSG = "I'd like to move forward with: INSEAD, London Business School.";

test('parses all 7 schools from the chat card message', () => {
  const schools = selectionFromMessage(CARD_MSG);
  assert.equal(schools.length, 7);
  assert.equal(schools[0], 'Harvard Business School');
  assert.equal(schools[6], 'Chicago Booth');
});

test('parses the Analysis tab message without the journey suffix', () => {
  assert.deepEqual(selectionFromMessage(TAB_MSG), ['INSEAD', 'London Business School']);
});

test('ignores unrelated messages', () => {
  assert.equal(selectionFromMessage('Should I move forward with Harvard?'), null);
  assert.equal(selectionFromMessage('next'), null);
  assert.equal(ensureSelectionContinuity('hello', 'next'), 'hello');
});

test('injects CHOSEN_SCHOOLS and N1 when the model returned a bare confirmation', () => {
  const out = ensureSelectionContinuity('Great, your schools are saved.', TAB_MSG);
  assert.match(out, /<CHOSEN_SCHOOLS>\["INSEAD","London Business School"\]<\/CHOSEN_SCHOOLS>/);
  assert.ok(out.includes(N1_QUESTION));
  assert.ok(out.includes('Great, your schools are saved.'));
});

test('replaces a reply that re-asks the candidate to pick schools', () => {
  const out = ensureSelectionContinuity(
    'Your portfolio is live in the Analysis tab. Before we build your strategy, which 3-5 schools excite you most? Name them and we will tailor everything.',
    CARD_MSG,
  );
  assert.ok(!out.includes('excite you most'), 'must not re-ask for schools');
  assert.ok(out.includes(N1_QUESTION));
  assert.match(out, /<CHOSEN_SCHOOLS>/);
});

test('strips a regenerated PROGRAMS block on the selection turn', () => {
  const out = ensureSelectionContinuity(
    '<PROGRAMS>[{"name":"Somewhere Else"}]</PROGRAMS>Your portfolio is live in the Analysis tab. Which 3-5 schools excite you most?',
    CARD_MSG,
  );
  assert.ok(!out.includes('<PROGRAMS>'), 'selection turn must not rebuild the portfolio');
  assert.ok(out.includes(N1_QUESTION));
});

test('keeps a good reply untouched when it already saves schools and asks a question', () => {
  const good = `<CHOSEN_SCHOOLS>["INSEAD","London Business School"]</CHOSEN_SCHOOLS>\nLocked in. ${N1_QUESTION}`;
  assert.equal(ensureSelectionContinuity(good, TAB_MSG), good);
});
