// Thin, validated tool layer for lib/agents/NarrativeCoachAgent.js (the
// NARRATIVE_COACHING_V2-gated adversarial coaching session that replaces the
// generic chat handoff the Pivot/Upgrade modal used to send to AdvisorAgent).
// Mirrors the lib/agents/tools/undergrad-tools.js pattern: tools mutate the
// mutable `ctx` accumulator NarrativeCoachAgent.handle() passes in, and the
// caller folds the final ctx into the statePatch it returns.
const NARRATIVE_TEXT_MIN = 200;
const NARRATIVE_TEXT_MAX = 800;
const END_TURN_CHAT_LIMIT = 500;

function truncateAtSentence(text, max) {
  const clean = String(text || '');
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max);
  const lastBoundary = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '));
  return (lastBoundary > 20 ? clipped.slice(0, lastBoundary + 1) : clipped).trim();
}

function getCandidateStateTool(ctx) {
  return {
    profile: ctx.workingProfile,
    scores: ctx.scores,
    targetSchools: ctx.targetSchools,
    rawGoal: ctx.workingNarrativeCoaching?.rawGoal || null,
    pivotRisk: ctx.workingNarrativeCoaching?.sessionContext?.pivotRisk || null,
    schoolContext: ctx.workingNarrativeCoaching?.sessionContext?.schoolContext || null,
    outcomeContext: ctx.workingNarrativeCoaching?.sessionContext?.outcomeContext || null,
    recommenders: ctx.workingProfile?.recommenders || [],
    currentNarrativeText: ctx.workingNarrativeText || null,
  };
}

function saveNarrativeTextTool(ctx, { text } = {}) {
  const clean = String(text || '').trim();
  if (clean.length < NARRATIVE_TEXT_MIN) return { error: 'too_short', length: clean.length, minimum: NARRATIVE_TEXT_MIN };
  if (clean.length > NARRATIVE_TEXT_MAX) return { error: 'too_long', length: clean.length, maximum: NARRATIVE_TEXT_MAX };
  ctx.workingNarrativeText = clean;
  ctx.narrativeTextDirty = true;
  return { status: 'saved', length: clean.length };
}

function endTurnResponseTool(ctx, { message, options } = {}) {
  let text = String(message || '').trim();
  if (text.length > END_TURN_CHAT_LIMIT) {
    text = truncateAtSentence(text, END_TURN_CHAT_LIMIT);
  }
  const cleanOptions = Array.isArray(options) ? options.map(o => String(o || '').trim()).filter(Boolean).slice(0, 4) : [];
  return { terminal: true, message: text, options: cleanOptions };
}

export const NARRATIVE_COACH_TOOLS = [
  {
    name: 'get_candidate_state',
    description: 'Get the candidate profile (CV summary, work history), target schools, GMAT/GPA scores, stated post-MBA goal, pivot-risk score, per-school portfolio needs, employment-outcome context, recommender info, and the current saved narrative text if one exists.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'save_narrative_text',
    description: 'Save the sharpened final narrative pitch once it has survived at least 2 consecutive challenges without weakening. Must be 200-800 characters (roughly 4-6 sentences). Rejects with an error otherwise instead of saving.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'end_turn_response',
    description: 'The only way to reply to the candidate. Always call this last, exactly once, to end your turn. Coaching turns should have empty options (free-form dialogue, not chip choices).',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        options: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 4 },
      },
      required: ['message'],
    },
  },
];

// Dispatches one tool_use block. Never throws — always resolves to a plain
// object suitable for JSON.stringify() as the tool_result content.
export async function executeNarrativeCoachTool(toolUse, ctx) {
  const input = toolUse?.input || {};
  try {
    switch (toolUse?.name) {
      case 'get_candidate_state': return getCandidateStateTool(ctx);
      case 'save_narrative_text': return saveNarrativeTextTool(ctx, input);
      case 'end_turn_response': return endTurnResponseTool(ctx, input);
      default: return { error: 'unknown_tool', name: toolUse?.name || null };
    }
  } catch (err) {
    return { error: 'tool_execution_failed', message: String(err?.message || err) };
  }
}

export { NARRATIVE_TEXT_MIN, NARRATIVE_TEXT_MAX };
