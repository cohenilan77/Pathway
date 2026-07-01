import { BaseAgent } from '../BaseAgent.js';
import { updateCandidateProfile } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a candidate profile specialist for Pathway.

Your role: extract structured information from CVs, resumes, LinkedIn profiles, and raw text.
Build and maintain complete candidate profiles.

When parsing:
- Extract: name, education (school, degree, GPA, year), work experience (company, role, duration),
  GMAT/GRE scores, extracurriculars, languages, certifications
- Infer career goals and MBA motivations from context
- Flag missing profile gaps that weaken applications
- Return clean, structured JSON

Always be precise and do not invent information not present in the source.`;

const TOOLS = [
  {
    name: 'update_profile',
    description: 'Save extracted profile data to the candidate record',
    input_schema: {
      type: 'object',
      required: ['candidateId', 'updates'],
      properties: {
        candidateId: { type: 'string' },
        updates: {
          type: 'object',
          description: 'Profile fields to update',
        },
      },
    },
  },
];

export class ProfileAgent extends BaseAgent {
  constructor() {
    super({ name: 'ProfileAgent', systemPrompt: SYSTEM_PROMPT });
  }

  #candidateId = null;

  async parse(candidateId, rawText) {
    this.#candidateId = candidateId;
    const messages = [
      {
        role: 'user',
        content: `Parse this CV/resume and extract a structured profile. Then call update_profile to save it.\n\nCandidate ID: ${candidateId}\n\nRaw content:\n${rawText}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async audit(candidateId) {
    this.#candidateId = candidateId;
    const messages = [
      {
        role: 'user',
        content: `Audit the profile for candidate ${candidateId}. Identify: missing fields, weak areas, inconsistencies, and top 3 improvement priorities. Return JSON: { gaps, weakAreas, inconsistencies, priorities }.`,
      },
    ];
    return this.execute(messages);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'update_profile') {
      const { candidateId, updates } = toolUse.input;
      return updateCandidateProfile(candidateId || this.#candidateId, updates);
    }
    return super.handleToolUse(toolUse);
  }
}
