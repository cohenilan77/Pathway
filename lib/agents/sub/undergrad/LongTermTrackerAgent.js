// Long Term Tracker agent: general progress check ins across grades, plus
// the next stage nudge when a student has been in one stage too long.
// Reached for discovery_general_checkin, focused_general_checkin,
// focused_next_stage_nudge, partial_general_checkin, and the shared
// general_progress_checkin fallback topic.
//
// Also wraps the deterministic progress-tracking engine
// (lib/undergrad/agents/profile-progress-agent.js and nagger-agent.js) for
// non-conversational callers such as the Roadmap "progress log" and the
// Parent Progress Report agent, so the same progress history is used in
// chat and in the Workplace UI.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';
import { recordProgress, latestProgress, progressSeries } from '../../../undergrad/agents/profile-progress-agent.js';
import { runNagger } from '../../../undergrad/agents/nagger-agent.js';

const VOICE_PROMPT = `You are Pathway's long term tracker, checking in on a high school student's overall momentum. Ask one grounded question about their most recent concrete progress, and let the student steer the conversation rather than repeating a fixed script.`;

export class LongTermTrackerAgent extends BaseUndergradAgent {
  constructor() {
    super('LongTermTrackerAgent', VOICE_PROMPT);
  }

  // Records a progress snapshot and returns the current nagger flags
  // (overdue tasks, inactivity, ignored reminders, upcoming deadlines) for
  // the Workplace Roadmap "progress log" section.
  trackProgress(state, scores, opts = {}) {
    const withSnapshot = recordProgress(state, scores, opts);
    return { state: withSnapshot, latest: latestProgress(withSnapshot), nagger: runNagger(withSnapshot, opts) };
  }

  progressHistory(state, dimension) {
    return progressSeries(state, dimension);
  }
}
