// Calendar view-model helpers shared by the admin Control Tower command center
// and the candidate Tracker / Calendar tab. Pure functions over stored tasks +
// calendar events — no React, no I/O, no mock data.

import { DAY_MS } from './constants.js';

const startOfDay = (now) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Short chip tone by task/event kind — maps onto the Pathway accent palette.
export const CALENDAR_TONES = {
  task: '#5b46e0',
  due_date: '#5b46e0',
  application_deadline: '#e0556b',
  test_date: '#c08a1a',
  consultant_review_date: '#2f9e78',
  consultant_check_in: '#2f9e78',
  milestone: '#7c6ef7',
  reminder_date: '#c08a1a',
  follow_up_date: '#c08a1a',
};

export function toneFor(entry) {
  return CALENDAR_TONES[entry.kind === 'task' ? 'task' : entry.type] || '#5b46e0';
}

// Normalize stored tasks + calendar events into a single dated-entry list.
export function toCalendarEntries({ tasks = [], calendar = [] } = {}, { includeConsultant = true } = {}) {
  const entries = [];
  for (const t of (tasks || [])) {
    if (!t?.deadline) continue;
    entries.push({ id: `task-${t.id}`, title: t.title, date: t.deadline, kind: 'task', area: t.area, status: t.status, priority: t.priority });
  }
  for (const e of (calendar || [])) {
    if (!e?.date) continue;
    if (!includeConsultant && e.visibility === 'consultant') continue;
    entries.push({ id: `event-${e.id}`, title: e.title, date: e.date, kind: 'event', type: e.type, area: e.area, status: e.status });
  }
  return entries;
}

function groupByDay(entries) {
  const map = {};
  for (const e of entries) {
    const d = new Date(e.date);
    if (Number.isNaN(d.getTime())) continue;
    (map[dayKey(d)] ||= []).push(e);
  }
  return map;
}

// Build a month grid (weeks of 7 day cells) with entries mapped onto each date.
// month is 0-indexed. Trailing all-out-of-month weeks are trimmed.
export function monthMatrix(year, month, entries = [], now = Date.now()) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);
  const byDay = groupByDay(entries);
  const today = new Date(now);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({
      date: d,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: sameDay(d, today),
      items: byDay[dayKey(d)] || [],
    });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  while (weeks.length > 4 && weeks[weeks.length - 1].every(c => !c.inMonth)) weeks.pop();
  return weeks;
}

// Split open tasks into the smart rail buckets used across both calendars.
export function groupSmartTasks(tasks = [], now = Date.now()) {
  const startToday = startOfDay(now);
  const endToday = startToday + DAY_MS;
  const weekEnd = startToday + 7 * DAY_MS;

  const dueNow = [];
  const thisWeek = [];
  const importantLater = [];
  const completed = [];

  for (const t of (tasks || [])) {
    if (t.status === 'done') { completed.push(t); continue; }
    if (t.status === 'cancelled') continue;
    const dl = t.deadline ? new Date(t.deadline).getTime() : null;
    if (dl != null && !Number.isNaN(dl) && dl < endToday) dueNow.push(t);
    else if (dl != null && !Number.isNaN(dl) && dl < weekEnd) thisWeek.push(t);
    else importantLater.push(t);
  }

  const byDeadline = (a, b) => (new Date(a.deadline || 8.64e15)) - (new Date(b.deadline || 8.64e15));
  const byPriority = (a, b) => (PRIORITY_RANK[b.priority] ?? 1) - (PRIORITY_RANK[a.priority] ?? 1);
  dueNow.sort(byDeadline);
  thisWeek.sort(byDeadline);
  importantLater.sort((a, b) => byPriority(a, b) || byDeadline(a, b));

  return { dueNow, thisWeek, importantLater, completed };
}

const PRIORITY_RANK = { urgent: 3, high: 2, medium: 1, low: 0 };

export function isOverdue(task, now = Date.now()) {
  if (!task?.deadline || ['done', 'cancelled'].includes(task.status)) return false;
  return new Date(task.deadline).getTime() < startOfDay(now);
}
