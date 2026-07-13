import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_GENERATED_PROGRAMS, validateProgramList } from '../program-validation.js';

function programs(names) {
  return names.map((name, index) => ({ name, fit: 60 + index }));
}

test('validateProgramList rejects non-arrays', () => {
  const result = validateProgramList(null);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'programs_not_array');
});

test('validateProgramList removes duplicate or unnamed rows before counting', () => {
  const result = validateProgramList([
    ...programs(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']),
    { name: 'A', fit: 90 },
    { name: '   ', fit: 80 },
  ]);
  assert.equal(result.valid, true);
  assert.equal(result.count, MIN_GENERATED_PROGRAMS);
  assert.deepEqual(result.programs.map(program => program.name).sort(), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
});

test('validateProgramList rejects generated lists with fewer than eight unique names', () => {
  const result = validateProgramList(programs(['A', 'B', 'C', 'D', 'E', 'F', 'G']));
  assert.equal(result.valid, false);
  assert.equal(result.count, 7);
  assert.equal(result.reason, 'too_few_programs');
});
