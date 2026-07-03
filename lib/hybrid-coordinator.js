import { MainAgent, ROUTER_AGENT_IDS } from './agents/MainAgent.js';
import { getAgentConfig } from './agent-config.js';
import { validateStatePatch } from './advisor-contract.js';
import { recordCandidateActivity } from './candidate-activity.js';

const SPECIALIST_PATTERNS = [
  // Profile-bearing uploads must be classified before the generic DocumentAgent.
  // Otherwise words such as "file" or "upload" steal CV/resume turns and the
  // profile agent receives no raw text, causing it to ask for the file again.
  ['profile', /(?:here is|attached|uploaded|submit(?:ted)?)?[\s\S]{0,40}(?:cv|resume|résumé|transcript)|additional background|profile audit/i],
  ['calendar', /deadline|calendar|schedule|event|due date/i],
  ['nagger', /remind|reminder|nudge|milestone/i],
  ['community', /study partner|community|peer|group/i],
  ['simulation', /what if|predict|chance|odds|scenario/i],
  ['interview', /mock interview|interview prep|evaluate my answer/i],
  ['essay', /essay|statement of purpose|sop|personal statement/i],
  ['document', /document|upload|file/i],
  ['settings-agent', /notification|preference|settings|change my language/i],
  ['matching', /recommend|match|school list|program list|portfolio/i],
  ['search', /requirements|ranking|program facts|find information/i],
];

export function inferSpecialist(message, action) {
  if (action && action !== 'candidate_message') {
    const direct = String(action).replace(/_agent$|_task$/, '').replace('settings', 'settings-agent');
    if (SPECIALIST_PATTERNS.some(([id]) => id === direct)) return direct;
  }
  if (looksLikeProfileText(message)) return 'profile';
  return SPECIALIST_PATTERNS.find(([, pattern]) => pattern.test(String(message || '')))?.[0] || 'advisor';
}

const ONBOARDING_CHOICES = /^(?:undergraduate|graduate|postgraduate\s*\/\s*doctoral|personal development|mba|llm|ma|msc|master'?s|md|jd|phd|postdoc|doctoral research|other advanced research program|1[- ]year|2[- ]year|multi[- ]year|full[- ]time|part[- ]time|executive|not sure|usa|uk|europe|canada|open(?: to anywhere)?|other)$/i;

export function isOnboardingContinuation(message, candidateState = {}) {
  const text = String(message || '').trim();
  if (!text || text === '__idle_checkin__') return text === '__idle_checkin__';
  if (ONBOARDING_CHOICES.test(text)) return true;
  if (candidateState.scores || candidateState.programs?.length || candidateState.chosenSchools?.length) return false;
  if (inferSpecialist(text) !== 'advisor') return false;
  const words = text.split(/\s+/).filter(Boolean);
  return text.length <= 40 && words.length <= 3 && /^[\p{L} .'-]+$/u.test(text);
}

export function buildExecutionPlan(message, action = 'candidate_message') {
  return buildExecutionPlanForAgent(inferSpecialist(message, action));
}

export function buildExecutionPlanForAgent(requested) {
  if (requested === 'profile') return ['document', 'profile'];
  if (requested === 'matching') return ['search', 'matching'];
  return [requested];
}

export function realAgentRouterEnabled(env = process.env) {
  return String(env.REAL_AGENT_ROUTER || '').toLowerCase() === 'true';
}

export function agentDisplayName(agentId) {
  if (agentId === 'settings-agent') return 'SettingsAgent';
  if (agentId === 'advisor') return 'AdvisorAgent';
  return `${String(agentId || 'advisor').charAt(0).toUpperCase()}${String(agentId || 'advisor').slice(1)}Agent`;
}

function compactValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 5);
  if (typeof value === 'string') return value.slice(0, 160);
  return value ?? null;
}

export function buildRoutingContext({ message, action, candidateState = {} }) {
  const profile = candidateState.profile || {};
  const stage = candidateState.stage || candidateState.journeyStage || {};
  const targets = profile.targetCountries || profile.countries || profile.destination
    || candidateState.targetCountries || candidateState.destination || candidateState.preferences?.countries;
  return {
    task: 'Route this candidate turn to exactly one Pathway agent.',
    message: String(message || '').slice(0, 1200),
    action: action || 'candidate_message',
    category: compactValue(profile.category || candidateState.category),
    degree: compactValue(profile.degree || profile.programType || candidateState.degree),
    stageName: compactValue(typeof stage === 'string' ? stage : stage.name || stage.label || candidateState.stageName),
    stageIndex: Number.isFinite(Number(candidateState.stepIdx ?? stage.index)) ? Number(candidateState.stepIdx ?? stage.index) : null,
    hasScores: !!(candidateState.scores && Object.keys(candidateState.scores).length),
    hasPrograms: !!(candidateState.programs?.length),
    hasChosenSchools: !!(candidateState.chosenSchools?.length),
    targetCountries: compactValue(targets),
    knownProgramType: compactValue(profile.programType || profile.degree || candidateState.programType),
  };
}

export async function resolveRoutingDecision({ message, action = 'candidate_message', candidateState = {}, route, enabled = realAgentRouterEnabled() }) {
  if (!enabled) {
    return { routerSource: 'regex_fallback', routedAgent: inferSpecialist(message, action), routeIntent: '', routerError: '' };
  }
  try {
    const result = await route(buildRoutingContext({ message, action, candidateState }));
    if (!result || !ROUTER_AGENT_IDS.has(result.agent)) throw new Error(`Invalid routed agent: ${result?.agent || 'missing'}`);
    const onboardingOverride = isOnboardingContinuation(message, candidateState);
    const protectedProfileUpload = inferSpecialist(message, action) === 'profile';
    return {
      routerSource: 'llm',
      routedAgent: protectedProfileUpload ? 'profile' : onboardingOverride ? 'advisor' : result.agent,
      routeIntent: protectedProfileUpload
        ? `Candidate document/profile extraction: ${result.intent || 'profile upload'}`
        : onboardingOverride ? `Core journey continuation: ${result.intent || 'onboarding/state collection'}` : result.intent || '',
      routerError: '',
      routerUsage: result.routerUsage || null,
      routerModel: result.routerModel || '',
      routerLatencyMs: Number(result.routerLatencyMs || 0),
    };
  } catch (error) {
    return {
      routerSource: 'regex_fallback',
      routedAgent: inferSpecialist(message, action),
      routeIntent: '',
      routerError: String(error?.message || error).slice(0, 240),
    };
  }
}

export function looksLikeProfileText(message) {
  const text = String(message || '');
  if (text.length < 350) return false;
  const signals = [
    /\bEDUCATION\b/i, /\bEXPERIENCE\b/i, /\bEMPLOYMENT\b/i, /\bGPA\b/i,
    /\bGMAT\b|\bGRE\b|\bSAT\b|\bACT\b/i, /\bLANGUAGES?\b/i,
    /\bVOLUNTEER/i, /\bAWARDS?\b|\bHONORS?\b/i, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  ];
  return signals.filter(pattern => pattern.test(text)).length >= 3;
}

function parseJson(text) {
  try { return JSON.parse(String(text || '').replace(/^```json\s*|\s*```$/g, '').trim()); } catch { return null; }
}

function specialistPatch(agent, text) {
  const parsed = parseJson(text);
  if (!parsed) return {};
  if (agent === 'matching') return validateStatePatch({ programs: parsed.matches || parsed.programs || [] });
  if (agent === 'profile') return validateStatePatch({ profile: parsed.profile || parsed });
  if (agent === 'essay') return parsed.insights ? { insights: parsed.insights } : {};
  if (agent === 'interview' && parsed.school) return { interviews: { [parsed.school]: parsed } };
  if (agent === 'calendar') return { calendarEvents: parsed.events || [] };
  if (agent === 'settings-agent') return { preferences: parsed.preferences || parsed };
  return {};
}

function specialistMessage(agent, text) {
  if (agent !== 'profile') return text;
  const parsed = parseJson(text);
  if (!parsed) return text;
  const missing = Array.isArray(parsed.missingFields) ? parsed.missingFields.filter(Boolean) : [];
  if (!missing.length) return 'I analyzed your CV and extracted your education, experience, achievements, leadership, activities, and test information. Your profile is ready for analysis.';
  return `I analyzed your CV and extracted the information it contains. Which of these missing details can you provide: ${missing.join(', ')}?`;
}

export class HybridCoordinator {
  async execute({ candidateId, message, action = 'candidate_message', payload = {}, conversationHistory = [], candidateState = {} }) {
    const agent = new MainAgent();
    const { routerSource, routedAgent, routeIntent, routerError, routerUsage, routerModel, routerLatencyMs } = await resolveRoutingDecision({
      message,
      action,
      candidateState,
      route: context => agent.route(context, { strict: true }),
    });

    if (routerSource === 'llm') {
      const inputTokens = Number(routerUsage?.input_tokens || 0);
      const outputTokens = Number(routerUsage?.output_tokens || 0);
      const cacheTokens = Number(routerUsage?.cache_creation_input_tokens || 0) + Number(routerUsage?.cache_read_input_tokens || 0);
      await recordCandidateActivity(candidateId, {
        type: 'agent_call',
        label: 'MainAgent routing decision',
        agent: 'MainAgent',
        architecture: 'hybrid',
        model: routerModel,
        inputTokens,
        outputTokens,
        cacheTokens,
        totalTokens: inputTokens + outputTokens + cacheTokens,
        latencyMs: routerLatencyMs,
        detail: `Selected ${agentDisplayName(routedAgent)}.`,
      }).catch(() => {});
    } else if (realAgentRouterEnabled() && routerError) {
      await recordCandidateActivity(candidateId, {
        type: 'routing',
        label: 'MainAgent router failed; regex fallback used',
        status: 'error',
        agent: 'MainAgent',
        architecture: 'hybrid',
        detail: routerError,
      }).catch(() => {});
    }

    const plan = buildExecutionPlanForAgent(routedAgent);
    const executionPlan = plan.map(agentDisplayName);
    const routingMetadata = {
      routerSource,
      routedAgent: agentDisplayName(routedAgent),
      routedAgentId: routedAgent,
      routeIntent,
      routerError,
      routerLatencyMs,
      executionPlan,
      primaryAgent: agentDisplayName(plan[plan.length - 1]),
      synthesisAgent: plan.some(id => ['document', 'profile', 'search', 'matching'].includes(id)) ? 'AdvisorAgent' : null,
      finalAgent: plan.some(id => ['document', 'profile', 'search', 'matching'].includes(id)) ? 'AdvisorAgent' : agentDisplayName(plan[plan.length - 1]),
      fallbackUsed: routerSource === 'regex_fallback' && realAgentRouterEnabled(),
    };
    if (routedAgent === 'advisor') {
      return { delegateToAdvisor: true, agent: 'advisor', metadata: { ...routingMetadata, latencyMs: 0, steps: [] } };
    }
    const carriesProfileText = /(?:cv|resume|résumé|transcript|additional background)/i.test(String(message || '')) || looksLikeProfileText(message);
    const statePatch = {};
    const steps = [];
    let lastResult = null;
    let lastConfig = null;

    for (const agentId of plan) {
      const config = await getAgentConfig(agentId);
      lastConfig = config;
      if (config.status !== 'active') {
        steps.push({ agent: agentId, status: 'disabled', fallbackAgent: config.publishedConfig?.fallbackAgent || 'advisor' });
        return {
          delegateToAdvisor: true,
          agent: config.publishedConfig?.fallbackAgent || 'advisor',
          disabledAgent: agentId,
          metadata: {
            ...routingMetadata,
            executionPlan,
            primaryAgent: 'AdvisorAgent',
            synthesisAgent: null,
            finalAgent: 'AdvisorAgent',
            fallbackUsed: true,
            plan,
            steps,
          },
        };
      }

      const result = await agent.handle(candidateId, message, {
        conversationHistory,
        forcedAgent: agentId,
        extra: {
          ...payload,
          ...(carriesProfileText && !payload.rawText ? { rawText: message } : {}),
          ...(agentId === 'document' ? { upload: payload.upload || { name: payload.fileName || 'Candidate CV', content: payload.rawText || message, url: payload.fileUrl || '' } } : {}),
          profile: { ...(candidateState.profile || {}), ...(statePatch.profile || {}) },
          preferences: payload.preferences || candidateState.preferences || candidateState.profile,
          targetSchools: candidateState.chosenSchools,
        },
      });
      lastResult = result;
      const patch = specialistPatch(result.agent || agentId, result.result?.text || '');
      Object.assign(statePatch, patch);
      steps.push({
        agent: result.agent || agentId,
        status: 'completed',
        latencyMs: result.latencyMs,
        stateFields: Object.keys(patch),
      });
    }

    const resultAgent = lastResult?.agent || plan[plan.length - 1];
    const internalPipeline = plan.some(agentId => ['document', 'profile', 'search', 'matching'].includes(agentId));
    return {
      agent: resultAgent,
      message: specialistMessage(resultAgent, lastResult?.result?.text || ''),
      statePatch,
      continueWithAdvisor: internalPipeline,
      metadata: {
        ...routingMetadata,
        plan,
        steps,
        latencyMs: steps.reduce((sum, step) => sum + Number(step.latencyMs || 0), 0),
        configVersion: lastConfig?.publishedVersion,
        usage: lastResult?.result?.usage || null,
      },
    };
  }
}
