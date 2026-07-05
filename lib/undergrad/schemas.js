// Factory + normalizer functions for every structured record the engine stores.
// Each returns a fully-shaped, JSON-serializable object with timestamps, so the
// store never persists half-formed records. Pure — `now` is always injected.

import { makeId, slug } from './ids.js';

function ts(now) {
  return typeof now === 'number' ? now : (now instanceof Date ? now.getTime() : Date.now());
}

function isoDay(value, now) {
  if (!value) return null;
  if (typeof value === 'number') return new Date(value).toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? String(value).slice(0, 10) : asDate.toISOString().slice(0, 10);
}

export function makeRoadmapItem(input = {}, now = Date.now()) {
  const created = ts(now);
  const id = input.id || makeId('road', input.candidateId, input.title, input.area, input.section);
  return {
    id,
    candidateId: input.candidateId || null,
    title: input.title || 'Untitled roadmap item',
    description: input.description || '',
    area: input.area || 'Academic depth',
    section: input.section || 'This month',
    owner: input.owner || 'candidate',
    priority: input.priority || 'medium',
    deadline: isoDay(input.deadline, now),
    status: input.status || 'todo',
    expectedImpact: input.expectedImpact || '',
    reminderCadence: input.reminderCadence || 'weekly',
    consultantAlertRule: input.consultantAlertRule || 'alert if no update after 14 days',
    createdAt: input.createdAt || created,
    updatedAt: created,
  };
}

export function makeTask(input = {}, now = Date.now()) {
  const created = ts(now);
  const id = input.id || makeId('task', input.candidateId, input.title, input.area);
  return {
    id,
    candidateId: input.candidateId || null,
    title: input.title || 'Untitled task',
    description: input.description || '',
    area: input.area || 'Academic depth',
    owner: input.owner || 'candidate',
    priority: input.priority || 'medium',
    deadline: isoDay(input.deadline, now),
    status: input.status || 'todo',
    expectedImpact: input.expectedImpact || '',
    reminderCadence: input.reminderCadence || 'weekly',
    consultantAlertRule: input.consultantAlertRule || 'alert if no update after 14 days',
    source: input.source || 'advisor_advice',
    roadmapItemId: input.roadmapItemId || null,
    lastUpdateAt: input.lastUpdateAt || created,
    createdAt: input.createdAt || created,
    updatedAt: created,
  };
}

export function makeCalendarEvent(input = {}, now = Date.now()) {
  const created = ts(now);
  const id = input.id || makeId('cal', input.candidateId, input.type, input.title, isoDay(input.date, now));
  return {
    id,
    candidateId: input.candidateId || null,
    type: input.type || 'due_date',
    title: input.title || 'Untitled event',
    date: isoDay(input.date, now),
    linkedTaskId: input.linkedTaskId || null,
    area: input.area || 'Admin',
    status: input.status || 'scheduled',
    owner: input.owner || 'candidate',
    visibility: input.visibility || 'shared',
    createdAt: input.createdAt || created,
    updatedAt: created,
  };
}

export function makeReminder(input = {}, now = Date.now()) {
  const created = ts(now);
  const id = input.id || makeId('rem', input.candidateId, input.taskId || input.title, isoDay(created, now));
  return {
    id,
    candidateId: input.candidateId || null,
    taskId: input.taskId || null,
    title: input.title || 'Reminder',
    message: input.message || '',
    cadence: input.cadence || 'weekly',
    status: input.status || 'sent', // sent | acknowledged | ignored
    sentAt: input.sentAt || created,
    dueAt: input.dueAt || null,
    createdAt: input.createdAt || created,
    updatedAt: created,
  };
}

export function makeAlert(input = {}, now = Date.now()) {
  const created = ts(now);
  const id = input.id || makeId('alert', input.candidateId, input.reason, input.taskId || '');
  return {
    id,
    candidateId: input.candidateId || null,
    candidateName: input.candidateName || '',
    candidateType: input.candidateType || 'Undergraduate',
    reason: input.reason || 'Attention needed',
    severity: input.severity || 'medium',
    recommendedAction: input.recommendedAction || '',
    relatedTaskId: input.taskId || input.relatedTaskId || null,
    status: input.status || 'open',
    snoozedUntil: input.snoozedUntil || null,
    createdAt: input.createdAt || created,
    updatedAt: created,
  };
}

export function makeProgressSnapshot(input = {}, now = Date.now()) {
  const created = ts(now);
  const scores = { ...(input.scores || {}) };
  const id = input.id || makeId('prog', input.candidateId, created);
  return {
    id,
    candidateId: input.candidateId || null,
    scores,
    changes: input.changes || {},
    note: input.note || '',
    at: input.at || created,
    createdAt: input.createdAt || created,
  };
}

export function makeNote(input = {}, now = Date.now()) {
  const created = ts(now);
  const id = input.id || makeId('note', input.candidateId, input.kind, created);
  return {
    id,
    candidateId: input.candidateId || null,
    author: input.author || 'consultant',
    kind: input.kind || 'call summary', // call summary | parent update | recommendation | next action
    body: input.body || '',
    nextAction: input.nextAction || '',
    followUpDate: isoDay(input.followUpDate, now),
    private: input.private !== false,
    createdAt: input.createdAt || created,
    updatedAt: created,
  };
}

export function makeLogEntry(event, payload = {}, now = Date.now()) {
  const at = ts(now);
  return {
    id: makeId('log', event, at, slug(payload.title || payload.id || '')),
    event,
    at,
    payload,
  };
}
