import { createAnthropicClient } from '../lib/anthropic-client.js';
import { getUserIdByToken } from '../lib/db.js';
import { recordUsage } from '../lib/usage.js';

const client = createAnthropicClient();
const MODEL = 'claude-haiku-4-5-20251001';
const QUESTION_COUNT = 20;
const CHUNK_QUESTION_COUNT = 5;

export const TEST_BLUEPRINTS = {
  sat: {
    name: 'SAT',
    durationSeconds: 28 * 60,
    composition: 'Exactly 10 Reading and Writing questions and 10 Math questions.',
    guidance: `
Reading and Writing: use a unique 25-150 word stimulus for each question. Cover Information and Ideas, Craft and Structure, Expression of Ideas, and Standard English Conventions. Questions must have four options.
Math: cover Algebra, Advanced Math, Problem-Solving and Data Analysis, and Geometry/Trigonometry. About 30% should be realistic word problems. Use four-option multiple choice for this mini simulation so the interface remains consistent.
Difficulty: 5 easy, 10 medium, 5 hard across the full set. Arrange broadly from easier to harder within each section.`,
  },
  act: {
    name: 'ACT',
    durationSeconds: 20 * 60,
    composition: 'Exactly 7 English questions, 7 Math questions, and 6 Reading questions.',
    guidance: `
English: editing and rhetorical questions grounded in short original passages; cover Production of Writing, Knowledge of Language, and Conventions of Standard English.
Math: cover number and quantity, algebra, functions, geometry, statistics/probability, essential skills, and modeling. Use four answer choices, matching the enhanced ACT format.
Reading: use original literary or informational passages and test key ideas/details, craft/structure, and integration of knowledge/ideas.
Difficulty: 5 easy, 10 medium, 5 hard across the full set.`,
  },
};

export const TEST_CHUNKS = {
  sat: [
    { id: 'reading-writing-a', sections: { 'Reading and Writing': 5 }, difficulties: { easy: 2, medium: 2, hard: 1 } },
    { id: 'reading-writing-b', sections: { 'Reading and Writing': 5 }, difficulties: { easy: 1, medium: 3, hard: 1 } },
    { id: 'math-a', sections: { Math: 5 }, difficulties: { easy: 1, medium: 3, hard: 1 } },
    { id: 'math-b', sections: { Math: 5 }, difficulties: { easy: 1, medium: 2, hard: 2 } },
  ],
  act: [
    { id: 'english-a', sections: { English: 5 }, difficulties: { easy: 2, medium: 2, hard: 1 } },
    { id: 'english-math', sections: { English: 2, Math: 3 }, difficulties: { easy: 1, medium: 3, hard: 1 } },
    { id: 'math-reading', sections: { Math: 4, Reading: 1 }, difficulties: { easy: 1, medium: 3, hard: 1 } },
    { id: 'reading-a', sections: { Reading: 5 }, difficulties: { easy: 1, medium: 2, hard: 2 } },
  ],
};

function resolveUserId(req) {
  const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  return match ? getUserIdByToken(match[1]) : null;
}

function extractPayload(response) {
  const toolResult = (response.content || []).find((block) => block.type === 'tool_use' && block.name === 'submit_questions');
  if (toolResult?.input) return toolResult.input;
  const text = (response.content || []).filter((block) => block.type === 'text').map((block) => block.text).join('').trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

function normalizeQuestion(question, index, testType) {
  const allowedSections = testType === 'sat' ? ['Reading and Writing', 'Math'] : ['English', 'Math', 'Reading'];
  if (!question || typeof question !== 'object') throw new Error(`Question ${index + 1} is invalid.`);
  if (!allowedSections.includes(question.section)) throw new Error(`Question ${index + 1} has an invalid section.`);
  if (!Array.isArray(question.options) || question.options.length !== 4) throw new Error(`Question ${index + 1} must have four options.`);
  const correctIndex = Number(question.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw new Error(`Question ${index + 1} has an invalid answer key.`);
  const difficulty = ['easy', 'medium', 'hard'].includes(question.difficulty) ? question.difficulty : 'medium';
  const prompt = String(question.prompt || '').trim();
  const explanation = String(question.explanation || '').trim();
  if (!prompt || !explanation || question.options.some((option) => !String(option || '').trim())) {
    throw new Error(`Question ${index + 1} is incomplete.`);
  }
  return {
    id: `${testType}-${index + 1}`,
    section: question.section,
    domain: String(question.domain || question.section).trim(),
    difficulty,
    stimulus: String(question.stimulus || '').trim(),
    prompt,
    options: question.options.map((option) => String(option).trim()),
    correctIndex,
    explanation,
  };
}

export function validateSimulation(payload, testType, blueprint = TEST_BLUEPRINTS[testType]) {
  if (!payload || !Array.isArray(payload.questions) || payload.questions.length !== QUESTION_COUNT) {
    throw new Error(`Simulation must contain exactly ${QUESTION_COUNT} questions.`);
  }
  const questions = payload.questions.map((question, index) => normalizeQuestion(question, index, testType));
  const counts = questions.reduce((acc, question) => ({ ...acc, [question.section]: (acc[question.section] || 0) + 1 }), {});
  const expected = testType === 'sat'
    ? { 'Reading and Writing': 10, Math: 10 }
    : { English: 7, Math: 7, Reading: 6 };
  for (const [section, count] of Object.entries(expected)) {
    if (counts[section] !== count) throw new Error(`${section} must contain exactly ${count} questions.`);
  }
  const difficultyCounts = questions.reduce((acc, question) => ({ ...acc, [question.difficulty]: (acc[question.difficulty] || 0) + 1 }), {});
  if (difficultyCounts.easy !== 5 || difficultyCounts.medium !== 10 || difficultyCounts.hard !== 5) {
    throw new Error('Difficulty mix must be exactly 5 easy, 10 medium, and 5 hard questions.');
  }
  const answerPositionCounts = questions.reduce((acc, question) => {
    acc[question.correctIndex] += 1;
    return acc;
  }, [0, 0, 0, 0]);
  if (answerPositionCounts.some((count) => count < 3 || count > 7)) {
    throw new Error('Correct answer positions must be distributed across all four choices.');
  }
  const questionFingerprints = questions.map((question) => `${question.stimulus}\n${question.prompt}`.toLowerCase().replace(/\s+/g, ' ').trim());
  if (new Set(questionFingerprints).size !== QUESTION_COUNT) {
    throw new Error('Every stimulus and question combination must be unique.');
  }
  if (questions.some((question) => question.section !== 'Math' && !question.stimulus)) {
    throw new Error('Every verbal question must include its original passage or editing context.');
  }
  return {
    id: `practice_${testType}_${Date.now()}`,
    testType,
    title: `${blueprint.name} 20-Question Practice Simulation`,
    durationSeconds: blueprint.durationSeconds,
    questions,
    generatedAt: Date.now(),
    scoringNote: testType === 'sat'
      ? 'Practice estimate only. The official digital SAT is adaptive and equated; only College Board can issue an official 400-1600 score.'
      : 'Practice estimate only. Official ACT 1-36 scores are equated from full test forms; only ACT can issue an official score.',
  };
}

export function validateSimulationChunk(payload, testType, chunk) {
  if (!payload || !Array.isArray(payload.questions) || payload.questions.length !== CHUNK_QUESTION_COUNT) {
    throw new Error(`Chunk must contain exactly ${CHUNK_QUESTION_COUNT} questions.`);
  }
  // Section and difficulty are blueprint rules, not creative model output. Assign
  // them by position so harmless wording/categorization differences from the
  // model cannot invalidate an otherwise usable set of questions.
  const sectionPlan = Object.entries(chunk.sections).flatMap(([section, count]) => Array(count).fill(section));
  const difficultyPlan = Object.entries(chunk.difficulties).flatMap(([difficulty, count]) => Array(count).fill(difficulty));
  const questions = payload.questions.map((question, index) => normalizeQuestion({
    ...question,
    section: sectionPlan[index],
    difficulty: difficultyPlan[index],
  }, index, testType));
  const sectionCounts = questions.reduce((counts, question) => {
    counts[question.section] = (counts[question.section] || 0) + 1;
    return counts;
  }, {});
  for (const [section, expected] of Object.entries(chunk.sections)) {
    if (sectionCounts[section] !== expected) throw new Error(`${chunk.id} must contain exactly ${expected} ${section} questions.`);
  }
  if (Object.keys(sectionCounts).some((section) => !chunk.sections[section])) {
    throw new Error(`${chunk.id} contains an unexpected section.`);
  }
  const difficultyCounts = questions.reduce((counts, question) => {
    counts[question.difficulty] = (counts[question.difficulty] || 0) + 1;
    return counts;
  }, {});
  for (const [difficulty, expected] of Object.entries(chunk.difficulties)) {
    if (difficultyCounts[difficulty] !== expected) throw new Error(`${chunk.id} must contain exactly ${expected} ${difficulty} questions.`);
  }
  if (questions.some((question) => question.section !== 'Math' && !question.stimulus)) {
    throw new Error(`${chunk.id} verbal questions must include original stimulus text.`);
  }
  return questions;
}

function shuffledAnswerTargets(random = Math.random) {
  const targets = Array.from({ length: QUESTION_COUNT }, (_, index) => index % 4);
  for (let index = targets.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [targets[index], targets[swapIndex]] = [targets[swapIndex], targets[index]];
  }
  return targets;
}

export function balanceAnswerPositions(questions, random = Math.random) {
  if (!Array.isArray(questions) || questions.length !== QUESTION_COUNT) {
    throw new Error(`Cannot balance answers without exactly ${QUESTION_COUNT} questions.`);
  }
  const targets = shuffledAnswerTargets(random);
  return questions.map((question, index) => {
    const targetIndex = targets[index];
    const options = [...question.options];
    [options[question.correctIndex], options[targetIndex]] = [options[targetIndex], options[question.correctIndex]];
    return { ...question, options, correctIndex: targetIndex };
  });
}

function recordSimulationUsage({ response, userId, conversationId, attempt }) {
  if (!response) return;
  recordUsage({
    userId,
    conversationId,
    feature: 'test_simulation',
    model: MODEL,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    cacheCreationInputTokens: response.usage?.cache_creation_input_tokens,
    cacheReadInputTokens: response.usage?.cache_read_input_tokens,
    endpoint: 'test-simulation',
    attempt,
    stopReason: response.stop_reason,
  }).catch((error) => console.error('Failed to record test simulation usage:', error));
}

const QUESTION_TOOL = {
  name: 'submit_questions',
  description: 'Submit one validated chunk of original test-simulation questions.',
  input_schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        minItems: CHUNK_QUESTION_COUNT,
        maxItems: CHUNK_QUESTION_COUNT,
        items: {
          type: 'object',
          properties: {
            section: { type: 'string' },
            domain: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            stimulus: { type: 'string' },
            prompt: { type: 'string' },
            options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
          },
          required: ['section', 'domain', 'difficulty', 'stimulus', 'prompt', 'options', 'correctIndex', 'explanation'],
        },
      },
    },
    required: ['questions'],
  },
};

function countDescription(counts) {
  return Object.entries(counts).map(([label, count]) => `${count} ${label}`).join(', ');
}

async function generateChunk(testType, chunk, seed, retryNote = '') {
  const blueprint = TEST_BLUEPRINTS[testType];
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4500,
    temperature: 0.8,
    system: `You are an expert assessment writer. Create original practice material inspired by the current ${blueprint.name} skill blueprint, never copied or closely paraphrased from official or commercial questions. Every question must be objectively answerable, have exactly one correct choice, plausible distractors, and a concise worked explanation. Submit the questions using the provided tool.`,
    tools: [QUESTION_TOOL],
    tool_choice: { type: 'tool', name: QUESTION_TOOL.name },
    messages: [{
      role: 'user',
      content: `Create chunk ${chunk.id} of a fresh ${blueprint.name} mini simulation.
Generation seed: ${seed}-${chunk.id}. Use it to vary topics, values, and passages from other sessions and chunks.

BLUEPRINT
${blueprint.guidance}

THIS CHUNK MUST CONTAIN
- exactly ${CHUNK_QUESTION_COUNT} questions
- sections: ${countDescription(chunk.sections)}
- difficulties: ${countDescription(chunk.difficulties)}

Rules:
- exactly four non-empty options per question
- option strings contain only the choice text; do not prefix them with A, B, C, or D
- correctIndex is zero-based (0-3)
- every non-Math question includes its complete original passage or editing context in stimulus
- no trick ambiguity, no copyrighted passage, no external image dependency
- use plain text/math notation that renders safely in a browser
${retryNote}`,
    }],
  });
  try {
    return { response, questions: validateSimulationChunk(extractPayload(response), testType, chunk) };
  } catch (error) {
    error.response = response;
    throw error;
  }
}

async function generateChunkWithRetry({ testType, chunk, seed, chunkIndex, userId, conversationId }) {
  let firstError;
  for (let retry = 0; retry < 2; retry += 1) {
    try {
      const result = await generateChunk(
        testType,
        chunk,
        retry ? `${seed}-retry` : seed,
        retry ? `Previous attempt failed validation: ${firstError.message}. Correct only that problem.` : '',
      );
      recordSimulationUsage({ response: result.response, userId, conversationId, attempt: chunkIndex * 2 + retry });
      return result.questions;
    } catch (error) {
      recordSimulationUsage({ response: error.response, userId, conversationId, attempt: chunkIndex * 2 + retry });
      if (retry === 1) throw error;
      firstError = error;
    }
  }
  throw firstError;
}

function orderQuestions(testType, questions) {
  const sections = testType === 'sat' ? ['Reading and Writing', 'Math'] : ['English', 'Math', 'Reading'];
  const difficulties = ['easy', 'medium', 'hard'];
  return [...questions].sort((left, right) => (
    sections.indexOf(left.section) - sections.indexOf(right.section)
    || difficulties.indexOf(left.difficulty) - difficulties.indexOf(right.difficulty)
  ));
}

async function generateSimulation({ testType, seed, userId, conversationId }) {
  const chunks = await Promise.all(TEST_CHUNKS[testType].map((chunk, chunkIndex) => generateChunkWithRetry({
    testType,
    chunk,
    seed,
    chunkIndex,
    userId,
    conversationId,
  })));
  const ordered = orderQuestions(testType, chunks.flat());
  const balanced = balanceAnswerPositions(ordered);
  return validateSimulation({ questions: balanced }, testType, TEST_BLUEPRINTS[testType]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to generate a test simulation.' });

  const testType = String(req.body?.testType || '').toLowerCase();
  if (!TEST_BLUEPRINTS[testType]) return res.status(400).json({ error: 'testType must be sat or act.' });
  const conversationId = req.body?.conversationId || 'legacy_session';
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  try {
    const simulation = await generateSimulation({ testType, seed, userId, conversationId });
    return res.status(200).json({ simulation });
  } catch (error) {
    console.error('Test simulation generation failed:', error);
    return res.status(500).json({ error: 'Could not generate a valid simulation. Please try again.' });
  }
}
