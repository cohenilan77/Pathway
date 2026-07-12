// Scholarship search/save for the Graduate/MBA/PhD track — the Undergraduate
// smart agent has its own tool-bound version (lib/agents/tools/undergrad-
// tools.js), both sharing the same underlying cache/validation
// (lib/scholarships/scholarship-cache.js, lib/agents/tools/scholarship-
// tools.js). There is no separately curated scholarship list: lookup_
// scholarships checks a real cache keyed by school (from the candidate's
// own school/program list) or a field/background query; on a miss this
// agent runs its own bound web_search and reports back via
// cache_scholarship_results, which enforces hard grounding (name+url
// required) before persisting anything. Unlike Undergraduate's per-turn ctx
// accumulator, this agent persists directly via lib/agents/tools/update.js
// since there is no turn-level statePatch merge step in the grad specialist
// pipeline for scholarship data specifically.
import { BaseAgent } from '../BaseAgent.js';
import { SCHOLARSHIP_TOOLS, lookupScholarships, cacheScholarshipLookup, normalizeScholarshipSave } from '../tools/scholarship-tools.js';
import { saveScholarshipInterest, addCalendarEvent } from '../tools/update.js';

const SYSTEM_PROMPT = `You are Pathway's scholarship and financial-aid advisor for graduate/MBA/PhD candidates.

Your role: help the candidate find real, currently-available scholarships and fellowships that fit their profile, and track their interest.

RULES:
1. GROUND, DON'T GUESS: call lookup_scholarships first, passing a schoolName from the candidate's own school list/programs, or a query for a field/background search. If it returns found:false and cached:false, use web_search next — only report what you can cite with a real name and real source URL, then call cache_scholarship_results with what you verified so the next candidate benefits too. Never invent a scholarship name, amount, deadline, or eligibility rule.
2. If nothing is found anywhere, say so plainly and offer to note their interest for when new matches appear. Never fabricate to fill the gap.
3. Match demographic-specific scholarships ONLY against demographics the candidate has explicitly volunteered — never ask their ethnicity/religion/background directly. You may mention once, in passing, that background-specific scholarships exist and sharing is optional.
4. Keep it concise: 2-4 sentences, cite the scholarship name, amount, and deadline when known.
5. When the candidate expresses interest in a specific scholarship, call save_scholarship_interest.`;

function isFutureIsoDate(value, now) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > now;
}

export class ScholarshipAgent extends BaseAgent {
  constructor() {
    super({ name: 'ScholarshipAgent', systemPrompt: SYSTEM_PROMPT });
    this._candidateId = null;
    this._profile = null;
  }

  async search(candidateId, profile = {}) {
    this._candidateId = candidateId;
    this._profile = profile;
    const messages = [
      {
        role: 'user',
        content: `Find scholarships that fit this candidate. Call lookup_scholarships first (by school name from their list, or by field/background), then explain the top matches (name, amount, deadline).\n\nCandidate profile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, [...SCHOLARSHIP_TOOLS, { type: 'web_search_20250305', name: 'web_search', max_uses: 2 }]);
  }

  async handle(candidateId, userMessage, profile = {}) {
    this._candidateId = candidateId;
    this._profile = profile;
    const messages = [
      {
        role: 'user',
        content: `${userMessage}\n\nCandidate profile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, [...SCHOLARSHIP_TOOLS, { type: 'web_search_20250305', name: 'web_search', max_uses: 2 }]);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'lookup_scholarships') {
      return lookupScholarships(toolUse.input || {});
    }
    if (toolUse.name === 'cache_scholarship_results') {
      return cacheScholarshipLookup(toolUse.input || {});
    }
    if (toolUse.name === 'save_scholarship_interest') {
      const { error, record } = normalizeScholarshipSave(toolUse.input || {});
      if (error) return { error };
      await saveScholarshipInterest(this._candidateId, record);
      if (record.deadline && isFutureIsoDate(record.deadline, Date.now())) {
        await addCalendarEvent(this._candidateId, {
          title: `Scholarship deadline: ${record.name}`,
          date: record.deadline,
          type: 'scholarship_deadline',
        }).catch(() => {});
      }
      return { status: 'saved', name: record.name };
    }
    return super.handleToolUse(toolUse);
  }
}
