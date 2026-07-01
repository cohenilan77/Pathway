import { BaseAgent } from '../BaseAgent.js';
import { searchPrograms } from '../tools/search.js';
import { getStore } from '../../store.js';
import { lookupAdmitRate } from '../../known-admit-rates.js';

const SYSTEM_PROMPT = `You are a school and program database search specialist for Pathway.

Your role: answer queries about MBA programs, graduate schools, deadlines, tuition, class profiles,
rankings, and admissions requirements. Use the search_programs tool to find relevant programs.

Be factual. If you don't have data, say so. Summarize results in a helpful, scannable format.`;

const TOOLS = [
  {
    name: 'search_programs',
    description: 'Search the school/program database',
    input_schema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' } },
        country: { type: 'string' },
        degree: { type: 'string' },
        gmat: { type: 'number' },
        gpa: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
];

export class SearchAgent extends BaseAgent {
  constructor() {
    super({ name: 'SearchAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async search(query) {
    const messages = [{ role: 'user', content: query }];
    return this.executeWithTools(messages, TOOLS);
  }

  // Returns real published admit rate for a school. Checks known rates table first,
  // then Redis cache (30-day TTL). Returns { admitRate, admitRateSource } or null fields
  // if not found. Never guesses or estimates.
  async fetchAdmitRate(schoolName) {
    if (!schoolName) return { admitRate: null, admitRateSource: 'Not available' };
    const normalized = schoolName.toLowerCase().trim();

    // Check shared known-rates table
    const known = lookupAdmitRate(normalized);
    if (known) return known;

    // Check Redis cache (30-day TTL)
    try {
      const store = getStore();
      const cached = await store.get(`admitrate:${normalized}`);
      if (cached) return typeof cached === 'object' ? cached : JSON.parse(cached);
    } catch { /* cache miss is fine */ }

    return { admitRate: null, admitRateSource: 'Not available' };
  }

  // Cache an admit rate in Redis with 30-day TTL (2592000 seconds)
  async cacheAdmitRate(schoolName, admitRate, admitRateSource) {
    try {
      const store = getStore();
      const key = `admitrate:${schoolName.toLowerCase().trim()}`;
      const data = { admitRate, admitRateSource };
      // Upstash Redis: set with ex (expiry in seconds)
      if (store.set) await store.set(key, JSON.stringify(data), { ex: 2592000 });
    } catch { /* cache write failure is non-fatal */ }
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'search_programs') return searchPrograms(toolUse.input);
    return super.handleToolUse(toolUse);
  }
}
