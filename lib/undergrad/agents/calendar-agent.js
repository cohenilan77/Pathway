// CalendarAgent — turns tasks, roadmap items, and raw deadlines into concrete,
// stored calendar events (due_date, reminder_date, follow_up_date,
// consultant_review_date, test_date, application_deadline). Every undergrad
// deadline therefore always appears in the tracker/calendar.

import { makeCalendarEvent } from '../schemas.js';
import { upsertCalendarEvent } from '../store.js';
import { DAY_MS } from '../constants.js';

const CADENCE_DAYS = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, none: 0 };
const future = (date, now) => date && Number.isFinite(new Date(date).getTime()) && new Date(date).getTime() >= now;

function testish(area, title) {
  return /Testing/i.test(area) || /\b(sat|act|toefl|ielts|psat|exam|test)\b/i.test(title || '');
}

// Build (not store) the calendar events implied by a task.
export function eventsFromTask(task, now = Date.now()) {
  if (!task) return [];
  const events = [];
  const base = {
    candidateId: task.candidateId,
    linkedTaskId: task.id,
    area: task.area,
    owner: task.owner,
    visibility: 'shared',
  };
  if (future(task.deadline, now)) {
    const dueType = /Applications/i.test(task.area) ? 'application_deadline' : testish(task.area, task.title) ? 'test_date' : 'due_date';
    events.push(makeCalendarEvent({ ...base, type: dueType, title: task.title, date: task.deadline }, now));

    const deadlineMs = new Date(task.deadline).getTime();
    const cadence = CADENCE_DAYS[task.reminderCadence] ?? 7;
    if (cadence > 0 && Number.isFinite(deadlineMs)) {
      const reminderMs = deadlineMs - cadence * DAY_MS;
      events.push(makeCalendarEvent({ ...base, type: 'reminder_date', title: `Reminder: ${task.title}`, date: reminderMs > now ? reminderMs : now }, now));
    }
  }
  // Consultant review keyed off the alert rule (default 14 days of no update).
  const reviewDays = /after\s+(\d+)\s+day/i.exec(task.consultantAlertRule || '');
  const days = reviewDays ? Number(reviewDays[1]) : 14;
  events.push(makeCalendarEvent({ ...base, type: 'consultant_review_date', title: `Consultant review: ${task.title}`, date: now + days * DAY_MS, owner: 'consultant', visibility: 'consultant' }, now));
  return events;
}

export function eventsFromRoadmapItem(item, now = Date.now()) {
  if (!item || !future(item.deadline, now)) return [];
  return [makeCalendarEvent({
    candidateId: item.candidateId,
    type: 'milestone',
    title: item.title,
    date: item.deadline,
    area: item.area,
    owner: item.owner,
    visibility: 'shared',
  }, now)];
}

// Store all events implied by a task.
export function syncCalendarForTask(state, task, now = Date.now()) {
  let next = state;
  for (const ev of eventsFromTask(task, now)) next = upsertCalendarEvent(next, ev, now);
  return next;
}

// Store an explicit deadline (e.g. an application deadline the student names).
export function addDeadlineEvent(state, { candidateId, title, date, type = 'application_deadline', area = 'Applications' }, now = Date.now()) {
  if (!future(date, now)) return state;
  const ev = makeCalendarEvent({ candidateId, type, title, date, area, owner: 'candidate', visibility: 'shared' }, now);
  return upsertCalendarEvent(state, ev, now);
}
