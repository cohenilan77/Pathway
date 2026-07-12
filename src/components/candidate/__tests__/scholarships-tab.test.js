import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const portal = readFileSync(path.join(dir, '../CandidatePortal.jsx'), 'utf8');
const scholarshipsPage = readFileSync(path.join(dir, '../Scholarships.jsx'), 'utf8');

test('CandidatePortal wires a Scholarships tab into both the undergrad and grad Workspace sub-navs', () => {
  assert.match(portal, /import Scholarships from '\.\/Scholarships\.jsx';/);
  assert.match(portal, /WORKSPACE_TAB_KEYS = \[.*'scholarships'.*\]/);
  assert.match(portal, /\['scholarships', 'Scholarships'\]/);
  assert.match(portal, /GRAD_WORKSPACE_TAB_KEYS = \[.*'scholarships'.*\]/);
  assert.match(portal, /candTab === 'scholarships' && <Scholarships \{\.\.\.props\} \/>/);
});

test('Scholarships.jsx fetches from /api/scholarships and supports a status PATCH', () => {
  assert.match(scholarshipsPage, /fetch\('\/api\/scholarships'/);
  assert.match(scholarshipsPage, /method: 'PATCH'/);
});
