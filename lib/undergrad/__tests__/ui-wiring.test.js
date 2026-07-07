import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(root, '..', '..', '..', rel), 'utf8');

const portal = read('src/components/candidate/CandidatePortal.jsx');
const admin = read('src/components/admin/AdminPortal.jsx');
const dashboard = read('src/components/candidate/Dashboard.jsx');

test('undergrad Roadmap/Tracker tabs render only for undergraduate candidates', () => {
  // Roadmap now renders inside the Workspace hub shell (re-homed, not
  // deleted), which is itself gated on isUndergrad; Tracker/Calendar stays a
  // standalone isUndergrad-gated deep-link from the Dashboard.
  assert.match(portal, /isUndergrad && WORKSPACE_TAB_KEYS\.includes\(candTab\)/);
  assert.match(portal, /candTab === 'ugRoadmap' && <UndergradRoadmap/);
  assert.match(portal, /candTab === 'calendar' && isUndergrad && <UndergradTracker/);
});

test('graduate candidates do not get the undergrad roadmap UI (gated on isUndergrad)', () => {
  // The only render paths for the undergrad tabs require isUndergrad === true.
  const roadmapRenders = portal.match(/<UndergradRoadmap\b/g) || [];
  const trackerRenders = portal.match(/<UndergradTracker\b/g) || [];
  assert.equal(roadmapRenders.length, 1);
  assert.equal(trackerRenders.length, 1);
  assert.ok(!/isUndergrad \? .*UndergradRoadmap/s.test(portal));
});

test('dashboard mini calendar is undergrad-gated', () => {
  // UndergradMiniCalendar renders inside UndergradJourneyDashboard, which is
  // itself only reached via `if (isUndergrad) return <UndergradJourneyDashboard.../>`
  // — so the gate is structural, not an inline `isUndergrad && <UndergradMiniCalendar`.
  assert.match(dashboard, /if \(isUndergrad\)[\s\S]{0,200}<UndergradJourneyDashboard/);
  assert.match(dashboard, /<UndergradMiniCalendar\b/);
});

test('admin adds exactly one general Candidate Control Tower tab', () => {
  assert.match(admin, /setAdminView\('controlTower'\)/);
  assert.match(admin, /adminView === 'controlTower' && 'Candidate Control Tower'/);
  // Exactly one nav button, one render, one title — a single general tab.
  assert.equal((admin.match(/setAdminView\('controlTower'\)/g) || []).length, 1, 'one nav button');
  assert.equal((admin.match(/<CandidateControlTower\b/g) || []).length, 1, 'one render');
  assert.equal((admin.match(/adminView === 'controlTower'/g) || []).length, 3, 'nav active + title + render guard');
});
