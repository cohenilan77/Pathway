import { normalizeProfileFacts } from './profile-facts.js';
import { scoreCandidateKPIs } from './kpi-engine.js';
import { scoreProgramFit } from './matching-engine.js';
import { normalizeProgramList } from './program-normalizer.js';

export const KPI_VERSION = 'v1';

export function deterministicKpiEnabled(env = process.env) {
  return String(env.DETERMINISTIC_KPI_ENGINE || '').toLowerCase() === 'true';
}

function replaceTag(raw, tag, value) {
  const source = String(raw || '');
  const pattern = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'i');
  if (!pattern.test(source)) return source;
  return source.replace(pattern, `<${tag}>${JSON.stringify(value)}</${tag}>`);
}

function evidenceCount(facts) {
  return [
    facts.academics.gpa != null || !!facts.academics.transcriptStrength,
    facts.testing.testScore != null || facts.testing.testOptional,
    facts.experience.workYears != null,
    facts.experience.achievements.length > 0 || facts.experience.quantifiedImpact.length > 0,
    facts.leadership.managedPeople || facts.leadership.ledProjects.length > 0 || !!facts.leadership.leadershipScope,
    facts.activities.activities.length > 0 || !!facts.activities.strongestActivity,
    facts.research.researchExperience.length > 0 || facts.research.publications.length > 0 || !!facts.research.thesis,
    !!facts.narrative.careerGoal || !!facts.narrative.whyDegree || !!facts.narrative.whyNow,
  ].filter(Boolean).length;
}

export function buildDeterministicAdvisorContext(candidateState = {}) {
  if (!deterministicKpiEnabled()) return '';
  const profile = candidateState.profile || {};
  const facts = normalizeProfileFacts(profile, candidateState.scores || {}, { chosenSchools: candidateState.chosenSchools });
  if (evidenceCount(facts) < 2) return '';
  const result = scoreCandidateKPIs(facts);
  return `DETERMINISTIC KPI ENGINE (${KPI_VERSION}) — AUTHORITATIVE CODE-CALCULATED RESULT:\nScores: ${JSON.stringify(result.scores)}\nScore details: ${JSON.stringify(result.scoreDetails)}\nStrengths: ${JSON.stringify(result.strengths)}\nWeaknesses: ${JSON.stringify(result.weaknesses)}\nTasks: ${JSON.stringify(result.tasks)}\nMissing fields: ${JSON.stringify(result.missingFields)}\nExplain these results when relevant. Do not recalculate, replace, or contradict these scores. Fit is a readiness index, never an admission probability.`;
}

function withInsightsRaw(raw, insights) {
  return replaceTag(raw, 'INSIGHTS', insights);
}

export function applyDeterministicKpiToResponse(response, { candidateState = {} } = {}) {
  if (!deterministicKpiEnabled() || !response) return response;
  const originalPatch = response.statePatch || {};
  const relevantTurn = !!(originalPatch.profile || originalPatch.scores || originalPatch.programs);
  if (!relevantTurn) return response;

  const profile = { ...(candidateState.profile || {}), ...(originalPatch.profile || {}) };
  const existingScores = { ...(candidateState.scores || {}), ...(originalPatch.scores || {}) };
  const facts = normalizeProfileFacts(profile, existingScores, { chosenSchools: originalPatch.chosenSchools || candidateState.chosenSchools });
  const currentInsights = { ...(candidateState.insights || {}), ...(originalPatch.insights || {}) };

  if (evidenceCount(facts) < 2) {
    const insights = {
      ...currentInsights,
      deterministicKpiEngineFallback: true,
      missingFields: facts.evidence.missingFields,
      deterministicKpiEngine: { enabled: true, version: KPI_VERSION, fallback: true, reason: 'Insufficient normalized profile facts.' },
    };
    return {
      ...response,
      raw: withInsightsRaw(response.raw, insights),
      statePatch: { ...originalPatch, insights },
      metadata: {
        ...(response.metadata || {}), deterministicKpiEngine: true, kpiVersion: KPI_VERSION,
        deterministicKpiEngineFallback: true, missingFields: facts.evidence.missingFields,
      },
    };
  }

  const kpiResult = scoreCandidateKPIs(facts);
  let programs = originalPatch.programs;
  if (Array.isArray(programs)) {
    programs = normalizeProgramList(programs.map(program => scoreProgramFit({ facts, kpiResult, program }))) || programs;
  }
  const insights = {
    ...currentInsights,
    scoreDetails: kpiResult.scoreDetails,
    missingFields: kpiResult.missingFields,
    deterministicKpiEngineFallback: false,
    deterministicKpiEngine: {
      enabled: true,
      version: KPI_VERSION,
      track: kpiResult.track,
      scoredKeys: Object.keys(kpiResult.scores),
      overall: kpiResult.overall,
      fallback: false,
    },
  };
  const statePatch = {
    ...originalPatch,
    scores: kpiResult.scores,
    strengths: kpiResult.strengths,
    weaknesses: kpiResult.weaknesses,
    tasks: kpiResult.tasks,
    insights,
    ...(Array.isArray(programs) ? { programs } : {}),
  };
  let raw = response.raw;
  raw = replaceTag(raw, 'SCORES', statePatch.scores);
  raw = replaceTag(raw, 'STRENGTHS', statePatch.strengths);
  raw = replaceTag(raw, 'WEAKNESSES', statePatch.weaknesses);
  raw = replaceTag(raw, 'TASKS', statePatch.tasks);
  raw = replaceTag(raw, 'INSIGHTS', insights);
  if (Array.isArray(programs)) raw = replaceTag(raw, 'PROGRAMS', programs);
  return {
    ...response,
    raw,
    statePatch,
    metadata: {
      ...(response.metadata || {}),
      deterministicKpiEngine: true,
      kpiVersion: KPI_VERSION,
      scoredKeys: Object.keys(kpiResult.scores),
      overall: kpiResult.overall,
      missingFields: kpiResult.missingFields,
      deterministicKpiEngineFallback: false,
    },
  };
}
