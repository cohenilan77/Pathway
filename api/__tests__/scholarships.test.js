import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../scholarships.js';
import { createManagedUser, createSessionToken, setUserData } from '../../lib/db.js';
import { saveScholarshipInterest } from '../../lib/agents/tools/update.js';

async function makeCandidate(email) {
  const user = await createManagedUser({
    name: 'Test Scholarship Candidate',
    email,
    password: 'password123',
    allowUnassigned: true,
  });
  const token = await createSessionToken(user.id);
  return { user, token };
}

function call(method, token, body) {
  let code = 200;
  let out;
  const req = { method, headers: { authorization: `Bearer ${token}` }, body };
  const res = { status(value) { code = value; return this; }, json(value) { out = value; return this; } };
  return handler(req, res).then(() => ({ code, body: out }));
}

test('GET /api/scholarships merges session-blob (undergrad) and store-backed (grad) scholarships', async () => {
  const { user, token } = await makeCandidate(`scholarship-merge-${Date.now()}@test.pathway`);
  await setUserData(user.id, {
    profile: { category: 'Undergraduate' },
    scholarships: [{ name: 'Undergrad Saved Award', url: 'https://example.com/undergrad-award', status: 'interested' }],
  });
  await saveScholarshipInterest(user.id, { name: 'Grad Saved Fellowship', url: 'https://example.com/grad-fellowship', status: 'interested' });

  const { code, body } = await call('GET', token);
  assert.equal(code, 200);
  const names = body.scholarships.map(s => s.name).sort();
  assert.deepEqual(names, ['Grad Saved Fellowship', 'Undergrad Saved Award']);
});

test('GET /api/scholarships requires auth', async () => {
  const req = { method: 'GET', headers: {} };
  let code;
  const res = { status(value) { code = value; return this; }, json() { return this; } };
  await handler(req, res);
  assert.equal(code, 401);
});

test('PATCH /api/scholarships updates status for a scholarship saved only in the session blob', async () => {
  const { user, token } = await makeCandidate(`scholarship-patch-${Date.now()}@test.pathway`);
  await setUserData(user.id, {
    profile: { category: 'Undergraduate' },
    scholarships: [{ name: 'Patch Me Award', url: 'https://example.com/patch-me', status: 'interested' }],
  });

  const { code, body } = await call('PATCH', token, { nameOrId: 'Patch Me Award', status: 'applying' });
  assert.equal(code, 200);
  const updated = body.scholarships.find(s => s.name === 'Patch Me Award');
  assert.equal(updated.status, 'applying');
});

test('PATCH /api/scholarships without nameOrId or status returns 400', async () => {
  const { token } = await makeCandidate(`scholarship-patch-bad-${Date.now()}@test.pathway`);
  const { code } = await call('PATCH', token, {});
  assert.equal(code, 400);
});
