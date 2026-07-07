// Shared plumbing for all Undergraduate conversational agents: the three
// legacy grade-band agents (UndergradExploreAgent, UndergradStrategyAgent,
// UndergradExecutionAgent) plus the 13 named agents under lib/agents/sub/
// undergrad/ orchestrated by lib/agents/UndergradMasterAgent.js. Each of
// those files owns its own voice/system prompt; this module only holds the
// mechanics they all need: the mandatory response rules, student-context
// formatting, and the forced respond_with_options tool call.
// Undergraduate-only — never imported outside lib/agents/sub/Undergrad*.js,
// lib/agents/sub/undergrad/*.js, and lib/agents/UndergradMasterAgent.js.
import { BaseAgent } from '../BaseAgent.js';
import {
  RESPOND_WITH_OPTIONS_TOOL,
  RESPOND_WITH_OPTIONS_TOOL_CHOICE,
  extractRespondWithOptions,
} from '../tools/respond-with-options.js';

export const MANDATORY_RESPONSE_RULES = `MANDATORY RESPONSE RULES (no exceptions):
1. Max 1-2 sentences in "message". No paragraphs.
2. No hyphens or dashes anywhere.
3. Reply ONLY by calling respond_with_options, with 2-4 concrete, specific options tied to this exact student and topic. Never use generic placeholder options like "Yes" or "No" or "Other" when specific subjects, activities, dates, or steps are available.
4. Never echo or confirm what the student said. Move forward.`;

function buildStudentContext({ grade, intendedMajor, destination, pathwayType }) {
  const gradeStr = grade ? `Grade ${grade}` : 'a student whose grade has not been confirmed yet';
  const pathwayLabel = pathwayType === 'focused' ? 'focused'
    : pathwayType === 'exploring' ? 'still exploring'
      : pathwayType === 'partial' ? 'partially decided' : null;
  return `STUDENT: ${gradeStr}${pathwayLabel ? ` · Pathway: ${pathwayLabel}` : ''}${intendedMajor ? ` · Interested in: ${intendedMajor}` : ''}${destination ? ` · Destination: ${destination}` : ''}`;
}

function buildForcedFocus({ topic, reason }) {
  if (!reason) return '';
  return `\n\nFORCED DISCUSSION FOCUS (topic id: ${topic || 'n/a'}). You choose the wording; the topic itself is fixed by the server and must not be changed: ${reason}`;
}

// conversationHistory entries use the app's { role: 'ai'|'user', text } shape
// (same convention AdvisorAgent/MainAgent already normalize elsewhere).
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

export class BaseUndergradAgent extends BaseAgent {
  constructor(name, voicePrompt) {
    super({ name, systemPrompt: voicePrompt, model: 'claude-haiku-4-5-20251001', maxTokens: 1024 });
    this.voicePrompt = voicePrompt;
  }

  // topic/reason are the stage tracker's forced discussion focus: this agent
  // phrases the question, it never chooses the topic. grade/intendedMajor/
  // destination/pathwayType/topTask/topWeakness describe the student; no
  // MBA/GMAT/GPA-shaped fields are accepted anywhere in this signature.
  async respond(candidateId, message, {
    conversationHistory = [],
    topic = null,
    reason = null,
    grade = null,
    intendedMajor = '',
    destination = '',
    pathwayType = null,
    topTask = null,
    topWeakness = null,
  } = {}) {
    const messages = toAnthropicMessages(conversationHistory, message);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return { text: '', options: [], topic, toolUses: [], usage: null, raw: null };
    }

    this.systemPrompt = [
      this.voicePrompt,
      MANDATORY_RESPONSE_RULES,
      buildStudentContext({ grade, intendedMajor, destination, pathwayType }),
      buildForcedFocus({ topic, reason }),
    ].filter(Boolean).join('\n\n');

    const result = await this.execute(messages, {
      tools: [RESPOND_WITH_OPTIONS_TOOL],
      toolChoice: RESPOND_WITH_OPTIONS_TOOL_CHOICE,
    });

    const structured = extractRespondWithOptions(result);
    return {
      text: structured?.message ?? result.text ?? '',
      options: structured?.options ?? [],
      topic,
      toolUses: result.toolUses,
      usage: result.usage,
      raw: result.raw,
      // topTask/topWeakness are accepted for future callers but the wording
      // decision already lives in `reason`, so they are not re-interpolated
      // into the prompt here.
      topTask,
      topWeakness,
    };
  }
}
