// Roadmap agent: turns a student's top task into the next concrete step.
// Reached for discovery_top_task and focused_top_task topics.
//
// Also wraps the deterministic roadmap engine
// (lib/undergrad/agents/roadmap-agent.js) so the Workplace Roadmap page's
// "next best action" / "this week" / "this semester" sections and the chat
// agent draw on the same roadmap state.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';
import { buildRoadmap, syncRoadmap } from '../../../undergrad/agents/roadmap-agent.js';

const VOICE_PROMPT = `You are Pathway's roadmap guide. Help the student make progress on their single most important next step right now. Ask ONE specific question about that task with concrete, actionable options, never a vague "keep going" nudge.`;

export class RoadmapAgent extends BaseUndergradAgent {
  constructor() {
    super('RoadmapAgent', VOICE_PROMPT);
  }

  buildRoadmap(opts) {
    return buildRoadmap(opts);
  }

  syncRoadmap(state, opts) {
    return syncRoadmap(state, opts);
  }
}
