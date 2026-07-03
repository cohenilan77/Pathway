import { normalizeProfileFacts } from './profile-facts.js';
import { assessScoringConfidence, scoreCandidateKPIs } from './kpi-engine.js';
import { balanceMbaPortfolio, scoreProgramFit } from './matching-engine.js';
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
  const confidence = assessScoringConfidence(facts);
  if (confidence.confidence !== 'high') {
    return `DETERMINISTIC KPI ENGINE (${KPI_VERSION}) — SCORING PENDING.\nKnown facts: ${JSON.stringify({ gpa: facts.academics.gpa, testType: facts.testing.testType, testScore: facts.testing.testScore, workYears: facts.experience.workYears })}\nMissing KPI facts: ${JSON.stringify(confidence.missingFields)}\nDo not finalize or invent a deterministic overall score. Ask one compact combined follow-up for the missing facts.`;
  }
  const result = scoreCandidateKPIs(facts);
  return `DETERMINISTIC KPI ENGINE (${KPI_VERSION}) — AUTHORITATIVE CODE-CALCULATED RESULT:\nScores: ${JSON.stringify(result.scores)}\nScore details: ${JSON.stringify(result.scoreDetails)}\nStrengths: ${JSON.stringify(result.strengths)}\nWeaknesses: ${JSON.stringify(result.weaknesses)}\nTasks: ${JSON.stringify(result.tasks)}\nMissing fields: ${JSON.stringify(result.missingFields)}\nExplain these results when relevant. Do not recalculate, replace, or contradict these scores. Fit is a readiness index, never an admission probability.`;
}

function withInsightsRaw(raw, insights) {
  return replaceTag(raw, 'INSIGHTS', insights);
}

function preserveBlocksWithMessage(raw, message) {
  const tags = 'PROFILE|SCORES|STRENGTHS|WEAKNESSES|TASKS|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT';
  const blocks = String(raw || '').match(new RegExp(`<(${tags})>[\\s\\S]*?<\\/\\1>`, 'gi')) || [];
  return `${blocks.join('')}${message}`;
}

function followUpMessage(facts, missingFields) {
  const known = [];
  if (facts.academics.gpa != null) known.push(`GPA ${facts.academics.gpa}`);
  if (facts.testing.testScore != null) known.push(`${facts.testing.testType || 'test'} ${facts.testing.testScore}`);
  if (facts.experience.workYears != null) known.push(`${facts.experience.workYears} years of experience`);
  const opening = known.length ? `I have ${known.join(', ').replace(/, ([^,]*)$/, ', and $1')}.` : 'I have the initial profile facts.';
  return `${opening} To finish the ${facts.track === 'MBA' ? 'MBA ' : ''}score, I still need: ${missingFields.join(', ')}.`;
}

export function applyDeterministicKpiToResponse(response, { candidateState = {} } = {}) {
  if (!deterministicKpiEnabled() || !response) return response;
  const originalPatch = response.statePatch || {};
  const latestMessage = String(candidateState.message || '').trim();
  const explicitScoringTurn = /refresh analysis|here is my (?:cv|resume)|uploaded (?:cv|resume)|submitted (?:a )?(?:cv|resume)/i.test(latestMessage);
  const relevantTurn = !!(originalPatch.profile || originalPatch.scores || originalPatch.programs || explicitScoringTurn);
  if (!relevantTurn) return response;

  const profile = { ...(candidateState.profile || {}), ...(originalPatch.profile || {}) };
  const existingScores = { ...(candidateState.scores || {}), ...(originalPatch.scores || {}) };
  const facts = normalizeProfileFacts(profile, existingScores, { chosenSchools: originalPatch.chosenSchools || candidateState.chosenSchools });
  const currentInsights = { ...(candidateState.insights || {}), ...(originalPatch.insights || {}) };
  const confidence = assessScoringConfidence(facts);

  if (evidenceCount(facts) < 2 || confidence.confidence !== 'high') {
    const missingFields = [...new Set([...facts.evidence.missingFields, ...confidence.missingFields])];
    const previousScores = candidateState.scores && Object.keys(candidateState.scores).length ? candidateState.scores : originalPatch.scores;
    const previousStrengths = candidateState.strengths?.length ? candidateState.strengths : originalPatch.strengths;
    const previousWeaknesses = candidateState.weaknesses?.length ? candidateState.weaknesses : originalPatch.weaknesses;
    const previousTasks = candidateState.tasks?.length ? candidateState.tasks : originalPatch.tasks;
    const basePrograms = candidateState.programs?.length ? candidateState.programs : originalPatch.programs;
    const programs = Array.isArray(basePrograms)
      ? normalizeProgramList(basePrograms.map(program => ({
        ...program,
        riskFlags: [...new Set([...(Array.isArray(program.riskFlags) ? program.riskFlags : []), 'Deterministic fit pending missing profile facts'])],
      }))) || basePrograms
      : basePrograms;
    const insights = {
      ...currentInsights,
      deterministicKpiEngineFallback: true,
      missingFields,
      deterministicKpiEngine: { enabled: true, version: KPI_VERSION, confidence: confidence.confidence, fallback: true, reason: 'missing_kpi_facts' },
    };
    const statePatch = {
      ...originalPatch,
      ...(previousScores ? { scores: previousScores } : {}),
      ...(previousStrengths ? { strengths: previousStrengths } : {}),
      ...(previousWeaknesses ? { weaknesses: previousWeaknesses } : {}),
      ...(previousTasks ? { tasks: previousTasks } : {}),
      ...(Array.isArray(programs) ? { programs } : {}),
      insights,
    };
    let raw = response.raw;
    if (statePatch.scores) raw = replaceTag(raw, 'SCORES', statePatch.scores);
    if (statePatch.strengths) raw = replaceTag(raw, 'STRENGTHS', statePatch.strengths);
    if (statePatch.weaknesses) raw = replaceTag(raw, 'WEAKNESSES', statePatch.weaknesses);
    if (statePatch.tasks) raw = replaceTag(raw, 'TASKS', statePatch.tasks);
    if (statePatch.programs) raw = replaceTag(raw, 'PROGRAMS', statePatch.programs);
    raw = withInsightsRaw(raw, insights);
    const followUp = followUpMessage(facts, confidence.missingFields.length ? confidence.missingFields : missingFields);
    raw = preserveBlocksWithMessage(raw, followUp);
    return {
      ...response,
      raw,
      message: followUp,
      statePatch,
      metadata: {
        ...(response.metadata || {}), deterministicKpiEngine: true, kpiVersion: KPI_VERSION,
        confidence: confidence.confidence, deterministicKpiEngineFallback: true, fallbackUsed: true,
        reason: 'missing_kpi_facts', missingFields,
      },
    };
  }

  const kpiResult = scoreCandidateKPIs(facts);
  let programs = originalPatch.programs;
  if (Array.isArray(programs)) {
    programs = normalizeProgramList(programs.map(program => scoreProgramFit({ facts, kpiResult, program }))) || programs;
    if (facts.track === 'MBA') programs = normalizeProgramList(balanceMbaPortfolio(programs)) || programs;
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
      confidence: 'high',
      reason: 'high_confidence_scored',
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
      confidence: 'high',
      scoredKeys: Object.keys(kpiResult.scores),
      overall: kpiResult.overall,
      missingFields: kpiResult.missingFields,
      deterministicKpiEngineFallback: false,
      reason: 'high_confidence_scored',
    },
  };
}
