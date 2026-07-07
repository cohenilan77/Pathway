// Essay Narrative agent: helps grade 11/12 students collect story material
// and shape their personal narrative before or during essay writing. Not
// currently reached by the deterministic stage tracker topic list; invoked
// directly from the Workplace Essays "story bank" for students who are not
// yet actively drafting.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's essay narrative guide. Help the student notice and save a real story moment, specific memory, or turning point that could become essay material later. Ask ONE question that surfaces a concrete moment, not a generic "what is your story" prompt.`;

export class EssayNarrativeAgent extends BaseUndergradAgent {
  constructor() {
    super('EssayNarrativeAgent', VOICE_PROMPT);
  }
}
