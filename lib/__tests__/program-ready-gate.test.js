import test from 'node:test';
import assert from 'node:assert/strict';
import { gateProgramReadyReply, needsProgramRecovery, PROGRAM_RECOVERY_REPLY } from '../program-ready-gate.js';

test('undergrad fake ready message is replaced when no program state exists', () => {
  const text = 'Your recommended programs are ready. Choose 3–5 schools from the University List tab.';
  assert.equal(gateProgramReadyReply({ text, isUndergrad: true, parsedPrograms: null, currentPrograms: null }), PROGRAM_RECOVERY_REPLY);
  assert.equal(needsProgramRecovery(text, []), true);
});

test('ready message is allowed only when program state exists', () => {
  const text = 'Your recommended programs are ready. Choose 3–5 schools.';
  const programs = [{ name: 'Example University' }];
  assert.equal(gateProgramReadyReply({ text, isUndergrad: true, parsedPrograms: programs, currentPrograms: [] }), text);
  assert.equal(needsProgramRecovery(text, programs), false);
});

test('graduate flow is not changed by the undergraduate gate', () => {
  const text = 'Your recommended programs are ready. Choose 3-5 schools.';
  assert.equal(gateProgramReadyReply({ text, isUndergrad: false, parsedPrograms: null, currentPrograms: null }), text);
});
