import { getStore } from '../../store.js';
import { recordCandidateActivity } from '../../candidate-activity.js';

export async function updateCandidateProfile(candidateId, updates) {
  const store = getStore();
  const user = await store.get(`user:${candidateId}`);
  if (!user) throw new Error(`Candidate ${candidateId} not found`);
  const updated = { ...user, ...updates, updatedAt: Date.now() };
  await store.set(`user:${candidateId}`, updated);
  return updated;
}

export async function addCalendarEvent(candidateId, event) {
  const store = getStore();
  const key = `calendar:${candidateId}:events`;
  const events = (await store.get(key)) || [];
  const newEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...event,
    createdAt: Date.now(),
  };
  events.push(newEvent);
  await store.set(key, events);
  return newEvent;
}

export async function getCalendarEvents(candidateId, { from, to } = {}) {
  const store = getStore();
  const events = (await store.get(`calendar:${candidateId}:events`)) || [];
  return events.filter(e => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

export async function removeCalendarEvent(candidateId, eventId) {
  const store = getStore();
  const key = `calendar:${candidateId}:events`;
  const events = (await store.get(key)) || [];
  const filtered = events.filter(e => e.id !== eventId);
  await store.set(key, filtered);
  return { removed: events.length - filtered.length };
}

export async function logAgentInteraction(candidateId, agentName, summary, details = {}) {
  return recordCandidateActivity(candidateId, {
    type: 'agent_call',
    label: `${agentName} call`,
    agent: agentName,
    detail: summary,
    ...details,
  });
}

export async function saveDocument(candidateId, { name, type, content, url }) {
  const store = getStore();
  const key = `docs:${candidateId}`;
  const docs = (await store.get(key)) || [];
  const doc = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    content,
    url,
    uploadedAt: Date.now(),
  };
  docs.push(doc);
  await store.set(key, docs);
  return doc;
}

export async function getDocuments(candidateId, type) {
  const store = getStore();
  const docs = (await store.get(`docs:${candidateId}`)) || [];
  return type ? docs.filter(d => d.type === type) : docs;
}

function scholarshipDedupeKey(record) {
  return record.id || String(record.name || '').toLowerCase();
}

export async function getScholarships(candidateId) {
  const store = getStore();
  return (await store.get(`scholarships:${candidateId}`)) || [];
}

// Dedupes by id (db-sourced) or lowercased name (web-sourced) — saving the
// same scholarship twice updates it in place instead of duplicating.
export async function saveScholarshipInterest(candidateId, record) {
  const store = getStore();
  const key = `scholarships:${candidateId}`;
  const existing = (await store.get(key)) || [];
  const next = [...existing.filter(r => scholarshipDedupeKey(r) !== scholarshipDedupeKey(record)), record];
  await store.set(key, next);
  return record;
}

export async function setScholarshipStatus(candidateId, idOrName, status) {
  const store = getStore();
  const key = `scholarships:${candidateId}`;
  const existing = (await store.get(key)) || [];
  const needle = String(idOrName || '').toLowerCase();
  const next = existing.map(r => (r.id === idOrName || scholarshipDedupeKey(r) === needle) ? { ...r, status } : r);
  await store.set(key, next);
  return next;
}
