// Regression coverage for the fix in api/advisor.js's finalizeKpiResponse:
// finalizeUndergradKpiResponse now short-circuits BEFORE the legacy grad/MBA
// cascade (applyDeterministicKpiToResponse + the readyForScoring/
// priorScoresExist gates) can touch an Undergraduate turn. That cascade
// unconditionally deleted statePatch.scores/programs and re-injected a raw
// `<PROFILE>{...}</PROFILE>` block whenever undergradBaseline's ALL-of-N-
// fields-known bar (grade + curriculum + gpa + activities + pathwayType +
// geography + testing + ...) wasn't cleared — which the smart agent
// deliberately never rushes for grade 9-10 — so in production it silently
// wiped the school list and progress score the SAME turn's agent had just
// computed, and leaked exactly the `<PROFILE>` block the 2026-07-09 hotfix
// was meant to eliminate. This exercises the real deterministic (LLM-free)
// school-list hotfix path end to end through the actual /api/advisor
// handler, with a profile that clears the handler's own grade/intendedMajor
// gate but not undergradBaseline.ready, to prove all three now survive.
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../advisor.js';
import orchestrateHandler from '../agents/orchestrate.js';
import { MainAgent } from '../../lib/agents/MainAgent.js';
import { createManagedUser, createSessionToken } from '../../lib/db.js';
import { getAgentArchitecture, setAgentArchitecture } from '../../lib/agent-architecture.js';

// The orchestrate.js coverage below intentionally lives in THIS file rather
// than its own: node's test runner runs files concurrently, and every file
// that toggles the shared, file-store-backed agent-architecture config
// (getAgentArchitecture/setAgentArchitecture) races with every other one
// doing the same — a second file here landed cleanly, a third (tried as its
// own file) intermittently flipped the mode out from under this file's
// request mid-flight, causing a real (missing-API-key) Anthropic call
// attempt and a flaky 500. Keeping all api/advisor.js + api/agents/
// orchestrate.js architecture-mode-dependent tests in this one file avoids
// adding another concurrent toggler beyond the two (this file +
// advisor-routing.test.js) already proven stable together.

async function request(profile) {
  let code = 200;
  let body;
  const message = 'Can you show me schools based on my profile?';
  const req = {
    method: 'POST',
    headers: {},
    body: {
      action: 'candidate_message',
      message,
      messages: [{ role: 'user', text: message }],
      profile,
      programs: [],
      chosenSchools: [],
    },
  };
  const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
  await handler(req, res);
  return { code, body };
}

test('Undergraduate scores.overall populates from a partial profile, without needing every undergradBaseline field', async () => {
  const original = await getAgentArchitecture();
  try {
    await setAgentArchitecture({ mode: 'hybrid', updatedBy: 'test' });
    const profile = {
      category: 'Undergraduate',
      grade: '11',
      intendedMajor: 'Computer Science',
      gpa: 3.8,
      activities: ['Robotics club'],
      // Deliberately missing: curriculum, pathwayType, geography/countries,
      // universityStyle, testing — undergradBaseline.ready requires ALL of
      // these too, so this profile alone would never have cleared the old gate.
    };
    const { code, body } = await request(profile);
    assert.equal(code, 200);
    assert.ok(body.statePatch?.scores, 'statePatch.scores should be present');
    assert.ok(Number.isFinite(body.statePatch.scores.overall), 'scores.overall should be a real number, not blank/undefined');
    assert.ok(body.statePatch.scores.overall > 0);
    assert.equal(body.statePatch.programs?.length, 12, 'the school list the deterministic handler just built must survive, not get deleted');
    assert.ok(!/<PROFILE>/.test(body.raw || ''), 'must never leak a grad-shaped <PROFILE> block into an Undergraduate response');
  } finally {
    await setAgentArchitecture({ mode: original.mode, updatedBy: 'test-restore' });
  }
});

test('Graduate candidates on the same hybrid-mode deterministic path are unaffected by the Undergraduate short-circuit', async () => {
  const original = await getAgentArchitecture();
  try {
    await setAgentArchitecture({ mode: 'hybrid', updatedBy: 'test' });
    let code = 200;
    let body;
    const message = "I'd like to move forward with: Booth | Wharton. Take me to the next step of my journey.";
    const req = {
      method: 'POST',
      headers: {},
      body: { action: 'candidate_message', message, messages: [{ role: 'user', text: message }], profile: { category: 'Graduate' }, programs: [], chosenSchools: [] },
    };
    const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
    await handler(req, res);
    assert.equal(code, 200);
    assert.deepEqual(body.statePatch.chosenSchools, ['Booth', 'Wharton']);
  } finally {
    await setAgentArchitecture({ mode: original.mode, updatedBy: 'test-restore' });
  }
});

// api/agents/orchestrate.js is the ACTUAL primary path authenticated
// Undergraduate candidates use (src/App.jsx routes them here instead of
// /api/advisor whenever a token is present — `usedOrchestrate = isUndergrad
// && !!auth?.token`). Neither this handler nor MainAgent.handle()/
// UndergradAgent.handle() ever computed scores, so the client's scores
// state never updated no matter how many facts had actually saved via
// save_profile_fact, and the debounced /api/session save persisted the
// same stale (empty) scores forever.
async function makeCandidate(email) {
  const user = await createManagedUser({
    name: 'Test Undergrad',
    email,
    password: 'password123',
    allowUnassigned: true,
  });
  const token = await createSessionToken(user.id);
  return { user, token };
}

test('orchestrate: Undergraduate turn gets real scores injected into statePatch', async () => {
  const original = await getAgentArchitecture();
  const originalHandle = MainAgent.prototype.handle;
  try {
    await setAgentArchitecture({ mode: 'hybrid', updatedBy: 'test' });
    const { user, token } = await makeCandidate(`undergrad-orchestrate-${Date.now()}@test.pathway`);

    // Stub MainAgent.handle to act like UndergradAgent.handle() actually
    // does today: return a statePatch with profile/undergrad/programs, but
    // NEVER scores — that's the real shape that reaches this handler.
    MainAgent.prototype.handle = async function stub() {
      return {
        agent: 'advisor',
        intent: 'undergrad_smart_agent',
        result: {
          text: 'Robotics is a great start!',
          toolUses: [],
          usage: null,
          raw: null,
          statePatch: { profile: { grade: '10', activities: ['Robotics club'] } },
          metadata: {},
        },
        latencyMs: 12,
      };
    };

    let code = 200;
    let body;
    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
        message: 'I joined robotics club, I am in grade 10',
        candidateId: user.id,
        conversationHistory: [],
        extra: { profile: { category: 'Undergraduate', gpa: 3.8 } },
      },
    };
    const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
    await orchestrateHandler(req, res);

    assert.equal(code, 200);
    assert.ok(body.statePatch?.scores, 'statePatch.scores must be present');
    assert.ok(Number.isFinite(body.statePatch.scores.overall));
    assert.ok(body.statePatch.scores.overall > 0);
    assert.equal(body.statePatch.profile.grade, '10');
    assert.equal(body.statePatch.profile.gpa, 3.8);
  } finally {
    MainAgent.prototype.handle = originalHandle;
    await setAgentArchitecture({ mode: original.mode, updatedBy: 'test-restore' });
  }
});

test('orchestrate: Graduate candidates are unaffected (no scores injected)', async () => {
  const original = await getAgentArchitecture();
  const originalHandle = MainAgent.prototype.handle;
  try {
    await setAgentArchitecture({ mode: 'hybrid', updatedBy: 'test' });
    const { user, token } = await makeCandidate(`grad-orchestrate-${Date.now()}@test.pathway`);

    MainAgent.prototype.handle = async function stub() {
      return {
        agent: 'chat',
        intent: 'generic reply',
        result: { text: 'Sure, tell me more.', toolUses: [], usage: null, raw: null },
        latencyMs: 5,
      };
    };

    let code = 200;
    let body;
    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
        message: 'Tell me about MBA programs',
        candidateId: user.id,
        conversationHistory: [],
        extra: { profile: { category: 'Graduate', degree: 'MBA' } },
      },
    };
    const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
    await orchestrateHandler(req, res);

    assert.equal(code, 200);
    assert.equal(body.statePatch, null);
  } finally {
    MainAgent.prototype.handle = originalHandle;
    await setAgentArchitecture({ mode: original.mode, updatedBy: 'test-restore' });
  }
});
