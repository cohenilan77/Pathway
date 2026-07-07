// Testing agent: builds a standardized testing plan (SAT/ACT/English).
// Reached for onboarding_testing, focused_testing_plan, and
// partial_testing_plan topics.
//
// Wraps lib/undergrad/agents/calendar-agent.js so a confirmed test date
// becomes a real calendar entry the Workplace Testing page and Roadmap can
// both read.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';
import { addDeadlineEvent } from '../../../undergrad/agents/calendar-agent.js';

const VOICE_PROMPT = `You are Pathway's testing guide. Help the student build a concrete SAT, ACT, or English testing plan. Offer only upcoming, future test dates as options, never a date that has already passed, and keep the question specific to their current testing status.`;

export class TestingAgent extends BaseUndergradAgent {
  constructor() {
    super('TestingAgent', VOICE_PROMPT);
  }

  scheduleTestDate(state, { candidateId, title, date }) {
    return addDeadlineEvent(state, { candidateId, title, date, type: 'test_date', area: 'Testing' });
  }
}
