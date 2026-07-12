// Regression coverage for the essay dispatch bug: MainAgent.js's `case
// 'essay'` only populates extra.essay/extra.prompt from the dedicated
// Documents/Essays UI. A candidate who pastes a draft straight into chat and
// says "review this" never sets those, so it silently fell to draft() and
// wrote a brand-new essay over whatever they pasted, with no error surfaced.
import test from 'node:test';
import assert from 'node:assert/strict';

import { MainAgent, detectPastedEssayIntent } from '../MainAgent.js';
import { EssayAgent } from '../sub/EssayAgent.js';

const LONG_ESSAY = `${'This is a sentence about my summer internship and what I learned from it. '.repeat(20)}`;

test('detectPastedEssayIntent: short ordinary messages are untouched (null -> normal draft flow)', () => {
  assert.equal(detectPastedEssayIntent('Can you write me an essay about resilience?'), null);
  assert.equal(detectPastedEssayIntent(''), null);
});

test('detectPastedEssayIntent: long prose with no review/draft signal is ambiguous', () => {
  const result = detectPastedEssayIntent(LONG_ESSAY);
  assert.deepEqual(result, { action: 'clarify' });
});

test('detectPastedEssayIntent: long prose + review verb triggers review with a placeholder prompt', () => {
  const message = `${LONG_ESSAY}\n\nCan you review this and give me feedback?`;
  const result = detectPastedEssayIntent(message);
  assert.equal(result.action, 'review');
  assert.equal(result.essay, message);
  assert.match(result.prompt, /not explicitly stated/i);
});

test('detectPastedEssayIntent: extracts an inline-stated prompt when present', () => {
  const message = `Prompt: Describe a challenge you overcame and what you learned.\n\n${LONG_ESSAY}\n\nPlease review this.`;
  const result = detectPastedEssayIntent(message);
  assert.equal(result.action, 'review');
  assert.match(result.prompt, /Describe a challenge you overcame/);
});

test('MainAgent.handle(): a pasted 900-char essay + "review this" calls EssayAgent.review, not draft', async () => {
  const originalReview = EssayAgent.prototype.review;
  const originalDraft = EssayAgent.prototype.draft;
  let reviewCalled = false;
  let draftCalled = false;
  EssayAgent.prototype.review = async function stubReview(essay, prompt) {
    reviewCalled = true;
    return { text: JSON.stringify({ scores: { structure: 7 }, overallScore: 7, strengths: [], weaknesses: [], specificFeedback: [], verdict: 'solid' }), toolUses: [], usage: null, raw: null };
  };
  EssayAgent.prototype.draft = async function stubDraft() {
    draftCalled = true;
    return { text: 'A fresh draft nobody asked for.', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    const message = `${LONG_ESSAY}\n\nCan you review this and give me feedback?`;
    await agent.handle('cand_essay_dispatch', message, { forcedAgent: 'essay', extra: {} });
    assert.equal(reviewCalled, true, 'review() should have been called');
    assert.equal(draftCalled, false, 'draft() must not silently overwrite the pasted essay');
  } finally {
    EssayAgent.prototype.review = originalReview;
    EssayAgent.prototype.draft = originalDraft;
  }
});

test('MainAgent.handle(): long ambiguous prose (no review verb) asks a clarifying question instead of drafting', async () => {
  const originalDraft = EssayAgent.prototype.draft;
  let draftCalled = false;
  EssayAgent.prototype.draft = async function stubDraft() {
    draftCalled = true;
    return { text: 'draft', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    const result = await agent.handle('cand_essay_ambiguous', LONG_ESSAY, { forcedAgent: 'essay', extra: {} });
    assert.equal(draftCalled, false);
    assert.match(result.result.text, /draft you want reviewed, or should I write one/i);
  } finally {
    EssayAgent.prototype.draft = originalDraft;
  }
});

test('MainAgent.handle(): the existing Documents/Essays UI path (extra.essay+extra.prompt) is unchanged', async () => {
  const originalReview = EssayAgent.prototype.review;
  let receivedArgs = null;
  EssayAgent.prototype.review = async function stubReview(essay, prompt, school) {
    receivedArgs = { essay, prompt, school };
    return { text: '{}', toolUses: [], usage: null, raw: null };
  };
  try {
    const agent = new MainAgent();
    await agent.handle('cand_essay_ui', 'ignored', {
      forcedAgent: 'essay',
      extra: { essay: 'My essay text', prompt: 'Why this school?', school: 'MIT' },
    });
    assert.deepEqual(receivedArgs, { essay: 'My essay text', prompt: 'Why this school?', school: 'MIT' });
  } finally {
    EssayAgent.prototype.review = originalReview;
  }
});
