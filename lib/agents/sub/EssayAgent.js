import { BaseAgent } from '../BaseAgent.js';

const SYSTEM_PROMPT = `You are an expert MBA and graduate school essay coach for Pathway.

Your role: review, critique, and help draft compelling application essays.

When reviewing:
- Evaluate structure, storytelling, clarity, and authenticity
- Check if the essay answers the prompt fully
- Identify clichés, weak language, and missed opportunities
- Score on: structure (0-10), storytelling (0-10), authenticity (0-10), prompt fit (0-10)
- Give specific, actionable line-level feedback

When drafting:
- Create outlines first before full drafts
- Mirror the candidate's voice — do not make it sound generic
- Respect word limits strictly

Tone: direct and honest. Great essays require honest feedback, not flattery.`;

// Narrative Coaching v2 (NARRATIVE_COACHING_V2): once a candidate has locked
// their sharpened narrative pitch via NarrativeCoachAgent, every essay
// review/draft/revision must be consistent with it. Prepended to the message
// content (EssayAgent's system prompt is a fixed string set at construction,
// so per-call context goes on the request itself rather than the system).
function narrativeContextBlock(narrativeText) {
  if (!narrativeText) return '';
  return `CANDIDATE NARRATIVE (source of truth for all essays):\n"${narrativeText}"\n\nEvery draft, review, and revision must be consistent with this narrative. If the candidate's request conflicts with it, note the conflict and ask before drifting.\n\n`;
}

export class EssayAgent extends BaseAgent {
  constructor() {
    super({ name: 'EssayAgent', systemPrompt: SYSTEM_PROMPT, maxTokens: 16000 });
  }

  async review(essay, prompt, school, narrativeText) {
    const messages = [
      {
        role: 'user',
        content: `${narrativeContextBlock(narrativeText)}Review this essay for ${school || 'a graduate program'}.\n\nPrompt: ${prompt}\n\nEssay:\n${essay}\n\nReturn JSON: { scores: { structure, storytelling, authenticity, promptFit }, overallScore, strengths, weaknesses, specificFeedback (array of { line, issue, suggestion }), verdict }`,
      },
    ];
    return this.execute(messages);
  }

  async draft(prompt, profile, school, wordLimit = 500, narrativeText) {
    const messages = [
      {
        role: 'user',
        content: `${narrativeContextBlock(narrativeText)}Draft an MBA essay for ${school || 'a graduate program'}.\n\nPrompt: ${prompt}\nWord limit: ${wordLimit}\n\nCandidate background:\n${JSON.stringify(profile, null, 2)}\n\nFirst provide a brief outline, then write the full draft.`,
      },
    ];
    return this.execute(messages);
  }

  async improve(essay, feedback, narrativeText) {
    const messages = [
      {
        role: 'user',
        content: `${narrativeContextBlock(narrativeText)}Rewrite this essay incorporating the following feedback:\n\n${feedback}\n\nOriginal essay:\n${essay}\n\nReturn the improved version only.`,
      },
    ];
    return this.execute(messages);
  }
}
