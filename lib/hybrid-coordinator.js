import { MainAgent, ROUTER_AGENT_IDS } from './agents/MainAgent.js';
import { getAgentConfig } from './agent-config.js';
import { validateStatePatch } from './advisor-contract.js';
import { recordCandidateActivity } from './candidate-activity.js';
import { isSchoolListRequest } from './candidate-facts.js';
import { UndergradMasterAgent } from './agents/UndergradMasterAgent.js';

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
  // Word-bounded: the bare substring "file" matches inside "profile", which
  // used to send "ready to see my full profile" turns to the DocumentAgent.
  ['document', /\bdocuments?\b|\bupload(?:ed|ing|s)?\b|\bfiles?\b/i],
  ['settings-agent', /notification|preference|settings|change my language/i],
  ['matching', /recommend|match|school list|program list|university list|portfolio|(?:cannot|can't|do not|don't)\s+see[\s\S]{0,50}schools/i],
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

// Any ordinary Undergraduate conversation turn — short chip replies
// ("ranking improved", "Math club") and longer natural-language answers
// alike ("I want you to recommend some schools for engineering") — must
// stay on the deterministic UndergradMasterAgent path rather than escaping
// to a generic specialist agent (matching/document/calendar/etc.) via a
// SPECIALIST_PATTERNS keyword hit. Those specialists carry no undergrad
// context; one observed failure mode was an escaped turn landing on
// ProfileAgent.audit(), which has no bound lookup tool and no profile data,
// producing a hallucinated "I don't have access to an external candidate
// database" reply with a leaked internal candidate ID. Only a genuine
// CV/profile-bearing paste (looksLikeProfileText — needs real extraction,
// not a voice-agent chip reply) or an explicit non-chat UI action leaves
// this path.
export function isUndergradEscapeToSpecialist(message, action) {
  if (action && action !== 'candidate_message') return true;
  return looksLikeProfileText(message);
}

// "Yes, I'm ready to see my full profile" and similar reveal requests need
// the full AdvisorAgent, which can emit the <PROFILE>/<SCORES>/<STRENGTHS>/
// <WEAKNESSES>/<TASKS> analysis blocks the app renders — the deterministic
// Undergraduate path can only ask the next chip question, so these requests
// must bypass it or the student never receives the analysis they asked for.
export function wantsProfileAnalysis(message) {
  return /\b(?:see|show|view|reveal|display|build|generate|ready(?:\s+(?:to see|for))?)\b[\s\S]{0,40}\b(?:full profile|profile analysis|full analysis|my profile|my analysis|readiness snapshot)\b/i.test(String(message || ''));
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
  const forceMatching = isSchoolListRequest(message)
    && !candidateState.programs?.length
    && (!!candidateState.scores || candidateState.profile?.profileCompleteness?.hasStrongProfileBaseline === true || candidateState.profile?.candidateFacts?.hasStrongProfileBaseline === true);
  if (!enabled) {
    return { routerSource: 'regex_fallback', routedAgent: forceMatching ? 'matching' : inferSpecialist(message, action), routeIntent: '', routerError: '' };
  }
  try {
    const result = await route(buildRoutingContext({ message, action, candidateState }));
    if (!result || !ROUTER_AGENT_IDS.has(result.agent)) throw new Error(`Invalid routed agent: ${result?.agent || 'missing'}`);
    const onboardingOverride = !forceMatching && isOnboardingContinuation(message, candidateState);
    const protectedProfileUpload = inferSpecialist(message, action) === 'profile';
    return {
      routerSource: 'llm',
      routedAgent: protectedProfileUpload ? 'profile' : forceMatching ? 'matching' : onboardingOverride ? 'advisor' : result.agent,
      routeIntent: protectedProfileUpload
        ? `Candidate document/profile extraction: ${result.intent || 'profile upload'}`
        : forceMatching ? 'Generate the requested candidate school portfolio now'
          : onboardingOverride ? `Core journey continuation: ${result.intent || 'onboarding/state collection'}` : result.intent || '',
      routerError: '',
      routerUsage: result.routerUsage || null,
      routerModel: result.routerModel || '',
      routerLatencyMs: Number(result.routerLatencyMs || 0),
    };
  } catch (error) {
    return {
      routerSource: 'regex_fallback',
      routedAgent: forceMatching ? 'matching' : inferSpecialist(message, action),
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

function toolUpdates(result, toolName) {
  const contentBlocks = [
    ...(Array.isArray(result?.history) ? result.history : [])
      .flatMap(message => Array.isArray(message?.content) ? message.content : []),
    ...(Array.isArray(result?.raw?.content) ? result.raw.content : []),
    ...(Array.isArray(result?.toolUses) ? result.toolUses : []),
  ];
  const calls = contentBlocks.filter(block => block?.type === 'tool_use' && block?.name === toolName);
  return calls.at(-1)?.input?.updates || null;
}

export function specialistPatch(agent, result = {}) {
  const parsed = parseJson(result?.text);
  if (agent === 'profile') {
    // update_profile is the extraction's authoritative result. The model may
    // finish with prose or malformed JSON after a successful tool call; never
    // discard the facts that were already validated and saved by the tool.
    const updates = toolUpdates(result, 'update_profile');
    const profile = updates || parsed?.profile || parsed;
    return profile && typeof profile === 'object' && !Array.isArray(profile)
      ? validateStatePatch({ profile })
      : {};
  }
  if (!parsed) return {};
  if (agent === 'matching') return validateStatePatch({ programs: parsed.matches || parsed.programs || [] });
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
    // Undergraduate-only deterministic path (grade-band agents + server-side
    // stage tracker). Every other category — including null/undefined, i.e.
    // pre-onboarding — falls through to the regex/LLM routing below exactly
    // as before. CV/document uploads, essay review, and calendar requests
    // still resolve to their existing specialists first; only the generic
    // "advisor" catch-all conversation is replaced here.
    if (candidateState?.profile?.category === 'Undergraduate'
      && !wantsProfileAnalysis(message)
      && !isUndergradEscapeToSpecialist(message, action)) {
      return new UndergradMasterAgent().handle(candidateId, message, { candidateState, conversationHistory });
    }

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
          profileSources: candidateState.profileSources || payload.profileSources || null,
          normalizationLanguage: 'English',
          preferences: payload.preferences || candidateState.preferences || candidateState.profile,
          targetSchools: candidateState.chosenSchools,
        },
      });
      lastResult = result;
      const patch = specialistPatch(result.agent || agentId, result.result);
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
