import test from 'node:test';
import assert from 'node:assert/strict';
import { gateProgramReadyReply, needsProgramRecovery, PROGRAM_RECOVERY_REPLY } from '../program-ready-gate.js';

test('undergrad fake ready message is replaced when no program state exists', () => {
  const text = 'Your recommended programs are ready. Choose 3–5 schools from the University List tab.';
  assert.equal(gateProgramReadyReply({ text, isUndergrad: true, parsedPrograms: null, currentPrograms: null }), PROGRAM_RECOVERY_REPLY);
  assert.equal(needsProgramRecovery(text, []), true);
});

function programs(count) {
  return Array.from({ length: count }, (_, index) => ({ name: `Example University ${index + 1}`, fit: 70 }));
}

test('ready message is allowed when a real program list exists, even if short', () => {
  const text = 'Your recommended programs are ready. Choose 3–5 schools.';
  const validPrograms = programs(8);
  assert.equal(gateProgramReadyReply({ text, isUndergrad: true, parsedPrograms: validPrograms, currentPrograms: [] }), text);
  assert.equal(needsProgramRecovery(text, validPrograms), false);
  assert.equal(gateProgramReadyReply({ text, isUndergrad: true, parsedPrograms: programs(1), currentPrograms: [] }), text);
});

test('graduate false-ready flow is protected by the same gate', () => {
  const text = 'Your recommended programs are ready. Choose 3-5 schools.';
  assert.equal(gateProgramReadyReply({ text, isUndergrad: false, parsedPrograms: null, currentPrograms: null }), PROGRAM_RECOVERY_REPLY);
});
