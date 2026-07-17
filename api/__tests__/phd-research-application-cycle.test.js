import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, DEFAULT_AI_CONFIG } from '../chat.js';
import { ensureSelectionContinuity, ensureNarrativeProgress, N1_QUESTION, N2_QUESTION, R1_QUESTION, R2_QUESTION } from '../../lib/selection-continuity.js';

// PhD/Postgraduate-Doctoral candidates were getting the MBA post-selection
// cycle: STEP 5 (Upgrade/Pivot), STEP 7 (essay-prompt Essay Workshop), and
// STEP 8 (MBA mock interview) — none of which fit a research degree. These
// tests pin the PHD RESEARCH-APPLICATION CYCLE that replaces those three
// steps, and the deterministic code guards that must route a PhD candidate
// there instead of forcing the MBA-style N1 narrative question.

const prompt = buildSystemPrompt(DEFAULT_AI_CONFIG, 'English');

test('system prompt defines the PhD research-application cycle', () => {
  assert.match(prompt, /==PHD RESEARCH-APPLICATION CYCLE/);
  assert.match(prompt, /PHD STEP 5 — RESEARCH POSITIONING/);
  assert.match(prompt, /PHD STEP 7 — STATEMENT OF PURPOSE \/ RESEARCH STATEMENT/);
  assert.match(prompt, /PHD STEP 8 — FACULTY-FIT INTERVIEW PREP/);
});

test('STEP 5/7/8 headers are scoped away from Postgraduate / Doctoral candidates', () => {
  assert.match(prompt, /STEP 5 — NARRATIVE STRATEGY \(MBA \/ Graduate \/ Personal Development only/);
  assert.match(prompt, /STEP 7 — ESSAY WORKSHOP \(MBA \/ Graduate \/ Personal Development only/);
  assert.match(prompt, /STEP 8 — MOCK INTERVIEW \(MBA \/ Graduate \/ Personal Development only/);
});

test('prompt explicitly forbids the essay-prompt question for Postgraduate / Doctoral candidates', () => {
  assert.match(prompt, /NEVER ask a Postgraduate \/ Doctoral candidate for "the exact essay prompt or question"/);
});

test('the PHD cycle section never actively instructs asking for an essay prompt, and uses SOP/Research Statement wording instead', () => {
  // STEP 5/7/8's headers each cross-reference "==PHD RESEARCH-APPLICATION
  // CYCLE==" inline, so anchor on the section's actual opening line (unique,
  // includes the "(replaces STEP 5, STEP 7, and STEP 8 ...)" suffix) rather
  // than the bare "==PHD RESEARCH-APPLICATION CYCLE" substring.
  const start = prompt.indexOf('==PHD RESEARCH-APPLICATION CYCLE (replaces STEP 5, STEP 7, and STEP 8 for Postgraduate / Doctoral candidates)==');
  const end = prompt.indexOf('==UNDERGRADUATE PATHWAY==', start);
  assert.ok(start !== -1 && end !== -1 && end > start, 'PHD cycle section must exist before the Undergraduate pathway');
  const phdSection = prompt.slice(start, end);

  // The only appearance of "essay prompt or question" in this section must be
  // the negation ("do not ask for..."), never an active ask of it.
  assert.ok(!phdSection.includes("what's the exact essay prompt or question"));
  assert.match(phdSection, /never ask for "the exact essay prompt or question\."/i);

  assert.match(phdSection, /Statement of Purpose and Research Statement/);
  assert.match(phdSection, /faculty\/lab fit/);
  assert.ok(!phdSection.includes('Upgrade — ['), 'PhD candidates must never get the Upgrade/Pivot framework text');
});

test('ensureSelectionContinuity routes a PhD candidate to R1 (research positioning), never the MBA N1 narrative question', () => {
  const out = ensureSelectionContinuity('', "I'd like to move forward with: MIT, Stanford.", true);
  assert.ok(out.includes(R1_QUESTION));
  assert.ok(!out.includes(N1_QUESTION));
});

test('ensureSelectionContinuity still asks N1 for non-PhD categories (unchanged default behavior)', () => {
  const out = ensureSelectionContinuity('', "I'd like to move forward with: Wharton, Booth.");
  assert.ok(out.includes(N1_QUESTION));
  assert.ok(!out.includes(R1_QUESTION));
});

test('ensureNarrativeProgress advances R1 to R2 for a PhD candidate on a substantive answer, never falling back to N1/N2', () => {
  const raw = `Great context. ${R1_QUESTION}`;
  const history = [
    { role: 'user', text: "I'd like to move forward with: MIT, Stanford." },
    { role: 'ai', text: `Your targets are locked in. Now let's build your research narrative. ${R1_QUESTION}` },
  ];
  const substantiveAnswer = 'I want to study how transformer attention heads specialize during multitask pretraining.';
  const out = ensureNarrativeProgress(raw, history, substantiveAnswer, true);
  assert.ok(!out.includes(R1_QUESTION));
  assert.ok(out.includes(R2_QUESTION));
  assert.ok(!out.includes(N2_QUESTION));
});
