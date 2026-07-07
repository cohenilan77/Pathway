// UndergradMasterAgent: orchestrates the 13 named Undergraduate agents
// (Profile/Intake, Long-Term Tracker, Activity Upgrade, Opportunity
// Finder, Roadmap, Testing, Academic Strength, Major Direction, University
// Matching, Portfolio Evidence, Essay Narrative, Application Execution,
// Parent Progress Report).
//
// Supersedes lib/undergrad/deterministic-turn.js's 3-agent
// (Explore/Strategy/Execution) grade-band routing while reusing its
// underlying decision engine unchanged: the deterministic, no-LLM topic
// picker in lib/undergrad/stage-tracker.js still decides WHICH topic to
// raise (grade, pathway, and profile-completeness aware, with anti-repeat);
// this module only decides WHICH of the 13 named agents phrases that topic.
//
// Both live entry points for the Undergraduate conversation path call
// handle() on a single instance of this class:
//   - lib/agents/MainAgent.js (MainAgent.handle(), /api/agents/orchestrate)
//   - lib/hybrid-coordinator.js (HybridCoordinator.execute(), /api/advisor)
// Only ever called once the caller has already confirmed
// candidateState.profile.category === 'Undergraduate'.
import { decideNextTopic, pushTopic } from '../undergrad/stage-tracker.js';
import { formatOptionsAsArrowPipe } from './tools/respond-with-options.js';

import { ProfileIntakeAgent } from './sub/undergrad/ProfileIntakeAgent.js';
import { LongTermTrackerAgent } from './sub/undergrad/LongTermTrackerAgent.js';
import { ActivityUpgradeAgent } from './sub/undergrad/ActivityUpgradeAgent.js';
import { OpportunityFinderAgent } from './sub/undergrad/OpportunityFinderAgent.js';
import { RoadmapAgent } from './sub/undergrad/RoadmapAgent.js';
import { TestingAgent } from './sub/undergrad/TestingAgent.js';
import { AcademicStrengthAgent } from './sub/undergrad/AcademicStrengthAgent.js';
import { MajorDirectionAgent } from './sub/undergrad/MajorDirectionAgent.js';
import { UniversityMatchingAgent } from './sub/undergrad/UniversityMatchingAgent.js';
import { PortfolioEvidenceAgent } from './sub/undergrad/PortfolioEvidenceAgent.js';
import { EssayNarrativeAgent } from './sub/undergrad/EssayNarrativeAgent.js';
import { ApplicationExecutionAgent } from './sub/undergrad/ApplicationExecutionAgent.js';
import { ParentProgressReportAgent } from './sub/undergrad/ParentProgressReportAgent.js';

export const UNDERGRAD_AGENT_LABELS = {
  profileIntake: 'ProfileIntakeAgent',
  longTermTracker: 'LongTermTrackerAgent',
  activityUpgrade: 'ActivityUpgradeAgent',
  opportunityFinder: 'OpportunityFinderAgent',
  roadmap: 'RoadmapAgent',
  testing: 'TestingAgent',
  academicStrength: 'AcademicStrengthAgent',
  majorDirection: 'MajorDirectionAgent',
  universityMatching: 'UniversityMatchingAgent',
  portfolioEvidence: 'PortfolioEvidenceAgent',
  essayNarrative: 'EssayNarrativeAgent',
  applicationExecution: 'ApplicationExecutionAgent',
  parentProgressReport: 'ParentProgressReportAgent',
};

const AGENT_CLASS_BY_ID = {
  profileIntake: ProfileIntakeAgent,
  longTermTracker: LongTermTrackerAgent,
  activityUpgrade: ActivityUpgradeAgent,
  opportunityFinder: OpportunityFinderAgent,
  roadmap: RoadmapAgent,
  testing: TestingAgent,
  academicStrength: AcademicStrengthAgent,
  majorDirection: MajorDirectionAgent,
  universityMatching: UniversityMatchingAgent,
  portfolioEvidence: PortfolioEvidenceAgent,
  essayNarrative: EssayNarrativeAgent,
  applicationExecution: ApplicationExecutionAgent,
  parentProgressReport: ParentProgressReportAgent,
};

// Maps every topic id the stage tracker can produce (lib/undergrad/
// stage-tracker.js) to one of the 13 named agents. Topics not reached
// through a chat turn (e.g. academicStrength, universityMatching,
// portfolioEvidence, essayNarrative, parentProgressReport) are still
// registered above for direct, non-chat use from the Workplace UI and
// consultant/parent report flows; they simply have no topic mapped here.
const TOPIC_AGENT_MAP = {
  onboarding_start: 'profileIntake',
  onboarding_activities: 'profileIntake',
  onboarding_testing: 'testing',
  onboarding_goals: 'majorDirection',

  discovery_recent_interest: 'opportunityFinder',
  discovery_weakness_gap: 'activityUpgrade',
  discovery_top_task: 'roadmap',
  discovery_general_checkin: 'longTermTracker',

  focused_testing_plan: 'testing',
  focused_weakness_gap: 'activityUpgrade',
  focused_top_task: 'roadmap',
  focused_next_stage_nudge: 'applicationExecution',
  focused_general_checkin: 'longTermTracker',

  partial_top_task: 'majorDirection',
  partial_testing_plan: 'testing',
  partial_general_checkin: 'longTermTracker',

  general_progress_checkin: 'longTermTracker',
};

const DEFAULT_AGENT_ID = 'longTermTracker';

function agentIdForTopic(topic) {
  return TOPIC_AGENT_MAP[topic] || DEFAULT_AGENT_ID;
}

// Prefers the frontend-computed `stage` object (built by App.jsx's
// buildStageContext, sent as a sibling of `profile`/`scores`/etc. on every
// turn) since it already carries the exact fields the tracker needs, and
// falls back to deriving them straight from profile/scores/programs when
// `stage` is absent (e.g. a caller that only has raw candidate state).
// Ported unchanged from lib/undergrad/deterministic-turn.js.
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

export class UndergradMasterAgent {
  // Returns the same shape lib/undergrad/deterministic-turn.js's
  // runUndergradDeterministicTurn() returned, so downstream consumers
  // (MainAgent.handle, HybridCoordinator.execute, App.jsx's state merge)
  // need no changes: { agent, message, statePatch, metadata }.
  async handle(candidateId, message, { conversationHistory = [], candidateState = {} } = {}) {
    const profile = candidateState.profile || {};
    const lastTopics = Array.isArray(profile.undergradStageTracker?.lastTopics)
      ? profile.undergradStageTracker.lastTopics
      : [];
    const stageInput = deriveStageInput(candidateState);
    const decision = decideNextTopic({ ...stageInput, lastTopics });

    const agentId = agentIdForTopic(decision.topic);
    const agentLabel = UNDERGRAD_AGENT_LABELS[agentId];
    const AgentClass = AGENT_CLASS_BY_ID[agentId] || AGENT_CLASS_BY_ID[DEFAULT_AGENT_ID];
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
    // here so every caller ships the same shape Advisor.jsx's parseOptions()
    // regex already expects.
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
        routerSource: 'undergrad_master_agent',
        routedAgent: agentLabel,
        executionPlan: [agentLabel],
        primaryAgent: agentLabel,
        synthesisAgent: null,
        finalAgent: agentLabel,
        fallbackUsed: !!result.fallbackUsed,
        latencyMs: Date.now() - startedAt,
        topic: decision.topic,
        topicReason: decision.reason,
        usage: result.usage || null,
      },
    };
  }
}
