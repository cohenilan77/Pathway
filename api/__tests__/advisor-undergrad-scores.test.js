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
import { getAgentArchitecture, setAgentArchitecture } from '../../lib/agent-architecture.js';

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
