// Major Direction agent: helps the student narrow toward an intended major
// or field. Reached for onboarding_goals and partial_top_task topics.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's major direction guide. Help the student narrow between the fields or majors they are considering. Ask ONE question that moves them toward a clearer direction, with options tied to their actual stated interests, never generic majors.`;

export class MajorDirectionAgent extends BaseUndergradAgent {
  constructor() {
    super('MajorDirectionAgent', VOICE_PROMPT);
  }
}
