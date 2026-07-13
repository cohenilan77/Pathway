import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, '..', '..', '..', 'App.jsx'), 'utf8');

// Regression: statePatch.scholarships (the only way an Undergraduate
// save_scholarship_interest tool call reaches the candidate — unlike Graduate's
// ScholarshipAgent, which persists straight to the scholarships:${candidateId}
// store key) was never captured into App.jsx state at all, so the periodic
// /api/session save never re-sent it and a saved scholarship was silently lost
// after the one turn that saved it, despite the agent reporting success.
test('App.jsx tracks scholarships state, loads it on session GET, and re-saves it on every session POST', () => {
  assert.match(appSrc, /const \[scholarships, setScholarships\] = useState\(\[\]\);/);
  assert.match(appSrc, /setScholarships\(Array\.isArray\(data\?\.scholarships\) \? data\.scholarships : \[\]\);/);
  assert.match(appSrc, /if \(typedPatch\.scholarships\) setScholarships\(typedPatch\.scholarships\);/);

  // Present in the debounced session-save POST body...
  const saveBodyIdx = appSrc.indexOf("body: JSON.stringify({\n          data: { sessionId,");
  assert.ok(saveBodyIdx > -1, 'could not locate the session-save POST body');
  const saveBodySnippet = appSrc.slice(saveBodyIdx, saveBodyIdx + 700);
  assert.match(saveBodySnippet, /\bscholarships\b/);

  // ...and in that effect's dependency array, so a scholarships change
  // actually triggers a save instead of waiting for some other field to change.
  const depsIdx = appSrc.indexOf('}, [auth?.token, sessionId, chat, stepIdx, profile, scores,');
  assert.ok(depsIdx > -1, 'could not locate the session-save effect dependency array');
  const depsSnippet = appSrc.slice(depsIdx, depsIdx + 400);
  assert.match(depsSnippet, /\bscholarships\b/);
});
