import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionFromMessage, ensureSelectionContinuity, ensureNarrativeProgress, N1_QUESTION, N2_QUESTION, N3_QUESTION, N4_QUESTION } from '../selection-continuity.js';

const CARD_MSG = "I'd like to move forward with: Harvard Business School, Stanford GSB, Wharton, MIT Sloan, Kellogg, Columbia Business School, Chicago Booth. Take me to the next step of my journey.";
const TAB_MSG = "I'd like to move forward with: INSEAD, London Business School.";
const PIPE_MSG = "I'd like to move forward with: University of California, Berkeley | London Business School | MIT Sloan. Take me to the next step of my journey.";

test('parses all 7 schools from the chat card message', () => {
  const schools = selectionFromMessage(CARD_MSG);
  assert.equal(schools.length, 7);
  assert.equal(schools[0], 'Harvard Business School');
  assert.equal(schools[6], 'Chicago Booth');
});

test('parses the Analysis tab message without the journey suffix', () => {
  assert.deepEqual(selectionFromMessage(TAB_MSG), ['INSEAD', 'London Business School']);
});

test('preserves comma inside school names when pipe-delimited', () => {
  assert.deepEqual(selectionFromMessage(PIPE_MSG), ['University of California, Berkeley', 'London Business School', 'MIT Sloan']);
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
  assert.ok(!out.includes('Great, your schools are saved.'));
});

test('replaces any visible model reply on the selection turn', () => {
  const out = ensureSelectionContinuity(
    'Locked in. Which of those seven should we prioritize first?',
    CARD_MSG,
  );
  assert.ok(!out.includes('prioritize first'), 'must not ask another portfolio question');
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

test('keeps existing CHOSEN_SCHOOLS block but still controls visible continuation', () => {
  const good = `<CHOSEN_SCHOOLS>["INSEAD","London Business School"]</CHOSEN_SCHOOLS>\nLocked in. ${N1_QUESTION}`;
  const out = ensureSelectionContinuity(good, TAB_MSG);
  assert.match(out, /<CHOSEN_SCHOOLS>\["INSEAD","London Business School"\]<\/CHOSEN_SCHOOLS>/);
  assert.ok(out.includes(N1_QUESTION));
});

const SUBSTANTIVE_ANSWER = 'Watching my grandmother navigate the healthcare system after her diagnosis was the moment this became personal.';

test('ensureNarrativeProgress: force-advances N1 to N2 when N1 repeats after a substantive answer', () => {
  const raw = `Great context. ${N1_QUESTION}`;
  const history = [
    { role: 'user', text: "I'd like to move forward with: Harvard, Wharton, Booth." },
    { role: 'ai', text: `Your targets are locked in. Now let's shape your Narrative & Strategy. ${N1_QUESTION}` },
  ];
  const out = ensureNarrativeProgress(raw, history, SUBSTANTIVE_ANSWER);
  assert.ok(!out.includes(N1_QUESTION), 'must not repeat N1');
  assert.ok(out.includes(N2_QUESTION), 'must advance to N2');
});

test('ensureNarrativeProgress: does not force-advance on a short chip-style reply', () => {
  const raw = `Got it. ${N1_QUESTION}`;
  const history = [
    { role: 'ai', text: `Now let's shape your Narrative & Strategy. ${N1_QUESTION}` },
  ];
  const out = ensureNarrativeProgress(raw, history, 'MBA');
  assert.equal(out, raw, 'a chip tap is not a real answer — must not force-advance');
});

test('ensureNarrativeProgress: leaves raw unchanged when genuinely progressing (N2 after N1 was last asked)', () => {
  const raw = `Thanks for sharing that. ${N2_QUESTION}`;
  const history = [
    { role: 'ai', text: `Now let's shape your Narrative & Strategy. ${N1_QUESTION}` },
    { role: 'user', text: SUBSTANTIVE_ANSWER },
  ];
  const out = ensureNarrativeProgress(raw, history, SUBSTANTIVE_ANSWER);
  assert.equal(out, raw);
});

test('ensureNarrativeProgress: N4 repeating is left unchanged (no N5 to advance to) but still logs', () => {
  const raw = `One more thing. ${N4_QUESTION}`;
  const history = [
    { role: 'ai', text: `Almost there. ${N4_QUESTION}` },
  ];
  const originalError = console.error;
  const calls = [];
  console.error = (...args) => { calls.push(args); };
  try {
    const out = ensureNarrativeProgress(raw, history, SUBSTANTIVE_ANSWER);
    assert.equal(out, raw);
  } finally {
    console.error = originalError;
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /narrative-question-loop-detected/);
});

test('ensureNarrativeProgress: returns raw unchanged when no narrative question is present at all', () => {
  const raw = 'Just an ordinary reply with no narrative question.';
  assert.equal(ensureNarrativeProgress(raw, [], SUBSTANTIVE_ANSWER), raw);
});

test('ensureNarrativeProgress: returns raw unchanged when the history never asked a narrative question before', () => {
  const raw = `Let's start here. ${N1_QUESTION}`;
  assert.equal(ensureNarrativeProgress(raw, [{ role: 'ai', text: 'Some earlier unrelated message.' }], SUBSTANTIVE_ANSWER), raw);
});
