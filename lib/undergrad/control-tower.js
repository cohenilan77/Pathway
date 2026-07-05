// General Admin Candidate Control Tower (Part 5) + permissions (Part 6).
// GENERAL across all candidate types: undergrad candidates contribute their
// full engine state; graduate/PhD/personal-development candidates contribute
// journey stage + pending next action (and any top-level tasks/alerts they have).
// Pure aggregation — no I/O, no React.

import { DAY_MS, THRESHOLDS, isUndergradCandidate } from './constants.js';
import { detectOverdueTasks, detectUpcomingDeadlines, detectInactive } from './agents/nagger-agent.js';
import { weakProfileAreas } from './agents/undergrad-profile-agent.js';
import { latestProgress } from './agents/profile-progress-agent.js';
import { monthlyReport } from './agents/report-agent.js';

const dayMs = (d) => new Date(d).getTime();

// ---- Permissions (Part 6) -------------------------------------------------
export function filterCandidatesForViewer(candidates = [], viewer = {}) {
  const role = viewer.role || 'candidate';
  if (role === 'admin') return candidates.slice();
  if (role === 'consultant') {
    const assigned = new Set(viewer.assignedCandidateIds || []);
    return candidates.filter(c => assigned.has(c.id) || c.assignedConsultantId === viewer.id);
  }
  // candidate: only their own record
  return candidates.filter(c => c.id === viewer.id);
}

// Normalize any candidate into the fields the tower reads.
export function candidateEngine(candidate = {}) {
  const eng = candidate.undergrad || {};
  return {
    id: candidate.id,
    name: candidate.name || candidate.email || 'Candidate',
    type: candidate.category || candidate.candidateType || candidate.type || 'Undergraduate',
    stage: candidate.stage || candidate.journeyStage || candidate.stageName || null,
    nextAction: candidate.nextAction || null,
    lastActiveAt: eng.lastActiveAt || candidate.lastActiveAt || candidate.lastActive || null,
    assignedConsultantId: candidate.assignedConsultantId || null,
    tasks: eng.tasks || candidate.tasks || [],
    calendar: eng.calendar || candidate.calendar || [],
    reminders: eng.reminders || candidate.reminders || [],
    alerts: eng.alerts || candidate.alerts || [],
    progress: eng.progress || candidate.progress || [],
    notes: eng.notes || candidate.notes || [],
    roadmap: eng.roadmap || [],
    profile: eng.profile || {},
    scores: candidate.scores || (latestProgress(eng)?.scores) || {},
    _undergrad: candidate.undergrad || null,
  };
}

export function nextDeadline(rec, now = Date.now()) {
  const future = (rec.calendar || [])
    .filter(e => e.date && dayMs(e.date) >= now)
    .sort((a, b) => dayMs(a.date) - dayMs(b.date));
  return future[0] || null;
}

export function weakestArea(rec) {
  // Prefer the lowest scored progress dimension; fall back to empty profile area.
  const scores = rec.scores || {};
  const entries = Object.entries(scores).filter(([k, v]) => k !== 'overall' && Number.isFinite(Number(v)));
  if (entries.length) return entries.sort((a, b) => a[1] - b[1])[0][0];
  return weakProfileAreas(rec.profile)[0] || null;
}

export function riskLevel(rec, now = Date.now()) {
  const overdue = detectOverdueTasks(rec, now).length;
  const inactive = detectInactive(rec, now);
  const soon = detectUpcomingDeadlines(rec, now, 7).length;
  const criticalAlerts = (rec.alerts || []).filter(a => a.status === 'open' && (a.severity === 'critical' || a.severity === 'high')).length;
  let score = overdue * 2 + (inactive ? 2 : 0) + soon + criticalAlerts * 3;
  if (score >= 8) return 'critical';
  if (score >= 4) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

// ---- Full tower build (Part 5) --------------------------------------------
export function buildControlTower(candidates = [], { viewer = { role: 'admin' }, now = Date.now() } = {}) {
  const visible = filterCandidatesForViewer(candidates, viewer).map(candidateEngine);

  const todaysPriorities = {
    overdueTasks: [],
    inactiveCandidates: [],
    urgentDeadlines: [],
    consultantReviews: [],
    ignoredReminders: [],
  };
  const riskTable = [];
  const journeyMonitor = [];
  const taskCalendar = [];
  const alerts = [];
  const profileProgress = [];
  const notes = [];

  for (const rec of visible) {
    const tag = { candidateId: rec.id, candidateName: rec.name, candidateType: rec.type };

    for (const t of detectOverdueTasks(rec, now)) todaysPriorities.overdueTasks.push({ ...tag, taskId: t.id, title: t.title, deadline: t.deadline });
    if (detectInactive(rec, now)) todaysPriorities.inactiveCandidates.push({ ...tag, lastActiveAt: rec.lastActiveAt });
    for (const e of detectUpcomingDeadlines(rec, now, 7)) todaysPriorities.urgentDeadlines.push({ ...tag, title: e.title, date: e.date, type: e.type });
    for (const e of (rec.calendar || []).filter(x => x.type === 'consultant_review_date' && x.date && dayMs(x.date) <= now)) todaysPriorities.consultantReviews.push({ ...tag, title: e.title, date: e.date });
    for (const r of (rec.reminders || []).filter(x => x.status === 'ignored')) todaysPriorities.ignoredReminders.push({ ...tag, reminderId: r.id, title: r.title });

    const nd = nextDeadline(rec, now);
    riskTable.push({
      ...tag,
      stage: rec.stage,
      riskLevel: riskLevel(rec, now),
      lastActiveAt: rec.lastActiveAt,
      overdueTaskCount: detectOverdueTasks(rec, now).length,
      nextDeadline: nd ? { title: nd.title, date: nd.date } : null,
      weakestArea: weakestArea(rec),
      recommendedAction: recommendedActionFor(rec, now),
    });

    journeyMonitor.push(isUndergradCandidate(rec.type)
      ? { ...tag, kind: 'roadmap', roadmapProgress: roadmapProgressPct(rec), roadmapTotal: (rec.roadmap || []).length }
      : { ...tag, kind: 'journey', stage: rec.stage, pendingNextAction: rec.nextAction });

    for (const t of (rec.tasks || [])) taskCalendar.push({ ...tag, source: 'task', id: t.id, title: t.title, area: t.area, date: t.deadline, status: t.status, owner: t.owner });
    for (const e of (rec.calendar || [])) taskCalendar.push({ ...tag, source: 'calendar', id: e.id, title: e.title, area: e.area, date: e.date, type: e.type, status: e.status, owner: e.owner });

    for (const a of (rec.alerts || [])) alerts.push({ ...tag, ...a });
    for (const n of (rec.notes || [])) notes.push({ ...tag, ...n });

    const lp = latestProgress(rec._undergrad || rec);
    profileProgress.push({ ...tag, latest: lp?.scores || rec.scores || {}, history: (rec.progress || []).map(p => ({ at: p.at, scores: p.scores })) });
  }

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  riskTable.sort((a, b) => (rank[a.riskLevel] ?? 3) - (rank[b.riskLevel] ?? 3));
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  alerts.sort((a, b) => (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4));
  taskCalendar.sort((a, b) => (dayMs(a.date || 0) || Infinity) - (dayMs(b.date || 0) || Infinity));

  return { generatedAt: now, candidateCount: visible.length, todaysPriorities, riskTable, journeyMonitor, taskCalendar, alerts, profileProgress, notes };
}

function roadmapProgressPct(rec) {
  const rm = rec.roadmap || [];
  if (!rm.length) return 0;
  return Math.round((rm.filter(r => r.status === 'done').length / rm.length) * 100);
}

function recommendedActionFor(rec, now) {
  if (detectOverdueTasks(rec, now).some(t => t.priority === 'urgent' || t.priority === 'high')) return 'Re-plan overdue high-priority tasks with the student.';
  if (detectInactive(rec, now)) return 'Reach out — student has gone quiet.';
  if (detectUpcomingDeadlines(rec, now, 7).length) return 'Confirm readiness for the upcoming deadline.';
  const wa = weakestArea(rec);
  if (wa) return `Plan a concrete step on ${wa}.`;
  return 'On track — routine check-in.';
}

// Report generation for one candidate (Part 5 §8).
export function candidateMonthlyReport(candidate, opts = {}) {
  const rec = candidateEngine(candidate);
  return monthlyReport(rec._undergrad || rec, { candidateName: rec.name, ...opts });
}
