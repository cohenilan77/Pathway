import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdvisorResponse, statePatchFromRaw, validateStatePatch } from '../advisor-contract.js';
import { buildExecutionPlan, buildExecutionPlanForAgent, inferSpecialist, looksLikeProfileText, realAgentRouterEnabled, resolveRoutingDecision } from '../hybrid-coordinator.js';

test('converts legacy structured blocks into a typed state patch', () => {
  const raw = '<PROFILE>{"name":"Galit","category":"Graduate"}</PROFILE><PROGRAMS>[{"name":"Booth","fit":80}]</PROGRAMS>Your list is ready.';
  const patch = statePatchFromRaw(raw);
  assert.equal(patch.profile.name, 'Galit');
  assert.equal(patch.programs[0].name, 'Booth');
  const response = makeAdvisorResponse({ architecture: 'legacy', raw });
  assert.equal(response.message, 'Your list is ready.');
  assert.equal(response.nextAction.type, 'select_programs');
});

test('sanitizes chosen schools and rejects invalid stages', () => {
  assert.deepEqual(validateStatePatch({ chosenSchools: ['Booth', 'Booth', ''] }).chosenSchools, ['Booth']);
  assert.throws(() => validateStatePatch({ journeyStage: 'broken' }), /Invalid journey stage/);
});

test('hybrid coordinator maps bounded requests to specialists', () => {
  assert.equal(inferSpecialist('Add my Wharton deadline to the calendar'), 'calendar');
  assert.equal(inferSpecialist('Review my MBA essay'), 'essay');
  assert.equal(inferSpecialist('What should I do next?'), 'advisor');
  assert.equal(inferSpecialist('Here is my uploaded CV file:\nGalit Cohen, MBA applicant, GMAT 750'), 'profile');
  assert.equal(inferSpecialist('Attached transcript and additional background information'), 'profile');
  assert.equal(inferSpecialist('List the documents I uploaded'), 'document');
  const pastedResume = `TAL YOGEV\nEDUCATION\nReichman University, BA Business Administration, GPA 91.6/100\nEXPERIENCE\nEY Senior Transaction Diligence 2022-Present\nKPMG Tax Associate 2021-2022\nGMAT 750\nVOLUNTEER SERVICE\nPaamonim financial mentor\nLANGUAGES\nHebrew and English\n${'Leadership and transaction experience. '.repeat(12)}`;
  assert.equal(looksLikeProfileText(pastedResume), true);
  assert.equal(inferSpecialist(pastedResume), 'profile');
});

test('stage orchestrator chains internal specialists before advisor continuation', () => {
  assert.deepEqual(buildExecutionPlan('Here is my uploaded CV file:\nEDUCATION\nEXPERIENCE'), ['document', 'profile']);
  assert.deepEqual(buildExecutionPlan('Recommend a tailored school portfolio'), ['search', 'matching']);
  assert.deepEqual(buildExecutionPlan('Help me review my essay'), ['essay']);
  assert.deepEqual(buildExecutionPlan('MBA'), ['advisor']);
});

test('REAL_AGENT_ROUTER flag is opt-in', () => {
  assert.equal(realAgentRouterEnabled({ REAL_AGENT_ROUTER: 'true' }), true);
  assert.equal(realAgentRouterEnabled({ REAL_AGENT_ROUTER: 'false' }), false);
  assert.equal(realAgentRouterEnabled({}), false);
});

test('LLM-first routing builds required specialist chains', async () => {
  const cases = [
    ['Here is my CV...', 'profile', ['document', 'profile']],
    ['Recommend MBA programs in the US', 'matching', ['search', 'matching']],
    ['Can you review my essay?', 'essay', ['essay']],
    ['What are my chances if I raise my GMAT?', 'simulation', ['simulation']],
    ['Schedule a deadline reminder', 'calendar', ['calendar']],
  ];
  for (const [message, agent, expectedPlan] of cases) {
    const decision = await resolveRoutingDecision({ message, enabled: true, route: async () => ({ agent, intent: 'test' }) });
    assert.equal(decision.routerSource, 'llm');
    assert.equal(decision.routedAgent, agent);
    assert.deepEqual(buildExecutionPlanForAgent(decision.routedAgent), expectedPlan);
  }
});

test('ambiguous next-step message uses LLM route and compact state context', async () => {
  let received;
  const decision = await resolveRoutingDecision({
    message: 'What should I do next?',
    enabled: true,
    candidateState: { profile: { category: 'Graduate', degree: 'MBA' }, stepIdx: 3, scores: { overall: 75 }, programs: [] },
    route: async context => { received = context; return { agent: 'advisor', intent: 'general strategy' }; },
  });
  assert.equal(decision.routerSource, 'llm');
  assert.equal(decision.routedAgent, 'advisor');
  assert.equal(received.category, 'Graduate');
  assert.equal(received.degree, 'MBA');
  assert.equal(received.stageIndex, 3);
  assert.equal(received.hasScores, true);
});

test('invalid or failed LLM route falls back to regex, and disabled flag never calls LLM', async () => {
  const invalid = await resolveRoutingDecision({ message: 'Review my essay', enabled: true, route: async () => ({ agent: 'made-up-agent' }) });
  assert.equal(invalid.routerSource, 'regex_fallback');
  assert.equal(invalid.routedAgent, 'essay');

  const failed = await resolveRoutingDecision({ message: 'Recommend schools', enabled: true, route: async () => { throw new Error('timeout'); } });
  assert.equal(failed.routerSource, 'regex_fallback');
  assert.equal(failed.routedAgent, 'matching');

  let called = false;
  const off = await resolveRoutingDecision({ message: 'Review my essay', enabled: false, route: async () => { called = true; } });
  assert.equal(called, false);
  assert.equal(off.routerSource, 'regex_fallback');
  assert.equal(off.routedAgent, 'essay');
});
