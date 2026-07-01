import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd().endsWith('Pathway') ? process.cwd() : path.join(process.cwd(), 'work/Pathway');

test('adaptive graduate rail removes Advisor tasks and leaves Dashboard tasks', () => {
  const advisor = fs.readFileSync(path.join(root, 'src/components/candidate/Advisor.jsx'), 'utf8');
  const dashboard = fs.readFileSync(path.join(root, 'src/components/candidate/Dashboard.jsx'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');

  assert.match(app, /setAdaptiveGradEnabled\(data\?\.enabled === true\)/);
  assert.match(app, /\/api\/agents\/orchestrate/);
  assert.match(advisor, /JourneyRail/);
  assert.match(advisor, /adaptiveGradEnabled && isGradPhD\(profile, chat\)/);
  assert.match(advisor, /postgraduate\|post graduate\|master\|mba\|phd\|doctoral\|doctorate/);
  assert.match(advisor, /Move me to the next step\./);
  assert.match(advisor, /Profile/);
  assert.match(advisor, /Analysis/);
  assert.match(advisor, /Portfolio/);
  assert.match(advisor, /Narrative/);
  assert.match(advisor, /CV/);
  assert.match(advisor, /Essays/);
  assert.match(advisor, /Interview/);
  assert.match(dashboard, /<CardLabel>Tasks<\/CardLabel>/);
});
