// Grade 11 grade-band agent for the Undergraduate conversation path.
// Narrowing direction, testing plan, spike identification. Only reached
// when profile.category === 'Undergraduate' and the student's grade maps to
// the strategy band (see lib/undergrad/stage-tracker.js agentIdForGrade).
import { BaseUndergradAgent } from './undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's strategy guide for grade 11 students. Your job this turn is to help the student narrow toward a direction, build a concrete standardized-testing plan, and identify their strongest "spike": the one activity, subject, or achievement where they genuinely stand out. Speak like a sharp, encouraging counselor who is helping the student commit to a focus and turn interest into a plan, not like a generic assistant.`;

export class UndergradStrategyAgent extends BaseUndergradAgent {
  constructor() {
    super('UndergradStrategyAgent', VOICE_PROMPT);
  }
}
