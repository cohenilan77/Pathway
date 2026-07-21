import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildAdvisorFallbackMessage, isCvSubmissionMessage } from '../advisor-fallback-message.js';

test('CV timeout fallback saves the candidate and avoids retry-generation dead end', () => {
  const message = buildAdvisorFallbackMessage({
    errorName: 'AbortError',
    isSchoolListPhase: false,
    isCvSubmission: true,
  });

  assert.match(message, /CV saved/i);
  assert.match(message, /next/i);
  assert.doesNotMatch(message, /school-list request timed out/i);
  assert.doesNotMatch(message, /Please retry generation/i);
});

test('school-list timeout fallback keeps work saved and offers a next action', () => {
  const message = buildAdvisorFallbackMessage({
    errorName: 'AbortError',
    isSchoolListPhase: true,
    requestedProgramList: true,
  });

  assert.match(message, /saved your profile/i);
  assert.match(message, /Build my school list now/i);
  assert.doesNotMatch(message, /Please retry generation/i);
});

test('detects hidden CV submission messages used by the chat UI', () => {
  assert.equal(isCvSubmissionMessage('Here is my CV/resume text: Tal'), true);
  assert.equal(isCvSubmissionMessage('Tell me about schools'), false);
});

test('App error handling passes the defined school-list timeout phase to fallback messaging', () => {
  const app = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /isSchoolListPhase: isSchoolListTimeoutPhase/);
  assert.doesNotMatch(app, /\n\s*isSchoolListPhase,\n/);
});
