import { MainAgent } from './agents/MainAgent.js';
import { getAgentConfig } from './agent-config.js';
import { validateStatePatch } from './advisor-contract.js';

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
    const requestedAgent = inferSpecialist(message, action);
    if (requestedAgent === 'advisor') return { delegateToAdvisor: true, agent: 'advisor' };

    const config = await getAgentConfig(requestedAgent);
    if (config.status !== 'active') {
      return { delegateToAdvisor: true, agent: config.publishedConfig?.fallbackAgent || 'advisor', disabledAgent: requestedAgent };
    }

    const agent = new MainAgent();
    const carriesProfileText = /(?:cv|resume|résumé|transcript|additional background)/i.test(String(message || '')) || looksLikeProfileText(message);
    const result = await agent.handle(candidateId, message, {
      conversationHistory,
      forcedAgent: requestedAgent,
      extra: {
        ...payload,
        ...(carriesProfileText && !payload.rawText ? { rawText: message } : {}),
        profile: candidateState.profile,
        preferences: payload.preferences || candidateState.preferences || candidateState.profile,
        targetSchools: candidateState.chosenSchools,
      },
    });
    return {
      agent: result.agent || requestedAgent,
      message: specialistMessage(result.agent || requestedAgent, result.result?.text || ''),
      statePatch: specialistPatch(result.agent || requestedAgent, result.result?.text),
      // Profile extraction is an internal specialist step, not the end of the
      // candidate conversation. Hand control back to the Advisor in the same
      // request so it can acknowledge extracted facts, ask only for genuinely
      // missing fields, and advance the admissions journey.
      continueWithAdvisor: (result.agent || requestedAgent) === 'profile',
      metadata: { latencyMs: result.latencyMs, configVersion: config.publishedVersion, usage: result.result?.usage || null },
    };
  }
}
