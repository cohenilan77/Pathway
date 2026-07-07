import { normalizeProfileFacts } from './profile-facts.js';
import { assessScoringConfidence, scoreCandidateKPIs } from './kpi-engine.js';
import { balanceMbaPortfolio, scoreProgramFit } from './matching-engine.js';
import { normalizeProgramList } from './program-normalizer.js';
import { buildCandidateFacts, isAdvanceRequest } from './candidate-facts.js';

export const KPI_VERSION = 'v2';

export function deterministicKpiEnabled(env = process.env) {
  // Staging uses the schema-backed engine by default. It can still be disabled
  // explicitly for diagnostics, but missing configuration must never fall back
  // to the model's legacy seven-KPI payload.
  return String(env.DETERMINISTIC_KPI_ENGINE ?? 'true').toLowerCase() !== 'false';
}

function replaceTag(raw, tag, value) {
  const source = String(raw || '');
  const pattern = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'i');
  if (!pattern.test(source)) return source;
  return source.replace(pattern, `<${tag}>${JSON.stringify(value)}</${tag}>`);
}

function removeTag(raw, tag) {
  return String(raw || '').replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi'), '').trim();
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
  const profile = { ...(candidateState.profile?.candidateFacts || {}), ...(candidateState.profile || {}) };
  const facts = normalizeProfileFacts(profile, candidateState.scores || {}, { chosenSchools: candidateState.chosenSchools });
  if (evidenceCount(facts) < 2) return '';
  const confidence = assessScoringConfidence(facts);
  const candidateFacts = buildCandidateFacts({
    cvExtraction: candidateState.profileSources?.fileText || candidateState.cvExtraction || {},
    extraText: [candidateState.profileSources?.pastedText, candidateState.profileSources?.additionalText, candidateState.extraText].filter(Boolean).join('\n\n'),
    profileSources: candidateState.profileSources || {},
    messages: candidateState.messages || [],
    profile,
    scores: candidateState.scores || {},
    candidateType: profile.category || profile.degree,
    targetSchools: candidateState.chosenSchools || [],
  });
  if (candidateFacts.needsMatchingFollowUp) {
    return `FAST PROFILE CYCLE — ONE FOLLOW-UP REMAINS. Ask only these matching-critical fields in one compact message: ${JSON.stringify(candidateFacts.nextQuestionFields)}. Do not ask about tests, GPA, recommenders, exceptions, languages, or international history. After this one turn, score with best available evidence.`;
  }
  if (confidence.confidence !== 'high' && !candidateFacts.readyForScoring) {
    return `DETERMINISTIC KPI ENGINE (${KPI_VERSION}) — SCORING PENDING.\nKnown facts: ${JSON.stringify({ gpa: facts.academics.gpa, testType: facts.testing.testType, testScore: facts.testing.testScore, workYears: facts.experience.workYears })}\nMissing KPI facts: ${JSON.stringify(confidence.missingFields)}\nDo not finalize or invent a deterministic overall score. Do not ask a generic follow-up here; the authoritative candidateFacts completeness layer supplies the exact missing checklist.`;
  }
  const result = scoreCandidateKPIs(facts, profile);
  return `DETERMINISTIC KPI ENGINE (${KPI_VERSION}) — AUTHORITATIVE CODE-CALCULATED RESULT (${confidence.confidence === 'high' ? 'high confidence' : 'best available evidence'}):\nScores: ${JSON.stringify(result.scores)}\nScore details: ${JSON.stringify(result.scoreDetails)}\nStrengths: ${JSON.stringify(result.strengths)}\nWeaknesses: ${JSON.stringify(result.weaknesses)}\nTasks: ${JSON.stringify(result.tasks)}\nMissing fields: ${JSON.stringify(result.missingFields)}\nExplain these results when relevant. Do not recalculate, replace, or contradict these scores. Missing GPA, testing, recommender detail, language, or international history is an evidence gap/task, not a blocker. Fit is a readiness index, never an admission probability.`;
}

function withInsightsRaw(raw, insights) {
  return replaceTag(raw, 'INSIGHTS', insights);
}

export function applyDeterministicKpiToResponse(response, { candidateState = {} } = {}) {
  if (!deterministicKpiEnabled() || !response) return response;
  const originalPatch = response.statePatch || {};
  const latestMessage = String(candidateState.message || '').trim();
  const explicitScoringTurn = /refresh analysis|here is my (?:cv|resume)|uploaded (?:cv|resume)|submitted (?:a )?(?:cv|resume)/i.test(latestMessage);
  const relevantTurn = !!(originalPatch.profile || originalPatch.scores || originalPatch.programs || explicitScoringTurn);
  if (!relevantTurn) return response;

  const mergedProfile = { ...(candidateState.profile || {}), ...(originalPatch.profile || {}) };
  const profile = { ...(mergedProfile.candidateFacts || {}), ...mergedProfile };
  const existingScores = { ...(candidateState.scores || {}), ...(originalPatch.scores || {}) };
  const facts = normalizeProfileFacts(profile, existingScores, { chosenSchools: originalPatch.chosenSchools || candidateState.chosenSchools });
  const currentInsights = { ...(candidateState.insights || {}), ...(originalPatch.insights || {}) };
  const confidence = assessScoringConfidence(facts);
  const completeness = profile.profileCompleteness || {};
  const askedFields = new Set(completeness.askedFields || []);
  const profileChecklistExhausted = (completeness.missingFields || []).length > 0
    && completeness.missingFields.every(field => askedFields.has(field));
  const candidateFacts = buildCandidateFacts({
    cvExtraction: candidateState.profileSources?.fileText || candidateState.cvExtraction || {},
    extraText: [candidateState.profileSources?.pastedText, candidateState.profileSources?.additionalText, candidateState.extraText].filter(Boolean).join('\n\n'),
    profileSources: candidateState.profileSources || {},
    messages: candidateState.messages || [],
    profile,
    scores: existingScores,
    candidateType: profile.category || profile.degree,
    targetSchools: originalPatch.chosenSchools || candidateState.chosenSchools || [],
  });
  const bestAvailableRequested = isAdvanceRequest(latestMessage)
    || profileChecklistExhausted
    || candidateFacts.readyForScoring;

  if (evidenceCount(facts) < 2 || (confidence.confidence !== 'high' && !bestAvailableRequested)) {
    const missingFields = [...new Set([...facts.evidence.missingFields, ...confidence.missingFields])];
    const previousStrengths = candidateState.strengths?.length ? candidateState.strengths : originalPatch.strengths;
    const previousWeaknesses = candidateState.weaknesses?.length ? candidateState.weaknesses : originalPatch.weaknesses;
    const previousTasks = candidateState.tasks?.length ? candidateState.tasks : originalPatch.tasks;
    const insights = {
      ...currentInsights,
      deterministicKpiEngineFallback: true,
      missingFields,
      deterministicKpiEngine: { enabled: true, version: KPI_VERSION, confidence: confidence.confidence, fallback: true, reason: 'missing_kpi_facts' },
    };
    // Do not preserve or emit scores/programs while evidence is incomplete,
    // and never replace the contextual advisor reply with a generic fallback.
    // api/advisor's candidateFacts gate owns the one-time missing checklist.
    const statePatch = {
      ...originalPatch,
      ...(previousStrengths ? { strengths: previousStrengths } : {}),
      ...(previousWeaknesses ? { weaknesses: previousWeaknesses } : {}),
      ...(previousTasks ? { tasks: previousTasks } : {}),
      insights,
    };
    delete statePatch.scores;
    delete statePatch.programs;
    let raw = removeTag(response.raw, 'SCORES');
    raw = removeTag(raw, 'PROGRAMS');
    raw = withInsightsRaw(raw, insights);
    return {
      ...response,
      raw,
      message: response.message,
      statePatch,
      metadata: {
        ...(response.metadata || {}), deterministicKpiEngine: true, kpiVersion: KPI_VERSION,
        confidence: confidence.confidence, deterministicKpiEngineFallback: true, fallbackUsed: true,
        reason: 'missing_kpi_facts', missingFields,
      },
    };
  }

  const kpiResult = scoreCandidateKPIs(facts, profile);
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
      confidence: confidence.confidence === 'high' ? 'high' : 'best_available',
      reason: confidence.confidence === 'high' ? 'high_confidence_scored' : 'candidate_requested_continuation',
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
      confidence: confidence.confidence === 'high' ? 'high' : 'best_available',
      scoredKeys: Object.keys(kpiResult.scores),
      overall: kpiResult.overall,
      missingFields: kpiResult.missingFields,
      deterministicKpiEngineFallback: false,
      reason: confidence.confidence === 'high' ? 'high_confidence_scored' : 'candidate_requested_continuation',
    },
  };
}
