// Hidden per-grade milestone plan for the Undergraduate smart agent
// (lib/agents/UndergradAgent.js) and lib/nagger-plan.js. computeRoadmapGaps()
// reduces ROADMAP_MILESTONES to the unmet subset for a candidate's grade
// band — this drives gentle conversational STEERING and plan-aware nudges,
// never a checklist or "you're behind" message shown to the student (see
// UndergradAgent's HIDDEN PLAN rule).
export const ROADMAP_MILESTONES = {
  '9-10': ['2+ sustained activities', 'subject passion named', 'leadership seed identified', 'story bank started'],
  '11': ['test plan set', 'test date booked', 'school list started (5+ tiered)', 'activity converted to leadership', 'recommender relationships forming'],
  '12': ['essays drafted', 'applications tracked', 'recommenders confirmed'],
};

function parseGrade(grade) {
  const numeric = Number(String(grade ?? '').match(/\d{1,2}/)?.[0] || '');
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function gradeBand(grade) {
  const numeric = parseGrade(grade);
  if (!numeric) return null;
  if (numeric <= 10) return '9-10';
  if (numeric === 11) return '11';
  return '12';
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [];
}

function hasDocType(documents, type) {
  return (documents || []).some(doc => doc?.type === type);
}

function isMilestoneMet(milestone, { profile, undergrad, programs, documents }) {
  const testingPlan = undergrad?.testingPlan || {};
  const applications = Array.isArray(undergrad?.applications) ? undergrad.applications : [];
  switch (milestone) {
    case '2+ sustained activities':
      return toList(profile.activities).length >= 2;
    case 'subject passion named':
      return toList(profile.subjects).length > 0 || !!profile.favoriteSubject;
    case 'leadership seed identified':
    case 'activity converted to leadership':
      return toList(profile.leadership).length > 0;
    case 'story bank started':
      return hasDocType(documents, 'essay_story');
    case 'test plan set':
      return !!testingPlan.status && testingPlan.status !== 'not_started';
    case 'test date booked':
      return Array.isArray(testingPlan.testDates) && testingPlan.testDates.length > 0;
    case 'school list started (5+ tiered)':
      return Array.isArray(programs) && programs.length >= 5;
    case 'recommender relationships forming':
      return applications.some(app => Array.isArray(app.recommendations) && app.recommendations.length > 0);
    case 'essays drafted':
      return hasDocType(documents, 'essay_draft');
    case 'applications tracked':
      return applications.length > 0;
    case 'recommenders confirmed':
      return applications.some(app => (app.recommendations || []).some(r => r.status === 'confirmed'));
    default:
      return false;
  }
}

// Ordered by priority (array order in ROADMAP_MILESTONES). Returns [] when
// the grade is unknown yet — there is no plan to steer toward until the
// first-session intake floor has captured it.
export function computeRoadmapGaps({ profile = {}, undergrad = {}, programs = [], documents = [] } = {}) {
  const band = gradeBand(profile.grade);
  if (!band) return [];
  const milestones = ROADMAP_MILESTONES[band] || [];
  return milestones.filter(milestone => !isMilestoneMet(milestone, { profile, undergrad, programs, documents }));
}

// Pure mutator matching the rest of lib/undergrad/store.js's shape: returns
// a NEW undergrad state with lastSessionSummary set, so UndergradAgent's
// save_session_summary tool can fold it into the same ctx.workingUndergrad
// accumulator every other save_* tool already writes through.
export function applySessionSummary(undergradState, oneLineText, now = Date.now()) {
  const text = String(oneLineText || '').trim().slice(0, 240);
  return { ...undergradState, lastSessionSummary: text ? { text, at: now } : undergradState.lastSessionSummary || null };
}
