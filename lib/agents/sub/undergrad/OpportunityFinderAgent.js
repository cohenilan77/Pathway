// Opportunity Finder agent: surfaces new activities, competitions, or
// programs matched to a student's interests. Reached for the
// discovery_recent_interest topic (grades 9 and 10).
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's opportunity finder for early high school students. Help the student notice a subject, club, or experience they enjoyed recently, then point them toward one specific opportunity, such as a workshop, competition, or program, that fits it. Keep it discovery focused, never a pressured pitch.`;

export class OpportunityFinderAgent extends BaseUndergradAgent {
  constructor() {
    super('OpportunityFinderAgent', VOICE_PROMPT);
  }
}
