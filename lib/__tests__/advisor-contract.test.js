import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdvisorResponse, statePatchFromRaw, validateStatePatch } from '../advisor-contract.js';
import { buildExecutionPlan, buildExecutionPlanForAgent, inferSpecialist, isOnboardingContinuation, looksLikeProfileText, realAgentRouterEnabled, resolveRoutingDecision } from '../hybrid-coordinator.js';
import { normalizeAnthropicMessages } from '../agents/BaseAgent.js';
import { buildNaggerPlan } from '../nagger-plan.js';
import { longRunningStatus } from '../../src/lib/longRunningAdvisorStatus.js';

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

test('normalizes frontend roles before every specialist Anthropic call', () => {
  assert.deepEqual(normalizeAnthropicMessages([
    { role: 'ai', text: 'Hello' },
    { role: 'assistant', content: 'Next' },
    { role: 'candidate', text: 'MBA' },
    { role: 'user', content: 'USA' },
    { role: 'system', text: 'hidden' },
    { role: 'user', text: '   ' },
  ]), [
    { role: 'assistant', content: 'Hello' },
    { role: 'assistant', content: 'Next' },
    { role: 'user', content: 'MBA' },
    { role: 'user', content: 'USA' },
  ]);
});

test('short onboarding answers and idle checks stay with AdvisorAgent', async () => {
  const examples = ['Graduate', 'MBA', '2-year', 'Full-time', 'tal', 'USA', '__idle_checkin__'];
  for (const message of examples) {
    assert.equal(isOnboardingContinuation(message, {}), true);
    const decision = await resolveRoutingDecision({
      message,
      enabled: true,
      route: async () => ({ agent: message === '__idle_checkin__' ? 'nagger' : 'chat', intent: 'generic reply' }),
    });
    assert.equal(decision.routerSource, 'llm');
    assert.equal(decision.routedAgent, 'advisor');
  }
});

test('onboarding guard does not override clear specialist intent or CV flow', () => {
  assert.equal(isOnboardingContinuation('Review my essay', {}), false);
  assert.equal(isOnboardingContinuation('Here is my CV with EXPERIENCE and EDUCATION', {}), false);
});

test('Nagger lifecycle activates intentionally and respects cooldowns', () => {
  const now = Date.UTC(2026, 6, 3);
  const inactiveGraduate = buildNaggerPlan({ profile: { category: 'Graduate', degree: 'MBA' }, state: {}, now });
  assert.equal(inactiveGraduate.active, false);
  assert.equal(inactiveGraduate.shouldNudge, false);

  const activeGraduate = buildNaggerPlan({
    profile: { category: 'Graduate', degree: 'MBA', email: 'candidate@example.com' },
    state: { chosenSchools: ['Booth'], tasks: ['Confirm recommender'] },
    events: [{ title: 'Booth essay', date: now + 2 * 86400000 }],
    now,
  });
  assert.equal(activeGraduate.active, true);
  assert.equal(activeGraduate.shouldNudge, true);
  assert.equal(activeGraduate.escalationLevel, 'critical');
  assert.deepEqual(activeGraduate.channels, ['in_app', 'email', 'admin_alert']);

  const undergrad = buildNaggerPlan({ profile: { category: 'Undergraduate', grade: 'Grade 11' }, state: {}, now });
  assert.equal(undergrad.active, true);
  assert.equal(undergrad.cadence, 'biweekly');
  assert.match(undergrad.nextBestNudge, /testing|university-list|leadership/i);

  const cooled = buildNaggerPlan({
    profile: { category: 'Undergraduate', grade: 12 },
    state: { naggerPlan: { lastNudgeAt: now - 86400000 } },
    now,
  });
  assert.equal(cooled.shouldNudge, false);
});

test('long-running Advisor status changes at 10, 30, and 60 seconds', () => {
  assert.equal(longRunningStatus(9, 'Here is my CV'), null);
  assert.match(longRunningStatus(10, 'Here is my CV').title, /Reading your document/);
  assert.match(longRunningStatus(30, 'Recommend MBA programs').title, /taking a little longer/);
  assert.match(longRunningStatus(60, 'Review my essay').title, /Deep analysis/);
  assert.match(longRunningStatus(60, 'Review my essay').detail, /Writing feedback|Checking strengths|Reviewing essay/);
});
