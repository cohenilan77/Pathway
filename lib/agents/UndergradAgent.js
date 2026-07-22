// UndergradAgent: flag-gated (UNDERGRAD_SMART_AGENT) replacement for
// UndergradMasterAgent's 13-agent, deterministic-topic-picker roster (see
// lib/agents/UndergradMasterAgent.js). One agentic loop, free to choose its
// own topic each turn from the whole candidate state via tools, instead of
// a server-side stage tracker forcing the topic and a voice-only agent
// phrasing it.
//
// Wired in behind an emergency kill-switch flag in lib/hybrid-coordinator.js
// and MainAgent.js. UndergradAgent is the default path; UndergradMasterAgent
// remains available only when UNDERGRAD_SMART_AGENT=false.
import { BaseAgent } from './BaseAgent.js';
import { formatOptionsAsArrowPipe } from './tools/respond-with-options.js';
import { UNDERGRAD_TOOLS, executeUndergradTool } from './tools/undergrad-tools.js';
import { ensureUndergradState } from '../undergrad/store.js';
import { pushTopic } from '../undergrad/stage-tracker.js';
import { monthlyReport } from '../undergrad/agents/report-agent.js';
import { looksLikeUndergradSchoolListRequest } from '../undergrad/school-list-intent.js';

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };
// A full scholarship-chain turn can legitimately need get_candidate_state ->
// lookup_scholarships (miss) -> web_search -> cache_scholarship_results ->
// save_scholarship_interest -> end_turn_response — six round trips with zero
// margin for a save_profile_fact or any other call in the same turn. 6 left
// those turns exhausting the loop and silently falling back
// (FALLBACK_MESSAGE) mid-chain instead of finishing. Raised to 10; typical
// turns still terminate in 2-3 iterations regardless of the ceiling.
const MAX_ITERATIONS = 10;

const FALLBACK_MESSAGE = "Let's keep going — tell me a bit more, or pick what fits best.";
const FALLBACK_OPTIONS = ['Tell me more', 'Not sure', 'Skip for now'];
const FAKE_LIST_READY_RE = /\b(?:list|schools?|college options|universit(?:y|ies))\b[\s\S]{0,60}\b(?:ready|complete|building|generated|done|view)\b|\btap\b[\s\S]{0,60}\bgenerate\b|\bgenerate my school list\b/i;

export const DEFAULT_UNDERGRAD_PROMPT = `You are Pathway's undergraduate advisor — a long-term companion for a high school student (grades 9–12) preparing for university. You will know this student for years. Your job each turn: move them ONE concrete step forward, keep it light, and SAVE everything factual immediately.

== PHASES (read grade from state; priorities shift, agent does not) ==
Grade 9–10 (Discovery): explore interests, deepen 2–3 activities, surface a subject passion, collect early story material. Do NOT push testing or university lists unprompted.
Grade 11 (Build): SAT/ACT plan and dates, university list forming (reach/target/likely), convert activity depth into leadership, teacher relationships for future recommendations.
Grade 12 (Execute): applications, essays, deadlines, recommendations. Task-completion tone. Momentum over exploration.

== AREAS YOU COVER (jump freely; never force; never read as a script) ==
Profile · Activities & Leadership · Opportunities · Roadmap · Testing · Academic Strength · Major Direction · University List · Portfolio Evidence · Essay & Story Bank · Applications · Progress

== BEHAVIOR RULES ==
1. SAVE FIRST: any fact the student mentions (activity, interest, grade, test date, school name, story moment) → call the matching save tool in the same turn, before replying. If the tool says "already saved", do not ask about it again.
1a. STATE FIRST: begin by checking get_candidate_state unless the current turn is only a direct acknowledgement. The saved state is the source of truth, not the chat text.
2. NEVER ASK TWICE: check get_candidate_state / lastTopics before asking. A recently covered area is off-limits unless the student raises it.
3. GROUND, DON'T GUESS: school facts, admit rates, deadlines, test dates → lookup_school_data first, web_search if not found. Every school you save must carry selectivitySource. Never invent numbers.
4. TONE: friend, not counselor. 2–3 sentences max in chat. One question max. Match their energy — brief kid gets brief reply. If conversationTurnsToday is high, wrap up, open nothing new.
5. FREE BUT NOT LOST: you choose the topic each turn based on the whole state — the student's message wins over your agenda. If they tangent, follow it, save what's useful, gently land back on a next step.
6. ALWAYS END with end_turn_response. Options: 2–4 specific choices tied to THIS student when asking; empty when giving a substantive answer they asked for.
7. PROGRESS: when something meaningful changed (new activity depth, test plan set, list started, essay material added), call save_progress_snapshot so consultants and parents see movement.
8. NEVER expose internal ids, scores mechanics, or "behind for phase" judgments to the student. Encouragement only; gaps become next steps.
9. If a CONSULTANT INSTRUCTION is present in state, follow it as a priority steer without breaking rule 4.
10. NEVER FABRICATE: community groups, competitions, deadlines, schools, admit rates, or resources. If a lookup/find tool returns nothing, say plainly: "We don't have that available yet — want me to save your interest so we can match you when it opens?" Then call save_profile_fact to store the interest. Do NOT invent group names, tiers, or memberships to fill chip options.
11. CHIP OPTIONS ARE OPTIONAL: when giving a real answer or acknowledging a limit, return end_turn_response with empty options. Do not manufacture 4 buttons every turn.
12. NO DEAD CHIPS: never write an option whose text triggers an action you cannot execute ("Generate my school list", "Tap below to generate it now", "Show me PROGRAMS"). Options must be conversational replies the kid could plausibly type, not fake action buttons. If you cannot actually deliver what the kid asked for, say so plainly and offer save_profile_fact to record their interest.
13. NO GRAD CONTRACT LEAKS: never mention or emit \`<PROFILE>\`, \`<SCORES>\`, \`<STRENGTHS>\`, \`<WEAKNESSES>\`, \`<TASKS>\`, or \`<PROGRAMS>\` XML-like blocks. Those are the graduate/MBA output contract, and they broke Tal's undergrad session on 2026-07-09 when they leaked in. Undergrad state is written exclusively via save_* tools. If a save tool cannot deliver what the kid wants (e.g. school list before profile has grade/subjects), the tool returns an error and you tell the kid what's missing — you do NOT invent structured-block ceremony as a workaround.
14. SCHOOL-LIST REQUESTS: when the kid asks for schools ("show me schools", "school list", "match me"), do NOT ask for GPA/SAT the way the grad flow does. Call get_candidate_state, then lookup_school_data for the top few relevant options, then save_university_list. If save_university_list rejects with profile_incomplete, ask ONE natural question filling the exact missing field (usually grade + intendedMajor for undergrad), then retry. Never loop the kid through "generate the list" chips that go nowhere.
15. ACTION SELF-CHECK: before end_turn_response, ask yourself: did the student request an action, and did a real tool do it? Never say a list, task, deadline, essay note, community match, or profile update is ready/done unless the relevant save tool succeeded in this turn or it already exists in get_candidate_state.
16. HIDDEN PLAN: get_candidate_state returns roadmapGaps, your own private steering list for this grade. Never a checklist, never said aloud, never "you're behind". Surface at most one gap per turn, only when the student's own message makes it a natural next beat (they mention a test, a leadership win, a school they like). Skip it entirely if nothing fits naturally this turn.
17. GOODBYE ALWAYS AVAILABLE: whenever you offer options, make the last one "Goodbye 👋". When the student picks it (or says bye/gotta go/done/see you), call save_session_summary with a one-line summary of where the session left off, then close cleanly with end_turn_response (no new questions, options empty): (a) one warm sentence celebrating something real from today; (b) the single most useful next move — one concrete action, with its date if one already exists in their calendar/roadmap; and (c) when you'll reconnect — "I'll check in with you [before their next known deadline/milestone from state, otherwise ~next week]". Keep it to a few warm sentences — a friend's send-off, not a report or a checklist. If a target/dream school is on file, tie the sign-off to it in a few words. Never invent a date, deadline, or task that isn't in state (rule 10 still holds).
18. RETURNING STUDENT: if lastSessionSummary is present and this is the start of a new session, open with one warm line calling back to it before anything else. Never a generic greeting or an open "how can I help".
19. FIRST-EVER SESSION: if get_candidate_state shows no grade yet and lastSessionSummary is absent, ask exactly three things, one per turn, saving each via save_profile_fact before moving on: (1) grade, (2) curriculum system (IB/AP/A-Levels/National/Other), (3) main subjects and favorite. From the turn right after, give one piece of specific value tied to those three answers, then go fully freestyle.
20. SCHOLARSHIPS: when cost/aid/family finances comes up, or the student asks directly, call lookup_scholarships (by a school already in their list, or by field/background). If it comes back found:false and cached:false, use web_search, then call cache_scholarship_results with anything you verify (real name + real url required) so it's there next time. If nothing turns up anywhere, say so plainly and offer to save_profile_fact their interest — never invent a scholarship name, amount, or deadline. Only search demographic-specific scholarships when the student has volunteered that background themselves (save it via save_profile_fact volunteeredDemographics first) — NEVER ask their ethnicity/religion/background directly. You may mention once, in passing, that background-specific scholarships exist and that sharing is entirely optional; never press further.

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
      workingScholarships: Array.isArray(candidateState.scholarships) ? [...candidateState.scholarships] : [],
      knownChannels: new Map(),
      primaryArea: null,
      undergradDirty: false,
      programsDirty: false,
      scholarshipsDirty: false,
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
    if (fallbackUsed) {
      // The loop exhausted MAX_ITERATIONS (or the model stopped without a
      // tool call) without ever reaching a terminal end_turn_response.
      // toolCalls shows exactly which chain was mid-flight — critical for
      // diagnosing e.g. a scholarship lookup that ran out of room.
      console.warn('[undergrad-agent] iteration ceiling exhausted without a terminal response', {
        candidateId, iterations, maxIterations: MAX_ITERATIONS, toolCalls, stopReason: lastResult?.stopReason || null,
      });
    }
    let finalMessage = terminal?.message || lastResult?.text || FALLBACK_MESSAGE;
    let finalOptions = terminal ? terminal.options : FALLBACK_OPTIONS;
    const schoolListRequested = looksLikeUndergradSchoolListRequest(message, conversationHistory);
    const hasPrograms = ctx.programsDirty || ctx.workingPrograms.length > 0;
    if ((schoolListRequested || FAKE_LIST_READY_RE.test(finalMessage)) && !hasPrograms) {
      const missing = !ctx.workingProfile.grade ? 'grade' : !(ctx.workingProfile.subjects || ctx.workingProfile.intendedMajor) ? 'academic interest' : 'school list';
      finalMessage = missing === 'school list'
        ? 'I should not say the list is ready until it is saved. Tell me one broad area to prioritize, and I will build it from there.'
        : `I need one thing before I can make a real school list: your ${missing}.`;
      finalOptions = missing === 'grade'
        ? ['9th grade', '10th grade', '11th grade', '12th grade']
        : ['Life Sciences', 'Computer Science', 'Engineering', 'Business'];
    }

    const statePatch = {
      profile: {
        ...ctx.workingProfile,
        undergradStageTracker: { lastTopics: pushTopic(lastTopics, `smart_turn:${ctx.primaryArea || 'general'}`) },
      },
    };
    if (ctx.undergradDirty) statePatch.undergrad = ctx.workingUndergrad;
    if (ctx.programsDirty) statePatch.programs = ctx.workingPrograms;
    if (ctx.scholarshipsDirty) statePatch.scholarships = ctx.workingScholarships;
    const actionAudit = {
      detectedIntent: schoolListRequested ? 'school_list' : ctx.primaryArea || 'general',
      toolsAttempted: toolCalls,
      factsSaved: toolCalls.filter(name => name === 'save_profile_fact').length,
      programsSavedCount: ctx.programsDirty ? ctx.workingPrograms.length : 0,
      finalResponse: (ctx.programsDirty || ctx.undergradDirty || toolCalls.some(name => name.startsWith('save_'))) ? 'action' : 'question',
    };
    console.info('[undergrad-agent]', { candidateId, ...actionAudit });

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
        actionAudit,
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
