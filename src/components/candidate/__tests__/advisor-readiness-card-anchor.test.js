import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');
const conversational = read('AdvisorConversational.jsx');

// The Undergraduate Readiness / KPI scorecard must NOT appear in the advisor
// chat — it lives in the Dashboard and Workspace. It kept cluttering the
// conversation on login (an all-zero / partially-scored starter profile still
// surfaced the big "Needs update" card), so it's been removed from chat.

test('the readiness/KPI scorecard is not rendered inside the advisor chat', () => {
  assert.ok(!/UndergradKpiPanel/.test(conversational), 'UndergradKpiPanel must not be rendered by AdvisorConversational');
  assert.ok(!/showReadinessCard/.test(conversational), 'no in-chat readiness-card render gate should remain');
  assert.ok(!/readinessCardAnchor/.test(conversational), 'the readiness-card anchor machinery should be gone');
});
