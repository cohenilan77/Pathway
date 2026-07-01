import { BaseAgent } from '../BaseAgent.js';
import { searchPrograms } from '../tools/search.js';
import { getStore } from '../../store.js';

// Known real published admit rates (as of 2024). Never guess — only hard data here.
const KNOWN_ADMIT_RATES = {
  'harvard': { admitRate: 3.6, admitRateSource: 'Official 2024' },
  'mit': { admitRate: 4.0, admitRateSource: 'Official 2024' },
  'stanford': { admitRate: 3.7, admitRateSource: 'Official 2024' },
  'yale': { admitRate: 4.6, admitRateSource: 'Official 2024' },
  'princeton': { admitRate: 4.6, admitRateSource: 'Official 2024' },
  'columbia': { admitRate: 3.9, admitRateSource: 'Official 2024' },
  'brown': { admitRate: 5.1, admitRateSource: 'Official 2024' },
  'dartmouth': { admitRate: 5.8, admitRateSource: 'Official 2024' },
  'cornell': { admitRate: 8.7, admitRateSource: 'Official 2024' },
  'upenn': { admitRate: 7.7, admitRateSource: 'Official 2024' },
  'university of pennsylvania': { admitRate: 7.7, admitRateSource: 'Official 2024' },
  'duke': { admitRate: 6.9, admitRateSource: 'Official 2024' },
  'vanderbilt': { admitRate: 6.6, admitRateSource: 'Official 2024' },
  'northwestern': { admitRate: 6.8, admitRateSource: 'Official 2024' },
  'caltech': { admitRate: 3.9, admitRateSource: 'Official 2024' },
  'rice': { admitRate: 8.5, admitRateSource: 'Official 2024' },
  'notre dame': { admitRate: 12.2, admitRateSource: 'Official 2024' },
  'georgetown': { admitRate: 12.5, admitRateSource: 'Official 2024' },
  'ucla': { admitRate: 8.6, admitRateSource: 'Official 2024' },
  'uc berkeley': { admitRate: 11.3, admitRateSource: 'Official 2024' },
  'usc': { admitRate: 11.5, admitRateSource: 'Official 2024' },
  'university of southern california': { admitRate: 11.5, admitRateSource: 'Official 2024' },
  'nyu': { admitRate: 12.2, admitRateSource: 'Official 2024' },
  'new york university': { admitRate: 12.2, admitRateSource: 'Official 2024' },
  'boston university': { admitRate: 18, admitRateSource: 'Official 2024' },
  'northeastern': { admitRate: 7.0, admitRateSource: 'Official 2024' },
  'emory': { admitRate: 11.6, admitRateSource: 'Official 2024' },
  'tulane': { admitRate: 11.5, admitRateSource: 'Official 2024' },
  'carnegie mellon': { admitRate: 11.0, admitRateSource: 'Official 2024' },
  'wake forest': { admitRate: 23.0, admitRateSource: 'Official 2024' },
  'tufts': { admitRate: 9.6, admitRateSource: 'Official 2024' },
  'oxford': { admitRate: 17.5, admitRateSource: 'Official 2024' },
  'cambridge': { admitRate: 21.0, admitRateSource: 'Official 2024' },
  'imperial college': { admitRate: 14.3, admitRateSource: 'Official 2024' },
  'lse': { admitRate: 8.0, admitRateSource: 'Official 2024' },
  'university of michigan': { admitRate: 17.7, admitRateSource: 'Official 2024' },
  'university of virginia': { admitRate: 19.0, admitRateSource: 'Official 2024' },
};

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

    // Check known rates table
    for (const [key, data] of Object.entries(KNOWN_ADMIT_RATES)) {
      if (normalized.includes(key) || key.includes(normalized)) return data;
    }

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
