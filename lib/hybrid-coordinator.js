import { MainAgent } from './agents/MainAgent.js';
import { getAgentConfig } from './agent-config.js';
import { validateStatePatch } from './advisor-contract.js';

const SPECIALIST_PATTERNS = [
  ['calendar', /deadline|calendar|schedule|event|due date/i],
  ['nagger', /remind|reminder|nudge|milestone/i],
  ['community', /study partner|community|peer|group/i],
  ['simulation', /what if|predict|chance|odds|scenario/i],
  ['interview', /mock interview|interview prep|evaluate my answer/i],
  ['essay', /essay|statement of purpose|sop|personal statement/i],
  ['document', /document|upload|file|transcript/i],
  ['settings-agent', /notification|preference|settings|change my language/i],
  ['matching', /recommend|match|school list|program list|portfolio/i],
  ['profile', /parse.*cv|analy[sz]e.*cv|profile audit|resume/i],
  ['search', /requirements|ranking|program facts|find information/i],
];

export function inferSpecialist(message, action) {
  if (action && action !== 'candidate_message') {
    const direct = String(action).replace(/_agent$|_task$/, '').replace('settings', 'settings-agent');
    if (SPECIALIST_PATTERNS.some(([id]) => id === direct)) return direct;
  }
  return SPECIALIST_PATTERNS.find(([, pattern]) => pattern.test(String(message || '')))?.[0] || 'advisor';
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

export class HybridCoordinator {
  async execute({ candidateId, message, action = 'candidate_message', payload = {}, conversationHistory = [], candidateState = {} }) {
    const requestedAgent = inferSpecialist(message, action);
    if (requestedAgent === 'advisor') return { delegateToAdvisor: true, agent: 'advisor' };

    const config = await getAgentConfig(requestedAgent);
    if (config.status !== 'active') {
      return { delegateToAdvisor: true, agent: config.publishedConfig?.fallbackAgent || 'advisor', disabledAgent: requestedAgent };
    }

    const agent = new MainAgent();
    const result = await agent.handle(candidateId, message, {
      conversationHistory,
      extra: {
        ...payload,
        ...(requestedAgent === 'profile' && !payload.rawText ? { rawText: message } : {}),
        profile: candidateState.profile,
        preferences: payload.preferences || candidateState.preferences || candidateState.profile,
        targetSchools: candidateState.chosenSchools,
      },
    });
    return {
      agent: result.agent || requestedAgent,
      message: result.result?.text || '',
      statePatch: specialistPatch(result.agent || requestedAgent, result.result?.text),
      metadata: { latencyMs: result.latencyMs, configVersion: config.publishedVersion, usage: result.result?.usage || null },
    };
  }
}
