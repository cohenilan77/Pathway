// Glue between the deterministic Undergrad stage tracker (stage-tracker.js)
// and the three grade-band agents. Shared by both live entry points for the
// Undergraduate conversation path:
//   - lib/hybrid-coordinator.js (HybridCoordinator.execute(), used by
//     /api/advisor for unauthenticated candidates and as the hybrid fallback)
//   - lib/agents/MainAgent.js (MainAgent.handle(), used by
//     /api/agents/orchestrate for authenticated candidates)
// Both call runUndergradDeterministicTurn() so the topic decision, agent
// selection, and option formatting only exist in one place. Only ever
// called once the caller has already confirmed
// candidateState.profile.category === 'Undergraduate'.
import { decideNextTopic, pushTopic } from './stage-tracker.js';
import { UndergradExploreAgent } from '../agents/sub/UndergradExploreAgent.js';
import { UndergradStrategyAgent } from '../agents/sub/UndergradStrategyAgent.js';
import { UndergradExecutionAgent } from '../agents/sub/UndergradExecutionAgent.js';
import { formatOptionsAsArrowPipe } from '../agents/tools/respond-with-options.js';

const AGENT_CLASS_BY_ID = {
  explore: UndergradExploreAgent,
  strategy: UndergradStrategyAgent,
  execution: UndergradExecutionAgent,
};

const AGENT_LABEL_BY_ID = {
  explore: 'UndergradExploreAgent',
  strategy: 'UndergradStrategyAgent',
  execution: 'UndergradExecutionAgent',
};

// Prefers the frontend-computed `stage` object (built by App.jsx's
// buildStageContext, sent as a sibling of `profile`/`scores`/etc. on every
// turn) since it already carries the exact fields the tracker needs, and
// falls back to deriving them straight from profile/scores/programs when
// `stage` is absent (e.g. a caller that only has raw candidate state).
function deriveStageInput(candidateState = {}) {
  const profile = candidateState.profile || {};
  const stage = candidateState.stage && typeof candidateState.stage === 'object' ? candidateState.stage : {};
  const scores = candidateState.scores || {};
  const programs = candidateState.programs;
  const tasks = candidateState.tasks;
  const weaknesses = candidateState.weaknesses;

  return {
    grade: stage.grade ?? profile.grade ?? null,
    pathwayType: stage.pathwayType ?? profile.pathwayType ?? null,
    hasProfile: stage.hasProfile ?? !!profile.category,
    hasScores: stage.hasScores ?? !!scores.overall,
    hasUniversities: stage.hasUniversities ?? (Array.isArray(programs) && programs.length > 0),
    hasTestingScore: stage.hasTestingScore ?? (!!scores.testScore && scores.testScore > 0),
    hasActivities: stage.hasActivities ?? (Array.isArray(candidateState.strengths) && candidateState.strengths.length > 0),
    topTask: stage.topTask ?? (Array.isArray(tasks) && tasks.length ? tasks[0] : null),
    topWeakness: stage.topWeakness ?? (Array.isArray(weaknesses) && weaknesses.length ? weaknesses[0] : null),
    intendedMajor: stage.intendedMajor || profile.intendedMajor || profile.major || profile.subjects || '',
    destination: stage.destination || profile.destination || profile.countries || '',
    daysInStage: Number.isFinite(Number(stage.daysInStage)) ? Number(stage.daysInStage) : 0,
    shouldNudgeToNextStage: !!stage.shouldNudgeToNextStage,
  };
}

export async function runUndergradDeterministicTurn({ candidateId, message, candidateState = {}, conversationHistory = [] }) {
  const profile = candidateState.profile || {};
  const lastTopics = Array.isArray(profile.undergradStageTracker?.lastTopics) ? profile.undergradStageTracker.lastTopics : [];
  const stageInput = deriveStageInput(candidateState);
  const decision = decideNextTopic({ ...stageInput, lastTopics });

  const AgentClass = AGENT_CLASS_BY_ID[decision.agentId] || UndergradExploreAgent;
  const agentLabel = AGENT_LABEL_BY_ID[decision.agentId] || 'UndergradExploreAgent';
  const agent = new AgentClass();
  const startedAt = Date.now();

  const result = await agent.respond(candidateId, message, {
    conversationHistory,
    topic: decision.topic,
    reason: decision.reason,
    grade: stageInput.grade,
    intendedMajor: stageInput.intendedMajor,
    destination: stageInput.destination,
    pathwayType: stageInput.pathwayType,
    topTask: stageInput.topTask,
    topWeakness: stageInput.topWeakness,
  });

  // Converted to the existing "-> Option1 | Option2 | Option3" text format
  // here so every caller (both /api/advisor and /api/agents/orchestrate)
  // ships the same shape Advisor.jsx's parseOptions() regex already expects.
  const formattedMessage = formatOptionsAsArrowPipe({ message: result.text, options: result.options });

  return {
    agent: agentLabel,
    message: formattedMessage,
    statePatch: {
      profile: {
        ...profile,
        undergradStageTracker: { lastTopics: pushTopic(lastTopics, decision.topic) },
      },
    },
    metadata: {
      routerSource: 'undergrad_deterministic',
      routedAgent: agentLabel,
      executionPlan: [agentLabel],
      primaryAgent: agentLabel,
      synthesisAgent: null,
      finalAgent: agentLabel,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
      topic: decision.topic,
      topicReason: decision.reason,
      usage: result.usage || null,
    },
  };
}
