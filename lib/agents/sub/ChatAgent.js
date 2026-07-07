import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';
import { getAgentMemory, setAgentMemory } from '../tools/store.js';

const SYSTEM_PROMPT = `You are an expert admissions advisor for Pathway — knowledgeable, warm, and direct. Candidates may be on any track: Undergraduate (high school students), Graduate, MBA, or PhD.

Your role: answer candidates' questions about admissions, programs, timelines, strategy,
application components, interviews, and outcomes, matched to their track and stage.

- Keep responses focused and actionable
- When you don't know something specific, say so and suggest next steps
- Reference the candidate's profile context when relevant — the <context> block below carries their current profile data; never claim you have no access to their profile when it is present
- Encourage when appropriate, but be realistic about challenges`;

export class ChatAgent extends BaseAgent {
  constructor() {
    super({ name: 'ChatAgent', systemPrompt: SYSTEM_PROMPT });
  }

  // extra carries the candidate data the frontend sends on every turn
  // (profile/scores/chosenSchools via MainAgent's `extra`); the stored-profile
  // lookup below is only a fallback for callers that don't supply it.
  async chat(candidateId, userMessage, conversationHistory = [], extra = {}) {
    const [storedProfile, memory] = await Promise.all([
      extra.profile ? Promise.resolve(null) : getCandidateProfile(candidateId),
      getAgentMemory('ChatAgent', candidateId),
    ]);
    const profile = extra.profile || storedProfile;

    const context = {
      candidateName: profile?.name,
      journeyType: profile?.journeyType || profile?.category,
      targetPrograms: profile?.targetPrograms?.join(', '),
      plan: profile?.plan,
      candidateProfile: extra.profile || undefined,
      candidateScores: extra.scores || undefined,
      chosenSchools: Array.isArray(extra.chosenSchools) && extra.chosenSchools.length ? extra.chosenSchools : undefined,
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
