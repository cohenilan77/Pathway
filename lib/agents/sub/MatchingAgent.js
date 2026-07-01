import { BaseAgent } from '../BaseAgent.js';
import { searchPrograms, getCandidateProfile } from '../tools/search.js';

const SYSTEM_PROMPT = `You are a school matching specialist for Pathway, an MBA and graduate admissions advisory platform.

Your role: analyze a candidate's profile and return ranked school matches with fit scores and reasoning.

When matching:
- Consider GMAT/GRE, GPA, work experience, residency, career goals
- Assign a fit score (0-100) and tier (reach/match/safety)
- Explain WHY each school is a good or poor fit
- Suggest 3 reach, 3 match, 3 safety schools unless otherwise specified
- Be honest — do not oversell schools that are out of reach

Always respond with structured JSON when requested.`;

const TOOLS = [
  {
    name: 'search_programs',
    description: 'Search the school/program database by filters',
    input_schema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: 'School or program name keywords' },
        country: { type: 'string', description: 'Country filter' },
        degree: { type: 'string', description: 'Degree type (MBA, MS, PhD, etc.)' },
        gmat: { type: 'number', description: 'Candidate GMAT score for compatibility filter' },
        gpa: { type: 'number', description: 'Candidate GPA for compatibility filter' },
        limit: { type: 'number', description: 'Max results to return' },
      },
    },
  },
];

export class MatchingAgent extends BaseAgent {
  constructor() {
    super({ name: 'MatchingAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async match(candidateId, preferences = {}) {
    const profile = await getCandidateProfile(candidateId);
    if (!profile) throw new Error('Candidate profile not found');

    const messages = [
      {
        role: 'user',
        content: `Match schools for this candidate. Return a JSON object with key "matches" containing an array of school objects with: name, school, degree, fitScore (0-100), tier (reach/match/safety), pros (array), cons (array), recommendation (string).\n\nCandidate profile:\n${JSON.stringify(profile, null, 2)}\n\nPreferences: ${JSON.stringify(preferences)}`,
      },
    ];

    return this.executeWithTools(messages, TOOLS);
  }

  async scoreSchool(candidateId, schoolName) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Score the fit between this candidate and "${schoolName}". Return JSON: { school, fitScore, tier, pros, cons, keyRisks, recommendation }.\n\nProfile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'search_programs') return searchPrograms(toolUse.input);
    return super.handleToolUse(toolUse);
  }
}
