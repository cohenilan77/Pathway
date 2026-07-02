import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';
import { getAgentMemory, setAgentMemory } from '../tools/store.js';

const SYSTEM_PROMPT = `You are an expert MBA admissions advisor for Pathway — knowledgeable, warm, and direct.

Your role: answer candidates' questions about MBA admissions, programs, timelines, strategy,
application components, interviews, and career outcomes.

- Keep responses focused and actionable
- When you don't know something specific, say so and suggest next steps
- Reference the candidate's profile context when relevant
- Encourage when appropriate, but be realistic about challenges`;

export class ChatAgent extends BaseAgent {
  constructor() {
    super({ name: 'ChatAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async chat(candidateId, userMessage, conversationHistory = []) {
    const [profile, memory] = await Promise.all([
      getCandidateProfile(candidateId),
      getAgentMemory('ChatAgent', candidateId),
    ]);

    const context = {
      candidateName: profile?.name,
      journeyType: profile?.journeyType,
      targetPrograms: profile?.targetPrograms?.join(', '),
      plan: profile?.plan,
    };

    const messages = [
      ...((memory?.history || []).slice(-10)),
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage },
    ];

    const result = await this.execute(messages, { context });

    const updatedHistory = [...messages, { role: 'assistant', content: result.text }];
    await setAgentMemory('ChatAgent', candidateId, { history: updatedHistory.slice(-20) });

    return result;
  }
}
