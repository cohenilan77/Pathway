import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deriveNarrativeProgress } from '../../../lib/narrativeProgress.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');

const advisor = read('Advisor.jsx');
const conversational = read('AdvisorConversational.jsx');

// AdvisorConversational.jsx is the component every track actually renders in
// production (Advisor.jsx hardcodes ADAPTIVE_GRAD = true), so the recommended-
// schools pinned card bug and the narrative-skip bug both have to be fixed
// here, not just in the AdvisorChatFirst.jsx fallback layout.

test('Advisor forwards setNarrative to the production conversational advisor', () => {
  assert.match(advisor, /<AdvisorConversational[\s\S]*?narrative=\{narrative\} setNarrative=\{setNarrative\}/);
});

test('recommended-schools list remains available after target schools are confirmed', () => {
  assert.match(conversational, /const showProgramList = hasPrograms;/);
  assert.match(conversational, /const showPrograms = showProgramList && \(programsAnchor === i \+ 1 \|\| \/list again\|review and select schools\/i\.test/);
  assert.match(conversational, /\{showPrograms && \(/);
  assert.match(conversational, /Open School List →/);
});

test('narrative gating imports the same deriveNarrativeProgress used elsewhere', () => {
  assert.match(conversational, /import \{ deriveNarrativeProgress \} from '\.\.\/\.\.\/lib\/narrativeProgress\.js'/);
  assert.match(conversational, /const \{ narrativeQnAComplete \} = deriveNarrativeProgress\(visibleChat, NARRATIVE_START\)/);
});

test('a stale non-null narrative without answered N1-N4 cannot skip to CV/essay chips', () => {
  assert.match(conversational, /const narrativeDataIntegrityIssue = !!rawNarrative && !narrativeQnAComplete;/);
  assert.match(conversational, /if \(!narrative \|\| !narrativeQnAComplete\) \{/);
  assert.match(conversational, /if \(!narrativeQnAComplete\) return \[\];/);
});

test('the narrative CTA and modal are never shown to Undergraduate candidates', () => {
  assert.match(conversational, /const showNarrativeCTA = !isUndergrad && !busy && chosenSchools\?\.length > 0 && \(narrativeQnAComplete \? !rawNarrative : narrativeDataIntegrityIssue\)/);
  assert.match(conversational, /\{showNarrativeModal && !isUndergrad && \(/);
  assert.match(advisor, /const showNarrativeCTA = !isUndergrad && !busy && !narrative && lastAiText\.includes\('Narrative Strategy tab'\)/);
  assert.match(advisor, /\{showNarrativeModal && !isUndergrad && \(/);
});

test('narrative CTA opens strategy synthesis with an explicit action, including for stale data', () => {
  assert.match(conversational, /import NarrativeModal from '\.\/AdvisorNarrativeModal\.jsx'/);
  assert.match(conversational, /const handleNarrativeChoose = \(\) => \{/);
  assert.match(conversational, /start_narrative_strategy/);
  assert.doesNotMatch(conversational, /I've chosen the \$\{kind/);
  assert.match(conversational, /\{showNarrativeModal && !isUndergrad && \(/);
});

test('deriveNarrativeProgress: stale narrative on a fresh/reset chat is reported incomplete', () => {
  // Simulates the Tal-account scenario: `narrative` is non-null server-side
  // from a prior run, but this chat never reached the N1 question.
  const NARRATIVE_START = "Your targets are locked in. Now let's shape your Narrative & Strategy. What's the specific moment or experience that convinced you this is the right path?";
  const freshChat = [
    { role: 'ai', text: 'Welcome back!' },
    { role: 'user', text: 'I confirm these target schools: Wharton | INSEAD.' },
  ];
  const { narrativeQnAComplete } = deriveNarrativeProgress(freshChat, NARRATIVE_START);
  assert.equal(narrativeQnAComplete, false);
});
