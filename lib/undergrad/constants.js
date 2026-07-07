// Shared vocabulary for the Undergrad Candidate-Building Engine and the general
// Admin Candidate Control Tower. Kept as plain constants (no React, no I/O) so
// every agent, the store, and the tests share one source of truth.

export const CANDIDATE_TYPES = ['Undergraduate', 'Graduate', 'Postgraduate / Doctoral', 'Personal Development'];

// Only Undergraduate candidates get the roadmap/tracker/calendar engine.
export function isUndergradCandidate(candidateOrType) {
  const type = typeof candidateOrType === 'string'
    ? candidateOrType
    : (candidateOrType?.category || candidateOrType?.candidateType || candidateOrType?.type);
  return String(type || '').trim() === 'Undergraduate';
}

export const ROADMAP_SECTIONS = ['This week', 'This month', 'This semester', 'Summer', 'Application season', 'Submission season'];

// Structured undergrad profile-graph areas.
export const PROFILE_AREAS = [
  'academics', 'testing', 'activities', 'leadership', 'awards', 'research',
  'volunteering', 'projects', 'majorInterests', 'targetCountries', 'targetUniversities',
  'risks', 'weaknesses', 'deadlines',
];

// Progress dimensions tracked over time (superset the profile scoring uses).
export const PROGRESS_DIMENSIONS = [
  'academics', 'testing', 'activities', 'leadership', 'awards', 'research',
  'volunteering', 'majorFit', 'profileDepth', 'essayReadiness', 'applicationReadiness',
];

export const TASK_AREAS = [
  'Academic depth', 'Testing', 'Activities', 'Leadership', 'Awards', 'Research',
  'Volunteering', 'Projects', 'Major fit', 'Essays', 'Applications', 'Admin',
];

export const OWNERS = ['candidate', 'consultant', 'parent'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TASK_STATUSES = ['todo', 'in-progress', 'blocked', 'done', 'overdue', 'cancelled'];
export const REMINDER_CADENCES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];
export const VISIBILITY = ['candidate', 'consultant', 'shared'];

export const CALENDAR_EVENT_TYPES = [
  'due_date', 'reminder_date', 'follow_up_date', 'consultant_review_date',
  'test_date', 'application_deadline', 'milestone', 'consultant_check_in', 'parent_meeting',
];

export const ALERT_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
export const ALERT_STATUSES = ['open', 'snoozed', 'resolved', 'dismissed'];

// Testing plan status (lib/undergrad/schemas.js makeTestingPlan) and
// application submission status (makeApplication), used by the Workplace
// Testing and Applications pages.
export const TESTING_PLAN_STATUSES = ['not_started', 'in_progress', 'complete'];
export const SUBMISSION_STATUSES = ['not_started', 'in_progress', 'submitted'];
export const RECOMMENDATION_STATUSES = ['requested', 'confirmed', 'submitted'];

// Every meaningful event the EngagementLog can record.
export const LOG_EVENTS = [
  'candidate_message', 'advisor_advice', 'file_upload', 'profile_fact_updated',
  'roadmap_item_created', 'roadmap_item_updated', 'task_created', 'task_updated',
  'task_completed', 'milestone_reached', 'deadline_added', 'calendar_event_created',
  'reminder_sent', 'reminder_ignored', 'candidate_inactive', 'consultant_alerted',
  'profile_score_changed', 'roadmap_updated', 'testing_plan_updated',
  'application_created', 'application_updated',
];

export const DAY_MS = 24 * 60 * 60 * 1000;

// Default thresholds used by the Nagger / ConsultantAlert engines. Kept here so
// they are easy to tune and assert in tests.
export const THRESHOLDS = {
  inactiveDays: 7,
  reminderIgnoredDays: 3,
  deadlineSoonDays: 14,
  weakAreaScore: 55,
  weakAreaStaleDays: 21,
  consultantAlertNoUpdateDays: 14,
};
