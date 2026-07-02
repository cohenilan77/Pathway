import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';
import { searchPrograms } from '../tools/search.js';

const SYSTEM_PROMPT = `You are an MBA admissions outcome predictor for Pathway.

Your role: simulate application outcomes using profile data, historical trends, and program statistics.

When predicting:
- Use realistic probability ranges (not false precision — give ranges like 20-35%)
- Factor in: GPA, GMAT, work experience quality, essays, recommendations, interviews
- Consider each school's class profile and acceptance rates
- Provide honest risk assessment and confidence level
- Identify the 2-3 factors that most affect chances for each school

Output structured predictions with probabilities and key drivers.
Never guarantee acceptance. Frame as data-driven estimates.`;

const TOOLS = [
  {
    name: 'search_programs',
    description: 'Get school class profile data for comparison',
    input_schema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number' },
      },
    },
  },
];

export class SimulationAgent extends BaseAgent {
  constructor() {
    super({ name: 'SimulationAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async predictOutcomes(candidateId, targetSchools) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Predict admission outcomes for this candidate at the specified schools.\n\nCandidate profile:\n${JSON.stringify(profile, null, 2)}\n\nTarget schools: ${JSON.stringify(targetSchools)}\n\nReturn JSON: { predictions: [{ school, acceptanceProbability (e.g. "25-35%"), confidence ("low"/"medium"/"high"), keyStrengths, keyWeaknesses, verdict }] }`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async whatIf(candidateId, hypotheticalChanges) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Run a what-if scenario: how would these changes to the candidate's profile affect their admission chances?\n\nCurrent profile: ${JSON.stringify(profile)}\n\nHypothetical changes: ${JSON.stringify(hypotheticalChanges)}\n\nCompare before vs after and explain the delta.`,
      },
    ];
    return this.execute(messages);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'search_programs') return searchPrograms(toolUse.input);
    return super.handleToolUse(toolUse);
  }
}
