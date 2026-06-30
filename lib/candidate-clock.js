// Candidate Clock System
// Manages internal candidate clock that tracks all timing events

import { getStore } from './store.js';
import { JOURNEY_TYPES, STAGE_MAX_DURATION } from './candidate-journey.js';

export async function initializeCandidateClock(userId, journeyType) {
  const store = getStore();
  const now = Date.now();
  const clock = {
    userId,
    journeyType,
    firstLoginCompletedAt: now,
    lastLoginAt: now,
    lastPortalActivityAt: now,
    lastAiAdvisorInteractionAt: now,
    currentStageStartedAt: now,
    lastWeeklyCheckInAt: now,
    nextWeeklyCheckInAt: now + 7 * 24 * 60 * 60 * 1000,
    lastMonthlyReviewAt: now,
    nextMonthlyReviewAt: now + 30 * 24 * 60 * 60 * 1000,
    lastReminderSentAt: null,
    nextEligibleReminderAt: now,
    timezone: 'UTC',
    currentNextBestAction: 'Complete your profile',
    stage: 'profile',
    stageNumber: 0,
  };
  await store.set(`candidate:clock:${userId}`, clock);
  return clock;
}

export async function getCandidateClock(userId) {
  const store = getStore();
  return store.get(`candidate:clock:${userId}`);
}

export async function updateCandidateClock(userId, updates) {
  const store = getStore();
  const clock = await getCandidateClock(userId);
  if (!clock) return null;
  const updated = { ...clock, ...updates, userId };
  await store.set(`candidate:clock:${userId}`, updated);
  return updated;
}

export async function touchPortalActivity(userId) {
  return updateCandidateClock(userId, {
    lastPortalActivityAt: Date.now(),
  });
}

export async function touchAiAdvisorInteraction(userId) {
  return updateCandidateClock(userId, {
    lastAiAdvisorInteractionAt: Date.now(),
  });
}

export async function recordReminderSent(userId) {
  return updateCandidateClock(userId, {
    lastReminderSentAt: Date.now(),
    nextEligibleReminderAt: Date.now() + 24 * 60 * 60 * 1000, // Next reminder after 24 hours
  });
}

export async function calculateDaysInCurrentStage(userId) {
  const clock = await getCandidateClock(userId);
  if (!clock || !clock.currentStageStartedAt) return 0;
  return Math.floor(
    (Date.now() - clock.currentStageStartedAt) / (24 * 60 * 60 * 1000)
  );
}

export async function calculateDaysSinceLastLogin(userId) {
  const clock = await getCandidateClock(userId);
  if (!clock || !clock.lastLoginAt) return null;
  return Math.floor(
    (Date.now() - clock.lastLoginAt) / (24 * 60 * 60 * 1000)
  );
}

export async function calculateDaysSinceLastPortalActivity(userId) {
  const clock = await getCandidateClock(userId);
  if (!clock || !clock.lastPortalActivityAt) return null;
  return Math.floor(
    (Date.now() - clock.lastPortalActivityAt) / (24 * 60 * 60 * 1000)
  );
}

export async function isCandidateStuck(userId, journeyType) {
  const clock = await getCandidateClock(userId);
  if (!clock) return false;

  const daysInStage = Math.floor(
    (Date.now() - clock.currentStageStartedAt) / (24 * 60 * 60 * 1000)
  );
  const maxDays = Math.floor(
    STAGE_MAX_DURATION[journeyType] / (24 * 60 * 60 * 1000)
  );

  return daysInStage > maxDays;
}

export async function isStuckCandidateDetails(userId, journeyType, assignments = []) {
  const clock = await getCandidateClock(userId);
  if (!clock) return { stuck: false, reason: null };

  const daysInStage = await calculateDaysInCurrentStage(userId);
  const daysSinceLastPortalActivity = await calculateDaysSinceLastPortalActivity(userId);
  const maxDays = Math.floor(
    STAGE_MAX_DURATION[journeyType] / (24 * 60 * 60 * 1000)
  );

  // Check multiple conditions
  const stuck = {
    tooLongInStage: daysInStage > maxDays,
    hasOverdueAssignments: assignments.some(a => a.status === 'overdue'),
    repeatedlyInactive: daysSinceLastPortalActivity > 7,
    multipleFailedReminders: clock.reminderFailureCount > 2,
  };

  const reason = stuck.tooLongInStage
    ? `Too long in stage (${daysInStage} days > ${maxDays} days)`
    : stuck.hasOverdueAssignments
      ? 'Has overdue assignments'
      : stuck.repeatedlyInactive
        ? `Inactive for ${daysSinceLastPortalActivity} days`
        : stuck.multipleFailedReminders
          ? 'Multiple failed reminders'
          : null;

  return { stuck: Object.values(stuck).some(v => v), reason, details: stuck };
}

export async function advanceStage(userId, newStage, newStageNumber) {
  return updateCandidateClock(userId, {
    stage: newStage,
    stageNumber: newStageNumber,
    currentStageStartedAt: Date.now(),
  });
}

export async function updateNextBestAction(userId, action) {
  return updateCandidateClock(userId, {
    currentNextBestAction: action,
  });
}

export async function isWeeklyCheckInDue(userId) {
  const clock = await getCandidateClock(userId);
  if (!clock) return false;
  return Date.now() >= clock.nextWeeklyCheckInAt;
}

export async function isMonthlyReviewDue(userId) {
  const clock = await getCandidateClock(userId);
  if (!clock) return false;
  return Date.now() >= clock.nextMonthlyReviewAt;
}

export async function markWeeklyCheckInCompleted(userId) {
  const now = Date.now();
  return updateCandidateClock(userId, {
    lastWeeklyCheckInAt: now,
    nextWeeklyCheckInAt: now + 7 * 24 * 60 * 60 * 1000,
  });
}

export async function markMonthlyReviewCompleted(userId) {
  const now = Date.now();
  return updateCandidateClock(userId, {
    lastMonthlyReviewAt: now,
    nextMonthlyReviewAt: now + 30 * 24 * 60 * 60 * 1000,
  });
}
