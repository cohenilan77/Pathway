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

// ---- Macro journey stages (candidate Roadmap tab) -------------------------
// Six high-level stages the student can understand at a glance: where am I,
// what is next. Progress is blended from real score dimensions + roadmap
// completion + concrete profile/program/document signals. No mock data.
const STAGE_DEFS = [
  { key: 'profile', label: 'Profile', areas: ['Admin', 'Major fit'], scoreKeys: ['goalClarity', 'academic'] },
  { key: 'testing', label: 'Testing', areas: ['Testing'], scoreKeys: ['testScore'] },
  { key: 'experience', label: 'Activities / Experience', areas: ['Activities', 'Leadership', 'Volunteering', 'Awards', 'Research', 'Projects'], scoreKeys: ['activities', 'leadership', 'volunteering', 'awards'] },
  { key: 'programs', label: 'Program List', areas: [], scoreKeys: [] },
  { key: 'essays', label: 'Essays / Documents', areas: ['Essays'], scoreKeys: ['narrative'] },
  { key: 'applications', label: 'Applications', areas: ['Applications'], scoreKeys: [] },
];

function clampPct(n) { return Math.max(0, Math.min(100, Math.round(n))); }

function statusFor(pct) {
  if (pct >= 100) return 'Complete';
  if (pct >= 75) return 'On track';
  if (pct >= 40) return 'In progress';
  if (pct > 0) return 'Getting started';
  return 'Not started';
}

export function journeyStages({ undergrad, scores = {}, profile = {}, programs = [], documents = [] } = {}) {
  const state = ensureUndergradState(undergrad);
  const roadmap = state.roadmap || [];
  const tasks = state.tasks || [];
  const openItems = [...roadmap, ...tasks].filter(i => i.status !== 'done' && i.status !== 'cancelled');

  return STAGE_DEFS.map(def => {
    const areaItems = roadmap.filter(i => def.areas.includes(i.area));
    const roadmapPct = areaItems.length
      ? (areaItems.filter(i => i.status === 'done').length / areaItems.length) * 100
      : null;
    const scoreVals = def.scoreKeys.map(k => Number(scores?.[k])).filter(Number.isFinite);
    const scorePct = scoreVals.length ? scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length : null;

    let pct;
    if (def.key === 'programs') {
      const total = (programs || []).length;
      const chosen = (programs || []).filter(p => p.chosen || p.selected).length;
      pct = total === 0 ? 0 : chosen > 0 ? 100 : 60;
    } else if (def.key === 'essays') {
      const docPct = Math.min(100, (documents || []).filter(d => d.status !== 'Archived').length * 34);
      pct = [scorePct, roadmapPct, docPct].filter(v => v != null).reduce((a, b, _, arr) => a + b / arr.length, 0);
    } else if (def.key === 'profile') {
      const fields = ['grade', 'curriculum', 'intendedMajor', 'countries', 'activities'];
      const filled = fields.filter(f => profile?.[f]).length;
      const profilePct = (filled / fields.length) * 100;
      pct = [scorePct, roadmapPct, profilePct].filter(v => v != null).reduce((a, b, _, arr) => a + b / arr.length, 0);
    } else {
      const parts = [scorePct, roadmapPct].filter(v => v != null);
      pct = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
    }
    pct = clampPct(pct);

    const nextItem = openItems.find(i => def.areas.includes(i.area));
    const nextAction = nextItem?.title
      || (def.key === 'programs' && !(programs || []).length ? 'Build your first university shortlist.' : null)
      || DEFAULT_NEXT[def.key];

    return {
      key: def.key,
      label: def.label,
      progress: pct,
      status: statusFor(pct),
      nextAction,
      openCount: openItems.filter(i => def.areas.includes(i.area)).length,
    };
  });
}

const DEFAULT_NEXT = {
  profile: 'Complete your profile basics with your advisor.',
  testing: 'Set your testing plan and target dates.',
  experience: 'Add depth to your strongest activity.',
  programs: 'Review and confirm your target universities.',
  essays: 'Start outlining your personal story.',
  applications: 'Map out application deadlines.',
};
