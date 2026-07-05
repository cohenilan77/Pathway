// NaggerAgent — the scheduled/checkable follow-up engine. It inspects tasks,
// calendar, reminders, and progress, then CREATES structured reminders,
// follow-up tasks, and consultant alerts (never chat-only). Pure: pass `now`.

import { makeReminder, makeTask } from '../schemas.js';
import { addReminder, upsertTask } from '../store.js';
import { raiseAlert } from './consultant-alert-agent.js';
import { weakProfileAreas } from './undergrad-profile-agent.js';
import { latestProgress } from './profile-progress-agent.js';
import { DAY_MS, THRESHOLDS } from '../constants.js';

const OPEN = new Set(['todo', 'in-progress', 'blocked', 'overdue']);
const dayMs = (d) => new Date(d).getTime();

export function detectOverdueTasks(state, now = Date.now()) {
  return (state?.tasks || []).filter(t => OPEN.has(t.status) && t.deadline && dayMs(t.deadline) < now);
}

export function detectInactive(state, now = Date.now(), thresholdDays = THRESHOLDS.inactiveDays) {
  const last = state?.lastActiveAt;
  if (!last) return false;
  return (now - last) >= thresholdDays * DAY_MS;
}

export function detectIgnoredReminders(state, now = Date.now(), staleDays = THRESHOLDS.reminderIgnoredDays) {
  return (state?.reminders || []).filter(r => r.status === 'sent' && (now - (r.sentAt || 0)) >= staleDays * DAY_MS);
}

export function detectUpcomingDeadlines(state, now = Date.now(), withinDays = THRESHOLDS.deadlineSoonDays) {
  const horizon = now + withinDays * DAY_MS;
  return (state?.calendar || []).filter(e => ['due_date', 'application_deadline', 'test_date'].includes(e.type)
    && e.date && dayMs(e.date) >= now && dayMs(e.date) <= horizon);
}

// Run all checks and materialize reminders / follow-up tasks / consultant alerts.
// Returns { state, created: { reminders, followUps, alerts } }.
export function runNagger(state, { now = Date.now(), candidateId = null, candidateName = '', candidateType = 'Undergraduate' } = {}) {
  let next = state;
  const created = { reminders: [], followUps: [], alerts: [] };

  const alert = (opts) => {
    const res = raiseAlert(next, { candidateId, candidateName, candidateType, ...opts }, now);
    next = res.state;
    if (res.alert) created.alerts.push(res.alert);
  };
  const remind = (opts) => {
    const rem = makeReminder({ candidateId, ...opts }, now);
    next = addReminder(next, rem, now);
    created.reminders.push(rem);
  };
  const followUp = (opts) => {
    const task = makeTask({ candidateId, source: 'nagger_follow_up', ...opts }, now);
    next = upsertTask(next, task, now);
    created.followUps.push(task);
  };

  // 1. Overdue tasks → reminder + follow-up + consultant alert if important.
  for (const t of detectOverdueTasks(next, now)) {
    remind({ taskId: t.id, title: `Overdue: ${t.title}`, message: `"${t.title}" is past its deadline. Let’s get it moving.`, cadence: t.reminderCadence });
    if (t.priority === 'high' || t.priority === 'urgent') {
      alert({ reason: `Important task overdue: ${t.title}`, severity: t.priority === 'urgent' ? 'critical' : 'high', recommendedAction: 'Check in with the student and re-plan this task.', taskId: t.id });
    }
  }

  // 2. Inactive candidate → reminder + alert + a light re-engagement follow-up.
  if (detectInactive(next, now)) {
    remind({ title: 'We miss you', message: 'It’s been a while — a small step this week keeps your roadmap on track.' });
    followUp({ title: 'Reconnect and log recent progress', area: 'Admin', priority: 'medium', deadline: now + 3 * DAY_MS, expectedImpact: 'keeps the roadmap current', consultantAlertRule: 'alert if no update after 7 days' });
    alert({ reason: 'Student inactive', severity: 'medium', recommendedAction: 'Reach out to re-engage the student.' });
  }

  // 3. Ignored reminders → mark ignored + escalate.
  for (const r of detectIgnoredReminders(next, now)) {
    next = { ...next, reminders: next.reminders.map(x => (x.id === r.id ? { ...x, status: 'ignored', updatedAt: now } : x)) };
    next = { ...next, log: [...next.log, { id: `log_ign_${r.id}_${now}`, event: 'reminder_ignored', at: now, payload: { id: r.id } }] };
    alert({ reason: 'Ignored reminder', severity: 'low', recommendedAction: 'Follow up personally; automated reminders are being missed.', taskId: r.taskId });
  }

  // 4. Weak profile areas unchanged → nudge + alert.
  for (const area of weakProfileAreas(next.profile).slice(0, 2)) {
    remind({ title: `Let’s build ${area}`, message: `Your ${area} evidence is still thin. One concrete step this month moves the needle.`, cadence: 'monthly' });
    alert({ reason: `Weak profile area unchanged: ${area}`, severity: 'low', recommendedAction: `Plan a concrete ${area} activity with the student.` });
  }

  // 5. Upcoming deadlines → reminder.
  for (const e of detectUpcomingDeadlines(next, now)) {
    const days = Math.max(0, Math.round((dayMs(e.date) - now) / DAY_MS));
    remind({ taskId: e.linkedTaskId, title: `Deadline in ${days}d: ${e.title}`, message: `"${e.title}" is due in ${days} day${days === 1 ? '' : 's'}.`, cadence: 'weekly', dueAt: dayMs(e.date) });
    if (e.type === 'application_deadline' && days <= 7) {
      alert({ reason: `Application deadline near: ${e.title}`, severity: 'high', recommendedAction: 'Confirm the student is on track to submit.', taskId: e.linkedTaskId });
    }
  }

  return { state: next, created };
}
