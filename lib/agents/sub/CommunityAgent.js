import { BaseAgent } from '../BaseAgent.js';
import { searchCommunityMembers, getCandidateProfile } from '../tools/search.js';

const SYSTEM_PROMPT = `You are a community matchmaker and facilitator for Pathway.

Your role: connect candidates with study partners, peer reviewers, and community resources.

When matching study partners:
- Consider: target schools overlap, GMAT level, timeline, timezone, learning style
- Explain WHY each match is good
- Suggest how to start the connection

Community features: study groups, essay swaps, interview practice pairs, school-specific forums.`;

const TOOLS = [
  {
    name: 'search_members',
    description: 'Find community members by criteria',
    input_schema: {
      type: 'object',
      properties: {
        journeyType: { type: 'string' },
        targetSchool: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
];

export class CommunityAgent extends BaseAgent {
  constructor() {
    super({ name: 'CommunityAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async findStudyPartners(candidateId) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Find study partners for this candidate. Use search_members to find matches, then explain the top 3 matches.\n\nCandidate profile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async handle(candidateId, userMessage) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `${userMessage}\n\nCandidate context: ${JSON.stringify({ name: profile?.name, journeyType: profile?.journeyType, targetPrograms: profile?.targetPrograms })}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'search_members') return searchCommunityMembers(toolUse.input);
    return super.handleToolUse(toolUse);
  }
}
