// UndergradProfileAgent — extracts and maintains the structured undergrad
// profile graph from chat answers, uploaded files, transcripts, activity lists,
// and consultant notes. Deterministic keyword extraction (the LLM advisor still
// drives conversation; this turns its raw material into structured facts).

import { logEvent } from '../store.js';

const AREA_MATCHERS = [
  ['academics', /\b(gpa|grade point|transcript|coursework|honou?rs class|ap\b|a-?level|ib\b|calculus|physics|biology|chemistry|straight a|class rank)\b/i],
  ['testing', /\b(sat|act|psat|toefl|ielts|duolingo|test date|practice test|superscore|subject test)\b/i],
  ['activities', /\b(club|team|debate|robotics|orchestra|band|sport|varsity|society|extracurricular|activity)\b/i],
  ['leadership', /\b(president|captain|founder|led|leader|organized|head of|chair)\b/i],
  ['awards', /\b(award|medal|prize|olympiad|scholarship|honor roll|finalist|recognition|competition)\b/i],
  ['research', /\b(research|lab|thesis|paper|publication|professor|mentorship|study on)\b/i],
  ['volunteering', /\b(volunteer|community service|nonprofit|charity|tutoring|shelter)\b/i],
  ['projects', /\b(project|built|app|startup|website|portfolio|prototype|maker)\b/i],
  ['majorInterests', /\b(major in|interested in|want to study|planning to study|economics|computer science|engineering|pre-?med|biology major|business)\b/i],
  ['targetCountries', /\b(usa|united states|uk|canada|australia|study abroad|europe|singapore)\b/i],
  ['targetUniversities', /\b(harvard|yale|stanford|mit|princeton|oxford|cambridge|berkeley|ucla|nyu|university of)\b/i],
  ['deadlines', /\b(deadline|due|early action|early decision|regular decision|submit by|application closes)\b/i],
];

const WEAKNESS_MATCHERS = [
  ['weaknesses', /\b(weak|struggling|behind|low gpa|no leadership|lacking|gap in|need to improve|not enough)\b/i],
  ['risks', /\b(risk|at risk|might miss|falling behind|no activities|inactive|dropped)\b/i],
];

function sentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Returns { area: [factStrings] } extracted from the supplied raw material.
export function extractProfileFacts({ text = '', files = [], transcripts = [], activities = [], consultantNotes = [] } = {}) {
  const corpus = [
    text,
    ...(Array.isArray(files) ? files.map(f => (typeof f === 'string' ? f : f?.text || '')) : []),
    ...(Array.isArray(transcripts) ? transcripts : []),
    ...(Array.isArray(consultantNotes) ? consultantNotes.map(n => (typeof n === 'string' ? n : n?.body || '')) : []),
  ].join('\n');

  const facts = {};
  const add = (area, value) => {
    const v = String(value || '').trim();
    if (!v) return;
    if (!facts[area]) facts[area] = [];
    if (!facts[area].includes(v)) facts[area].push(v);
  };

  for (const line of sentences(corpus)) {
    for (const [area, rx] of AREA_MATCHERS) if (rx.test(line)) add(area, line);
    for (const [area, rx] of WEAKNESS_MATCHERS) if (rx.test(line)) add(area, line);
  }
  // Activity lists arrive already structured — map each straight into activities.
  for (const a of (Array.isArray(activities) ? activities : [])) add('activities', typeof a === 'string' ? a : a?.name || a?.title || '');

  return facts;
}

// Merge extracted facts into state.profile (dedupe) and log one update event.
export function applyProfileFacts(state, facts, now = Date.now()) {
  const areas = Object.keys(facts || {});
  if (!areas.length) return state;
  const profile = { ...(state?.profile || {}) };
  const touched = [];
  for (const area of areas) {
    const existing = Array.isArray(profile[area]) ? profile[area] : [];
    const merged = [...existing];
    for (const fact of facts[area]) if (!merged.includes(fact)) merged.push(fact);
    if (merged.length !== existing.length) {
      profile[area] = merged;
      touched.push(area);
    }
  }
  if (!touched.length) return { ...state, profile };
  return logEvent({ ...state, profile }, 'profile_fact_updated', { areas: touched }, now);
}

// Areas whose evidence is empty — used by RoadmapAgent and Nagger as "weak".
export function weakProfileAreas(profile = {}, coreAreas = ['academics', 'testing', 'activities', 'leadership', 'awards', 'research']) {
  return coreAreas.filter(area => !(Array.isArray(profile[area]) && profile[area].length));
}
