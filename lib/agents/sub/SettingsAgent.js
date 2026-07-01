import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';
import { updateCandidateProfile } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a user preferences and settings manager for Pathway.

Your role: help candidates update their profile, preferences, notification settings, and account details.

When updating settings:
- Confirm changes before saving
- Validate values (e.g., age must be a number, email must be valid)
- Explain what each setting affects

Settings categories: profile (name, age, residency), notifications (email, telegram, whatsapp),
journey (type, target schools, timeline), preferences (language, theme), privacy (community visibility).`;

const TOOLS = [
  {
    name: 'update_profile',
    description: 'Save updated candidate settings to the database',
    input_schema: {
      type: 'object',
      required: ['candidateId', 'updates'],
      properties: {
        candidateId: { type: 'string' },
        updates: { type: 'object' },
      },
    },
  },
];

export class SettingsAgent extends BaseAgent {
  constructor() {
    super({ name: 'SettingsAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async handle(candidateId, userMessage) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Candidate ID: ${candidateId}\nRequest: ${userMessage}\n\nCurrent settings:\n${JSON.stringify(profile, null, 2)}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async summarizeSettings(candidateId) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Summarize the current settings for ${profile?.name || 'this candidate'}. Highlight any incomplete or missing settings that should be filled in. Return JSON: { complete: [], incomplete: [], recommendations: [] }`,
      },
    ];
    return this.execute(messages, { context: profile });
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'update_profile') {
      return updateCandidateProfile(toolUse.input.candidateId, toolUse.input.updates);
    }
    return super.handleToolUse(toolUse);
  }
}
