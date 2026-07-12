// Shared scholarship tool schemas + logic, bound to BOTH tracks: the
// Undergraduate smart agent (lib/agents/UndergradAgent.js, via
// lib/agents/tools/undergrad-tools.js) and the Graduate/MBA side
// (lib/agents/sub/ScholarshipAgent.js). There is no separately curated
// scholarship list — lookup_scholarships checks a real cache keyed by
// school (from the existing schools/programs database) or by field/
// background query; on a cache miss the agent runs its own bound web_search
// and reports back through cache_scholarship_results, which validates hard
// grounding (name + url required) before persisting anything.
import { getCachedScholarships, cacheScholarshipResults } from '../../scholarships/scholarship-cache.js';

export const SCHOLARSHIP_TOOLS = [
  {
    name: 'lookup_scholarships',
    description: 'Check the scholarship cache for a school (pass schoolName — use one already in this candidate\'s school list/programs) or a general query (field/background, e.g. "engineering" or "first-generation"). If this returns found:false and cached:false, there is nothing cached yet — use web_search next, then call cache_scholarship_results with whatever real scholarships you find (each must have a real name and source url). Never invent a scholarship name, amount, or deadline.',
    input_schema: {
      type: 'object',
      properties: {
        schoolName: { type: 'string' },
        query: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'cache_scholarship_results',
    description: 'Persist scholarships you found via a real web_search this turn, so the same school/query does not need to be re-searched next time. Pass the same schoolName or query you searched with, plus the scholarships you verified (each needs at minimum a real name and source url — entries missing either are dropped, not cached).',
    input_schema: {
      type: 'object',
      properties: {
        schoolName: { type: 'string' },
        query: { type: 'string' },
        scholarships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              amountUSD: { type: 'number' },
              amountType: { type: 'string' },
              eligibility: { type: 'string' },
              deadline: { type: 'string' },
            },
            required: ['name', 'url'],
          },
        },
      },
      required: ['scholarships'],
    },
  },
  {
    name: 'save_scholarship_interest',
    description: 'Record the student\'s interest in a scholarship they\'ve seen (from lookup_scholarships or a fresh web_search this turn). Requires a real name and source url — never save one without both.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        url: { type: 'string' },
        amountUSD: { type: 'number' },
        amountType: { type: 'string' },
        deadline: { type: 'string' },
        status: { type: 'string', enum: ['interested', 'applying', 'applied', 'won'] },
      },
      required: ['name', 'url'],
    },
  },
];

export async function lookupScholarships({ schoolName, query } = {}) {
  return getCachedScholarships({ schoolName, query });
}

export async function cacheScholarshipLookup({ schoolName, query, scholarships } = {}) {
  return cacheScholarshipResults({ schoolName, query, scholarships });
}

// Validates+normalizes a save_scholarship_interest call into a persistable
// record. Returns { error } or { record }; never throws. Hard grounding:
// name+url are required — there is no scholarshipId shortcut anymore since
// there's no static DB to look one up in.
export function normalizeScholarshipSave({ name, url, amountUSD, amountType, deadline, status } = {}, now = Date.now()) {
  if (!name || !url) return { error: 'missing_name_or_url' };
  return {
    record: {
      name: String(name).slice(0, 200),
      url: String(url).slice(0, 500),
      amountUSD: Number.isFinite(Number(amountUSD)) ? Number(amountUSD) : null,
      amountType: amountType || null,
      deadline: deadline || null,
      source: 'web',
      status: status || 'interested',
      savedAt: now,
    },
  };
}
