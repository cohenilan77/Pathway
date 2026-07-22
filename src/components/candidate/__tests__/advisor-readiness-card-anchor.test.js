import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');
const conversational = read('AdvisorConversational.jsx');

// The readiness/KPI card used to be an unconditional trailing widget
// re-rendered directly above the composer on every turn (profile-
// temperature.js's neutral floor scores make hasScores go true almost
// immediately for Undergrad, well before there's real profile info), which
// read as the conversation being interrupted every time a new message
// arrived rather than continuing normally beneath a one-time card.

test('readiness card is gated on grade AND a real (>0) score — an all-zero starter profile shows no card', () => {
  assert.match(conversational, /const hasRealScores = .*Number\(v\) > 0\);/);
  assert.match(conversational, /const readinessReady = \(isUndergrad \? hasRealScores : hasScores\) && \(!isUndergrad \|\| !!profile\?\.grade\);/);
});

test('readiness card is anchored once to the message that made it ready, like milestones', () => {
  assert.match(conversational, /const \[readinessCardAnchor, setReadinessCardAnchor\] = useState\(null\);/);
  assert.match(conversational, /if \(readinessReady && !prevReadinessReady\.current\) \{\s*setReadinessCardAnchor\(visibleChat\.length\);/);
  assert.match(conversational, /const showReadinessCard = isUndergrad && readinessCardAnchor === i \+ 1;/);
  assert.match(conversational, /\{showReadinessCard && <UndergradKpiPanel scores=\{scores\} compact \/>\}/);
});

test('the old unconditional trailing readiness card render is gone', () => {
  assert.ok(!/\{isUndergrad && hasScores && <UndergradKpiPanel scores=\{scores\} compact \/>\}/.test(conversational),
    'UndergradKpiPanel must not render as an unconditional trailer after the message map anymore');
});
