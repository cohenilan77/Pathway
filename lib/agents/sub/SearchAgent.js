import { BaseAgent } from '../BaseAgent.js';
import { searchPrograms } from '../tools/search.js';

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

  async handleToolUse(toolUse) {
    if (toolUse.name === 'search_programs') return searchPrograms(toolUse.input);
    return super.handleToolUse(toolUse);
  }
}
