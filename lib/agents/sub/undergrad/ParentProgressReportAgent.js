// Parent Progress Report agent: produces the calm, plain-language monthly
// update sent to parents. Not reached by the deterministic stage tracker
// topic list (it never talks to the student); invoked directly by the
// consultant/parent-facing report flow.
//
// Wraps lib/undergrad/agents/report-agent.js so the report the parent sees
// draws on the same state as the student's Roadmap and Long Term Tracker.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';
import { monthlyReport } from '../../../undergrad/agents/report-agent.js';

const VOICE_PROMPT = `You are Pathway's parent progress report guide. Summarize a student's recent progress for a parent in calm, plain, encouraging language, focused on real progress and the next concrete step, never alarmist or overly clinical.`;

export class ParentProgressReportAgent extends BaseUndergradAgent {
  constructor() {
    super('ParentProgressReportAgent', VOICE_PROMPT);
  }

  buildReport(state, opts) {
    return monthlyReport(state, opts);
  }
}
