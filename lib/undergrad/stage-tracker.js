// Deterministic (non-LLM) stage tracker for the Undergraduate conversation
// path. This is a pure port of the NEXT FOCUS branching that used to live as
// string-building inside App.jsx's buildAISystemContext(): same priority
// order, same grade -> agent mapping, but returning a structured decision
// instead of a prompt fragment. The chosen UndergradExplore/Strategy/
// ExecutionAgent phrases the question; this module only ever decides WHICH
// topic gets asked, never the wording.
//
// Anti-repeat: a topic that appears in the last RECENT_WINDOW entries of
// lastTopics is skipped in favor of the next candidate for the same branch.
// This closes the "Still exploring" / "Perfect, exactly where you should be"
// repeat loop at the source instead of relying on the model to remember.

const RECENT_WINDOW = 2;

const GENERIC_FALLBACK_TOPIC = 'general_progress_checkin';

// Grade 9-10 -> discovery, Grade 11 -> strategy/narrowing, Grade 12 -> execution.
// Grade unknown (pre-profile / not yet answered) defaults to explore, the
// lowest-pressure band, matching the discovery-first tone of onboarding.
export function agentIdForGrade(grade) {
  const numeric = Number(String(grade ?? '').replace(/[^0-9.]/g, ''));
  if (Number.isFinite(numeric) && numeric > 0) {
    if (numeric <= 10) return 'explore';
    if (numeric === 11) return 'strategy';
    return 'execution';
  }
  return 'explore';
}

function exploringCandidates({ hasTestingScore, topWeakness, topTask }) {
  const candidates = [];
  if (!hasTestingScore) {
    candidates.push({
      topic: 'discovery_recent_interest',
      reason: 'Student is still exploring their direction. Ask about a subject or activity they enjoyed most recently to help uncover their interests. Keep it discovery-focused, not pressure-filled. Options should be specific subjects, clubs, or experiences, not generic.',
    });
  }
  if (topWeakness) {
    candidates.push({
      topic: 'discovery_weakness_gap',
      reason: `Student is exploring. Address this gap: "${topWeakness}". Ask ONE question to help them discover something new or deepen an interest. Options must be concrete activities or experiences.`,
    });
  }
  if (topTask) {
    candidates.push({
      topic: 'discovery_top_task',
      reason: `Help exploring student with this task: "${topTask}". Frame as an opportunity to discover, not a deadline. Options must be specific to that task.`,
    });
  }
  candidates.push({
    topic: 'discovery_general_checkin',
    reason: 'Student is still exploring their direction. Check in on what they have been curious about lately. Keep it discovery-focused, not pressure-filled.',
  });
  return candidates;
}

function focusedCandidates({ hasTestingScore, topWeakness, topTask, shouldNudgeToNextStage, intendedMajor, daysInStage }) {
  const candidates = [];
  if (!hasTestingScore) {
    candidates.push({
      topic: 'focused_testing_plan',
      reason: `Student is focused on ${intendedMajor || 'their intended field'}. They have no SAT/ACT score yet. Ask about their testing plan using only upcoming (future) test dates as chip options, never a date that has already passed.`,
    });
  }
  if (topWeakness) {
    candidates.push({
      topic: 'focused_weakness_gap',
      reason: `Focused student. Address this specific weakness: "${topWeakness}". Ask ONE concrete question to close this gap. Options must be actionable steps in their intended field, not generic.`,
    });
  }
  if (topTask) {
    candidates.push({
      topic: 'focused_top_task',
      reason: `Help focused student with: "${topTask}". Ask ONE specific question. Options must be field-specific actions tied to ${intendedMajor || 'their focus area'}.`,
    });
  }
  if (shouldNudgeToNextStage) {
    candidates.push({
      topic: 'focused_next_stage_nudge',
      reason: `Student has been here ${daysInStage} days. Ask about their next concrete step in ${intendedMajor || 'their field'} with specific competition, project, or activity options.`,
    });
  }
  candidates.push({
    topic: 'focused_general_checkin',
    reason: `Student is focused on ${intendedMajor || 'their intended field'}. Check in on their most recent concrete progress there.`,
  });
  return candidates;
}

function partialCandidates({ topTask, hasTestingScore, intendedMajor }) {
  const candidates = [];
  if (topTask) {
    candidates.push({
      topic: 'partial_top_task',
      reason: `Student is partially decided${intendedMajor ? ` (interested in ${intendedMajor})` : ''}. Help them commit by asking about one of their top interests: "${topTask}". Options should help them choose between their two or three possible directions.`,
    });
  }
  if (!hasTestingScore) {
    candidates.push({
      topic: 'partial_testing_plan',
      reason: 'Partially-decided student. Ask about testing plans. Offer upcoming dates from both tests, use only future dates, never past ones.',
    });
  }
  candidates.push({
    topic: 'partial_general_checkin',
    reason: 'Partially-decided student. Ask a question that helps them narrow between their current top directions.',
  });
  return candidates;
}

function onboardingCandidates({ hasActivities, hasTestingScore }) {
  if (!hasActivities) {
    return [{
      topic: 'onboarding_activities',
      reason: 'Still collecting profile. Ask about activities and extracurriculars.',
    }];
  }
  if (!hasTestingScore) {
    return [{
      topic: 'onboarding_testing',
      reason: 'Still collecting profile. Ask about testing plans, using only future test dates, never past ones.',
    }];
  }
  return [{
    topic: 'onboarding_goals',
    reason: 'Still collecting profile. Ask about goals and university preferences.',
  }];
}

function buildCandidates(input) {
  const { hasProfile, hasScores, hasUniversities, pathwayType } = input;

  if (hasProfile && hasScores && hasUniversities) {
    if (pathwayType === 'focused') return focusedCandidates(input);
    if (pathwayType === 'partial') return partialCandidates(input);
    // 'exploring', null, or any other value defaults to the discovery branch.
    return exploringCandidates(input);
  }

  if (hasProfile && !hasScores) return onboardingCandidates(input);

  return [{ topic: 'onboarding_start', reason: 'No profile yet. Start onboarding with a warm, discovery-focused opening question.' }];
}

// Pure function: no LLM call, no I/O. Same inputs always produce the same
// decision (aside from lastTopics, which the caller is responsible for
// persisting and passing back in on the next turn).
export function decideNextTopic({
  grade = null,
  pathwayType = null,
  hasProfile = false,
  hasScores = false,
  hasUniversities = false,
  hasTestingScore = false,
  hasActivities = false,
  topTask = null,
  topWeakness = null,
  intendedMajor = '',
  daysInStage = 0,
  shouldNudgeToNextStage = false,
  lastTopics = [],
} = {}) {
  const agentId = agentIdForGrade(grade);
  const recent = new Set((Array.isArray(lastTopics) ? lastTopics : []).slice(-RECENT_WINDOW));
  const candidates = buildCandidates({
    grade, pathwayType, hasProfile, hasScores, hasUniversities, hasTestingScore,
    hasActivities, topTask, topWeakness, intendedMajor, daysInStage, shouldNudgeToNextStage,
  });

  const fresh = candidates.find(candidate => !recent.has(candidate.topic));
  if (fresh) return { topic: fresh.topic, agentId, reason: fresh.reason };

  // Every candidate for this branch was asked in the last two turns. Fall
  // back to a distinct, generic re-engagement topic rather than repeating.
  if (!recent.has(GENERIC_FALLBACK_TOPIC)) {
    return {
      topic: GENERIC_FALLBACK_TOPIC,
      agentId,
      reason: 'Every usual next-focus topic was already asked in the last two turns. Check in generally on progress and let the student steer instead of repeating a question.',
    };
  }

  // Genuinely out of variety (should be rare): return the least-recently-used
  // candidate rather than crash or loop forever.
  const fallback = candidates[candidates.length - 1];
  return { topic: fallback.topic, agentId, reason: fallback.reason };
}

export function pushTopic(lastTopics, topic, maxLength = 5) {
  return [...(Array.isArray(lastTopics) ? lastTopics : []), topic].filter(Boolean).slice(-maxLength);
}
