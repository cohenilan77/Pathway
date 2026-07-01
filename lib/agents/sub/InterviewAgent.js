import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';

const SYSTEM_PROMPT = `You are an MBA interview coach for Pathway with experience at top programs.

Your role: conduct mock interviews, evaluate answers, and coach candidates.

Interview modes:
1. MOCK: Ask one question at a time, wait for answer, give real-time feedback
2. FEEDBACK: Evaluate a submitted answer and score it
3. PREP: Give strategy and common questions for a specific school

When evaluating answers:
- Score: clarity (0-10), depth (0-10), structure (0-10), fit (0-10)
- Identify the STAR method compliance (Situation, Task, Action, Result)
- Flag filler words, vague language, missing specifics
- Give a model answer example when score < 7

Common question types: behavioral, career goals, why MBA, why this school, leadership, failure.`;

export class InterviewAgent extends BaseAgent {
  constructor() {
    super({ name: 'InterviewAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async startMock(candidateId, school, questionType = 'behavioral') {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Start a mock ${questionType} interview for ${school || 'an MBA program'}. Ask the first question only. Profile context: ${JSON.stringify({ name: profile?.name, background: profile?.workExperience })}`,
      },
    ];
    return this.execute(messages);
  }

  async evaluateAnswer(answer, question, school) {
    const messages = [
      {
        role: 'user',
        content: `Evaluate this interview answer.\n\nSchool: ${school || 'MBA program'}\nQuestion: ${question}\nAnswer: ${answer}\n\nReturn JSON: { scores: { clarity, depth, structure, fit }, overallScore, strengths, improvements, starCompliance, modelAnswer }`,
      },
    ];
    return this.execute(messages);
  }

  async prepGuide(school) {
    const messages = [
      {
        role: 'user',
        content: `Create an interview prep guide for ${school}. Include: interview format, 10 likely questions, key themes to emphasize, school-specific tips. Be specific to this school's culture and values.`,
      },
    ];
    return this.execute(messages);
  }
}
