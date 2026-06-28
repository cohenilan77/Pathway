import { createAnthropicClient } from '../lib/anthropic-client.js';
import { getUserIdByToken } from '../lib/db.js';
import { recordUsage } from '../lib/usage.js';

const client = createAnthropicClient();
const MODEL = 'claude-haiku-4-5-20251001';
const QUESTION_COUNT = 20;

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

function resolveUserId(req) {
  const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  return match ? getUserIdByToken(match[1]) : null;
}

function extractJson(response) {
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
  if (new Set(questions.map((question) => question.prompt.toLowerCase())).size !== QUESTION_COUNT) {
    throw new Error('Every question prompt must be unique.');
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

async function generateSimulation(testType, seed, retryNote = '') {
  const blueprint = TEST_BLUEPRINTS[testType];
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    temperature: 0.8,
    system: `You are an expert assessment writer. Create original practice material inspired by the current ${blueprint.name} skill blueprint, never copied or closely paraphrased from official or commercial questions. Every question must be objectively answerable, have exactly one correct choice, plausible distractors, and a concise worked explanation. Return JSON only.`,
    messages: [{
      role: 'user',
      content: `Create a fresh 20-question ${blueprint.name} mini simulation.
Generation seed: ${seed}. Use this seed to vary topics, values, passages, and answer positions from other sessions.

BLUEPRINT
${blueprint.composition}
${blueprint.guidance}

Return exactly this JSON shape:
{"questions":[{"section":"...","domain":"...","difficulty":"easy|medium|hard","stimulus":"short original passage, data, equation, or context; empty only when unnecessary","prompt":"question","options":["choice text","choice text","choice text","choice text"],"correctIndex":0,"explanation":"why the correct answer is right"}]}

Rules:
- exactly 20 objects and exactly four non-empty options each
- option strings contain only the choice text; do not prefix them with A, B, C, or D
- correctIndex is zero-based (0-3), and answer positions must be well distributed
- no trick ambiguity, no copyrighted passage, no external image dependency
- use plain text/math notation that renders safely in a browser
- do not include markdown fences or prose outside the JSON
${retryNote}`,
    }],
  });
  try {
    return { response, simulation: validateSimulation(extractJson(response), testType, blueprint) };
  } catch (error) {
    error.response = response;
    throw error;
  }
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
    let generated;
    let attempt = 0;
    try {
      generated = await generateSimulation(testType, seed);
    } catch (firstError) {
      recordSimulationUsage({ response: firstError.response, userId, conversationId, attempt: 0 });
      attempt = 1;
      generated = await generateSimulation(testType, `${seed}-retry`, `Previous validation failed: ${firstError.message}. Correct the structure precisely.`);
    }

    const { response, simulation } = generated;
    recordSimulationUsage({ response, userId, conversationId, attempt });

    return res.status(200).json({ simulation });
  } catch (error) {
    recordSimulationUsage({ response: error.response, userId, conversationId, attempt: 1 });
    console.error('Test simulation generation failed:', error);
    return res.status(500).json({ error: 'Could not generate a valid simulation. Please try again.' });
  }
}
