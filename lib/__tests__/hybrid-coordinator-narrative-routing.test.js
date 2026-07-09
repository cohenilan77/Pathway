import test from 'node:test';
import assert from 'node:assert/strict';
import { inferSpecialist, isNarrativeChoiceHandoff, resolveRoutingDecision } from '../hybrid-coordinator.js';

const UPGRADE_MESSAGE = "I've chosen the Upgrade narrative. Please craft my complete narrative strategy now for my chosen schools.";
const PIVOT_MESSAGE = "I've chosen the Pivot narrative. Please craft my complete narrative strategy now for my chosen schools.";

test('isNarrativeChoiceHandoff recognizes both Upgrade and Pivot handoff messages', () => {
  assert.equal(isNarrativeChoiceHandoff(UPGRADE_MESSAGE), true);
  assert.equal(isNarrativeChoiceHandoff(PIVOT_MESSAGE), true);
  assert.equal(isNarrativeChoiceHandoff('What should I do next?'), false);
});

test('inferSpecialist routes the narrative handoff to advisor regardless of keyword overlap', () => {
  assert.equal(inferSpecialist(UPGRADE_MESSAGE), 'advisor');
  assert.equal(inferSpecialist(PIVOT_MESSAGE), 'advisor');
});

test('resolveRoutingDecision (regex fallback, router disabled) forces advisor for the narrative handoff', async () => {
  const decision = await resolveRoutingDecision({ message: UPGRADE_MESSAGE, enabled: false });
  assert.equal(decision.routedAgent, 'advisor');
  assert.equal(decision.routerSource, 'regex_fallback');
});

test('resolveRoutingDecision overrides an LLM router misroute (e.g. to "chat") for the narrative handoff', async () => {
  // Simulates the exact bug: the LLM router's own prompt lists "chat" as
  // covering general "strategy" Q&A, so it can misclassify this handoff.
  const decision = await resolveRoutingDecision({
    message: PIVOT_MESSAGE,
    enabled: true,
    route: async () => ({ agent: 'chat', intent: 'General strategy question' }),
  });
  assert.equal(decision.routedAgent, 'advisor');
  assert.equal(decision.routerSource, 'llm');
});

test('resolveRoutingDecision still forces advisor for the narrative handoff even if the LLM router throws', async () => {
  const decision = await resolveRoutingDecision({
    message: UPGRADE_MESSAGE,
    enabled: true,
    route: async () => { throw new Error('router unavailable'); },
  });
  assert.equal(decision.routedAgent, 'advisor');
  assert.equal(decision.routerSource, 'regex_fallback');
});
