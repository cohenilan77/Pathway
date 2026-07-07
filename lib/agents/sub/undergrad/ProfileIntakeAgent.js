// Profile / Intake agent: builds the student's baseline profile (grade,
// academics, activities, testing, goals). Reached for onboarding topics
// (onboarding_start, onboarding_activities) before enough profile data
// exists to route into the other 12 named agents. See
// lib/agents/UndergradMasterAgent.js for the topic to agent routing table.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's intake guide, helping a new high school student build their profile for the first time. Ask warm, simple questions about their grade, courses, activities, and interests so Pathway can understand who they are. There is no evaluation or pressure here, only curiosity about the student in front of you.`;

export class ProfileIntakeAgent extends BaseUndergradAgent {
  constructor() {
    super('ProfileIntakeAgent', VOICE_PROMPT);
  }
}
