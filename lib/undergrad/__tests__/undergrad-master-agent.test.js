import test from 'node:test';
import assert from 'node:assert/strict';

import { UNDERGRAD_AGENT_LABELS } from '../../agents/UndergradMasterAgent.js';
import { decideNextTopic } from '../stage-tracker.js';

// UndergradMasterAgent.handle() makes a real Anthropic API call via
// BaseUndergradAgent.respond(), so it is not exercised end-to-end here.
// These tests cover the pure topic -> agent routing table it builds on top
// of the (already separately tested) stage-tracker decision engine, by
// re-deriving the same mapping the module keeps private.
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

test('UNDERGRAD_AGENT_LABELS registers all 13 named agents', () => {
  const expected = [
    'profileIntake', 'longTermTracker', 'activityUpgrade', 'opportunityFinder',
    'roadmap', 'testing', 'academicStrength', 'majorDirection', 'universityMatching',
    'portfolioEvidence', 'essayNarrative', 'applicationExecution', 'parentProgressReport',
  ];
  assert.deepEqual(Object.keys(UNDERGRAD_AGENT_LABELS).sort(), expected.sort());
  for (const id of expected) {
    assert.ok(typeof UNDERGRAD_AGENT_LABELS[id] === 'string' && UNDERGRAD_AGENT_LABELS[id].endsWith('Agent'));
  }
});

test('every topic decideNextTopic can produce has a registered agent in TOPIC_AGENT_MAP', () => {
  const scenarios = [
    {},
    { hasProfile: true, hasScores: false, hasActivities: false },
    { hasProfile: true, hasScores: false, hasActivities: true, hasTestingScore: false },
    { hasProfile: true, hasScores: false, hasActivities: true, hasTestingScore: true },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'exploring', hasTestingScore: false },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'exploring', hasTestingScore: true, topWeakness: 'Weak writing' },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'exploring', hasTestingScore: true, topTask: 'Join a club' },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'exploring', hasTestingScore: true },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'focused', hasTestingScore: false },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'focused', hasTestingScore: true, shouldNudgeToNextStage: true, daysInStage: 70 },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'focused', hasTestingScore: true },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'partial', topTask: 'Compare two majors' },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'partial', hasTestingScore: false },
    { hasProfile: true, hasScores: true, hasUniversities: true, pathwayType: 'partial' },
  ];

  for (const scenario of scenarios) {
    const decision = decideNextTopic(scenario);
    assert.ok(
      Object.prototype.hasOwnProperty.call(TOPIC_AGENT_MAP, decision.topic),
      `topic "${decision.topic}" from scenario ${JSON.stringify(scenario)} has no registered agent`,
    );
    const agentId = TOPIC_AGENT_MAP[decision.topic];
    assert.ok(UNDERGRAD_AGENT_LABELS[agentId], `agent id "${agentId}" is not registered`);
  }
});
