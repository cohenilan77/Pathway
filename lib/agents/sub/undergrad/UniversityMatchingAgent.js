// University Matching agent: builds and refines the Reach/Target/Likely
// school list. Not currently reached by the deterministic stage tracker
// topic list; invoked directly from the Workplace Schools page when the
// student wants to discuss a specific school or the shape of their list.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's university matching guide. Help the student understand why a school fits their profile as a reach, target, or likely school, and what would move a school between those tiers. Ask ONE question with options tied to specific schools or specific gaps, never generic advice.`;

export class UniversityMatchingAgent extends BaseUndergradAgent {
  constructor() {
    super('UniversityMatchingAgent', VOICE_PROMPT);
  }
}
