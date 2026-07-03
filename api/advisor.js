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
  try {
    const coordinator = new HybridCoordinator();
    const storedState = candidateId ? (await getUserData(candidateId).catch(() => null)) : null;
    const effectiveState = { ...(body.candidateState || body), ...(storedState || {}) };
    if (candidateId && effectiveState.profile) {
      await updateCandidateProfile(candidateId, effectiveState.profile).catch(() => {});
    }
    const result = await coordinator.execute({
      candidateId: candidateId || 'anonymous', message, action: body.action, payload: body.payload,
      conversationHistory: body.messages || [], candidateState: effectiveState,
    });
    await recordCandidateActivity(candidateId, {
      type: 'routing',
      label: result.metadata?.plan?.length > 1
        ? `Execution plan: ${result.metadata.plan.map(agent => `${agent}Agent`).join(' → ')}${result.continueWithAdvisor ? ' → AdvisorAgent' : ''}`
        : result.delegateToAdvisor ? 'Routed to AdvisorAgent' : `Routed to ${result.agent || 'AdvisorAgent'}`,
      agent: result.agent || 'AdvisorAgent',
      architecture: 'hybrid',
      latencyMs: result.metadata?.latencyMs,
      detail: result.continueWithAdvisor
        ? `${result.agent} completed its specialist step; control returned to AdvisorAgent.`
        : result.delegateToAdvisor ? 'Coordinator selected the main advisor.' : 'Coordinator selected a specialist agent.',
      metadata: { continueWithAdvisor: !!result.continueWithAdvisor, fallback: !!result.disabledAgent, plan: result.metadata?.plan, steps: result.metadata?.steps },
    }).catch(() => {});
    if (!result.delegateToAdvisor && !result.continueWithAdvisor) {
      const response = makeAdvisorResponse({
        architecture: 'hybrid', agent: result.agent, raw: result.message,
        statePatch: result.statePatch, metadata: result.metadata,
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
          delegatedAgent: result.agent,
          specialistConfigVersion: result.metadata?.configVersion,
          specialistLatencyMs: result.metadata?.latencyMs,
          fallbackUsed: false,
        },
      };
      await persistStatePatch(candidateId, response);
      await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: false, configVersion: result.metadata?.configVersion });
      return res.status(200).json(response);
    }

    const fallback = await invokeAdvisor(req, false);
    if (fallback.error) throw new Error(fallback.error?.details || fallback.error?.error || 'Hybrid AdvisorAgent failed.');
    const response = { ...fallback.response, architecture: 'hybrid', coordinator: 'AdvisorCoordinator', agent: 'AdvisorAgent', metadata: { ...fallback.response.metadata, delegatedAgent: result.disabledAgent || 'advisor', fallbackUsed: false } };
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
    const response = { ...fallback.response, architecture: 'hybrid', coordinator: 'AdvisorCoordinator', metadata: { ...fallback.response.metadata, fallbackUsed: true, hybridError: error.message } };
    await persistStatePatch(candidateId, response);
    await recordArchitectureEvent({ architecture: 'hybrid', agent: response.agent, latencyMs: Date.now() - startedAt, fallbackUsed: true, error: error.message });
    return res.status(200).json(response);
  }
}
