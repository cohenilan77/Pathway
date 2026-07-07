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
  assert.match(portal, /candTab === 'ugRoadmap' && isUndergrad && <UndergradRoadmap/);
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
  assert.match(dashboard, /isUndergrad && <UndergradMiniCalendar/);
});

test('admin adds exactly one general Candidate Control Tower tab', () => {
  assert.match(admin, /setAdminView\('controlTower'\)/);
  assert.match(admin, /adminView === 'controlTower' && 'Candidate Control Tower'/);
  // Exactly one nav button, one render, one title — a single general tab.
  assert.equal((admin.match(/setAdminView\('controlTower'\)/g) || []).length, 1, 'one nav button');
  assert.equal((admin.match(/<CandidateControlTower\b/g) || []).length, 1, 'one render');
  assert.equal((admin.match(/adminView === 'controlTower'/g) || []).length, 3, 'nav active + title + render guard');
});
