import { normalizeProgramList } from './program-normalizer.js';

export const JOURNEY_STAGES = ['profile', 'recommender', 'analysis', 'programs', 'narrative', 'fit', 'cv', 'essay', 'interview', 'complete'];
export const PATCH_FIELDS = new Set(['profile', 'scores', 'strengths', 'weaknesses', 'tasks', 'programs', 'chosenSchools', 'narrative', 'narrativeText', 'narrativeCoaching', 'documents', 'essays', 'interviews', 'calendarEvents', 'preferences', 'journeyStage', 'stepIdx', 'scholarships']);

const TAGS = ['PROFILE', 'SCORES', 'STRENGTHS', 'WEAKNESSES', 'TASKS', 'PROGRAMS', 'CHOSEN_SCHOOLS', 'INSIGHTS', 'ESSAY', 'INTERVIEW_RESULT'];

function extract(raw, tag) {
  const match = String(raw || '').match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return undefined;
  try { return JSON.parse(match[1].trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return undefined; }
}

export function visibleAdvisorMessage(raw) {
  return String(raw || '')
    .replace(new RegExp(`<(${TAGS.join('|')})>[\\s\\S]*?<\\/\\1>`, 'gi'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function statePatchFromRaw(raw) {
  const patch = {};
  const map = {
    PROFILE: 'profile', SCORES: 'scores', STRENGTHS: 'strengths', WEAKNESSES: 'weaknesses',
    TASKS: 'tasks', PROGRAMS: 'programs', CHOSEN_SCHOOLS: 'chosenSchools', INSIGHTS: 'insights',
  };
  for (const [tag, field] of Object.entries(map)) {
    const value = extract(raw, tag);
    if (value !== undefined) patch[field] = field === 'programs' ? normalizeProgramList(value) : value;
  }
  const essay = extract(raw, 'ESSAY');
  if (essay?.school) patch.essays = { [essay.school]: { question: essay.question || '', text: essay.text || '' } };
  const interview = extract(raw, 'INTERVIEW_RESULT');
  if (interview?.school) patch.interviews = { [interview.school]: interview };
  return patch;
}

export function validateStatePatch(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('State patch must be an object.');
  const patch = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'insights') { patch.insights = value; continue; }
    if (!PATCH_FIELDS.has(key)) continue;
    if (key === 'programs') patch.programs = normalizeProgramList(Array.isArray(value) ? value : []) || [];
    else if (key === 'chosenSchools') patch.chosenSchools = [...new Set((Array.isArray(value) ? value : []).filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))];
    else if (key === 'journeyStage') {
      if (!JOURNEY_STAGES.includes(value)) throw new Error('Invalid journey stage.');
      patch[key] = value;
    } else patch[key] = value;
  }
  return patch;
}

export function nextActionForPatch(patch = {}, message = '') {
  if (patch.programs?.length && !patch.chosenSchools?.length) return { type: 'select_programs', minimum: 1, maximum: 5 };
  if (patch.chosenSchools?.length) return { type: 'answer_narrative_question' };
  if (patch.essays) return { type: 'review_essay' };
  if (patch.interviews) return { type: 'review_interview' };
  return message?.includes('?') ? { type: 'answer_question' } : { type: 'continue' };
}

export function makeAdvisorResponse({ architecture, agent, raw, statePatch, metadata = {}, fallbackUsed = false }) {
  const patch = validateStatePatch(statePatch ?? statePatchFromRaw(raw));
  const message = visibleAdvisorMessage(raw) || 'Your workspace has been updated.';
  return {
    ok: true,
    architecture,
    coordinator: architecture === 'hybrid' ? 'AdvisorCoordinator' : 'LegacyAdvisor',
    agent: agent || (architecture === 'hybrid' ? 'AdvisorAgent' : 'LegacyAdvisor'),
    message,
    raw,
    statePatch: patch,
    nextAction: nextActionForPatch(patch, message),
    metadata: { fallbackUsed, ...metadata },
  };
}
