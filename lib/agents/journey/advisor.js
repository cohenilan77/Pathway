import { createAnthropicClient } from '../../anthropic-client.js';
import { normalizeProgramList } from '../../program-normalizer.js';
import { computeFit } from '../../scoring.js';
import { getKpiPromptSummary } from '../../admissions-kpi.js';
import { buildJourneySystemPrompt } from './prompts.js';
import { getJourneyState, setJourneyState, advanceStage } from './state.js';
import { narrativeGateCheck } from './gate.js';
import { fetchBenchmark } from './tools/benchmarks.js';
import { checkRisk } from './tools/risk.js';
import { isLocked } from './tools/gates.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 8192;
const MAX_TOOL_ITERATIONS = 8;

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };

// Tool schemas exposed to the AI
const JOURNEY_TOOLS = [
  {
    name: 'parse_cv',
    description: 'Extract structured profile fields from raw CV text. Call this whenever the candidate pastes or uploads a CV.',
    input_schema: {
      type: 'object',
      required: ['cvText'],
      properties: {
        cvText: { type: 'string', description: 'Raw CV / resume text' },
      },
    },
  },
  {
    name: 'fetch_benchmark',
    description: 'Get real published median GPA and test score for a school/program. Always call this before scoring.',
    input_schema: {
      type: 'object',
      required: ['schoolName'],
      properties: {
        schoolName: { type: 'string' },
        programType: { type: 'string', description: 'e.g. MBA, MSc, PhD, LLM, MD' },
      },
    },
  },
  {
    name: 'score_profile',
    description: 'Compute fit score for a candidate against a school using real benchmark data.',
    input_schema: {
      type: 'object',
      required: ['schoolName', 'medianGPA'],
      properties: {
        schoolName: { type: 'string' },
        medianGPA: { type: 'number' },
        medianTest: { type: 'number' },
        benchmarkVerified: { type: 'boolean' },
        confidenceNote: { type: 'string' },
      },
    },
  },
  {
    name: 'check_risk',
    description: 'Run a risk analysis on a school. Returns risks and tasks. Call for each school in the portfolio.',
    input_schema: {
      type: 'object',
      required: ['schoolName'],
      properties: {
        schoolName: { type: 'string' },
        medianGPA: { type: 'number' },
        medianTest: { type: 'number' },
        benchmarkVerified: { type: 'boolean' },
      },
    },
  },
  {
    name: 'set_chosen_schools',
    description: 'Save the schools the candidate has confirmed for their portfolio. Also marks portfolioShown = true.',
    input_schema: {
      type: 'object',
      required: ['schools'],
      properties: {
        schools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of school names',
        },
      },
    },
  },
  {
    name: 'build_portfolio',
    description: 'Build a full portfolio: fetches benchmarks, scores each school, runs risk checks. Marks portfolioShown = true.',
    input_schema: {
      type: 'object',
      properties: {
        schools: {
          type: 'array',
          items: { type: 'string' },
          description: 'Schools to evaluate. Leave empty to use already chosen schools from state.',
        },
        programType: { type: 'string', description: 'e.g. MBA, MSc, PhD' },
      },
    },
  },
  {
    name: 'show_narrative_options',
    description: 'Present narrative strategy choices to the candidate. Blocked until portfolioShown is true.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'advance_stage',
    description: 'Move the journey to the next stage when the candidate has completed the current one.',
    input_schema: {
      type: 'object',
      required: ['stage'],
      properties: {
        stage: {
          type: 'string',
          enum: ['intake', 'profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'],
        },
      },
    },
  },
  {
    name: 'open_screen',
    description: 'Signal the frontend to open a specific tab or screen. Use instead of asking the candidate to navigate.',
    input_schema: {
      type: 'object',
      required: ['screen'],
      properties: {
        screen: {
          type: 'string',
          enum: ['analysis', 'portfolio', 'essays', 'narrative', 'universities', 'advisor'],
          description: 'Which screen/tab to open',
        },
      },
    },
  },
];

export class JourneyAdvisor {
  constructor() {
    this.client = createAnthropicClient();
  }

  // Resolve candidate from current journey state + frontend-provided profile
  buildCandidate(state, profile, scores) {
    const collected = state.collected || {};
    return {
      gpa: scores?.academic != null ? null : (collected.gpa ?? profile?.scores?.academic ?? null),
      testScore: collected.testScore ?? null,
      programType: state.category || profile?.category,
      track: (state.category || profile?.category || '').toLowerCase(),
      softScores: scores || {},
      collected,
      recommenders: collected.recommenders || [],
      careerGapFlagged: collected.careerGapFlagged || false,
    };
  }

  async handleToolUse(toolName, input, candidateId, state, candidate) {
    switch (toolName) {

      case 'parse_cv': {
        const text = input.cvText || '';
        const extracted = {
          cvText: text.slice(0, 200),
          hasCV: true,
          parsedAt: new Date().toISOString(),
        };
        // Extract basic fields heuristically so state is updated immediately
        const gpaMatch = text.match(/GPA[:\s]+([0-9.]+)/i);
        const gmatMatch = text.match(/GMAT[:\s]+([0-9]+)/i);
        const greMatch = text.match(/GRE[:\s]+([0-9]+)/i);
        if (gpaMatch) extracted.gpa = parseFloat(gpaMatch[1]);
        if (gmatMatch) extracted.testScore = parseInt(gmatMatch[1]);
        if (greMatch && !extracted.testScore) extracted.testScore = parseInt(greMatch[1]);
        await setJourneyState(candidateId, { collected: { ...state.collected, ...extracted } });
        return { ok: true, extracted };
      }

      case 'fetch_benchmark': {
        const result = await fetchBenchmark(input.schoolName, input.programType);
        return result;
      }

      case 'score_profile': {
        const medianGPA = input.medianGPA ?? null;
        const medianTest = input.medianTest ?? null;
        if (!medianGPA) return { fit: null, tier: null, locked: false, confidenceNote: 'No median GPA available' };
        const result = computeFit(candidate, { medianGPA, medianTest });
        const verified = input.benchmarkVerified !== false;
        return {
          ...(result || { fit: null, tier: null }),
          locked: result ? result.tier === 'locked' : isLocked(candidate.gpa, candidate.testScore, medianGPA, medianTest),
          confidenceNote: !verified ? input.confidenceNote || 'Benchmark not verified' : null,
        };
      }

      case 'check_risk': {
        const benchmark = {
          medianGPA: input.medianGPA ?? null,
          medianTest: input.medianTest ?? null,
          verified: input.benchmarkVerified !== false,
        };
        const result = checkRisk(candidate, input.schoolName, benchmark);
        // Surface tasks back into journey state so they survive the conversation
        if (result.tasks?.length) {
          const existing = state.collected.pendingTasks || [];
          const merged = [...new Set([...existing, ...result.tasks])];
          await setJourneyState(candidateId, { collected: { ...state.collected, pendingTasks: merged } });
        }
        return result;
      }

      case 'set_chosen_schools': {
        const schools = input.schools || [];
        await setJourneyState(candidateId, { chosenSchools: schools, portfolioShown: true });
        return { ok: true, schools };
      }

      case 'build_portfolio': {
        const schools = input.schools?.length ? input.schools : (state.chosenSchools || []);
        const programType = input.programType || state.category;
        const results = [];
        for (const school of schools) {
          const benchmark = await fetchBenchmark(school, programType);
          const scoreResult = computeFit(candidate, { medianGPA: benchmark.medianGPA, medianTest: benchmark.medianTest });
          const riskResult = checkRisk(candidate, school, benchmark);
          const program = {
            name: school,
            admitRate: null,
            admitRateSource: null,
            fit: scoreResult?.fit ?? null,
            tier: scoreResult?.tier ?? null,
            locked: scoreResult?.tier === 'locked',
            confidenceNote: benchmark.confidenceNote || null,
            verified: benchmark.verified,
            medianGPA: benchmark.medianGPA,
            medianTest: benchmark.medianTest,
            testName: benchmark.testName,
            risks: riskResult.risks,
            riskTasks: riskResult.tasks,
          };
          results.push(program);
        }
        const normalized = normalizeProgramList(results) || results;
        if (results.length) {
          const allTasks = results.flatMap((r) => r.riskTasks || []);
          const existing = state.collected.pendingTasks || [];
          const merged = [...new Set([...existing, ...allTasks])];
          await setJourneyState(candidateId, { portfolio: normalized, portfolioShown: true, collected: { ...state.collected, pendingTasks: merged } });
        }
        return { schools: results };
      }

      case 'show_narrative_options': {
        const gate = narrativeGateCheck(state);
        if (!gate.allowed) return { ok: false, reason: gate.reason };
        return {
          ok: true,
          options: [
            { key: 'upgrade', label: 'The Upgrade', risk: 'lower', description: 'Build on your current trajectory and frame your experience as a natural step forward.' },
            { key: 'pivot', label: 'The Pivot', risk: 'higher', description: 'Reframe your story around a deliberate change in direction.' },
          ],
        };
      }

      case 'advance_stage': {
        const next = await advanceStage(candidateId, input.stage);
        return { ok: true, stage: next.stage };
      }

      case 'open_screen': {
        return { ok: true, screen: input.screen };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  async chat(messages, { candidateId, profile, scores, kpiSummary } = {}) {
    const state = await getJourneyState(candidateId);
    const candidate = this.buildCandidate(state, profile, scores);
    const systemPrompt = buildJourneySystemPrompt(state, kpiSummary);

    const params = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
      tools: [...JOURNEY_TOOLS, WEB_SEARCH_TOOL],
    };

    let openScreen = null;
    let history = [...messages];
    let iterations = 0;
    let response;

    while (iterations < MAX_TOOL_ITERATIONS) {
      response = await this.client.messages.create(params.tools
        ? { ...params, messages: history }
        : { ...params, messages: history });
      iterations++;

      const toolUses = (response.content || []).filter((b) => b.type === 'tool_use');
      if (response.stop_reason !== 'tool_use' || !toolUses.length) break;

      history.push({ role: 'assistant', content: response.content });

      const refreshedState = await getJourneyState(candidateId);
      const toolResults = await Promise.all(
        toolUses.map(async (tu) => {
          const result = await this.handleToolUse(tu.name, tu.input, candidateId, refreshedState, candidate).catch((err) => ({ error: err.message }));
          if (tu.name === 'open_screen' && result?.screen) openScreen = result.screen;
          return {
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          };
        })
      );
      history.push({ role: 'user', content: toolResults });
    }

    const raw = (response?.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim() || 'I was unable to generate a response. Please try again.';

    // Refresh state to get latest stage after any advance_stage calls
    const finalState = await getJourneyState(candidateId);

    return {
      raw,
      openScreen,
      journeyStage: finalState.stage,
      pendingTasks: finalState.collected?.pendingTasks || [],
      usage: response?.usage,
    };
  }
}
