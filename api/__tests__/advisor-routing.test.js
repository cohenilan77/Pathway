import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../advisor.js';
import { getAgentArchitecture, setAgentArchitecture } from '../../lib/agent-architecture.js';

async function request() {
  let code = 200;
  let body;
  const message = "I'd like to move forward with: Booth | Wharton. Take me to the next step of my journey.";
  const req = { method: 'POST', headers: {}, body: { action: 'candidate_message', message, messages: [{ role: 'user', text: message }], profile: { category: 'Graduate' }, programs: [], chosenSchools: [] } };
  const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
  await handler(req, res);
  return { code, body };
}

test('unified advisor routes both Legacy and Hybrid without losing typed state', async () => {
  const original = await getAgentArchitecture();
  try {
    await setAgentArchitecture({ mode: 'legacy', updatedBy: 'test' });
    const legacy = await request();
    assert.equal(legacy.code, 200);
    assert.equal(legacy.body.architecture, 'legacy');
    assert.deepEqual(legacy.body.statePatch.chosenSchools, ['Booth', 'Wharton']);

    await setAgentArchitecture({ mode: 'hybrid', updatedBy: 'test' });
    const hybrid = await request();
    assert.equal(hybrid.code, 200);
    assert.equal(hybrid.body.architecture, 'hybrid');
    assert.deepEqual(hybrid.body.statePatch.chosenSchools, ['Booth', 'Wharton']);
  } finally {
    await setAgentArchitecture({ mode: original.mode, updatedBy: 'test-restore' });
  }
});
