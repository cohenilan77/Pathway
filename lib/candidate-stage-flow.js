// Candidate advisor stage flow — deterministic guardrails that keep the
// journey agent-driven while enforcing the required stage order:
//
//   Profile / CV scan → Analysis / Scores → School list →
//   Choose target schools → Narrative & Strategy → CV optimization →
//   Essays → Interviews
//
// Agents own the wording and the questions inside each stage; this module only
// decides *when* the stepper is allowed to advance, so a later stage can never
// start before its prerequisite. It is a pure module (no React, no network) so
// the behaviour can be unit tested directly.

// --- Graduate degree sub-choice -------------------------------------------
// After the candidate picks the Graduate opening path we still need the exact
// degree before the agent proceeds. These clickable options render as bubbles
// (the trailing "→ a | b | c" is parsed by the chat UI), and the normal input
// stays open so the candidate can type any other degree (MFin, MFA, MDes, MPP,
// Data Science, Finance, and the like).
export const GRADUATE_DEGREE_OPTIONS = ['MBA', 'LLM', 'MA', 'MSc', "Master's", 'MD', 'Other'];

export const GRADUATE_DEGREE_PROMPT =
  `Graduate track it is. Which degree are you targeting? Tap one below, or just type your own (MFin, MFA, MDes, MPP, Data Science, Finance, and so on). → ${GRADUATE_DEGREE_OPTIONS.join(' | ')}`;

export const GRADUATE_DEGREE_OTHER_PROMPT = "Type the exact degree or field you’re targeting.";

// The Graduate opening choice stores a placeholder degree of "Graduate" until a
// specific degree is captured. This is true only while we are still waiting for
// that specific degree.
export function needsGraduateDegree(profile = {}) {
  const category = String(profile?.category || '').trim().toLowerCase();
  if (category !== 'graduate') return false;
  const degree = String(profile?.degree || '').trim();
  return !degree || degree.toLowerCase() === 'graduate';
}

// Resolve a clicked bubble or typed degree into a profile patch.
//   - "Other"            → { other: true }  (ask for the exact degree)
//   - "" / whitespace    → null             (ignore, keep waiting)
//   - anything else      → { category: 'Graduate', degree: <trimmed value> }
export function resolveGraduateDegreeChoice(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^other$/i.test(text)) return { other: true };
  return { category: 'Graduate', degree: text };
}

// --- Stage order enforcement ----------------------------------------------

// Default (graduate / professional) stepper order, mirrors DEFAULT_STEPS in
// src/trackConfig.js. Callers pass their own `steps` array so this stays in
// sync even if labels change; these names are the lookup keys.
const DEFAULT_ORDER = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV', 'Essay', 'Interview'];

function stepIndex(steps, name) {
  const list = Array.isArray(steps) && steps.length ? steps : DEFAULT_ORDER;
  return list.indexOf(name);
}

const CV_INTENT = /\b(cv|resume|r[ée]sum[ée])\b/i;

// True once the Narrative / Strategy stage has genuinely started. That happens
// when target schools are confirmed (the narrative stage begins) or the
// candidate has committed to a narrative direction. It is NOT enough for a reply
// to merely mention the word "narrative".
export function narrativeHasStarted({ chosenSchools = [], narrative = null } = {}) {
  const hasChosen = Array.isArray(chosenSchools) && chosenSchools.length > 0;
  return hasChosen || !!narrative;
}

// Decide the next stepper index, or null for "stay put". This is the single
// guardrail the UI consults after every advisor turn. Prerequisites are hard:
//   - Narrative starts only after target schools are chosen.
//   - CV starts only after the narrative/strategy stage has started, and never
//     just because a reply mentions "CV" or "resume" (the stage bug).
//   - Essays start only after the CV stage is unlocked.
export function computeStageAdvancement({
  stepIdx,
  isUndergrad = false,
  steps = null,
  aiText = '',
  userText = '',
  parsed = {},
  chosenSchools = [],
  narrative = null,
  cvText = '',
} = {}) {
  const ai = String(aiText || '').toLowerCase();
  const user = String(userText || '').toLowerCase();

  if (isUndergrad) {
    if (stepIdx === 0 && parsed.profile?.category) return 1; // Profile → Roadmap
    if (stepIdx === 1 && (ai.includes('activities') || ai.includes('roadmap'))) return 2; // Roadmap → Activities
    if (stepIdx === 2 && (ai.includes('university') || parsed.programs)) return 3; // Activities → Universities
    if (stepIdx === 3 && (ai.includes('sat') || ai.includes('act') || ai.includes('testing') || ai.includes('standardized') || parsed.scores?.testScore)) return 4; // Universities → Testing
    if (stepIdx === 4 && (ai.includes('essay') || parsed.essay)) return 5; // Testing → Essays
    if (stepIdx === 5 && (ai.includes('application') || ai.includes('submit'))) return 6; // Essays → Applications
    return null;
  }

  const CV = stepIndex(steps, 'CV');
  const ESSAY = stepIndex(steps, 'Essay');
  const INTERVIEW = stepIndex(steps, 'Interview');
  const NARRATIVE = stepIndex(steps, 'Narrative');

  const hasChosenSchools = !!(parsed.chosenSchools?.length || (Array.isArray(chosenSchools) && chosenSchools.length));
  const narrativeStarted = narrativeHasStarted({ chosenSchools, narrative });
  // CV only advances on a real intent: the candidate asked to work on their CV
  // or an actual CV/resume was supplied — not because the advisor's reply
  // happened to mention the word.
  const wantsCv = CV_INTENT.test(user) || !!cvText || !!parsed.cv;
  const wantsEssay = ai.includes('essay') || user.includes('essay') || !!parsed.essay;
  const wantsInterview = ai.includes('interview') || ai.includes('mock') || user.includes('interview');

  if (stepIdx === 0 && parsed.profile?.category) return 1; // Profile → Recommender
  if (stepIdx === 2 && parsed.programs) return 3; // Analysis → Programs (school list)
  // Choose target schools → Narrative & Strategy.
  if (NARRATIVE >= 0 && stepIdx === 3 && hasChosenSchools) return NARRATIVE;
  // Narrative & Strategy → CV optimization. Gated on the narrative stage having
  // started AND an explicit CV intent. This is the stage-bug fix.
  if (CV >= 0 && stepIdx >= NARRATIVE && stepIdx < CV && narrativeStarted && wantsCv) return CV;
  // CV optimization → Essays. Only once the CV stage is unlocked.
  if (ESSAY >= 0 && stepIdx === CV && wantsEssay) return ESSAY;
  // Essays → Interviews.
  if (INTERVIEW >= 0 && stepIdx === ESSAY && wantsInterview) return INTERVIEW;
  return null;
}

// --- "You are getting ahead" explainer ------------------------------------

function stageSignals(state = {}) {
  const { scores, programs, chosenSchools, narrative, cvUnlocked } = state;
  return {
    hasScores: !!(scores && (scores.overall != null || Object.keys(scores).length)),
    hasPrograms: Array.isArray(programs) && programs.length > 0,
    hasChosen: Array.isArray(chosenSchools) && chosenSchools.length > 0,
    narrativeStarted: narrativeHasStarted({ chosenSchools, narrative }),
    narrativeChosen: !!narrative,
    cvUnlocked: !!cvUnlocked,
  };
}

// The stage the candidate should focus on right now — the recommended next
// step, used to word the guardrail nudge. This is stricter than the hard
// prerequisites in explainIfTooEarly: narrative stays the focus until a
// direction is actually chosen.
export function requiredNextStage(state = {}) {
  const s = stageSignals(state);
  if (!s.hasScores) return { stage: 'Analysis', message: "Let’s finish your profile and analysis first so every recommendation is grounded in real scores." };
  if (!s.hasPrograms) return { stage: 'School list', message: "Next we build your school list, then choose targets from it." };
  if (!s.hasChosen) return { stage: 'Choose target schools', message: "First choose your target schools from the list, then we shape your narrative." };
  if (!s.narrativeChosen) return { stage: 'Narrative & Strategy', message: "Now let’s shape your Narrative & Strategy." };
  if (!s.cvUnlocked) return { stage: 'CV optimization', message: "With your narrative underway, we can move on to optimizing your CV." };
  return { stage: 'Essays', message: "Your CV stage is unlocked, so essays are the next step." };
}

// Which guardrail stage a free-text request is reaching for, or null when the
// message is not a jump-ahead request.
export function requestedStage(userText = '') {
  const t = String(userText || '').toLowerCase();
  if (/\b(interviews?|mock)\b/.test(t)) return 'Interviews';
  if (/\b(essays?|personal statements?|sop)\b/.test(t)) return 'Essays';
  if (CV_INTENT.test(t)) return 'CV optimization';
  if (/\b(narrative|strategy|story)\b/.test(t)) return 'Narrative & Strategy';
  return null;
}

// If the candidate asks for a stage whose hard prerequisite is not yet met,
// return a short explanation pointing at the current required next step.
// Returns null when the request is in-bounds (the agent handles it normally).
export function explainIfTooEarly(state = {}, userText = '') {
  const wanted = requestedStage(userText);
  if (!wanted) return null;
  const s = stageSignals(state);
  const blocked =
    (wanted === 'Narrative & Strategy' && !s.hasChosen) ||
    (wanted === 'CV optimization' && !s.narrativeStarted) ||
    (wanted === 'Essays' && !s.cvUnlocked) ||
    (wanted === 'Interviews' && !s.cvUnlocked);
  return blocked ? requiredNextStage(state).message : null;
}
