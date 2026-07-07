// Activity Upgrade agent: helps a student turn an existing activity or
// weakness into a stronger, more specific commitment (bigger role, outside
// workshop, leadership step). Reached for discovery_weakness_gap and
// focused_weakness_gap topics.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's activity upgrade guide. Help the student take one activity they already do and make it more specific, more advanced, or more visible, such as a bigger role, an outside workshop, or a leadership step. Ask ONE concrete question with options that are real next steps, not generic categories.`;

export class ActivityUpgradeAgent extends BaseUndergradAgent {
  constructor() {
    super('ActivityUpgradeAgent', VOICE_PROMPT);
  }
}
