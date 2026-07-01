import assert from 'node:assert/strict';
import { estimatePracticeScore } from '../src/lib/testScoring.js';

process.env.ANTHROPIC_API_KEY ||= 'test-key';
const {
  TEST_BLUEPRINTS,
  TEST_CHUNKS,
  balanceAnswerPositions,
  validateSimulation,
  validateSimulationChunk,
} = await import('../api/test-simulation.js');

function question(section, index) {
  return {
    section,
    domain: `${section} domain`,
    difficulty: index < 5 ? 'easy' : index < 15 ? 'medium' : 'hard',
    stimulus: `Original stimulus ${index}`,
    prompt: `Question ${index}?`,
    options: ['Option one', 'Option two', 'Option three', 'Option four'],
    correctIndex: index % 4,
    explanation: 'A concise explanation.',
  };
}

const satPayload = {
  questions: [
    ...Array.from({ length: 10 }, (_, index) => question('Reading and Writing', index)),
    ...Array.from({ length: 10 }, (_, index) => question('Math', index + 10)),
  ],
};
const sat = validateSimulation(satPayload, 'sat', TEST_BLUEPRINTS.sat);
assert.equal(sat.questions.length, 20);
assert.equal(sat.durationSeconds, 28 * 60);
const satAnswers = Object.fromEntries(sat.questions.map((item, index) => [index, item.correctIndex]));
const satScore = estimatePracticeScore('sat', sat.questions, satAnswers);
assert.equal(satScore.correctCount, 20);
assert.equal(satScore.estimatedScore, 1600);

const satChunk = TEST_CHUNKS.sat[0];
const satChunkPayload = {
  questions: Array.from({ length: 5 }, (_, index) => ({
    ...question('Reading and Writing', index),
    difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
  })),
};
assert.equal(validateSimulationChunk(satChunkPayload, 'sat', satChunk).length, 5);
const normalizedSatChunk = validateSimulationChunk({
  questions: satChunkPayload.questions.map((item) => ({ ...item, section: 'Reading & Writing', difficulty: 'hard' })),
}, 'sat', satChunk);
assert.deepEqual(normalizedSatChunk.map((item) => item.section), Array(5).fill('Reading and Writing'));
assert.deepEqual(normalizedSatChunk.map((item) => item.difficulty), ['easy', 'easy', 'medium', 'medium', 'hard']);

const actPayload = {
  questions: [
    ...Array.from({ length: 7 }, (_, index) => question('English', index)),
    ...Array.from({ length: 7 }, (_, index) => question('Math', index + 7)),
    ...Array.from({ length: 6 }, (_, index) => question('Reading', index + 14)),
  ],
};
const act = validateSimulation(actPayload, 'act', TEST_BLUEPRINTS.act);
assert.equal(act.questions.length, 20);
assert.equal(act.durationSeconds, 20 * 60);
const actAnswers = Object.fromEntries(act.questions.map((item, index) => [index, item.correctIndex]));
const actScore = estimatePracticeScore('act', act.questions, actAnswers);
assert.equal(actScore.correctCount, 20);
assert.equal(actScore.estimatedScore, 36);

for (const testType of ['sat', 'act']) {
  const totals = TEST_CHUNKS[testType].reduce((result, chunk) => {
    Object.entries(chunk.sections).forEach(([section, count]) => { result.sections[section] = (result.sections[section] || 0) + count; });
    Object.entries(chunk.difficulties).forEach(([difficulty, count]) => { result.difficulties[difficulty] = (result.difficulties[difficulty] || 0) + count; });
    return result;
  }, { sections: {}, difficulties: {} });
  assert.deepEqual(totals.difficulties, { easy: 5, medium: 10, hard: 5 });
  assert.deepEqual(totals.sections, testType === 'sat'
    ? { 'Reading and Writing': 10, Math: 10 }
    : { English: 7, Math: 7, Reading: 6 });
}

const originalCorrectAnswers = satPayload.questions.map((item) => item.options[item.correctIndex]);
const balanced = balanceAnswerPositions(satPayload.questions, () => 0.42);
const balancedPositionCounts = balanced.reduce((counts, item) => {
  counts[item.correctIndex] += 1;
  return counts;
}, [0, 0, 0, 0]);
assert.deepEqual(balancedPositionCounts, [5, 5, 5, 5]);
assert.deepEqual(balanced.map((item) => item.options[item.correctIndex]), originalCorrectAnswers);

const repeatedStemPayload = {
  questions: satPayload.questions.map((item, index) => ({
    ...item,
    prompt: index < 2 ? 'Which choice best states the main idea of the text?' : item.prompt,
  })),
};
assert.equal(validateSimulation(repeatedStemPayload, 'sat', TEST_BLUEPRINTS.sat).questions.length, 20);
const duplicateQuestionPayload = {
  questions: repeatedStemPayload.questions.map((item, index) => (index === 1
    ? { ...item, stimulus: repeatedStemPayload.questions[0].stimulus }
    : item)),
};
assert.equal(validateSimulation(duplicateQuestionPayload, 'sat', TEST_BLUEPRINTS.sat).questions.length, 20);

assert.throws(() => validateSimulation({ questions: satPayload.questions.slice(0, 19) }, 'sat', TEST_BLUEPRINTS.sat), /exactly 20/);

console.log('Test simulation verification passed.');
