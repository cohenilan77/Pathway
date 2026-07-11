// Session lifecycle for the Narrative Coaching v2 flow (NARRATIVE_COACHING_V2).
// Pure functions except finalizeCoachingSession, which writes an audit log —
// mirrors lib/candidate-stage-flow.js's "no React, no network" pure-module
// style wherever a real side effect isn't required, so the lifecycle logic
// stays directly unit-testable.
import { scorePivot } from './pivot-risk-table.js';
import { getSchoolNeeds, getEmploymentOutcomes, resolveSchoolSlug } from './school-portfolio-needs.js';
import { recordCandidateActivity } from '../candidate-activity.js';

// All target-function keys that actually appear in the curated pivot-risk
// table, used to pull a best-effort target out of the candidate's free-text
// rawGoal without fabricating a match the table doesn't support.
import { PIVOT_RISK_TABLE } from './pivot-risk-table.js';

const TARGET_FUNCTION_KEYS = [...new Set(Object.values(PIVOT_RISK_TABLE).flatMap(row => Object.keys(row)))];

function extractTargetFunction(rawGoal) {
  const text = String(rawGoal || '').toLowerCase();
  if (!text) return null;
  return TARGET_FUNCTION_KEYS.find(key => text.includes(key.replace(/_/g, ' '))) || null;
}

function firstTargetSchoolName(candidateState = {}) {
  const chosen = Array.isArray(candidateState.chosenSchools) ? candidateState.chosenSchools : [];
  if (chosen[0]) return chosen[0];
  const programs = Array.isArray(candidateState.programs) ? candidateState.programs : [];
  return programs[0]?.name || null;
}

// Computes the one-time session context (pivot risk, school portfolio needs,
// employment outcomes) from the curated data files based on the candidate's
// current industry, stated goal, and target schools. Never fabricates a
// score/context the curated data doesn't actually have — falls back to a
// neutral/null value instead.
export function computeSessionContext(candidateState = {}) {
  const profile = candidateState.profile || {};
  const rawGoal = candidateState.narrativeCoaching?.rawGoal || '';
  const sourceIndustry = profile.currentIndustry || profile.industry || '';
  const targetFunction = extractTargetFunction(rawGoal);
  const pivotRisk = sourceIndustry && targetFunction ? scorePivot(sourceIndustry, targetFunction) : null;

  const schoolName = firstTargetSchoolName(candidateState);
  const schoolSlug = schoolName ? resolveSchoolSlug(schoolName) : null;
  const schoolContext = schoolSlug ? getSchoolNeeds(schoolSlug) : null;
  const outcomeContext = schoolSlug ? getEmploymentOutcomes(schoolSlug) : null;

  return { pivotRisk, schoolContext, outcomeContext };
}

// Called once when the candidate enters the narrative stage with the flag on
// and rawGoal has just been captured. Returns the narrativeCoaching patch the
// coordinator writes to candidateState.narrativeCoaching.
export function startCoachingSession(candidateState = {}) {
  return {
    rawGoal: candidateState?.narrativeCoaching?.rawGoal || null,
    sessionContext: computeSessionContext(candidateState),
  };
}

// True once a coaching session has started (sessionContext computed) but the
// final narrative text has not yet been locked.
export function isCoachingActive(candidateState = {}) {
  return !!candidateState?.narrativeCoaching?.sessionContext && !candidateState?.narrativeText;
}

// Called after save_narrative_text succeeds. Writes an audit log entry and
// returns the patch/system-message the coordinator surfaces to the
// candidate — journeyStage is the one backend-authoritative "current stage"
// signal (lib/advisor-contract.js's JOURNEY_STAGES); the visible stepper
// itself is frontend state driven off statePatch.narrativeText (see
// src/App.jsx), same convention every other stage transition already uses.
export async function finalizeCoachingSession(candidateId, { pivotRiskBand, textLength } = {}) {
  await recordCandidateActivity(candidateId, {
    type: 'narrative_coaching',
    label: 'Narrative locked; stage advanced to CV',
    detail: `textLength=${textLength ?? 'unknown'} pivotRiskBand=${pivotRiskBand ?? 'unknown'}`,
  }).catch(() => {});
  return {
    statePatch: { journeyStage: 'cv' },
    message: 'Locked in. Your narrative is saved — you can view or refine it anytime under Workspace → Documents → Narrative. Ready to rework your CV around this pitch?',
    options: ['Yes, start CV', 'Show me my narrative first', 'Refine narrative again'],
  };
}
