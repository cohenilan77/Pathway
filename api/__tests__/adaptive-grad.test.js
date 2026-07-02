import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isAdaptiveGradEnabled } from '../../lib/adaptive-grad.js';
import { getJourney, patchJourney, resetJourney, advanceJourneyStage } from '../../lib/agents/journey/state.js';
import { CATEGORY_QUESTION, runJourneyGate, narrativeGateCheck } from '../../lib/agents/journey/gate.js';
import { applyHardGates } from '../../lib/agents/journey/tools/gates.js';
import { assess_risk } from '../../lib/agents/journey/tools/risk.js';
import { GradAgent, deriveProfileScores } from '../../lib/agents/journey/GradAgent.js';

const uid = (label) => `test-adaptive-${label}-${Date.now()}-${Math.random()}`;

test('flag defaults off and enables only with exact true value', () => {
  const before = process.env.ADAPTIVE_GRAD;
  delete process.env.ADAPTIVE_GRAD;
  assert.equal(isAdaptiveGradEnabled(), false);
  process.env.ADAPTIVE_GRAD = 'true';
  assert.equal(isAdaptiveGradEnabled(), true);
  process.env.ADAPTIVE_GRAD = 'TRUE';
  assert.equal(isAdaptiveGradEnabled(), false);
  if (before === undefined) delete process.env.ADAPTIVE_GRAD;
  else process.env.ADAPTIVE_GRAD = before;
});

test('journey state deep merges collected and flags, advances forward, and resets', async () => {
  const id = uid('state');
  await resetJourney(id);
  await patchJourney(id, { collected: { gpa: 3.5, education: { school: 'A' } }, flags: { profileConfirmed: true, stage: 'profile' } });
  await patchJourney(id, { collected: { gmat: 710, education: { degree: 'BSc' } }, flags: { chosenSchools: ['INSEAD'] } });
  await advanceJourneyStage(id, 'analysis');
  await advanceJourneyStage(id, 'profile');
  const journey = await getJourney(id);
  assert.deepEqual(journey.collected, { gpa: 3.5, gmat: 710, education: { school: 'A', degree: 'BSc' } });
  assert.equal(journey.flags.profileConfirmed, true);
  assert.deepEqual(journey.flags.chosenSchools, ['INSEAD']);
  assert.equal(journey.flags.stage, 'analysis');
  await resetJourney(id);
  assert.equal((await getJourney(id)).flags.stage, 'intake');
});

test('gate asks the one fixed question and records Graduate', async () => {
  const id = uid('gate-grad');
  await resetJourney(id);
  const first = await runJourneyGate(id, 'hello');
  assert.equal(first.action, 'ask');
  assert.equal(first.text, CATEGORY_QUESTION);
  const picked = await runJourneyGate(id, 'Graduate');
  assert.equal(picked.action, 'adaptive');
  assert.equal((await getJourney(id)).category, 'Graduate');
  await resetJourney(id);
});

for (const category of ['Undergraduate', 'Personal Development']) {
  test(`gate falls through for ${category}`, async () => {
    const id = uid(category);
    await resetJourney(id);
    const result = await runJourneyGate(id, category);
    assert.equal(result.action, 'legacy');
    await resetJourney(id);
  });
}

test('narrative is blocked until programsShown', () => {
  assert.equal(narrativeGateCheck({ flags: { programsShown: false } }).allowed, false);
  assert.equal(narrativeGateCheck({ flags: { programsShown: true } }).allowed, true);
});

test('hard gates deterministically lock GPA gap above 0.5', () => {
  const result = applyHardGates({ fit: 72, tier: 'possible', candidateGPA: 3.0, medianGPA: 3.6, candidateTest: 700, medianTest: 700 });
  assert.equal(result.locked, true);
  assert.equal(result.fit, 49);
  assert.ok(result.riskFlags.includes('gpa_below_gate'));
});

test('hollow high-profile recommender emits a risk flag and fix task', async () => {
  const result = await assess_risk('candidate', 'Harvard', {
    candidate: { gpa: 3.7, testScore: 720, programType: 'MBA', collected: {}, recommenders: ['Senator Jane Doe'] },
    benchmark: { medianGPA: 3.7, medianTest: 720, verified: true },
  });
  assert.ok(result.riskFlags.includes('weak_recommender'));
  assert.ok(result.tasks.some((task) => /directly supervised|closer recommender/i.test(task)));
});

test('one mocked turn parses CV, selects schools, builds portfolio, and emits UI in order', async () => {
  const id = uid('loop');
  await resetJourney(id);
  await patchJourney(id, { category: 'Graduate', flags: { stage: 'profile' } });
  const calls = [];
  const benchmarkProvider = async (school) => {
    calls.push(`benchmark:${school}`);
    return { medianGPA: 3.6, medianTest: 700, testName: 'GMAT', verified: true, source: 'official' };
  };
  const riskProvider = async (_candidateId, school) => {
    calls.push(`risk:${school}`);
    return { risks: [], tasks: [], riskFlags: [] };
  };
  const agent = new GradAgent({
    profileAgent: { parse: async () => ({ text: '{"gpa":3.7,"testScore":710}' }) },
    benchmarkProvider,
    riskProvider,
  });
  const responses = [
    {
      stop_reason: 'tool_use', usage: {}, content: [
        { type: 'tool_use', id: '1', name: 'parse_cv', input: { cvText: 'GPA 3.7 GMAT 710' } },
        { type: 'tool_use', id: '2', name: 'set_chosen_schools', input: { schools: ['INSEAD', 'LBS'] } },
        { type: 'tool_use', id: '3', name: 'build_portfolio', input: { schools: ['INSEAD', 'LBS'], programType: 'MBA' } },
        { type: 'tool_use', id: '4', name: 'emit_ui', input: { blocks: ['PROGRAMS'], tab: 'analysis' } },
      ],
    },
    { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Your verified school list is ready. -> Review list | Adjust schools' }] },
  ];
  agent.client = { messages: { create: async () => responses.shift() } };
  const result = await agent.chat(id, 'Here is my CV. My schools are INSEAD and LBS.');
  assert.deepEqual(result.toolUses, ['parse_cv', 'set_chosen_schools', 'build_portfolio', 'emit_ui']);
  assert.deepEqual(calls, ['benchmark:INSEAD', 'risk:INSEAD', 'benchmark:LBS', 'risk:LBS']);
  assert.equal(result.journey.flags.programsShown, true);
  assert.equal(result.ui.tab, 'analysis');
  assert.match(result.raw, /<PROGRAMS>[\s\S]*<\/PROGRAMS>/);
  assert.ok(!result.toolUses.includes('present_narrative_options'));
  await resetJourney(id);
});

test('unverified benchmark produces low confidence and per-school risk flags', async () => {
  const id = uid('confidence');
  await resetJourney(id);
  await patchJourney(id, { category: 'Graduate', collected: { gpa: 3.5, testScore: 680 }, flags: { chosenSchools: ['Unknown School'] } });
  const agent = new GradAgent({
    benchmarkProvider: async () => ({ medianGPA: null, medianTest: null, verified: false, source: null }),
    riskProvider: async () => ({ risks: [{ type: 'unverified_benchmark' }], tasks: ['Verify benchmark'], riskFlags: ['unverified_benchmark'] }),
  });
  agent.runtime = { candidateId: id, profile: {}, scores: {}, ui: {}, toolCalls: [] };
  const result = await agent.handleToolUse({ name: 'build_portfolio', input: { schools: ['Unknown School'] } });
  assert.equal(result.programs[0].confidence, 'low');
  assert.ok(result.programs[0].riskFlags.includes('unverified_benchmark'));
  assert.equal((await getJourney(id)).flags.programsShown, true);
  await resetJourney(id);
});

test('saved school choices are built and emitted when the model skips build_portfolio', async () => {
  const id = uid('selected-school-recovery');
  await resetJourney(id);
  await patchJourney(id, {
    category: 'Graduate',
    subtype: 'MBA',
    collected: { gpa: 3.9, testScore: 750 },
    flags: { stage: 'portfolio' },
  });
  const agent = new GradAgent({
    benchmarkProvider: async () => ({ medianGPA: 3.7, medianTest: 730, verified: true, source: 'official' }),
    riskProvider: async () => ({ risks: [], tasks: [], riskFlags: [] }),
  });
  const responses = [
    {
      stop_reason: 'tool_use', usage: {}, content: [
        { type: 'tool_use', id: '1', name: 'set_chosen_schools', input: { schools: ['Harvard Business School', 'Stanford GSB', 'Chicago Booth'] } },
      ],
    },
    { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Your choices are saved. -> Review analysis | Add targets' }] },
  ];
  agent.client = { messages: { create: async () => responses.shift() } };

  const result = await agent.chat(id, 'HBS, Stanford, Booth only', { programs: [] });

  assert.ok(result.toolUses.includes('build_portfolio'));
  assert.equal(result.journey.flags.programsShown, true);
  assert.equal(result.journey.collected.portfolio.length, 3);
  assert.match(result.raw, /<PROGRAMS>[\s\S]*Harvard Business School[\s\S]*<\/PROGRAMS>/);
  await resetJourney(id);
});

test('missing-analysis report re-emits a saved portfolio to an empty client', async () => {
  const id = uid('empty-analysis-recovery');
  await resetJourney(id);
  await patchJourney(id, {
    category: 'Graduate',
    collected: { portfolio: [{ name: 'Chicago Booth', tier: 'possible', fit: 75 }] },
    flags: { programsShown: true, chosenSchools: ['Chicago Booth'], stage: 'portfolio' },
  });
  const agent = new GradAgent();
  agent.client = { messages: { create: async () => ({
    stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'I restored it. -> Review analysis | Continue' }],
  }) } };

  const result = await agent.chat(id, "I don't see any schools in the analysis tab", { programs: [] });

  assert.match(result.raw, /<PROGRAMS>[\s\S]*Chicago Booth[\s\S]*<\/PROGRAMS>/);
  await resetJourney(id);
});

test('completed MBA profile always emits scores for Dashboard and Analysis', async () => {
  const id = uid('profile-score-sync');
  await resetJourney(id);
  await patchJourney(id, {
    category: 'Graduate',
    subtype: 'MBA',
    collected: {
      name: 'Dandi',
      gpa: 3.9,
      gmat: 750,
      experience: '2 years',
      leadership: 'Led a national security team',
      recommenders: ['Direct manager'],
      hasCV: true,
    },
    flags: { profileConfirmed: true, stage: 'analysis' },
  });
  const agent = new GradAgent();
  agent.client = { messages: { create: async () => ({
    stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Your profile analysis is ready. -> Review analysis | Match programs' }],
  }) } };

  const result = await agent.chat(id, 'Finish my profile analysis', { profile: { degree: 'MBA' }, scores: {} });
  const scoreBlock = result.raw.match(/<SCORES>([\s\S]*?)<\/SCORES>/);

  assert.ok(scoreBlock);
  const emitted = JSON.parse(scoreBlock[1]);
  assert.ok(emitted.academic >= 90);
  assert.ok(emitted.testScore >= 90);
  assert.ok(emitted.professional > 0);
  assert.ok(emitted.recommenders > 0);
  await resetJourney(id);
});

test('submitted CV is persisted before the model and cannot trigger another upload request', async () => {
  const id = uid('cv-receipt');
  await resetJourney(id);
  await patchJourney(id, { category: 'Graduate', subtype: 'MBA', flags: { stage: 'profile' } });
  const agent = new GradAgent();
  agent.client = { messages: { create: async () => ({
    stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Please upload your CV or paste your background. -> Upload a file | Paste text' }],
  }) } };

  const result = await agent.chat(id, 'Here is my CV/resume:\n\nGPA 3.9, GMAT 750, 2 years of work experience.');
  const journey = await getJourney(id);

  assert.equal(journey.collected.hasCV, true);
  assert.equal(journey.collected.gpa, 3.9);
  assert.equal(journey.collected.gmat, 750);
  assert.match(journey.collected.cvText, /GPA 3\.9/);
  assert.doesNotMatch(result.raw, /upload your CV|paste your background/i);
  assert.match(result.raw, /received and saved your file/i);
  await resetJourney(id);
});

test('profile score derivation covers doctoral dimensions', () => {
  const scores = deriveProfileScores({
    category: 'Postgraduate / Doctoral',
    subtype: 'PhD',
    collected: { gpa: 3.8, gre: 330, research: 'Thesis and lab research', publications: 'Conference paper', supervisor: 'Professor A' },
  });
  assert.ok(scores.academic > 0);
  assert.ok(scores.research > 0);
  assert.ok(scores.publications > 0);
  assert.ok(scores.facultyFit > 0);
  assert.ok(scores.recommenders > 0);
});

for (const scenario of [
  {
    label: 'MBA',
    category: 'Graduate',
    subtype: 'MBA',
    schools: ['Harvard Business School', 'Chicago Booth'],
    collected: { gpa: 3.9, testScore: 750 },
    benchmark: { medianGPA: 3.7, medianTest: 730, verified: true, source: 'official' },
  },
  {
    label: 'PhD',
    category: 'Postgraduate / Doctoral',
    subtype: 'PhD',
    schools: ['MIT EECS PhD', 'Stanford Computer Science PhD'],
    collected: { gpa: 3.9, testScore: 330 },
    benchmark: { medianGPA: 3.8, medianTest: 325, verified: true, source: 'official' },
  },
]) {
  test(`${scenario.label} matching produces a non-empty banded portfolio`, async () => {
    const id = uid(`portfolio-${scenario.label.toLowerCase()}`);
    await resetJourney(id);
    await patchJourney(id, {
      category: scenario.category,
      subtype: scenario.subtype,
      collected: scenario.collected,
      flags: { stage: 'analysis' },
    });
    const agent = new GradAgent({
      benchmarkProvider: async () => scenario.benchmark,
      riskProvider: async () => ({ risks: [], tasks: [], riskFlags: [] }),
    });
    agent.runtime = { candidateId: id, profile: {}, scores: {}, programs: [], ui: {}, toolCalls: [] };

    const result = await agent.handleToolUse({
      name: 'build_portfolio',
      input: { schools: scenario.schools, programType: scenario.subtype },
    });

    assert.equal(result.programs.length, scenario.schools.length);
    assert.ok(result.programs.every((program) => program.name && program.tier && Number.isFinite(program.fit)));
    assert.equal((await getJourney(id)).flags.programsShown, true);
    await resetJourney(id);
  });
}

test('UI keeps tasks in Dashboard, gates Advisor rail, and uses explicit intents', () => {
  const root = process.cwd();
  const advisor = fs.readFileSync(path.join(root, 'src/components/candidate/Advisor.jsx'), 'utf8');
  const dashboard = fs.readFileSync(path.join(root, 'src/components/candidate/Dashboard.jsx'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
  const portal = fs.readFileSync(path.join(root, 'src/components/candidate/CandidatePortal.jsx'), 'utf8');
  assert.match(advisor, /adaptiveGradEnabled && isAdaptiveTrack\(currentTrack, profile, chat\)/);
  assert.match(advisor, /currentTrack === 'Undergraduate' \|\| currentTrack === 'Personal Development'/);
  assert.match(advisor, /Move me to the next step\./);
  assert.match(advisor, /Take me to \$\{stageLabels\[stage\]\}\./);
  assert.match(advisor, /steps=\{STEPS\}/);
  assert.match(advisor, /stageOrder\.map/);
  assert.match(advisor, /advisorDirective\?\.modal === 'upgradePivot'/);
  assert.match(dashboard, /<CardLabel>Tasks<\/CardLabel>/);
  assert.match(app, /useAdaptiveEndpoint \? '\/api\/agents\/orchestrate' : '\/api\/chat'/);
  assert.match(app, /data\.ui\?\.tab/);
  assert.match(app, /extra: \{ profile, scores, programs:/);
  assert.match(advisor, /upload a file/i);
  assert.match(advisor, /setShowCvModal\(true\)/);
  const analysis = fs.readFileSync(path.join(root, 'src/components/candidate/Analysis.jsx'), 'utf8');
  assert.match(analysis, /const hasData = !!scores \|\| hasPrograms/);
  assert.match(portal, /candTab === 'narrative'/);
  assert.match(portal, /<NarrativeStrategy/);
});
