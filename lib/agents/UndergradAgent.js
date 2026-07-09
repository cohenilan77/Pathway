// UndergradAgent: flag-gated (UNDERGRAD_SMART_AGENT) replacement for
// UndergradMasterAgent's 13-agent, deterministic-topic-picker roster (see
// lib/agents/UndergradMasterAgent.js). One agentic loop, free to choose its
// own topic each turn from the whole candidate state via tools, instead of
// a server-side stage tracker forcing the topic and a voice-only agent
// phrasing it.
//
// Wired in behind the flag in lib/hybrid-coordinator.js; UndergradMasterAgent
// remains the default path until the flag is turned on.
import { BaseAgent } from './BaseAgent.js';
import { formatOptionsAsArrowPipe } from './tools/respond-with-options.js';
import { UNDERGRAD_TOOLS, executeUndergradTool } from './tools/undergrad-tools.js';
import { ensureUndergradState } from '../undergrad/store.js';
import { pushTopic } from '../undergrad/stage-tracker.js';
import { monthlyReport } from '../undergrad/agents/report-agent.js';

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };
const MAX_ITERATIONS = 6;

const FALLBACK_MESSAGE = "Let's keep going — tell me a bit more, or pick what fits best.";
const FALLBACK_OPTIONS = ['Tell me more', 'Not sure', 'Skip for now'];

export const DEFAULT_UNDERGRAD_PROMPT = `You are Pathway's undergraduate advisor — a long-term companion for a high school student (grades 9–12) preparing for university. You will know this student for years. Your job each turn: move them ONE concrete step forward, keep it light, and SAVE everything factual immediately.

== PHASES (read grade from state; priorities shift, agent does not) ==
Grade 9–10 (Discovery): explore interests, deepen 2–3 activities, surface a subject passion, collect early story material. Do NOT push testing or university lists unprompted.
Grade 11 (Build): SAT/ACT plan and dates, university list forming (reach/target/likely), convert activity depth into leadership, teacher relationships for future recommendations.
Grade 12 (Execute): applications, essays, deadlines, recommendations. Task-completion tone. Momentum over exploration.

== AREAS YOU COVER (jump freely; never force; never read as a script) ==
Profile · Activities & Leadership · Opportunities · Roadmap · Testing · Academic Strength · Major Direction · University List · Portfolio Evidence · Essay & Story Bank · Applications · Progress

== BEHAVIOR RULES ==
1. SAVE FIRST: any fact the student mentions (activity, interest, grade, test date, school name, story moment) → call the matching save tool in the same turn, before replying. If the tool says "already saved", do not ask about it again.
2. NEVER ASK TWICE: check get_candidate_state / lastTopics before asking. A recently covered area is off-limits unless the student raises it.
3. GROUND, DON'T GUESS: school facts, admit rates, deadlines, test dates → lookup_school_data first, web_search if not found. Every school you save must carry selectivitySource. Never invent numbers.
4. TONE: friend, not counselor. 2–3 sentences max in chat. One question max. Match their energy — brief kid gets brief reply. If conversationTurnsToday is high, wrap up, open nothing new.
5. FREE BUT NOT LOST: you choose the topic each turn based on the whole state — the student's message wins over your agenda. If they tangent, follow it, save what's useful, gently land back on a next step.
6. ALWAYS END with end_turn_response. Options: 2–4 specific choices tied to THIS student when asking; empty when giving a substantive answer they asked for.
7. PROGRESS: when something meaningful changed (new activity depth, test plan set, list started, essay material added), call save_progress_snapshot so consultants and parents see movement.
8. NEVER expose internal ids, scores mechanics, or "behind for phase" judgments to the student. Encouragement only; gaps become next steps.
9. If a CONSULTANT INSTRUCTION is present in state, follow it as a priority steer without breaking rule 4.

== READINESS SIGNALS (for snapshots, consultant-facing, never said to kid) ==
9–10 exit: 2+ sustained activities, one subject passion named.
11 exit: test plan underway, university list started (≥5 schools tiered).
12 exit: applications drafted, essays in progress, recommenders identified.`;

// conversationHistory entries use the app's { role: 'ai'|'user', text } shape
// (same convention BaseUndergradAgent/AdvisorAgent already normalize).
function toAnthropicMessages(conversationHistory, message) {
  const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
  const historyMessages = rawHistory
    .filter(entry => entry?.role !== 'system' && entry?.text && entry.text !== '__idle_checkin__')
    .map(entry => ({ role: entry.role === 'ai' ? 'assistant' : 'user', content: entry.text }));
  const lastEntry = historyMessages[historyMessages.length - 1];
  const alreadyIncludesMessage = !!message && lastEntry?.role === 'user' && lastEntry.content === message;
  return (message && !alreadyIncludesMessage)
    ? [...historyMessages, { role: 'user', content: message }]
    : historyMessages;
}

export class UndergradAgent extends BaseAgent {
  constructor() {
    super({ name: 'UndergradMaster', systemPrompt: DEFAULT_UNDERGRAD_PROMPT, model: 'claude-sonnet-4-6', maxTokens: 4096 });
  }

  async handle(candidateId, message, { conversationHistory = [], candidateState = {}, surface = 'chat' } = {}) {
    const startedAt = Date.now();
    const profile = candidateState.profile || {};
    const lastTopics = Array.isArray(profile.undergradStageTracker?.lastTopics)
      ? profile.undergradStageTracker.lastTopics.slice(-5)
      : [];

    const history = toAnthropicMessages(conversationHistory, message);
    if (!history.length || history[history.length - 1].role !== 'user') {
      return {
        agent: 'UndergradAgent',
        message: '',
        statePatch: {},
        metadata: {
          routerSource: 'undergrad_smart_agent', routedAgent: 'UndergradAgent', executionPlan: ['UndergradAgent'],
          primaryAgent: 'UndergradAgent', synthesisAgent: null, finalAgent: 'UndergradAgent',
          fallbackUsed: false, latencyMs: Date.now() - startedAt, toolCalls: [], usage: null, model: null,
        },
      };
    }

    const context = {
      grade: profile.grade || null,
      pathwayType: profile.pathwayType || null,
      lastTopics,
      surface,
      consultantInstruction: profile.consultantNotes?.aiInstruction || null,
    };

    const ctx = {
      candidateId,
      surface,
      now: startedAt,
      workingProfile: { ...profile },
      workingUndergrad: ensureUndergradState(candidateState.undergrad, candidateId),
      workingPrograms: Array.isArray(candidateState.programs) ? [...candidateState.programs] : [],
      primaryArea: null,
      undergradDirty: false,
      programsDirty: false,
    };

    const tools = [...UNDERGRAD_TOOLS, WEB_SEARCH_TOOL];
    const toolCalls = [];
    let terminal = null;
    let lastResult = null;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS && !terminal) {
      lastResult = await this.execute(history, { tools, context });
      iterations++;

      if (lastResult.stopReason !== 'tool_use' || !lastResult.toolUses.length) break;

      history.push({ role: 'assistant', content: lastResult.raw.content });
      const toolResults = [];
      for (const toolUse of lastResult.toolUses) {
        toolCalls.push(toolUse.name);
        // eslint-disable-next-line no-await-in-loop
        const output = await executeUndergradTool(candidateId, toolUse, ctx);
        if (output?.terminal) terminal = output;
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(output?.terminal ? { status: 'ok' } : output) });
      }
      history.push({ role: 'user', content: toolResults });
    }

    const fallbackUsed = !terminal;
    const finalMessage = terminal?.message || lastResult?.text || FALLBACK_MESSAGE;
    const finalOptions = terminal ? terminal.options : FALLBACK_OPTIONS;

    const statePatch = {
      profile: {
        ...ctx.workingProfile,
        undergradStageTracker: { lastTopics: pushTopic(lastTopics, `smart_turn:${ctx.primaryArea || 'general'}`) },
      },
    };
    if (ctx.undergradDirty) statePatch.undergrad = ctx.workingUndergrad;
    if (ctx.programsDirty) statePatch.programs = ctx.workingPrograms;

    return {
      agent: 'UndergradAgent',
      message: formatOptionsAsArrowPipe({ message: finalMessage, options: finalOptions }),
      statePatch,
      metadata: {
        routerSource: 'undergrad_smart_agent',
        routedAgent: 'UndergradAgent',
        executionPlan: ['UndergradAgent'],
        primaryAgent: 'UndergradAgent',
        synthesisAgent: null,
        finalAgent: 'UndergradAgent',
        fallbackUsed,
        latencyMs: Date.now() - startedAt,
        toolCalls,
        usage: lastResult?.usage || null,
        model: lastResult?.raw?.model || null,
      },
    };
  }

  // Non-chat: a markdown progress report for parents/consultants. Reuses the
  // same monthlyReport() aggregation the control tower's
  // candidateMonthlyReport() calls, and lets the model narrate it in prose
  // rather than re-deriving the underlying numbers itself.
  async generateParentReport(candidateId, candidateState = {}) {
    const undergrad = ensureUndergradState(candidateState.undergrad, candidateId);
    const report = monthlyReport(undergrad, { candidateName: candidateState.profile?.name || '' });
    const result = await this.execute(
      [{ role: 'user', content: `Write a short, warm monthly progress report for this student's parent, in markdown, from this data:\n\n${JSON.stringify(report)}` }],
      { context: {} },
    );
    return result.text;
  }
}
