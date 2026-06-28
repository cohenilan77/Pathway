import assert from 'node:assert/strict';
import { estimatePracticeScore } from '../src/lib/testScoring.js';

process.env.ANTHROPIC_API_KEY ||= 'test-key';
const { TEST_BLUEPRINTS, validateSimulation } = await import('../api/test-simulation.js');

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

assert.throws(() => validateSimulation({ questions: satPayload.questions.slice(0, 19) }, 'sat', TEST_BLUEPRINTS.sat), /exactly 20/);

console.log('Test simulation verification passed.');
