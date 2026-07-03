import chatHandler from './chat.js';
import { getAgentArchitecture } from '../lib/agent-architecture.js';
import { getUserIdByToken, getUserData, setUserData } from '../lib/db.js';
import { invokeHandler } from '../lib/handler-invoker.js';
import { makeAdvisorResponse } from '../lib/advisor-contract.js';
import { HybridCoordinator } from '../lib/hybrid-coordinator.js';
import { recordArchitectureEvent } from '../lib/architecture-metrics.js';
import { updateCandidateProfile } from '../lib/agents/tools/update.js';
import { recordCandidateActivity } from '../lib/candidate-activity.js';

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

async function invokeAdvisor(req, bypassRuntimeConfig) {
  const headers = { ...(req.headers || {}) };
  if (bypassRuntimeConfig) headers['x-pathway-legacy-bypass'] = '1';
  const result = await invokeHandler(chatHandler, { ...req, method: 'POST', headers });
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
    const output = await invokeAdvisor(req, true);
    if (output.error) return res.status(output.statusCode).json(output.error);
    await persistStatePatch(candidateId, output.response);
    await recordArchitectureEvent({ architecture: 'legacy', agent: output.response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false });
    return res.status(200).json(output.response);
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
      const response = makeAdvisorResponse({
        architecture: 'hybrid', agent: result.agent, raw: result.message,
        statePatch: result.statePatch,
        metadata: hybridMetadata(result.metadata, {
          finalAgent: result.metadata?.finalAgent || result.agent,
          fallbackUsed: !!result.metadata?.fallbackUsed,
          latencyMs: Date.now() - startedAt,
        }),
      });
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

      const continued = await invokeAdvisor(req, false);
      if (continued.error) throw new Error(continued.error?.details || continued.error?.error || 'Advisor continuation failed.');
      const response = {
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
      await persistStatePatch(candidateId, response);
      await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false, configVersion: result.metadata?.configVersion });
      return res.status(200).json(response);
    }

    const fallback = await invokeAdvisor(req, false);
    if (fallback.error) throw new Error(fallback.error?.details || fallback.error?.error || 'Hybrid AdvisorAgent failed.');
    const response = {
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
    const fallback = await invokeAdvisor(req, true);
    if (fallback.error) return res.status(fallback.statusCode).json(fallback.error);
    const response = {
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
    await persistStatePatch(candidateId, response);
    await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: true, error: error.message });
    return res.status(200).json(response);
  }
}
