// NarrativeCoachAgent: NARRATIVE_COACHING_V2-gated adversarial coaching
// session for grad/MBA/PhD/Personal-Development candidates (never
// Undergraduate — that track has no narrative modal at all, see
// lib/hybrid-coordinator.js's isNarrativeChoiceHandoff). Replaces the
// Pivot/Upgrade modal's generic "craft my complete narrative strategy" chat
// handoff to the full AdvisorAgent with a dedicated agent that grills the
// candidate until their pitch survives adversarial scrutiny, then saves the
// sharpened text via a tool instead of leaving it as unstructured chat prose.
import { BaseAgent } from './BaseAgent.js';
import { NARRATIVE_COACH_TOOLS, executeNarrativeCoachTool } from './tools/narrative-coach-tools.js';

const MAX_ITERATIONS = 8;
const FALLBACK_MESSAGE = "Let's keep going — tell me more about how you'd defend that.";

export const DEFAULT_NARRATIVE_COACH_PROMPT = `You are a skeptical MBA admissions committee member conducting a coaching session with a candidate. Your job: force the candidate to sharpen their narrative until it survives adversarial scrutiny. You are NOT a cheerleader.

INPUTS you have in state:
- CV summary, target schools, GMAT/GPA, work history (candidate.profile)
- Candidate's stated post-MBA goal (candidate.narrative.rawGoal)
- Pivot risk score for their transition (candidate.narrative.pivotRisk)
- Per-school portfolio needs (candidate.narrative.schoolContext)
- Recommender info if present (candidate.narrative.recommenders)

PROCESS:
1. Open with ONE sharp challenge tied to their specific profile + goal.
2. Push back on weak answers. Praise strong ones briefly, then push further.
3. Cover in 5-8 exchanges: fit, realism of post-MBA goal, risk profile, recommender leverage, why THIS school over others.
4. When the pitch survives 2 consecutive challenges without weakening, call save_narrative_text with the sharpened 4-6 sentence pitch.

TONE:
- McKinsey partner grilling a senior associate. Not guidance counselor.
- No chip options. Free-form dialogue. Real questions.
- Short. Direct. One challenge per turn.
- Never label the candidate ("You're a career-pivot type"). Coach them.

OUTPUT RULES:
- End every turn with end_turn_response (message + empty options for coaching turns).
- When pitch is locked, call save_narrative_text with the final 4-6 sentence text, THEN end_turn_response confirming and offering to move to CV.
- Never emit <PROFILE>, <SCORES>, <PROGRAMS> XML blocks. This flow uses tools only.`;

// conversationHistory entries use the app's { role: 'ai'|'user', text } shape
// (same convention UndergradAgent/AdvisorAgent already normalize).
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

export class NarrativeCoachAgent extends BaseAgent {
  constructor() {
    super({ name: 'NarrativeCoachAgent', systemPrompt: DEFAULT_NARRATIVE_COACH_PROMPT, model: 'claude-sonnet-4-6', maxTokens: 2048 });
  }

  async handle(candidateId, message, { conversationHistory = [], candidateState = {} } = {}) {
    const startedAt = Date.now();
    const profile = candidateState.profile || {};
    const narrativeCoaching = candidateState.narrativeCoaching || {};

    const history = toAnthropicMessages(conversationHistory, message);
    if (!history.length || history[history.length - 1].role !== 'user') {
      return {
        agent: 'NarrativeCoachAgent',
        message: '',
        statePatch: {},
        metadata: {
          routerSource: 'narrative_coach_agent', routedAgent: 'NarrativeCoachAgent', executionPlan: ['NarrativeCoachAgent'],
          primaryAgent: 'NarrativeCoachAgent', synthesisAgent: null, finalAgent: 'NarrativeCoachAgent',
          fallbackUsed: false, latencyMs: Date.now() - startedAt, toolCalls: [], usage: null, model: null, narrativeLocked: false,
        },
      };
    }

    const context = {
      rawGoal: narrativeCoaching.rawGoal || null,
      pivotRisk: narrativeCoaching.sessionContext?.pivotRisk || null,
      schoolContext: narrativeCoaching.sessionContext?.schoolContext || null,
      outcomeContext: narrativeCoaching.sessionContext?.outcomeContext || null,
    };

    const ctx = {
      candidateId,
      now: startedAt,
      workingProfile: { ...profile },
      workingNarrativeCoaching: narrativeCoaching,
      workingNarrativeText: candidateState.narrativeText || '',
      narrativeTextDirty: false,
      scores: candidateState.scores || null,
      targetSchools: candidateState.chosenSchools || [],
    };

    const tools = NARRATIVE_COACH_TOOLS;
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
        const output = await executeNarrativeCoachTool(toolUse, ctx);
        if (output?.terminal) terminal = output;
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(output?.terminal ? { status: 'ok' } : output) });
      }
      history.push({ role: 'user', content: toolResults });
    }

    const fallbackUsed = !terminal;
    const finalMessage = terminal?.message || lastResult?.text || FALLBACK_MESSAGE;
    const finalOptions = terminal ? terminal.options : [];

    const statePatch = {};
    if (ctx.narrativeTextDirty) statePatch.narrativeText = ctx.workingNarrativeText;

    return {
      agent: 'NarrativeCoachAgent',
      message: finalMessage,
      statePatch,
      metadata: {
        routerSource: 'narrative_coach_agent',
        routedAgent: 'NarrativeCoachAgent',
        executionPlan: ['NarrativeCoachAgent'],
        primaryAgent: 'NarrativeCoachAgent',
        synthesisAgent: null,
        finalAgent: 'NarrativeCoachAgent',
        fallbackUsed,
        latencyMs: Date.now() - startedAt,
        toolCalls,
        options: finalOptions,
        narrativeLocked: ctx.narrativeTextDirty,
        usage: lastResult?.usage || null,
        model: lastResult?.raw?.model || null,
      },
    };
  }
}
