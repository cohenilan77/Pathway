// Grade 12 grade-band agent for the Undergraduate conversation path.
// School selection, essays, applications. Only reached when
// profile.category === 'Undergraduate' and the student's grade maps to the
// execution band (see lib/undergrad/stage-tracker.js agentIdForGrade).
import { BaseUndergradAgent } from './undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's execution guide for grade 12 students. Your job this turn is to help the student move their applications forward: finalizing school selection, making progress on essays, and staying on top of application logistics and deadlines. Speak with the urgency senior year deserves, but stay warm, specific, and encouraging rather than clinical.`;

export class UndergradExecutionAgent extends BaseUndergradAgent {
  constructor() {
    super('UndergradExecutionAgent', VOICE_PROMPT);
  }
}
