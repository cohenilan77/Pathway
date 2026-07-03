import chatHandler from './chat.js';
import { getAgentArchitecture } from '../lib/agent-architecture.js';
import { getUserIdByToken, getUserData, setUserData } from '../lib/db.js';
import { invokeHandler } from '../lib/handler-invoker.js';
import { makeAdvisorResponse } from '../lib/advisor-contract.js';
import { HybridCoordinator } from '../lib/hybrid-coordinator.js';
import { recordArchitectureEvent } from '../lib/architecture-metrics.js';
import { updateCandidateProfile } from '../lib/agents/tools/update.js';
import { recordCandidateActivity } from '../lib/candidate-activity.js';
import { applyDeterministicKpiToResponse, buildDeterministicAdvisorContext } from '../lib/deterministic-kpi-response.js';
import { buildCandidateFacts, buildComplementaryQuestion, stripStructuredBlocks } from '../lib/candidate-facts.js';

function token(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
}

function hybridMetadata(metadata = {}, overrides = {}) {
  return {
    routerSource: metadata.routerSource || 'regex_fallback',
    routedAgent: metadata.routedAgent || 'AdvisorAgent',
    executionPlan: metadata.executionPlan || ['AdvisorAgent'],
    primaryAgent: metadata.primaryAgent || 'AdvisorAgent',
    synthesisAgent: metadata.synthesisAgent || null,
    finalAgent: metadata.finalAgent || 'AdvisorAgent',
    fallbackUsed: !!metadata.fallbackUsed,
    latencyMs: Number(metadata.latencyMs || 0),
    ...metadata,
    ...overrides,
  };
}

function safeRoutingDiagnostic({ candidateId, message, metadata }) {
  const rawPreview = String(message || '');
  const messagePreview = /(?:here is|attached|uploaded)[\s\S]{0,50}(?:cv|resume|résumé|transcript)/i.test(rawPreview)
    ? '[candidate document/profile upload]'
    : rawPreview.slice(0, 300);
  const diagnostic = {
    candidateId,
    messagePreview,
    routerSource: metadata.routerSource,
    routedAgent: metadata.routedAgent,
    executionPlan: metadata.executionPlan,
    finalAgent: metadata.finalAgent,
    synthesisAgent: metadata.synthesisAgent,
    latencyMs: metadata.latencyMs,
  };
  console.info('[real-agent-router]', diagnostic);
  return diagnostic;
}

async function finalizeKpiResponse(response, candidateState, candidateId) {
  let finalized = applyDeterministicKpiToResponse(response, { candidateState });
  const mergedProfile = { ...(candidateState?.profile || {}), ...(finalized?.statePatch?.profile || {}) };
  const candidateFacts = buildCandidateFacts({
    cvExtraction: candidateState?.profileSources?.fileText || candidateState?.cvExtraction || mergedProfile?.candidateFacts?.cvExtraction || {},
    extraText: [
      candidateState?.profileSources?.pastedText,
      candidateState?.profileSources?.additionalText,
      candidateState?.extraText,
      candidateState?.systemContext,
    ].filter(Boolean).join('\n\n'),
    profileSources: candidateState?.profileSources || mergedProfile?.candidateFacts?.profileSources || {},
    messages: candidateState?.messages || [],
    profile: mergedProfile,
    scores: { ...(candidateState?.scores || {}), ...(finalized?.statePatch?.scores || {}) },
    candidateType: mergedProfile.category || mergedProfile.degree,
    targetSchools: finalized?.statePatch?.chosenSchools || candidateState?.chosenSchools || [],
  });
  const nextStatePatch = { ...(finalized?.statePatch || {}) };
  const persistedProfile = {
    ...mergedProfile,
    candidateFacts: {
      ...(mergedProfile.candidateFacts || {}),
      workYears: candidateFacts.workYears,
      militaryYears: candidateFacts.militaryYears,
      civilianWorkYears: candidateFacts.civilianWorkYears,
      currentRole: candidateFacts.currentRole,
      currentCompany: candidateFacts.currentCompany,
      companies: candidateFacts.companies,
      careerProgression: candidateFacts.careerProgression,
      leadershipEvidence: candidateFacts.leadershipEvidence,
      achievementsImpact: candidateFacts.achievementsImpact,
      whyMBA: candidateFacts.whyMBA,
      postMbaGoal: candidateFacts.postMbaGoal,
      targetSchools: candidateFacts.targetSchools,
      selectedCandidateType: candidateFacts.selectedCandidateType,
      profileSources: candidateState?.profileSources ? {
        hasFileText: !!candidateState.profileSources.fileText,
        hasPastedText: !!candidateState.profileSources.pastedText,
        hasAdditionalText: !!candidateState.profileSources.additionalText,
        targetLanguage: 'English',
        normalizeToEnglish: true,
      } : mergedProfile?.candidateFacts?.profileSources,
      sourceLanguages: candidateFacts.sourceLanguages,
      normalizationLanguage: candidateFacts.normalizationLanguage,
    },
    profileCompleteness: candidateFacts.profileCompleteness,
  };
  nextStatePatch.profile = persistedProfile;

  if (!candidateFacts.readyForScoring) {
    delete nextStatePatch.scores;
    delete nextStatePatch.programs;
    let raw = stripStructuredBlocks(finalized?.raw || finalized?.message || '', ['SCORES', 'PROGRAMS']);
    const question = buildComplementaryQuestion(candidateFacts);
    if (question) {
      persistedProfile.profileCompleteness = {
        ...persistedProfile.profileCompleteness,
        askedFields: [...new Set([
          ...(persistedProfile.profileCompleteness?.askedFields || []),
          ...(candidateFacts.nextMissingFields || []),
        ])],
      };
      nextStatePatch.profile = persistedProfile;
    }
    if (question && !String(raw).includes(question)) raw = `${raw}\n\n${question}`.trim();
    finalized = {
      ...finalized,
      raw,
      message: question || finalized?.message,
      statePatch: nextStatePatch,
      metadata: {
        ...(finalized?.metadata || {}),
        candidateFactsReady: false,
        profileCompleteness: candidateFacts.profileCompleteness,
      },
    };
  } else if (!candidateFacts.readyForPrograms) {
    delete nextStatePatch.programs;
    let raw = stripStructuredBlocks(finalized?.raw || finalized?.message || '', ['PROGRAMS']);
    const schoolChoiceQuestion = 'Do you already have specific schools, or do you want recommendations?';
    if (!/specific schools|want recommendations/i.test(raw)) raw = `${raw}\n\n${schoolChoiceQuestion}`.trim();
    finalized = {
      ...finalized,
      raw,
      statePatch: nextStatePatch,
      metadata: { ...(finalized?.metadata || {}), candidateFactsReady: true, programsReady: false },
    };
  } else {
    finalized = {
      ...finalized,
      statePatch: nextStatePatch,
      metadata: { ...(finalized?.metadata || {}), candidateFactsReady: true, programsReady: true },
    };
  }

  if (finalized?.metadata?.deterministicKpiEngine) {
    const fallback = !!finalized.metadata.deterministicKpiEngineFallback;
    await recordCandidateActivity(candidateId, {
      type: 'scoring',
      label: fallback ? 'Deterministic KPI fallback used' : 'Deterministic KPI scores calculated',
      status: fallback ? 'warning' : 'success',
      agent: 'KpiEngine',
      architecture: 'deterministic',
      detail: fallback ? 'Existing model values were preserved because normalized facts were insufficient.' : `Calculated overall readiness ${finalized.metadata.overall}.`,
      metadata: {
        deterministicKpiEngine: true,
        kpiVersion: finalized.metadata.kpiVersion,
        scoredKeys: finalized.metadata.scoredKeys || [],
        overall: finalized.metadata.overall,
        missingFields: finalized.metadata.missingFields || [],
        confidence: finalized.metadata.confidence,
        reason: finalized.metadata.reason,
        fallback,
      },
    }).catch(() => {});
  }
  return finalized;
}

async function invokeAdvisor(req, bypassRuntimeConfig, candidateState = {}) {
  const headers = { ...(req.headers || {}) };
  if (bypassRuntimeConfig) headers['x-pathway-legacy-bypass'] = '1';
  const deterministicContext = buildDeterministicAdvisorContext(candidateState);
  const baseBody = {
    ...(req.body || {}),
    profile: candidateState.profile || req.body?.profile,
    scores: candidateState.scores || req.body?.scores,
    programs: candidateState.programs || req.body?.programs,
    chosenSchools: candidateState.chosenSchools || req.body?.chosenSchools,
    candidateFacts: candidateState.candidateFacts || candidateState.profile?.candidateFacts || req.body?.candidateFacts,
    profileSources: candidateState.profileSources || req.body?.profileSources,
    cvExtraction: candidateState.cvExtraction || req.body?.cvExtraction,
    extraText: candidateState.extraText || req.body?.extraText,
  };
  const body = deterministicContext
    ? { ...baseBody, systemContext: [req.body?.systemContext, deterministicContext].filter(Boolean).join('\n\n') }
    : baseBody;
  const result = await invokeHandler(chatHandler, { ...req, body, method: 'POST', headers });
  if (result.statusCode >= 400) return { error: result.payload, statusCode: result.statusCode };
  const raw = result.payload?.raw || result.payload?.reply || '';
  return { response: makeAdvisorResponse({ architecture: 'legacy', agent: 'LegacyAdvisor', raw }) };
}

async function persistStatePatch(candidateId, response) {
  if (!candidateId || !response?.statePatch || !Object.keys(response.statePatch).length) return;
  const current = (await getUserData(candidateId)) || {};
  const patch = response.statePatch;
  await setUserData(candidateId, {
    ...current,
    ...patch,
    essays: patch.essays ? { ...(current.essays || {}), ...patch.essays } : current.essays,
    interviews: patch.interviews ? { ...(current.interviews || {}), ...patch.interviews } : current.interviews,
    stateVersion: Number(current.stateVersion || 0) + 1,
    updatedAt: Date.now(),
  });
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const candidateId = await getUserIdByToken(token(req));
  const latestMessage = req.body?.message || [...(req.body?.messages || [])].reverse().find(message => message.role === 'user')?.text || '';
  await recordCandidateActivity(candidateId, {
    type: 'request',
    label: 'Advisor request received',
    detail: String(latestMessage).startsWith('Here is my CV') ? 'Candidate submitted a CV/background document for analysis.' : String(latestMessage).slice(0, 240),
    metadata: { action: req.body?.action || 'candidate_message' },
  }).catch(() => {});
  const architecture = await getAgentArchitecture();
  if (architecture.mode !== 'hybrid') {
    const candidateState = candidateId ? (await getUserData(candidateId).catch(() => ({}))) : {};
    const effectiveState = { ...req.body, ...(req.body?.candidateState || {}), ...(candidateState || {}) };
    const output = await invokeAdvisor(req, true, effectiveState);
    if (output.error) return res.status(output.statusCode).json(output.error);
    const response = await finalizeKpiResponse(output.response, effectiveState, candidateId);
    await persistStatePatch(candidateId, response);
    await recordArchitectureEvent({ architecture: 'legacy', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false });
    return res.status(200).json(response);
  }

  const body = req.body || {};
  const message = body.message || [...(body.messages || [])].reverse().find(m => m.role === 'user')?.text || '';
  let routingResult = null;
  try {
    const coordinator = new HybridCoordinator();
    const storedState = candidateId ? (await getUserData(candidateId).catch(() => null)) : null;
    const effectiveState = { ...body, ...(body.candidateState || {}), ...(storedState || {}) };
    if (candidateId && effectiveState.profile) {
      await updateCandidateProfile(candidateId, effectiveState.profile).catch(() => {});
    }
    const result = await coordinator.execute({
      candidateId: candidateId || 'anonymous', message, action: body.action, payload: body.payload,
      conversationHistory: body.messages || [], candidateState: effectiveState,
    });
    routingResult = result;
    const routedMetadata = hybridMetadata(result.metadata, {
      latencyMs: Number(result.metadata?.latencyMs || 0),
    });
    const diagnostic = safeRoutingDiagnostic({ candidateId, message, metadata: routedMetadata });
    await recordCandidateActivity(candidateId, {
      type: 'routing',
      label: result.metadata?.executionPlan?.length > 1
        ? `Execution plan: ${result.metadata.executionPlan.join(' → ')}${result.continueWithAdvisor ? ' → AdvisorAgent' : ''}`
        : result.delegateToAdvisor ? 'Routed to AdvisorAgent' : `Routed to ${result.metadata?.finalAgent || result.agent || 'AdvisorAgent'}`,
      agent: result.agent || 'AdvisorAgent',
      architecture: 'hybrid',
      latencyMs: result.metadata?.latencyMs,
      detail: result.continueWithAdvisor
        ? `${result.metadata?.executionPlan?.join(' → ') || result.agent} completed; control returned to AdvisorAgent for synthesis.`
        : result.delegateToAdvisor ? 'Coordinator selected the main advisor.' : 'Coordinator selected a specialist agent.',
      metadata: {
        candidateId,
        messagePreview: diagnostic.messagePreview,
        routerSource: routedMetadata.routerSource,
        routedAgent: routedMetadata.routedAgent,
        executionPlan: routedMetadata.executionPlan,
        finalAgent: routedMetadata.finalAgent,
        synthesisAgent: routedMetadata.synthesisAgent,
        continueWithAdvisor: !!result.continueWithAdvisor,
        fallback: !!result.disabledAgent,
        plan: result.metadata?.plan,
        steps: result.metadata?.steps,
      },
    }).catch(() => {});
    if (!result.delegateToAdvisor && !result.continueWithAdvisor) {
      let response = makeAdvisorResponse({
        architecture: 'hybrid', agent: result.agent, raw: result.message,
        statePatch: result.statePatch,
        metadata: hybridMetadata(result.metadata, {
          finalAgent: result.metadata?.finalAgent || result.agent,
          fallbackUsed: !!result.metadata?.fallbackUsed,
          latencyMs: Date.now() - startedAt,
        }),
      });
      response = await finalizeKpiResponse(response, effectiveState, candidateId);
      await persistStatePatch(candidateId, response);
      await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false, configVersion: response.metadata?.configVersion });
      return res.status(200).json(response);
    }

    // A CV/profile upload is a two-agent turn: ProfileAgent extracts and saves
    // structured facts, then AdvisorAgent produces the user-facing continuation.
    // Never expose the specialist's tool-completion prose as the final reply.
    if (result.continueWithAdvisor) {
      const specialistResponse = makeAdvisorResponse({
        architecture: 'hybrid', agent: result.agent, raw: '',
        statePatch: result.statePatch, metadata: result.metadata,
      });
      await persistStatePatch(candidateId, specialistResponse);

      const continued = await invokeAdvisor(req, false, { ...effectiveState, ...(result.statePatch || {}) });
      if (continued.error) throw new Error(continued.error?.details || continued.error?.error || 'Advisor continuation failed.');
      let response = {
        ...continued.response,
        architecture: 'hybrid',
        coordinator: 'AdvisorCoordinator',
        agent: 'AdvisorAgent',
        statePatch: { ...(result.statePatch || {}), ...(continued.response.statePatch || {}) },
        metadata: {
          ...continued.response.metadata,
          ...result.metadata,
          delegatedAgent: result.agent,
          specialistConfigVersion: result.metadata?.configVersion,
          specialistLatencyMs: result.metadata?.latencyMs,
          routerSource: result.metadata?.routerSource || 'regex_fallback',
          routedAgent: result.metadata?.routedAgent || result.agent,
          executionPlan: result.metadata?.executionPlan || [],
          primaryAgent: result.metadata?.primaryAgent || result.agent,
          synthesisAgent: 'AdvisorAgent',
          finalAgent: 'AdvisorAgent',
          fallbackUsed: false,
          latencyMs: Date.now() - startedAt,
        },
      };
      response = await finalizeKpiResponse(response, effectiveState, candidateId);
      await persistStatePatch(candidateId, response);
      await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false, configVersion: result.metadata?.configVersion });
      return res.status(200).json(response);
    }

    const fallback = await invokeAdvisor(req, false, effectiveState);
    if (fallback.error) throw new Error(fallback.error?.details || fallback.error?.error || 'Hybrid AdvisorAgent failed.');
    let response = {
      ...fallback.response,
      architecture: 'hybrid', coordinator: 'AdvisorCoordinator', agent: 'AdvisorAgent',
      metadata: hybridMetadata(result.metadata, {
        ...fallback.response.metadata,
        delegatedAgent: result.disabledAgent || 'advisor',
        synthesisAgent: null,
        finalAgent: 'AdvisorAgent',
        fallbackUsed: !!result.disabledAgent || !!result.metadata?.fallbackUsed,
        latencyMs: Date.now() - startedAt,
      }),
    };
    response = await finalizeKpiResponse(response, effectiveState, candidateId);
    await persistStatePatch(candidateId, response);
    await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false });
    return res.status(200).json(response);
  } catch (error) {
    await recordCandidateActivity(candidateId, {
      type: 'fallback',
      label: 'Specialist pipeline failed; legacy fallback started',
      status: 'error',
      architecture: 'hybrid',
      latencyMs: Date.now() - startedAt,
      detail: error.message || 'Unknown specialist failure.',
    }).catch(() => {});
    if (!architecture.fallbackToLegacy) return res.status(500).json({ error: 'Hybrid advisor failed.', detail: error.message });
    const fallbackState = candidateId ? (await getUserData(candidateId).catch(() => ({}))) : {};
    const effectiveFallbackState = { ...req.body, ...(req.body?.candidateState || {}), ...(fallbackState || {}) };
    const fallback = await invokeAdvisor(req, true, effectiveFallbackState);
    if (fallback.error) return res.status(fallback.statusCode).json(fallback.error);
    let response = {
      ...fallback.response,
      architecture: 'hybrid', coordinator: 'AdvisorCoordinator',
      metadata: hybridMetadata(routingResult?.metadata, {
        ...fallback.response.metadata,
        finalAgent: 'LegacyAdvisor',
        synthesisAgent: null,
        fallbackUsed: true,
        hybridError: error.message,
        latencyMs: Date.now() - startedAt,
      }),
    };
    response = await finalizeKpiResponse(response, effectiveFallbackState, candidateId);
    await persistStatePatch(candidateId, response);
    await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: true, error: error.message });
    return res.status(200).json(response);
  }
}
