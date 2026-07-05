// ReportAgent — generates a monthly progress summary (parent/candidate report)
// from roadmap progress, completed/overdue tasks, score changes, consultant
// notes, and next-month priorities. Pure and store-driven.

import { DAY_MS } from '../constants.js';
import { latestProgress } from './profile-progress-agent.js';

const dayMs = (d) => new Date(d).getTime();

export function monthlyReport(state, { now = Date.now(), windowDays = 30, candidateName = '' } = {}) {
  const since = now - windowDays * DAY_MS;
  const tasks = state?.tasks || [];
  const roadmap = state?.roadmap || [];

  const completed = tasks.filter(t => t.status === 'done' && (t.updatedAt || 0) >= since);
  const overdue = tasks.filter(t => ['todo', 'in-progress', 'blocked', 'overdue'].includes(t.status) && t.deadline && dayMs(t.deadline) < now);
  const roadmapDone = roadmap.filter(r => r.status === 'done').length;
  const roadmapProgress = roadmap.length ? Math.round((roadmapDone / roadmap.length) * 100) : 0;

  const progress = state?.progress || [];
  const first = progress.find(p => p.at >= since) || progress[0] || null;
  const last = latestProgress(state);
  const scoreChanges = {};
  if (first && last && first !== last) {
    for (const key of Object.keys(last.scores || {})) {
      const before = Number(first.scores?.[key]);
      const after = Number(last.scores?.[key]);
      if (Number.isFinite(after) && Number.isFinite(before) && before !== after) {
        scoreChanges[key] = { from: before, to: after, delta: after - before };
      }
    }
  }

  const notes = (state?.notes || []).filter(n => (n.createdAt || 0) >= since).map(n => ({ kind: n.kind, body: n.body, nextAction: n.nextAction, followUpDate: n.followUpDate }));

  // Next-month priorities: highest-priority open tasks + this month's roadmap.
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  const nextPriorities = [
    ...tasks.filter(t => ['todo', 'in-progress'].includes(t.status)),
    ...roadmap.filter(r => ['This week', 'This month'].includes(r.section) && r.status !== 'done'),
  ]
    .sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2))
    .slice(0, 6)
    .map(x => ({ title: x.title, area: x.area, priority: x.priority, deadline: x.deadline }));

  return {
    candidateName,
    generatedAt: now,
    windowDays,
    roadmapProgress,
    roadmapDone,
    roadmapTotal: roadmap.length,
    completedTasks: completed.map(t => ({ title: t.title, area: t.area })),
    completedCount: completed.length,
    overdueTasks: overdue.map(t => ({ title: t.title, area: t.area, deadline: t.deadline })),
    overdueCount: overdue.length,
    scoreChanges,
    consultantNotes: notes,
    nextMonthPriorities: nextPriorities,
  };
}
