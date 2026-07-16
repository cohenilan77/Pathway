import test from 'node:test';
import assert from 'node:assert/strict';
import { getCandidateKpiDisplayItems } from '../candidate-kpi-schemas.js';

test('getCandidateKpiDisplayItems exposes displayReason, never the raw internal reason', () => {
  const scoreDetails = {
    goalClarity: {
      reason: 'Already asked once — proceeding with a conservative estimate rather than leaving this blocked.',
      displayReason: 'Goal Clarity — No career or academic goal confirmed — share a specific target role, sector, or program direction.',
    },
  };
  const items = getCandidateKpiDisplayItems({}, { category: 'Graduate', degree: 'MBA' }, undefined, scoreDetails);
  const goalItem = items.find(item => item.key === 'goalClarity');
  assert.ok(goalItem, 'goalClarity item must be present for an incomplete score');
  assert.equal(goalItem.reason, scoreDetails.goalClarity.displayReason);
  assert.notEqual(goalItem.reason, scoreDetails.goalClarity.reason);
  assert.ok(!goalItem.reason.toLowerCase().includes('already asked'));
});

test('getCandidateKpiDisplayItems falls back to a safe generic string when displayReason is missing', () => {
  const scoreDetails = { goalClarity: { reason: 'internal debug text that must never render' } };
  const items = getCandidateKpiDisplayItems({}, { category: 'Graduate', degree: 'MBA' }, undefined, scoreDetails);
  const goalItem = items.find(item => item.key === 'goalClarity');
  assert.ok(goalItem.reason);
  assert.notEqual(goalItem.reason, scoreDetails.goalClarity.reason);
  assert.match(goalItem.reason, /more detail is needed/i);
});
