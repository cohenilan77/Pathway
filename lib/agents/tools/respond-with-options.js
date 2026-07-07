// Structured-option tool shared by the three Undergrad grade-band agents
// (UndergradExploreAgent, UndergradStrategyAgent, UndergradExecutionAgent).
// Forcing tool_choice to this tool replaces the old "end every message with
// -> Option1 | Option2 | Option3" prompt convention with a real tool call, so
// the options survive prompt rewriting/compression instead of depending on
// the model remembering a formatting rule.
export const RESPOND_WITH_OPTIONS_TOOL = {
  name: 'respond_with_options',
  description: 'Send the student a short question or statement together with a fixed set of clickable options. This is the only way to reply to the student.',
  input_schema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: '1-2 sentence question or statement, no dashes' },
      options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
    },
    required: ['message', 'options'],
  },
};

export const RESPOND_WITH_OPTIONS_TOOL_CHOICE = { type: 'tool', name: RESPOND_WITH_OPTIONS_TOOL.name };

// Pulls the { message, options } the model sent via the forced tool call out
// of a BaseAgent.execute() result. Returns null if the model did not call the
// tool (e.g. it was disabled by admin config), so callers can fall back to
// the model's raw text instead of crashing.
export function extractRespondWithOptions(result) {
  const toolUse = (result?.toolUses || []).find(block => block?.name === RESPOND_WITH_OPTIONS_TOOL.name);
  const input = toolUse?.input;
  if (!input || typeof input.message !== 'string') return null;
  const options = Array.isArray(input.options)
    ? input.options.map(option => String(option || '').trim()).filter(Boolean).slice(0, 4)
    : [];
  return { message: input.message.trim(), options };
}

// Converts the structured { message, options } shape into the existing
// "-> Option1 | Option2 | Option3" text convention Advisor.jsx's
// parseOptions() regex already expects, so the frontend needs zero changes.
export function formatOptionsAsArrowPipe({ message, options } = {}) {
  const cleanMessage = String(message || '').trim();
  if (!Array.isArray(options) || !options.length) return cleanMessage;
  return `${cleanMessage} → ${options.join(' | ')}`;
}
