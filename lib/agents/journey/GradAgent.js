import { BaseAgent } from '../BaseAgent.js';
import { ProfileAgent } from '../sub/ProfileAgent.js';
import { EssayAgent } from '../sub/EssayAgent.js';
import { InterviewAgent } from '../sub/InterviewAgent.js';
import { SimulationAgent } from '../sub/SimulationAgent.js';
import { computeFit } from '../../scoring.js';
import { normalizeProgramList } from '../../program-normalizer.js';
import { buildJourneySystemPrompt } from './prompts.js';
import { getJourney, patchJourney, advanceJourneyStage } from './state.js';
import { narrativeGateCheck } from './gate.js';
import { get_benchmarks } from './tools/benchmarks.js';
import { assess_risk } from './tools/risk.js';
import { applyHardGates } from './tools/gates.js';

const TOOLS = [
  ['read_state', 'Read the current candidate journey state.', {}],
  ['write_state', 'Deep merge collected facts or flags into journey state.', { patch: { type: 'object' } }],
  ['parse_cv', 'Parse a pasted CV and save facts. Do not re-ask facts found here.', { cvText: { type: 'string' } }],
  ['score_profile', 'Score one school only after fetching its benchmarks.', { school: { type: 'string' }, programType: { type: 'string' } }],
  ['build_portfolio', 'Build and show the verified school portfolio.', { schools: { type: 'array', items: { type: 'string' } }, programType: { type: 'string' } }],
  ['set_chosen_schools', 'Save the candidate selected schools.', { schools: { type: 'array', items: { type: 'string' } } }],
  ['present_narrative_options', 'Show Upgrade and Pivot choices. Refuses until programs were shown.', {}],
  ['craft_narrative', 'Craft the chosen narrative.', { choice: { type: 'string', enum: ['upgrade', 'pivot'] } }],
  ['optimize_cv', 'Improve the candidate CV for the chosen schools.', { cvText: { type: 'string' } }],
  ['workshop_essay', 'Review or develop an admissions essay.', { essay: { type: 'string' }, prompt: { type: 'string' }, school: { type: 'string' } }],
  ['run_mock_interview', 'Start a mock interview.', { school: { type: 'string' }, questionType: { type: 'string' } }],
  ['predict_odds', 'Predict honest probability ranges for selected schools.', { schools: { type: 'array', items: { type: 'string' } } }],
  ['advance_stage', 'Advance the journey stage.', { stage: { type: 'string', enum: ['profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'] } }],
  ['emit_ui', 'Explicitly open a candidate tab or modal.', { blocks: { type: 'array', items: { type: 'string' } }, tab: { type: 'string', enum: ['analysis', 'universities', 'narrative'] }, modal: { type: 'string', enum: ['upgradePivot'] } }],
].map(([name, description, properties]) => ({
  name,
  description,
  input_schema: { type: 'object', properties, ...(Object.keys(properties).length ? {} : { additionalProperties: false }) },
}));

function parseJson(text) {
  try {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

const clampScore = (value) => Math.max(25, Math.min(95, Math.round(value)));

function numericValue(...values) {
  for (const value of values) {
    const match = String(value ?? '').match(/\d+(?:\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return null;
}

function hasProfileEvidence(collected, pattern) {
  return pattern.test(JSON.stringify(collected || {}).toLowerCase());
}

export function deriveProfileScores(journey, profile = {}) {
  const collected = { ...(profile || {}), ...(journey?.collected || {}) };
  const category = `${journey?.category || ''} ${journey?.subtype || ''} ${profile?.degree || ''}`.toLowerCase();
  const gpa = numericValue(collected.gpa, collected.GPA);
  const test = numericValue(collected.testScore, collected.gmat, collected.gre, collected.GMAT, collected.GRE);
  const experience = numericValue(collected.yearsExperience, collected.workExperience, collected.experience);
  const academic = gpa == null ? 55 : clampScore(gpa * 25);
  const testScore = test == null
    ? 55
    : clampScore(test > 500 ? 45 + ((test - 550) / 200) * 50 : 45 + ((test - 295) / 40) * 50);
  const leadership = hasProfileEvidence(collected, /lead|manage|direct|captain|found|owner|command/) ? 76 : 55;
  const narrative = hasProfileEvidence(collected, /goal|target|career|research direction|why/) ? 70 : 50;
  const recommenders = hasProfileEvidence(collected, /recommender|recommendation|supervisor|professor|manager/) ? 72 : 40;

  if (/phd|doctoral|doctorate/.test(category)) {
    return {
      academic,
      research: hasProfileEvidence(collected, /research|thesis|lab|method/) ? 78 : 48,
      publications: hasProfileEvidence(collected, /publication|paper|journal|conference|poster/) ? 74 : 42,
      facultyFit: hasProfileEvidence(collected, /faculty|supervisor|professor|lab/) ? 70 : 42,
      potential: clampScore((academic + leadership) / 2),
      narrative,
      recommenders,
      goalClarity: narrative,
    };
  }

  if (/mba/.test(category)) {
    const professional = experience == null
      ? (hasProfileEvidence(collected, /work|role|company|employment/) ? 68 : 52)
      : clampScore(50 + experience * 7);
    return {
      professional,
      leadership,
      careerProgression: hasProfileEvidence(collected, /promot|progress|increas|senior/) ? 74 : 56,
      internationalExposure: hasProfileEvidence(collected, /international|global|countr|language|cross-border/) ? 72 : 50,
      testScore,
      academic,
      narrative,
      goalClarity: narrative,
      recommenders,
    };
  }

  return {
    academic,
    professional: experience == null ? 58 : clampScore(50 + experience * 7),
    leadership,
    research: hasProfileEvidence(collected, /research|thesis|project/) ? 72 : 48,
    testScore,
    narrative,
    goalClarity: narrative,
    recommenders,
  };
}

export class GradAgent extends BaseAgent {
  constructor({ profileAgent, essayAgent, interviewAgent, simulationAgent, benchmarkProvider, riskProvider } = {}) {
    super({ name: 'GradAgent', systemPrompt: buildJourneySystemPrompt(null), model: 'claude-haiku-4-5-20251001', maxTokens: 8192 });
    this.profileAgent = profileAgent || new ProfileAgent();
    this.essayAgent = essayAgent || new EssayAgent();
    this.interviewAgent = interviewAgent || new InterviewAgent();
    this.simulationAgent = simulationAgent || new SimulationAgent();
    this.benchmarkProvider = benchmarkProvider || get_benchmarks;
    this.riskProvider = riskProvider || assess_risk;
    this.runtime = null;
  }

  candidateFrom(journey, profile = {}, scores = {}) {
    const collected = journey.collected || {};
    return {
      gpa: collected.gpa ?? profile.gpa ?? profile.GPA ?? null,
      testScore: collected.testScore ?? collected.gmat ?? collected.gre ?? profile.testScore ?? null,
      programType: journey.subtype || profile.degree || journey.category,
      track: /phd|doctoral/i.test(journey.category || profile.degree || '') ? 'phd' : 'mba',
      softScores: scores || {},
      collected,
      recommenders: collected.recommenders || [],
      careerGapFlagged: collected.careerGapFlagged === true,
    };
  }

  async executeJourneyLoop(messages, maxIterations = 8) {
    const history = [...messages];
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const result = await this.execute(history, { tools: TOOLS });
      if (result.stopReason !== 'tool_use' || !result.toolUses.length) return { ...result, history };
      history.push({ role: 'assistant', content: result.raw.content });
      const toolResults = [];
      for (const toolUse of result.toolUses) {
        const output = await this.handleToolUse(toolUse);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: typeof output === 'string' ? output : JSON.stringify(output),
        });
      }
      history.push({ role: 'user', content: toolResults });
    }
    return this.execute(history, { tools: TOOLS });
  }

  async handleToolUse(toolUse) {
    const { candidateId, profile, scores } = this.runtime;
    const input = toolUse.input || {};
    const journey = await getJourney(candidateId);
    const candidate = this.candidateFrom(journey, profile, scores);
    this.runtime.toolCalls.push(toolUse.name);

    if (toolUse.name === 'read_state') return journey;
    if (toolUse.name === 'write_state') return patchJourney(candidateId, input.patch || {});

    if (toolUse.name === 'parse_cv') {
      const parsed = await this.profileAgent.parse(candidateId, input.cvText || '');
      const extracted = parseJson(parsed?.text);
      await patchJourney(candidateId, {
        name: extracted.name || journey.name,
        collected: { ...extracted, cvText: input.cvText, hasCV: true },
        flags: { profileConfirmed: true, stage: 'profile' },
      });
      return { ok: true, collected: extracted };
    }

    if (toolUse.name === 'score_profile') {
      const benchmark = await this.benchmarkProvider(input.school, input.programType || candidate.programType);
      const scored = computeFit(candidate, benchmark);
      const program = applyHardGates({
        name: input.school,
        fit: scored?.fit ?? null,
        fitRange: benchmark.verified ? null : 'Benchmark unavailable, fit is a range',
        tier: scored?.tier ?? null,
        candidateGPA: candidate.gpa,
        candidateTest: candidate.testScore,
        medianGPA: benchmark.medianGPA,
        medianTest: benchmark.medianTest,
        confidence: benchmark.verified ? 'high' : 'low',
        selectivitySource: benchmark.source || null,
      });
      await patchJourney(candidateId, {
        collected: { schoolScores: { ...(journey.collected.schoolScores || {}), [input.school]: program } },
        flags: { scoresEmitted: true, stage: 'analysis' },
      });
      return program;
    }

    if (toolUse.name === 'set_chosen_schools') {
      return patchJourney(candidateId, { flags: { chosenSchools: input.schools || [] } });
    }

    if (toolUse.name === 'build_portfolio') {
      const schools = input.schools?.length ? input.schools : journey.flags.chosenSchools;
      const programs = [];
      const tasks = [];
      for (const school of schools || []) {
        const benchmark = await this.benchmarkProvider(school, input.programType || candidate.programType);
        const score = computeFit(candidate, benchmark);
        const risk = await this.riskProvider(candidateId, school, { candidate, benchmark });
        tasks.push(...(risk.tasks || []));
        programs.push(applyHardGates({
          name: school,
          fit: score?.fit ?? null,
          fitRange: benchmark.verified ? null : 'Low confidence range',
          tier: score?.tier ?? null,
          candidateGPA: candidate.gpa,
          candidateTest: candidate.testScore,
          medianGPA: benchmark.medianGPA,
          medianTest: benchmark.medianTest,
          confidence: benchmark.verified ? 'high' : 'low',
          selectivitySource: benchmark.source || null,
          riskFlags: risk.riskFlags || [],
          risks: risk.risks || [],
        }));
      }
      const normalizedBase = normalizeProgramList(programs) || programs;
      const normalized = normalizedBase.map((program, index) => applyHardGates({
        ...program,
        confidence: programs[index]?.confidence,
        selectivitySource: programs[index]?.selectivitySource,
        riskFlags: programs[index]?.riskFlags || [],
        risks: programs[index]?.risks || [],
        candidateGPA: programs[index]?.candidateGPA,
        candidateTest: programs[index]?.candidateTest,
        medianGPA: programs[index]?.medianGPA,
        medianTest: programs[index]?.medianTest,
      }));
      await patchJourney(candidateId, {
        collected: { portfolio: normalized, pendingTasks: [...new Set(tasks)] },
        flags: { programsShown: true, chosenSchools: schools || [], stage: 'portfolio' },
      });
      return { programs: normalized, tasks: [...new Set(tasks)] };
    }

    if (toolUse.name === 'present_narrative_options') {
      const gate = narrativeGateCheck(journey);
      if (!gate.allowed) return { ok: false, reason: gate.reason };
      this.runtime.ui = { ...this.runtime.ui, modal: 'upgradePivot' };
      return { ok: true, options: ['Upgrade', 'Pivot'] };
    }

    if (toolUse.name === 'craft_narrative') {
      const gate = narrativeGateCheck(journey);
      if (!gate.allowed) return { ok: false, reason: gate.reason };
      await patchJourney(candidateId, { flags: { narrativeChoice: input.choice, stage: 'narrative' } });
      return { ok: true, choice: input.choice };
    }

    if (toolUse.name === 'optimize_cv') {
      const result = await this.profileAgent.parse(candidateId, input.cvText || journey.collected.cvText || '');
      return { ok: true, result: result?.text || '' };
    }

    if (toolUse.name === 'workshop_essay') return this.essayAgent.review(input.essay || '', input.prompt || '', input.school || '');
    if (toolUse.name === 'run_mock_interview') return this.interviewAgent.startMock(candidateId, input.school, input.questionType);
    if (toolUse.name === 'predict_odds') return this.simulationAgent.predictOutcomes(candidateId, input.schools || journey.flags.chosenSchools);

    if (toolUse.name === 'advance_stage') return advanceJourneyStage(candidateId, input.stage);
    if (toolUse.name === 'emit_ui') {
      this.runtime.ui = { blocks: input.blocks || [], tab: input.tab || null, modal: input.modal || null };
      return { ok: true, ...this.runtime.ui };
    }
    return super.handleToolUse(toolUse);
  }

  async chat(candidateId, message, { conversationHistory = [], profile = {}, scores = {}, programs = [], kpiSummary = '' } = {}) {
    const journey = await getJourney(candidateId);
    this.systemPrompt = buildJourneySystemPrompt(journey, kpiSummary);
    this.runtime = { candidateId, profile, scores, programs, ui: {}, toolCalls: [] };
    const messages = conversationHistory
      .filter((item) => item?.role === 'user' || item?.role === 'assistant' || item?.role === 'ai')
      .map((item) => ({ role: item.role === 'ai' ? 'assistant' : item.role, content: item.content || item.text || '' }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') messages.push({ role: 'user', content: message });
    const result = await this.executeJourneyLoop(messages, 8);
    let finalJourney = await getJourney(candidateId);

    // The model sometimes saves a candidate's school choices without following up
    // with build_portfolio. That advances the journey in Redis but leaves the web
    // client with no PROGRAMS block to render. Close that gap deterministically.
    if (this.runtime.toolCalls.includes('set_chosen_schools') && finalJourney.flags.chosenSchools?.length) {
      const selected = finalJourney.flags.chosenSchools;
      const saved = finalJourney.collected.portfolio || [];
      const savedNames = new Set(saved.map((program) => program?.name).filter(Boolean));
      const portfolioIsStale = selected.length !== savedNames.size || selected.some((school) => !savedNames.has(school));
      if (!finalJourney.flags.programsShown || portfolioIsStale) {
        await this.handleToolUse({
          name: 'build_portfolio',
          input: { schools: selected, programType: finalJourney.subtype || profile.degree || finalJourney.category },
        });
        finalJourney = await getJourney(candidateId);
      }
    }

    let text = String(result.text || '').replace(/—/g, ',');
    const blocks = [];
    const clientHasScores = scores && Object.keys(scores).length > 0;
    const hasProfileForScoring = finalJourney.flags.profileConfirmed
      || finalJourney.collected.hasCV
      || finalJourney.collected.gpa != null
      || finalJourney.collected.testScore != null
      || finalJourney.collected.gmat != null
      || finalJourney.collected.gre != null;
    if (!clientHasScores && hasProfileForScoring && !text.includes('<SCORES>')) {
      blocks.push(`<SCORES>${JSON.stringify(deriveProfileScores(finalJourney, profile))}</SCORES>`);
    }
    const clientHasPrograms = Array.isArray(programs) && programs.length > 0;
    const missingDataReport = /(?:don'?t|do not|can'?t|cannot)\s+(?:see|find)|(?:empty|blank|nothing)\s+(?:in|on)|no\s+(?:schools|programs|analysis)/i.test(message || '');
    const shouldSyncPortfolio = this.runtime.toolCalls.includes('build_portfolio') || !clientHasPrograms || missingDataReport;
    if (shouldSyncPortfolio && finalJourney.collected.portfolio?.length && !text.includes('<PROGRAMS>')) {
      blocks.push(`<PROGRAMS>${JSON.stringify(finalJourney.collected.portfolio)}</PROGRAMS>`);
    }
    if (finalJourney.collected.pendingTasks?.length && !text.includes('<TASKS>')) {
      blocks.push(`<TASKS>${JSON.stringify(finalJourney.collected.pendingTasks)}</TASKS>`);
    }
    if (blocks.length) text = `${blocks.join('')}\n${text}`;
    return {
      text,
      raw: text,
      usage: result.usage,
      toolUses: this.runtime.toolCalls,
      journey: finalJourney,
      journeyStage: finalJourney.flags.stage,
      pendingTasks: finalJourney.collected.pendingTasks || [],
      ui: this.runtime.ui,
    };
  }
}
