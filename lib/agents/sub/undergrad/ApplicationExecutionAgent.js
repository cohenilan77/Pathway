// Application Execution agent: senior year application logistics,
// deadlines, and checklist items. Reached for focused_next_stage_nudge
// (grade 12) as well as directly from the Workplace Applications page.
//
// Wraps lib/undergrad/agents/task-agent.js and calendar-agent.js so
// application deadlines turn into real tasks and calendar entries shared
// with the Roadmap and Testing agents.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';
import { createTaskFromAdvice } from '../../../undergrad/agents/task-agent.js';
import { addDeadlineEvent } from '../../../undergrad/agents/calendar-agent.js';

const VOICE_PROMPT = `You are Pathway's application execution guide for seniors. Help the student move one application forward right now, such as finalizing a school choice, making progress on an essay, or handling a logistics step. Speak with the urgency senior year deserves, but stay warm and specific.`;

export class ApplicationExecutionAgent extends BaseUndergradAgent {
  constructor() {
    super('ApplicationExecutionAgent', VOICE_PROMPT);
  }

  addDeadline(state, { candidateId, title, date }) {
    return addDeadlineEvent(state, { candidateId, title, date, type: 'application_deadline', area: 'Applications' });
  }

  addChecklistTask(state, advice, opts) {
    return createTaskFromAdvice(state, advice, opts);
  }
}
