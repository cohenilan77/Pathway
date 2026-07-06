// Candidate-facing selectors for the undergrad Dashboard mini calendar and the
// Roadmap/Tracker tabs. Pure read helpers over the stored undergrad state.

import { DAY_MS, ROADMAP_SECTIONS } from './constants.js';
import { ensureUndergradState } from './store.js';

const dayMs = (d) => new Date(d).getTime();
const startOfDay = (now) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };

function calendarItems(state) {
  return (state.calendar || []).filter(e => e.visibility !== 'consultant' && e.date && Number.isFinite(dayMs(e.date)));
}

// Mini calendar summary (Part 1): Today, This week, Overdue, Next deadline,
// Next consultant check-in.
export function miniCalendar(rawState, now = Date.now()) {
  const state = ensureUndergradState(rawState);
  const today0 = startOfDay(now);
  const todayEnd = today0 + DAY_MS;
  const weekEnd = today0 + 7 * DAY_MS;
  const events = calendarItems(state);

  const inRange = (e, lo, hi) => e.date && dayMs(e.date) >= lo && dayMs(e.date) < hi;

  const today = events.filter(e => inRange(e, today0, todayEnd));
  const thisWeek = events.filter(e => inRange(e, today0, weekEnd));
  const overdue = events.filter(e => e.date && dayMs(e.date) < today0 && e.status !== 'done'
    && ['due_date', 'application_deadline', 'test_date'].includes(e.type));

  const nextDeadline = events
    .filter(e => ['due_date', 'application_deadline', 'test_date'].includes(e.type) && e.date && dayMs(e.date) >= now)
    .sort((a, b) => dayMs(a.date) - dayMs(b.date))[0] || null;

  const nextConsultantCheckIn = (state.calendar || [])
    .filter(e => (e.type === 'consultant_review_date' || e.type === 'consultant_check_in') && e.date && dayMs(e.date) >= now)
    .sort((a, b) => dayMs(a.date) - dayMs(b.date))[0] || null;

  return { today, thisWeek, overdue, nextDeadline, nextConsultantCheckIn, counts: { today: today.length, thisWeek: thisWeek.length, overdue: overdue.length } };
}

// Roadmap grouped by section for the full Roadmap tab.
export function roadmapBySection(rawState) {
  const state = ensureUndergradState(rawState);
  const grouped = {};
  for (const section of ROADMAP_SECTIONS) grouped[section] = [];
  for (const item of (state.roadmap || [])) {
    (grouped[item.section] || (grouped[item.section] = [])).push(item);
  }
  return grouped;
}

// Unacknowledged reminders the candidate should see.
export function activeReminders(rawState) {
  const state = ensureUndergradState(rawState);
  return (state.reminders || []).filter(r => r.status !== 'acknowledged');
}
