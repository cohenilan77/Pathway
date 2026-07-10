import test from 'node:test';
import assert from 'node:assert/strict';

import { looksLikeUndergradSchoolListRequest } from '../school-list-intent.js';

test('recognizes real school-list requests, including messy/typo phrasing', () => {
  const truePositives = [
    'list shcools',
    'list of shcools pls',
    'show me schools',
    'show me possible list of schools based on my profile',
    'which schools should I look at',
    'show me a school list',
    'match me with schools',
    'recommend schools for me',
    'Show me the list now',
    'what schools should I consider',
  ];
  for (const message of truePositives) {
    assert.equal(looksLikeUndergradSchoolListRequest(message, []), true, `expected a match for ${JSON.stringify(message)}`);
  }
});

test('short frustrated phrases only count as a school-list request with recent context', () => {
  const historyWithSchoolContext = [{ role: 'user', text: 'list of shcools pls' }];
  for (const message of ['show now', 'sho wnow', 'stop asking just fucking show']) {
    assert.equal(looksLikeUndergradSchoolListRequest(message, []), false, `${JSON.stringify(message)} alone, with no context, should not match`);
    assert.equal(looksLikeUndergradSchoolListRequest(message, historyWithSchoolContext), true, `${JSON.stringify(message)} with recent school-list context should match`);
  }
});

// Regression coverage: a prior version of the detection regex had an
// unintentionally optional trailing group ("...\\b(list|options|matches?|
// recommend|now)?\\b"), which meant ANY sentence containing a common verb
// (tell/see/show) near "school" or "program" — with no list/options/
// recommend word anywhere — matched. A student asking a genuine, unrelated
// question ("tell me about my program requirements") got a canned Reach/
// Target/Likely school dump instead of an answer.
test('does not fire on ordinary sentences that merely mention school/program near a common verb', () => {
  const falsePositives = [
    'generate PROFILE',
    'I want to see my full profile',
    'hello',
    'I joined robotics club',
    "I've chosen the Upgrade narrative. Please craft my complete narrative strategy",
    'I got my SAT score back, 1450!',
    'can you show me the essay I wrote?',
    'I want to tell you about my school project',
    'can you see my school schedule tomorrow',
    'I joined my school newspaper',
    'my program starts at 9am',
    'tell me about my program requirements',
    'I got into my dream school program today!',
    'I have a question about my school lunch schedule',
    'what should I do to prepare for my program interview',
  ];
  for (const message of falsePositives) {
    assert.equal(looksLikeUndergradSchoolListRequest(message, []), false, `expected no match for ${JSON.stringify(message)}`);
  }
});
