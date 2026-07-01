// Assignment Management System
// Handles creation, tracking, and reminder scheduling for assignments

import { getStore } from './store.js';
import { ASSIGNMENT_STATUSES, REMINDER_SCHEDULE } from './candidate-journey.js';
import { newId } from './auth.js';

export async function createAssignment({
  userId,
  title,
  description,
  journeyType,
  relatedStage,
  dueDate,
  priority = 'medium',
  completionRequirements = [],
  optional = false,
}) {
  const store = getStore();
  const id = newId();
  const now = Date.now();
  const assignment = {
    id,
    userId,
    title,
    description,
    journeyType,
    relatedStage,
    createdAt: now,
    dueDate: new Date(dueDate).getTime(),
    priority,
    status: ASSIGNMENT_STATUSES.notStarted,
    completionRequirements,
    optional,
    reminderSchedule: REMINDER_SCHEDULE.map(r => ({
      ...r,
      sentAt: null,
    })),
    completedAt: null,
    aiFeedback: null,
    feedbackProvidedAt: null,
  };

  await store.sadd(`assignments:byUser:${userId}`, id);
  await store.set(`assignment:${id}`, assignment);
  return assignment;
}

export async function getAssignment(assignmentId) {
  return getStore().get(`assignment:${assignmentId}`);
}

export async function getUserAssignments(userId) {
  const store = getStore();
  const assignmentIds = await store.smembers(`assignments:byUser:${userId}`);
  const assignments = await Promise.all(
    assignmentIds.map(id => store.get(`assignment:${id}`))
  );
  return assignments.filter(Boolean);
}

export async function getUserAssignmentsByStatus(userId, status) {
  const assignments = await getUserAssignments(userId);
  return assignments.filter(a => a.status === status);
}

export async function updateAssignmentStatus(assignmentId, status) {
  const store = getStore();
  const assignment = await store.get(`assignment:${assignmentId}`);
  if (!assignment) return null;

  const updated = {
    ...assignment,
    status,
    completedAt: status === ASSIGNMENT_STATUSES.completed ? Date.now() : assignment.completedAt,
  };

  await store.set(`assignment:${assignmentId}`, updated);
  return updated;
}

export async function markAssignmentCompleted(assignmentId, aiFeedback = null) {
  const store = getStore();
  const assignment = await store.get(`assignment:${assignmentId}`);
  if (!assignment) return null;

  const updated = {
    ...assignment,
    status: ASSIGNMENT_STATUSES.completed,
    completedAt: Date.now(),
    aiFeedback,
    feedbackProvidedAt: aiFeedback ? Date.now() : null,
  };

  await store.set(`assignment:${assignmentId}`, updated);
  return updated;
}

export async function recordReminderSent(assignmentId, reminderType) {
  const store = getStore();
  const assignment = await store.get(`assignment:${assignmentId}`);
  if (!assignment) return null;

  const updated = {
    ...assignment,
    reminderSchedule: assignment.reminderSchedule.map(r => {
      if ((r.daysBeforeDue !== undefined && r.daysBeforeDue === reminderType.daysBeforeDue)
        || (r.daysAfterDue !== undefined && r.daysAfterDue === reminderType.daysAfterDue)) {
        return { ...r, sentAt: Date.now() };
      }
      return r;
    }),
  };

  await store.set(`assignment:${assignmentId}`, updated);
  return updated;
}

export async function getAssignmentReminders(userId) {
  const store = getStore();
  const assignments = await getUserAssignments(userId);
  const reminders = [];

  assignments.forEach(assignment => {
    if (assignment.status === ASSIGNMENT_STATUSES.completed || assignment.status === ASSIGNMENT_STATUSES.cancelled) {
      return; // Skip completed or cancelled assignments
    }

    const now = Date.now();
    const dueDate = new Date(assignment.dueDate);
    const daysSinceDue = Math.floor((now - dueDate) / (24 * 60 * 60 * 1000));
    const daysUntilDue = Math.floor((dueDate - now) / (24 * 60 * 60 * 1000));

    assignment.reminderSchedule.forEach(reminder => {
      const shouldSend = daysSinceDue > 0
        ? (reminder.daysAfterDue !== undefined && daysSinceDue === reminder.daysAfterDue && !reminder.sentAt)
        : (reminder.daysBeforeDue !== undefined && daysUntilDue === reminder.daysBeforeDue && !reminder.sentAt);

      if (shouldSend) {
        reminders.push({
          type: 'assignment-reminder',
          assignmentId: assignment.id,
          userId: assignment.userId,
          title: assignment.title,
          message: `Your assignment "${assignment.title}" is due ${
            daysSinceDue > 0 ? `${daysSinceDue} days ago` : `in ${Math.abs(daysUntilDue)} days`
          }`,
          priority: assignment.priority,
          dueDate: assignment.dueDate,
          reminderType: reminder,
        });
      }
    });
  });

  return reminders;
}

export async function getOverdueAssignments(userId) {
  const assignments = await getUserAssignments(userId);
  const now = Date.now();
  return assignments.filter(a => {
    if (a.status === ASSIGNMENT_STATUSES.completed || a.status === ASSIGNMENT_STATUSES.cancelled) {
      return false;
    }
    return new Date(a.dueDate).getTime() < now;
  });
}

export async function getUpcomingDeadlines(userId, daysAhead = 7) {
  const assignments = await getUserAssignments(userId);
  const now = Date.now();
  const cutoff = now + daysAhead * 24 * 60 * 60 * 1000;

  return assignments
    .filter(a => {
      if (a.status === ASSIGNMENT_STATUSES.completed || a.status === ASSIGNMENT_STATUSES.cancelled) {
        return false;
      }
      const dueTime = new Date(a.dueDate).getTime();
      return dueTime >= now && dueTime <= cutoff;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

export async function cancelAssignment(assignmentId) {
  return updateAssignmentStatus(assignmentId, ASSIGNMENT_STATUSES.cancelled);
}

export async function getAssignmentStats(userId) {
  const assignments = await getUserAssignments(userId);
  return {
    total: assignments.length,
    completed: assignments.filter(a => a.status === ASSIGNMENT_STATUSES.completed).length,
    inProgress: assignments.filter(a => a.status === ASSIGNMENT_STATUSES.inProgress).length,
    notStarted: assignments.filter(a => a.status === ASSIGNMENT_STATUSES.notStarted).length,
    overdue: assignments.filter(a => a.status === ASSIGNMENT_STATUSES.overdue).length,
    cancelled: assignments.filter(a => a.status === ASSIGNMENT_STATUSES.cancelled).length,
  };
}
