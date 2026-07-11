import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdvisorResponse, statePatchFromRaw, validateStatePatch } from '../advisor-contract.js';
import { buildExecutionPlan, buildExecutionPlanForAgent, inferSpecialist, isUndergradEscapeToSpecialist, isOnboardingContinuation, looksLikeProfileText, realAgentRouterEnabled, resolveRoutingDecision, wantsProfileAnalysis } from '../hybrid-coordinator.js';
import { normalizeAnthropicMessages } from '../agents/BaseAgent.js';
import { buildNaggerPlan } from '../nagger-plan.js';
import { longRunningStatus } from '../../src/lib/longRunningAdvisorStatus.js';
import { normalizeProfileFacts } from '../profile-facts.js';
import { assessScoringConfidence, scoreCandidateKPIs } from '../kpi-engine.js';
import { checkEligibility } from '../eligibility-engine.js';
import { balanceMbaPortfolio, scoreProgramFit } from '../matching-engine.js';
import { applyDeterministicKpiToResponse, deterministicKpiEnabled } from '../deterministic-kpi-response.js';

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

test('undergrad turns of any length stay with the advisor unless they carry real profile text or an explicit action', () => {
  // Short chip replies, even when they trip a specialist keyword pattern
  // ("ranking" matches the search pattern).
  assert.equal(isUndergradEscapeToSpecialist('ranking improved'), false);
  assert.equal(isUndergradEscapeToSpecialist('Math club'), false);
  assert.equal(isUndergradEscapeToSpecialist('10th grade'), false);
  // Longer natural-language answers that trip a specialist pattern (e.g.
  // "recommend"/"university list" -> matching) must also stay, since
  // MatchingAgent/DocumentAgent/etc. have no undergrad-aware context.
  assert.equal(isUndergradEscapeToSpecialist('I want you to recommend some schools that match my interests'), false);
  assert.equal(isUndergradEscapeToSpecialist('Can you build me a university list for engineering'), false);
  // Sanity: the misrouting this guards against actually exists at the
  // inferSpecialist layer (used only by non-undergrad candidates now).
  assert.equal(inferSpecialist('ranking improved'), 'search');
  assert.equal(inferSpecialist('Can you build me a university list for engineering'), 'matching');
  // A genuine CV/profile-bearing paste still needs real extraction.
  const pastedResume = `TAL YOGEV\nEDUCATION\nReichman University, BA Business Administration, GPA 91.6/100\nEXPERIENCE\nEY Senior Transaction Diligence 2022-Present\nKPMG Tax Associate 2021-2022\nGMAT 750\nVOLUNTEER SERVICE\nPaamonim financial mentor\nLANGUAGES\nHebrew and English\n${'Leadership and transaction experience. '.repeat(12)}`;
  assert.equal(isUndergradEscapeToSpecialist(pastedResume), true);
  // An explicit non-chat UI action (e.g. a real upload) also leaves the path.
  assert.equal(isUndergradEscapeToSpecialist('Math club', 'document_upload'), true);
  assert.equal(isUndergradEscapeToSpecialist('Math club', 'candidate_message'), false);
  assert.equal(isUndergradEscapeToSpecialist('Math club'), false);
});

test('the word "profile" no longer routes to the document agent via the "file" substring', () => {
  assert.equal(inferSpecialist("Yes, I'm ready to see my full profile"), 'advisor');
  // Genuine document intents still route to the document agent.
  assert.equal(inferSpecialist('List the documents I uploaded'), 'document');
  assert.equal(inferSpecialist('Where is my file?'), 'document');
});

test('profile-reveal requests are detected so undergrads reach the full advisor analysis', () => {
  assert.equal(wantsProfileAnalysis("Yes, I'm ready to see my full profile"), true);
  assert.equal(wantsProfileAnalysis('Show my profile analysis'), true);
  assert.equal(wantsProfileAnalysis('ranking improved'), false);
  assert.equal(wantsProfileAnalysis('Math club'), false);
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

test('scored candidate school-list continuation routes to MatchingAgent', async () => {
  const candidateState = {
    profile: { category: 'Graduate', degree: 'MBA' },
    scores: { overall: 76 },
    programs: [],
  };
  for (const message of ['show my school list', 'match me', 'next']) {
    const decision = await resolveRoutingDecision({
      message,
      candidateState,
      enabled: true,
      route: async () => ({ agent: 'advisor', intent: 'continue' }),
    });
    assert.equal(decision.routedAgent, 'matching');
  }
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

test('Nagger plan surfaces a time-critical test-date nudge for grade 11 ahead of June registration', () => {
  const march = Date.UTC(2026, 2, 10); // March: inside the Jan-May registration window
  const noTestDate = buildNaggerPlan({
    profile: { category: 'Undergraduate', grade: 11 },
    state: { undergrad: { testingPlan: { status: 'in_progress', testDates: [] } } },
    now: march,
  });
  assert.match(noTestDate.nextBestNudge, /SAT\/ACT June registration/);

  const withTestDate = buildNaggerPlan({
    profile: { category: 'Undergraduate', grade: 11 },
    state: { undergrad: { testingPlan: { status: 'in_progress', testDates: ['2026-06-05'] } } },
    now: march,
  });
  assert.doesNotMatch(withTestDate.nextBestNudge || '', /SAT\/ACT June registration/);

  const outsideWindow = buildNaggerPlan({
    profile: { category: 'Undergraduate', grade: 11 },
    state: { undergrad: { testingPlan: { status: 'in_progress', testDates: [] } } },
    now: Date.UTC(2026, 8, 1), // September: outside the registration window
  });
  assert.doesNotMatch(outsideWindow.nextBestNudge || '', /SAT\/ACT June registration/);
});

test('long-running Advisor status changes at 10, 30, and 60 seconds', () => {
  assert.equal(longRunningStatus(9, 'Here is my CV'), null);
  assert.match(longRunningStatus(10, 'Here is my CV').title, /Reviewing extracted details/);
  assert.match(longRunningStatus(30, 'Recommend MBA programs').title, /Still working/);
  assert.match(longRunningStatus(60, 'Review my essay').title, /Deep analysis/);
  assert.match(longRunningStatus(60, 'Review my essay').detail, /Writing feedback|Checking strengths|Reviewing essay/);
});

test('deterministic KPI engine scores an MBA profile from facts', () => {
  const facts = normalizeProfileFacts({
    category: 'Graduate', degree: 'MBA', gpa: 3.7, gmat: 720, workYears: 5,
    managedPeople: true, teamSize: 4, ledProjects: ['Led diligence team'],
    careerGoal: 'Private equity investment manager in the USA', whyDegree: 'Build investing skills', whyNow: 'Career transition',
  });
  const result = scoreCandidateKPIs(facts);
  assert.equal(result.track, 'MBA');
  assert.equal(result.scores.academic, 80);
  assert.equal(result.scores.testScore, 80);
  assert.equal(result.scores.professional, 75);
  assert.ok(result.scores.leadership >= 70);
  assert.equal(result.scores.overall, result.overall);
});

test('deterministic KPI engine renders undergrad readiness without SAT', () => {
  // Undergraduate now runs through the grade-aware Profile Temperature /
  // Admissions Readiness engine (lib/undergrad/profile-temperature.js), not
  // the generic academic/testScore/activities KPI keys — a missing SAT/ACT
  // must still never block or tank the score.
  const facts = normalizeProfileFacts({
    category: 'Undergraduate', gpa: 3.9, activityDepthYears: 4,
    activities: ['Robotics team'], strongestActivity: 'Robotics captain', leadershipScope: 'Club captain',
    intendedMajor: 'Engineering', careerGoal: 'Study engineering in the USA',
  });
  const result = scoreCandidateKPIs(facts);
  assert.equal(result.track, 'Undergraduate');
  assert.ok(result.scores.academicFoundation >= 80, 'strong GPA scores well without needing a test');
  assert.ok(result.scoreDetails.testingAwareness.score >= 50, 'missing SAT/ACT stays neutral, not penalized');
  assert.notEqual(result.scoreDetails.testingAwareness.incomplete, true, 'missing testing plan is not treated as blocking');
  assert.ok(result.scores.activityExploration >= 70);
  assert.ok(Number.isFinite(result.overall));
});

test('deterministic KPI engine rewards PhD research, publication, and faculty fit', () => {
  const facts = normalizeProfileFacts({
    category: 'Postgraduate / Doctoral', degree: 'PhD', gpa: 3.8,
    researchExperience: ['Research assistant'], thesis: 'Machine learning thesis',
    publications: ['Peer-reviewed journal article'], methods: ['causal inference'],
    facultyFitEvidence: ['Professor Smith lab'], directEvaluatorConfirmed: true,
    recommenders: [{ title: 'Thesis supervisor' }], recommenderEvidenceSpecificity: 'concrete',
    careerGoal: 'Professor researching trustworthy AI', whyDegree: 'Research training', whyNow: 'Thesis completed',
  });
  const result = scoreCandidateKPIs(facts);
  assert.ok(result.scores.research >= 75);
  assert.ok(result.scores.publications >= 75);
  assert.ok(result.scores.facultyFit >= 80);
});

test('missing required test creates a task and evidence gap without blocking matching', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MBA', gpa: 3.7, workYears: 5 });
  const result = scoreCandidateKPIs(facts);
  assert.equal(result.scores.testScore, undefined);
  assert.ok(result.tasks.some(task => /test/i.test(task)));
  const eligibility = checkEligibility(facts, { requiresTest: true, avgGMAT: 720 });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.status, 'Eligible');
  assert.ok(eligibility.missingGates.some(gap => /test/i.test(gap)));
});

test('Tal-like MBA metrics remain incomplete rather than being crushed by missing soft evidence', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MBA', gpa: 3.66, gmat: 750, workExperience: '6 years' });
  const result = scoreCandidateKPIs(facts);
  const confidence = assessScoringConfidence(facts);
  assert.equal(facts.experience.workYears, 6);
  assert.equal(result.scores.academic, 80);
  assert.equal(result.scores.testScore, 90);
  assert.equal(result.scores.professional, 75);
  assert.equal(result.scores.leadership, undefined);
  assert.equal(result.scores.narrative, undefined);
  assert.equal(result.scoreDetails.recommenders.status, 'incomplete');
  assert.match(result.scoreDetails.recommenders.reason, /No direct evaluator recommender/i);
  assert.equal(result.scoreDetails.recommenders.missingPrompt, 'Who are your recommenders, and what can each one prove?');
  assert.ok(result.missingQuestions.includes('Who are your recommenders, and what can each one prove?'));
  assert.notEqual(confidence.confidence, 'high');
  assert.ok(confidence.missingFields.includes('current role/company'));
  assert.ok(result.tasks.some(task => /leadership/i.test(task)));
});

test('explicitly confirmed no leadership is known weak evidence', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MBA', gpa: 3.7, gmat: 730, workYears: 5, leadershipEvidence: 'none' });
  const result = scoreCandidateKPIs(facts);
  assert.equal(facts.leadership.explicitlyNone, true);
  assert.equal(result.scores.leadership, 40);
});

test('low-confidence non-source response does not publish unsupported scores or programs', () => {
  const previous = process.env.DETERMINISTIC_KPI_ENGINE;
  try {
    process.env.DETERMINISTIC_KPI_ENGINE = 'true';
    const response = {
      raw: '<PROFILE>{"category":"Graduate","degree":"MBA","gpa":3.66,"gmat":750,"workExperience":"6 years"}</PROFILE><SCORES>{"overall":54,"academic":80}</SCORES><PROGRAMS>[{"name":"Existing MBA","fit":72,"tier":"possible","programInfo":"Existing description."}]</PROGRAMS>Your analysis is ready.',
      message: 'Your analysis is ready.',
      statePatch: { profile: { category: 'Graduate', degree: 'MBA', gpa: 3.66, gmat: 750, workExperience: '6 years' }, scores: { overall: 54, academic: 80 }, programs: [{ name: 'Existing MBA', fit: 72, tier: 'possible', programInfo: 'Existing description.' }] },
      metadata: {},
    };
    const transformed = applyDeterministicKpiToResponse(response, { candidateState: { scores: { overall: 76, academic: 80 }, programs: [{ name: 'Saved MBA', fit: 74, tier: 'possible', programInfo: 'Saved description.' }] } });
    assert.equal(transformed.statePatch.scores, undefined);
    assert.equal(transformed.statePatch.programs, undefined);
    assert.equal(transformed.metadata.reason, 'missing_kpi_facts');
    assert.equal(transformed.metadata.fallbackUsed, true);
  } finally {
    if (previous === undefined) delete process.env.DETERMINISTIC_KPI_ENGINE;
    else process.env.DETERMINISTIC_KPI_ENGINE = previous;
  }
});

test('school fit starts from hard metrics and MBA balancing creates mixed tiers', () => {
  const facts = normalizeProfileFacts({
    category: 'Graduate', degree: 'MBA', gpa: 3.66, gmat: 750, workYears: 6,
    currentRole: 'Manager', currentCompany: 'EY', achievements: ['Saved $5m'],
    leadershipEvidence: 'Led diligence team', ledProjects: ['Diligence'], careerGoal: 'PE investment manager', whyMBA: 'Move into investing',
  });
  const kpi = scoreCandidateKPIs(facts);
  const scored = Array.from({ length: 10 }, (_, index) => scoreProgramFit({
    facts,
    kpiResult: { ...kpi, overall: 40 },
    program: {
      name: `MBA ${index + 1}`, programGroup: 'MBA', avgGPA: index < 2 ? 3.8 : 3.6, avgGMAT: index < 2 ? 755 : 720,
      selectivityLabel: index < 2 ? 'Ultra Competitive' : index > 6 ? 'Accessible' : 'Competitive',
      selectivityScore: index < 2 ? 95 : index > 6 ? 30 : 65,
      programInfo: 'A complete program description.',
    },
  }));
  assert.ok(scored[5].fit > 50, 'hard metrics should outweigh the deliberately low supplied overall');
  const balanced = balanceMbaPortfolio(scored);
  const tiers = new Set(balanced.map(program => program.tier));
  assert.ok(tiers.has('stretch'));
  assert.ok(tiers.has('possible'));
  assert.ok(tiers.has('safe'));
});

test('program far above candidate GPA and test baseline is deterministic stretch', () => {
  const facts = normalizeProfileFacts({ category: 'Graduate', degree: 'MBA', gpa: 3.0, gmat: 650, workYears: 5, careerGoal: 'Consultant' });
  const result = scoreCandidateKPIs(facts);
  const program = scoreProgramFit({
    facts, kpiResult: result,
    program: { name: 'Selective MBA', avgGPA: 3.8, avgGMAT: 730, requiresTest: true, selectivityLabel: 'Ultra Competitive' },
  });
  assert.equal(program.tier, 'stretch');
  assert.equal(program.admissionStatus, 'Below Baseline');
  assert.ok(program.fit <= 49);
});

test('deterministic feature flag defaults on and fallback rejects unsupported UI state', () => {
  assert.equal(deterministicKpiEnabled({ DETERMINISTIC_KPI_ENGINE: 'true' }), true);
  assert.equal(deterministicKpiEnabled({}), true);
  const previous = process.env.DETERMINISTIC_KPI_ENGINE;
  try {
    process.env.DETERMINISTIC_KPI_ENGINE = 'true';
    const response = {
      raw: '<SCORES>{"academic":77}</SCORES><PROGRAMS>[{"name":"Existing","fit":70}]</PROGRAMS>Ready.',
      statePatch: { profile: { category: 'Graduate' }, scores: { academic: 77 }, programs: [{ name: 'Existing', fit: 70 }] },
      metadata: {},
    };
    const transformed = applyDeterministicKpiToResponse(response, { candidateState: {} });
    assert.equal(transformed.statePatch.scores, undefined);
    assert.equal(transformed.statePatch.programs, undefined);
    assert.equal(transformed.statePatch.insights.deterministicKpiEngineFallback, true);
  } finally {
    if (previous === undefined) delete process.env.DETERMINISTIC_KPI_ENGINE;
    else process.env.DETERMINISTIC_KPI_ENGINE = previous;
  }
});
