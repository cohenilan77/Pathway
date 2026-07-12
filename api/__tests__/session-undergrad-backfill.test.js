// Regression coverage for the backfill in api/session.js's GET handler:
// candidates who were already stuck with stale/empty scores before the
// api/advisor.js and api/agents/orchestrate.js fixes shipped need to self-heal
// without a migration script — the very next time their app loads (GET
// /api/session) with a profile that has real facts but no real score, it gets
// recomputed and persisted once.
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../session.js';
import { createManagedUser, createSessionToken, setUserData, getUserData } from '../../lib/db.js';

async function makeCandidate(email) {
  const user = await createManagedUser({
    name: 'Test Undergrad Backfill',
    email,
    password: 'password123',
    allowUnassigned: true,
  });
  const token = await createSessionToken(user.id);
  return { user, token };
}

async function get(token) {
  let code = 200;
  let body;
  const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
  const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
  await handler(req, res);
  return { code, body };
}

test('GET /api/session backfills stale-zero scores for an Undergraduate candidate with a real profile', async () => {
  const { user, token } = await makeCandidate(`undergrad-backfill-${Date.now()}@test.pathway`);
  await setUserData(user.id, {
    profile: { category: 'Undergraduate', grade: '11', gpa: 3.7, activities: ['Debate club'] },
    scores: {},
  });

  const { code, body } = await get(token);
  assert.equal(code, 200);
  assert.ok(Number.isFinite(body.data?.scores?.overall));
  assert.ok(body.data.scores.overall > 0);

  // Persisted, not just returned this once.
  const persisted = await getUserData(user.id);
  assert.ok(Number.isFinite(persisted.scores?.overall));
});

test('GET /api/session does not backfill a brand-new Undergraduate candidate with no grade yet', async () => {
  const { user, token } = await makeCandidate(`undergrad-nograde-${Date.now()}@test.pathway`);
  await setUserData(user.id, { profile: { category: 'Undergraduate' }, scores: {} });

  const { code, body } = await get(token);
  assert.equal(code, 200);
  assert.deepEqual(body.data.scores, {});
});

test('GET /api/session leaves an already-scored Undergraduate candidate untouched', async () => {
  const { user, token } = await makeCandidate(`undergrad-already-scored-${Date.now()}@test.pathway`);
  await setUserData(user.id, {
    profile: { category: 'Undergraduate', grade: '12' },
    scores: { overall: 42 },
  });

  const { body } = await get(token);
  assert.equal(body.data.scores.overall, 42);
});

test('GET /api/session never touches a Graduate candidate', async () => {
  const { user, token } = await makeCandidate(`grad-backfill-${Date.now()}@test.pathway`);
  await setUserData(user.id, { profile: { category: 'Graduate', degree: 'MBA' }, scores: {} });

  const { body } = await get(token);
  assert.deepEqual(body.data.scores, {});
});
