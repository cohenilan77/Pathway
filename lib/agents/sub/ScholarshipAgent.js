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
import { SCHOLARSHIP_TOOLS, SAVE_SCHOLARSHIP_RESULTS_TOOL, lookupScholarships, cacheScholarshipLookup, normalizeScholarshipSave, normalizeScholarshipResults } from '../tools/scholarship-tools.js';
import { saveScholarshipInterest, addCalendarEvent } from '../tools/update.js';

const SYSTEM_PROMPT = `You are Pathway's scholarship and financial-aid advisor for graduate/MBA/PhD candidates.

Your role: help the candidate find real, currently-available scholarships and fellowships that fit their profile, and track their interest.

RULES:
1. GROUND, DON'T GUESS: call lookup_scholarships first, passing a schoolName from the candidate's own school list/programs, or a query for a field/background search. If it returns found:false and cached:false, use web_search next — only report what you can cite with a real name and real source URL, then call cache_scholarship_results with what you verified so the next candidate benefits too. Never invent a scholarship name, amount, deadline, or eligibility rule.
2. SEARCH THE WHOLE LIST: when the candidate's chosen schools/programs are provided, call lookup_scholarships once per school (using its schoolName) AND at least once with a field/background query built from their profile. Gather every grounded match across all of those searches.
3. SAVE WHAT YOU FIND: after searching, call save_scholarship_results ONCE with every grounded match (real name + source url) so they populate the candidate's Scholarships tab as suggestions. This is required on a search even if the candidate has not asked about a specific one yet. Use save_scholarship_interest (not save_scholarship_results) only for a scholarship the candidate explicitly says they want.
4. If nothing is found anywhere, say so plainly and offer to note their interest for when new matches appear. Never fabricate to fill the gap.
5. Match demographic-specific scholarships ONLY against demographics the candidate has explicitly volunteered — never ask their ethnicity/religion/background directly. You may mention once, in passing, that background-specific scholarships exist and sharing is optional.
6. Keep it concise: 2-4 sentences, cite the scholarship name, amount, and deadline when known.`;

function isFutureIsoDate(value, now) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > now;
}

function normalizeSchoolList(schools) {
  if (!Array.isArray(schools)) return [];
  return schools
    .map(school => (typeof school === 'string' ? school : school?.name))
    .filter(Boolean);
}

export class ScholarshipAgent extends BaseAgent {
  constructor() {
    // Grounded multi-school search + bulk persistence can produce a long
    // sequence of tool calls and result summaries; 8192 truncated that on
    // full lists, so raise the ceiling.
    super({ name: 'ScholarshipAgent', systemPrompt: SYSTEM_PROMPT, maxTokens: 12000 });
    this._candidateId = null;
    this._profile = null;
  }

  async search(candidateId, profile = {}, schools = []) {
    this._candidateId = candidateId;
    this._profile = profile;
    const schoolNames = normalizeSchoolList(schools);
    const schoolsLine = schoolNames.length
      ? `\n\nChosen schools/programs to search (call lookup_scholarships once per school by schoolName, plus one field/background query): ${schoolNames.join(', ')}`
      : '';
    const messages = [
      {
        role: 'user',
        content: `Find scholarships that fit this candidate. Call lookup_scholarships first (by each school name from their list, and by field/background), then call save_scholarship_results with every grounded match so they appear in their Scholarships tab, and explain the top matches (name, amount, deadline).${schoolsLine}\n\nCandidate profile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, [...SCHOLARSHIP_TOOLS, SAVE_SCHOLARSHIP_RESULTS_TOOL, { type: 'web_search_20250305', name: 'web_search', max_uses: 2 }]);
  }

  async handle(candidateId, userMessage, profile = {}, schools = []) {
    this._candidateId = candidateId;
    this._profile = profile;
    const schoolNames = normalizeSchoolList(schools);
    const schoolsLine = schoolNames.length
      ? `\n\nCandidate's chosen schools/programs (search these by schoolName when relevant): ${schoolNames.join(', ')}`
      : '';
    const messages = [
      {
        role: 'user',
        content: `${userMessage}${schoolsLine}\n\nCandidate profile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, [...SCHOLARSHIP_TOOLS, SAVE_SCHOLARSHIP_RESULTS_TOOL, { type: 'web_search_20250305', name: 'web_search', max_uses: 2 }]);
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
    if (toolUse.name === 'save_scholarship_results') {
      // Bulk persist a search's grounded matches to the candidate's tab as
      // "suggested" — the piece that actually populates the Scholarships tab
      // from a search, versus save_scholarship_interest's single explicit save.
      const records = normalizeScholarshipResults(toolUse.input?.scholarships || []);
      if (!records.length) return { status: 'no_valid_results', saved: 0 };
      for (const record of records) {
        await saveScholarshipInterest(this._candidateId, record);
      }
      return { status: 'saved', saved: records.length, names: records.map(r => r.name) };
    }
    return super.handleToolUse(toolUse);
  }
}
