// Pure, serializable store for one undergrad candidate's engine state. Every
// mutator returns a NEW state object and records an EngagementLog entry, so the
// data is structured, stored, and auditable (never a UI-only mockup). Persisted
// as `candidateState.undergrad` in the existing session blob.

import { makeLogEntry, makeTestingPlan } from './schemas.js';
import { normalizeUndergradProfile } from '../undergrad-profile.js';

export function emptyUndergradState(candidateId = null) {
  return {
    candidateId,
    profile: {}, // area -> [facts]
    roadmap: [],
    tasks: [],
    calendar: [],
    reminders: [],
    alerts: [],
    progress: [],
    notes: [],
    log: [],
    testingPlan: makeTestingPlan({}, 0),
    applications: [],
    lastActiveAt: null,
    lastSessionSummary: null,
  };
}

export function ensureUndergradState(state, candidateId = null) {
  if (!state || typeof state !== 'object') return emptyUndergradState(candidateId);
  const base = emptyUndergradState(candidateId || state.candidateId || null);
  return {
    ...base,
    ...state,
    profile: { ...(state.profile || {}) },
    roadmap: Array.isArray(state.roadmap) ? state.roadmap : [],
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    calendar: Array.isArray(state.calendar) ? state.calendar : [],
    reminders: Array.isArray(state.reminders) ? state.reminders : [],
    alerts: Array.isArray(state.alerts) ? state.alerts : [],
    progress: Array.isArray(state.progress) ? state.progress : [],
    notes: Array.isArray(state.notes) ? state.notes : [],
    log: Array.isArray(state.log) ? state.log : [],
    testingPlan: state.testingPlan && typeof state.testingPlan === 'object' ? state.testingPlan : base.testingPlan,
    applications: Array.isArray(state.applications) ? state.applications : [],
  };
}

export function logEvent(state, event, payload = {}, now = Date.now()) {
  const s = ensureUndergradState(state);
  return { ...s, log: [...s.log, makeLogEntry(event, payload, now)] };
}

function upsertBy(list, record) {
  const idx = list.findIndex(x => x.id === record.id);
  if (idx === -1) return { list: [...list, record], created: true };
  const next = [...list];
  next[idx] = { ...next[idx], ...record, createdAt: next[idx].createdAt };
  return { list: next, created: false };
}

export function upsertRoadmapItem(state, item, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list, created } = upsertBy(s.roadmap, item);
  const logged = logEvent({ ...s, roadmap: list }, created ? 'roadmap_item_created' : 'roadmap_item_updated', { id: item.id, title: item.title, section: item.section }, now);
  return logged;
}

export function upsertTask(state, task, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list, created } = upsertBy(s.tasks, task);
  return logEvent({ ...s, tasks: list }, created ? 'task_created' : 'task_updated', { id: task.id, title: task.title, area: task.area }, now);
}

export function completeTask(state, taskId, now = Date.now()) {
  const s = ensureUndergradState(state);
  const idx = s.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return s;
  const tasks = [...s.tasks];
  tasks[idx] = { ...tasks[idx], status: 'done', updatedAt: now, lastUpdateAt: now };
  return logEvent({ ...s, tasks }, 'task_completed', { id: taskId, title: tasks[idx].title }, now);
}

export function upsertCalendarEvent(state, event, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list, created } = upsertBy(s.calendar, event);
  let next = { ...s, calendar: list };
  if (created) {
    next = logEvent(next, 'calendar_event_created', { id: event.id, type: event.type, date: event.date }, now);
    if (event.type === 'application_deadline' || event.type === 'due_date' || event.type === 'test_date') {
      next = logEvent(next, 'deadline_added', { id: event.id, date: event.date, title: event.title }, now);
    }
    if (event.type === 'milestone') {
      next = logEvent(next, 'milestone_reached', { id: event.id, title: event.title }, now);
    }
  }
  return next;
}

export function addReminder(state, reminder, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list } = upsertBy(s.reminders, reminder);
  return logEvent({ ...s, reminders: list }, 'reminder_sent', { id: reminder.id, taskId: reminder.taskId, title: reminder.title }, now);
}

export function markReminderIgnored(state, reminderId, now = Date.now()) {
  const s = ensureUndergradState(state);
  const idx = s.reminders.findIndex(r => r.id === reminderId);
  if (idx === -1) return s;
  const reminders = [...s.reminders];
  reminders[idx] = { ...reminders[idx], status: 'ignored', updatedAt: now };
  return logEvent({ ...s, reminders }, 'reminder_ignored', { id: reminderId }, now);
}

export function addAlert(state, alert, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list } = upsertBy(s.alerts, alert);
  return logEvent({ ...s, alerts: list }, 'consultant_alerted', { id: alert.id, reason: alert.reason, severity: alert.severity }, now);
}

export function addProgress(state, snapshot, now = Date.now()) {
  const s = ensureUndergradState(state);
  const changed = snapshot.changes && Object.keys(snapshot.changes).length > 0;
  let next = { ...s, progress: [...s.progress, snapshot] };
  if (changed) next = logEvent(next, 'profile_score_changed', { changes: snapshot.changes }, now);
  return next;
}

export function addNote(state, note, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list } = upsertBy(s.notes, note);
  return { ...s, notes: list };
}

export function upsertTestingPlan(state, patch = {}, now = Date.now()) {
  const s = ensureUndergradState(state);
  const testingPlan = makeTestingPlan({ ...s.testingPlan, ...patch }, now);
  return logEvent({ ...s, testingPlan }, 'testing_plan_updated', { status: testingPlan.status, targetScore: testingPlan.targetScore }, now);
}

export function upsertApplication(state, application, now = Date.now()) {
  const s = ensureUndergradState(state);
  const { list, created } = upsertBy(s.applications, application);
  return logEvent({ ...s, applications: list }, created ? 'application_created' : 'application_updated', { id: application.id, schoolName: application.schoolName, submissionStatus: application.submissionStatus }, now);
}

export function touchActivity(state, now = Date.now()) {
  const s = ensureUndergradState(state);
  return { ...s, lastActiveAt: now };
}

export function recordMonthlySnapshot(state, { profile = {}, scores = {}, message = '', tasks = [] } = {}, now = Date.now()) {
  const s = ensureUndergradState(state);
  const normalized = normalizeUndergradProfile({ ...profile, category: 'Undergraduate' });
  const month = new Date(now).toISOString().slice(0, 7);
  const snapshots = Array.isArray(s.profile.monthlySnapshots) ? [...s.profile.monthlySnapshots] : [];
  const update = String(message || '').trim().slice(0, 240);
  const nextTasks = (tasks || []).map(task => task.header || task.title).filter(Boolean).slice(0, 5);
  const existingIndex = snapshots.findIndex(item => item.month === month);
  const snapshot = {
    month,
    grade: String(normalized.grade || ''),
    updates: [...new Set([...(existingIndex >= 0 ? snapshots[existingIndex].updates || [] : []), ...(update ? [update] : [])])].slice(-12),
    kpiChanges: { ...(existingIndex >= 0 ? snapshots[existingIndex].kpiChanges || {} : {}), ...(scores || {}) },
    nextTasks,
  };
  if (existingIndex >= 0) snapshots[existingIndex] = snapshot;
  else snapshots.push(snapshot);
  const kpiHistory = Array.isArray(s.profile.kpiHistory) ? [...s.profile.kpiHistory] : [];
  if (scores && Object.keys(scores).length) kpiHistory.push({ month, scores: { ...scores }, at: now });
  return {
    ...s,
    profile: {
      ...s.profile,
      profileStage: normalized.profileStage,
      interestCluster: normalized.interestCluster,
      monthlySnapshots: snapshots.slice(-24),
      kpiHistory: kpiHistory.slice(-24),
    },
  };
}
