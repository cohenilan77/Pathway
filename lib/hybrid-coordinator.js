import { MainAgent, ROUTER_AGENT_IDS } from './agents/MainAgent.js';
import { getAgentConfig } from './agent-config.js';
import { validateStatePatch } from './advisor-contract.js';
import { recordCandidateActivity } from './candidate-activity.js';
import { isSchoolListRequest } from './candidate-facts.js';
import { UndergradMasterAgent } from './agents/UndergradMasterAgent.js';
import { UndergradAgent } from './agents/UndergradAgent.js';
import { handleUndergradSchoolListRequest } from './undergrad/handle-school-list.js';
import { looksLikeUndergradSchoolListRequest } from './undergrad/school-list-intent.js';
import { turnSession as undergradRailTurn } from './undergrad/rail.js';
import { recordUsage } from './usage.js';
import { NarrativeCoachAgent } from './agents/NarrativeCoachAgent.js';
import { startCoachingSession, isCoachingActive, finalizeCoachingSession } from './narrative/coaching-session.js';
import { saveDocument } from './agents/tools/update.js';
import { validateProgramList } from './program-validation.js';

// Hotfix 2026-07-09: school-list requests from undergrad candidates must
// stay on the undergrad path. AdvisorAgent's grad-shaped <PROGRAMS> flow
// looped forever with fabricated chip options ("Generate my school list")
// when an undergrad turn escaped to it, so these two patterns are matched
// BEFORE any other undergrad routing decision (smart agent on or off) and
// handled deterministically by handleUndergradSchoolListRequest instead —
// see the top of HybridCoordinator.execute()'s Undergraduate branch below.
// Note: the plural-safe word classes and the reversed verb/list/school
// order below (e.g. "show me a possible LIST of SCHOOLS") are deliberate
// fixes on top of the originally proposed patterns, which missed the
// literal acceptance-test phrase "show me schools" (a bare \bschool\b
// boundary never matches inside "schools") and any "list...school" word
// order — both verified against the real failure transcripts before shipping.
// Usage & Cost dashboard feature labels (api/admin-usage.js FEATURE_LABELS) for
// the named Undergraduate agents. Agents with no closer match fall back to
// 'general_chat', the same default recordUsage() itself applies.
const FEATURE_BY_UNDERGRAD_AGENT = {
  ProfileIntakeAgent: 'profile_analysis',
  AcademicStrengthAgent: 'profile_analysis',
  UniversityMatchingAgent: 'program_matching',
  PortfolioEvidenceAgent: 'program_matching',
  EssayNarrativeAgent: 'essay_workshop',
  UndergradAgent: 'undergrad_agent',
};

// UNDERGRAD_SMART_AGENT gates the single-agent, tool-driven UndergradAgent
// replacement for the 13-agent UndergradMasterAgent roster (see
// lib/agents/UndergradAgent.js). Defaults ON: production should use the
// tool-driven advisor unless an emergency env override sets this to "false".
export function undergradSmartAgentEnabled(env = process.env) {
  return String(env.UNDERGRAD_SMART_AGENT || 'true').toLowerCase() !== 'false';
}

// UNDERGRAD_RAIL_V2 gates the two-agent grade-rail (lib/undergrad/rail.js):
// a fixed Y10/Y11/Y12 topic rail with a Run agent that talks, a Track agent
// that is the sole author of state, and resume-by-weakest-field. Defaults OFF.
// When ON, undergrad turns are handled entirely by the rail and never enter
// the grad step machine or the legacy 13-agent undergrad roster. The primary
// surface is the dedicated /api/undergrad endpoint + UndergradChat component;
// this fork only covers undergrad turns that still arrive via the shared chat
// pipeline. Rollback is a single env flip (or reverting this one branch).
export function undergradRailV2Enabled(env = process.env) {
  return String(env.UNDERGRAD_RAIL_V2 || '').toLowerCase() === 'true';
}

// NARRATIVE_COACHING_V2 gates the adversarial NarrativeCoachAgent session
// (see lib/agents/NarrativeCoachAgent.js) for grad/MBA/PhD/Personal-
// Development candidates — never Undergraduate, which has no narrative
// modal at all (isNarrativeChoiceHandoff above). Defaults OFF: until set,
// the existing Pivot/Upgrade modal's generic chat handoff to AdvisorAgent
// runs completely unchanged.
export function narrativeCoachingV2Enabled(env = process.env) {
  return String(env.NARRATIVE_COACHING_V2 || '').toLowerCase() === 'true';
}

export const NARRATIVE_KICKOFF_QUESTION = "In a paragraph, what do you actually want after the MBA?";

// UndergradMasterAgent.handle() fully resolves the turn itself (no
// delegateToAdvisor/continueWithAdvisor flags), so its own direct Anthropic
// call is never logged by chat.js or anywhere downstream. Log it here, right
// where the call resolves, using the same shape chat.js's recordUsage() call
// uses.
function recordUndergradTurnUsage(candidateId, turn) {
  const usage = turn?.metadata?.usage;
  if (!usage) return;
  const agentLabel = turn.metadata.routedAgent || turn.agent;
  recordUsage({
    userId: candidateId,
    conversationId: candidateId ? `user:${candidateId}` : 'anonymous',
    feature: FEATURE_BY_UNDERGRAD_AGENT[agentLabel] || 'general_chat',
    model: turn.metadata.model || '',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens,
    webSearchRequests: usage.server_tool_use?.web_search_requests,
    endpoint: `undergrad:${agentLabel}`,
    useWebSearch: false,
  }).catch((err) => console.error('Failed to record usage:', err));
}

const SPECIALIST_PATTERNS = [
  // Profile-bearing uploads must be classified before the generic DocumentAgent.
  // Otherwise words such as "file" or "upload" steal CV/resume turns and the
  // profile agent receives no raw text, causing it to ask for the file again.
  ['profile', /(?:here is|attached|uploaded|submit(?:ted)?)?[\s\S]{0,40}(?:cv|resume|résumé|transcript)|additional background|profile audit/i],
  ['calendar', /deadline|calendar|schedule|event|due date/i],
  ['nagger', /remind|reminder|nudge|milestone/i],
  ['community', /study partner|community|peer|group/i],
  ['scholarship', /scholarship|financial aid|funding|fellowship|stipend/i],
  ['simulation', /what if|predict|chance|odds|scenario/i],
  ['interview', /\binterview(?:s|ing)?\b|evaluate my answer/i],
  ['essay', /essay|statement of purpose|sop|personal statement/i],
  // Word-bounded: the bare substring "file" matches inside "profile", which
  // used to send "ready to see my full profile" turns to the DocumentAgent.
  ['document', /\bdocuments?\b|\bupload(?:ed|ing|s)?\b|\bfiles?\b/i],
  ['settings-agent', /notification|preference|settings|change my language/i],
  ['matching', /recommend|match|school list|program list|university list|portfolio|(?:cannot|can't|do not|don't)\s+see[\s\S]{0,50}schools/i],
  ['search', /requirements|ranking|program facts|find information/i],
];

// The Pivot/Upgrade narrative modal sends this exact, app-generated text
// (see handleNarrativeChoose in AdvisorConversational.jsx/AdvisorChatFirst.jsx).
// The LLM router can misclassify it as "chat" — the router prompt's own
// "chat: General Q&A, strategy, admissions advice" description shares the
// word "strategy" with this handoff — and "chat"/"essay"/etc. specialists
// never get an AdvisorAgent synthesis pass (see internalPipeline below), so a
// misroute silently swaps the promised crafted narrative for generic prose.
// Since we control this literal string, route it deterministically instead
// of leaving it to router guesswork.
const NARRATIVE_CHOICE_HANDOFF = /I've chosen the (?:Upgrade|Pivot) narrative\. Please craft my complete narrative strategy/i;

// Narrative coaching (see inNarrativeStage below) used to claim 100% of a
// candidate's turns with no escape hatch: a clearly off-topic request like
// "find me scholarships for my schools" got swallowed into the coaching
// flow instead of reaching ScholarshipAgent, blocking scholarship search
// (and essay/calendar/interview) entirely for the whole time a candidate is
// mid-narrative-stage. Only these four ids — chosen because their
// SPECIALIST_PATTERNS regexes are specific phrase/keyword matches, not
// broad ones — are eligible to escape; a real narrative answer that happens
// to share a word with a broader pattern (matching/document/etc.) should
// still stay with the coach.
const NARRATIVE_ESCAPE_AGENTS = ['scholarship', 'essay', 'calendar', 'interview'];

function narrativeOffTopicEscape(message) {
  const text = String(message || '').trim();
  if (!text || text === '__idle_checkin__') return false;
  return SPECIALIST_PATTERNS.some(([id, pattern]) => NARRATIVE_ESCAPE_AGENTS.includes(id) && pattern.test(text));
}

function normalizeForLoopCheck(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Safety net, not a substitute for correct narrativeCoaching persistence
// (see the explicit narrativeCoaching carry-forward in the two runCoachTurn
// call sites below): if the session state were ever lost again — a future
// regression, a code path this file doesn't cover yet — the coach would ask
// essentially the same opening-style question every single turn with no way
// out for the candidate. Compares the response the coach is ABOUT to send
// against what it said on the immediately preceding assistant turn; an
// exact-or-near-exact repeat means the session made no real progress and is
// looping, not that the candidate got a legitimate close follow-up.
function repeatsLastAssistantTurn(responseText, history) {
  const lastAssistant = [...(Array.isArray(history) ? history : [])].reverse().find(entry => entry?.role === 'ai');
  if (!lastAssistant?.text) return false;
  return normalizeForLoopCheck(responseText) === normalizeForLoopCheck(lastAssistant.text);
}

// isSchoolListRequest (candidate-facts.js) already covers "generate/show/
// build my [complete] school list/portfolio" and "I cannot see...schools",
// but not a bare "where's my list?" / "where is my school list" — the exact
// third trigger phrase this override is meant to catch (2026-07-12 Tal
// transcript). Kept as a thin OR on top of isSchoolListRequest rather than
// duplicating its logic.
const WHERE_IS_MY_LIST_RE = /\bwhere(?:'s| is)\s+my\s+(?:school\s+)?list\b/i;
export function isGradSchoolListOverrideRequest(message) {
  const text = String(message || '');
  return isSchoolListRequest(text) || WHERE_IS_MY_LIST_RE.test(text);
}

// Undergrad has no narrative modal — the Pivot/Upgrade narrative concept is
// grad/MBA/PhD/Personal-Development only. category is optional so existing
// callers that don't have it (e.g. inferSpecialist) keep prior behavior;
// resolveRoutingDecision passes it explicitly since that's the one place
// this literal handoff string could otherwise force an Undergraduate turn
// onto the full AdvisorAgent.
export function isNarrativeChoiceHandoff(message, category) {
  if (category === 'Undergraduate') return false;
  return NARRATIVE_CHOICE_HANDOFF.test(String(message || ''));
}

export function inferSpecialist(message, action, category) {
  if (isNarrativeChoiceHandoff(message, category)) return 'advisor';
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

// A candidate built entirely through the chip-question flow (path → name →
// field → research interests → career goal → geography → GPA) never gets a
// `scores` object — scores only come from a CV/analysis pass — so the old
// scores-or-baseline-flag gate below left a fully completed chip profile with
// no way to ever reach MatchingAgent, looping forever on "the school list
// needs one more generation pass." MatchingAgent already turns unknown
// GPA/test/recommender details into evidence gaps rather than refusing, so a
// profile with a handful of real answers is matchable without a formal
// scores object. The scores/baseline checks stay as fast-path returns so
// existing behavior is unchanged; the "3+ filled fields" check is the only
// new path.
export function hasMatchableProfileSignal(candidateState = {}) {
  if (candidateState.scores) return true;
  const profile = candidateState.profile || {};
  if (profile.profileCompleteness?.hasStrongProfileBaseline === true) return true;
  if (profile.candidateFacts?.hasStrongProfileBaseline === true) return true;
  const filled = Object.entries(profile).filter(([k, v]) => {
    if (['name', 'category', 'exceptionType'].includes(k)) return false;
    if (v == null) return false;
    const t = String(v).trim().toLowerCase();
    return t !== '' && t !== 'none' && t !== 'unknown' && t !== 'n/a';
  });
  return filled.length >= 3;
}

export async function resolveRoutingDecision({ message, action = 'candidate_message', candidateState = {}, route, enabled = realAgentRouterEnabled() }) {
  const forceMatching = isSchoolListRequest(message)
    && !candidateState.programs?.length
    && hasMatchableProfileSignal(candidateState);
  const forceNarrativeAdvisor = isNarrativeChoiceHandoff(message, candidateState?.profile?.category);
  if (!enabled) {
    return { routerSource: 'regex_fallback', routedAgent: forceNarrativeAdvisor ? 'advisor' : forceMatching ? 'matching' : inferSpecialist(message, action, candidateState?.profile?.category), routeIntent: '', routerError: '' };
  }
  try {
    const result = await route(buildRoutingContext({ message, action, candidateState }));
    if (!result || !ROUTER_AGENT_IDS.has(result.agent)) throw new Error(`Invalid routed agent: ${result?.agent || 'missing'}`);
    const onboardingOverride = !forceMatching && isOnboardingContinuation(message, candidateState);
    const protectedProfileUpload = inferSpecialist(message, action, candidateState?.profile?.category) === 'profile';
    return {
      routerSource: 'llm',
      routedAgent: forceNarrativeAdvisor ? 'advisor' : protectedProfileUpload ? 'profile' : forceMatching ? 'matching' : onboardingOverride ? 'advisor' : result.agent,
      routeIntent: forceNarrativeAdvisor ? 'Craft the complete narrative strategy for the candidate\'s chosen Pivot/Upgrade posture'
        : protectedProfileUpload
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
      routedAgent: forceNarrativeAdvisor ? 'advisor' : forceMatching ? 'matching' : inferSpecialist(message, action, candidateState?.profile?.category),
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
  const value = String(text || '').replace(/^```json\s*|\s*```$/g, '').trim();
  try { return JSON.parse(value); } catch { /* Try the first balanced JSON block below. */ }

  for (let start = 0; start < value.length; start++) {
    if (value[start] !== '{' && value[start] !== '[') continue;
    const stack = [];
    let inString = false;
    let escaped = false;
    for (let index = start; index < value.length; index++) {
      const char = value[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const opener = stack.pop();
        if ((char === '}' && opener !== '{') || (char === ']' && opener !== '[')) break;
        if (!stack.length) {
          try { return JSON.parse(value.slice(start, index + 1)); } catch { break; }
        }
      }
    }
  }
  return null;
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
  // EssayAgent.review() returns the scored critique directly as JSON (no
  // "insights" wrapper key) — draft()/improve() return prose instead, which
  // parseJson can't parse; that prose case is handled by the caller
  // (hybrid-coordinator.js's execute() loop, which has candidateId in scope
  // to saveDocument it), not here.
  if (agent === 'essay') return parsed ? { insights: parsed } : {};
  if (agent === 'matching') {
    const validation = validateProgramList(parsed?.matches || parsed?.programs || []);
    console.info('[program-list]', {
      event: 'specialist_programs_raw',
      rawLength: String(result?.text || '').length,
      reason: validation.reason,
    });
    console.info('[program-list]', {
      event: 'specialist_programs',
      agent: 'MatchingAgent',
      specialistProgramCount: validation.count,
      valid: validation.valid,
      validationFailureReason: validation.valid ? '' : validation.reason,
    });
    return validation.valid || (validation.reason === 'too_few_programs' && validation.count > 0)
      ? validateStatePatch({ programs: validation.programs })
      : {};
  }
  if (!parsed) return {};
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
  // Runs an already-decided specialist plan (e.g. ['search', 'matching']) to
  // completion. Factored out of execute() so the top-level grad school-list
  // override (see COORDINATOR_SCHOOL_LIST_OVERRIDE below) can invoke the
  // exact same "recommend my portfolio" pipeline directly, without going
  // through the router — the override already knows the intent, routing it
  // through resolveRoutingDecision again would be redundant and, worse,
  // could re-route it into whatever specialist it was just overriding.
  async runSpecialistPlan({ candidateId, message, conversationHistory, payload, candidateState, plan, routingMetadata }) {
    const agent = new MainAgent();
    const executionPlan = routingMetadata.executionPlan || plan.map(agentDisplayName);
    if (routingMetadata.routedAgentId === 'advisor' || plan[0] === 'advisor') {
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
          // ScholarshipAgent searches by the candidate's list: chosen schools
          // (targetSchools) first, then their recommended programs as a
          // fallback when no targets are confirmed yet.
          programs: candidateState.programs,
          narrativeText: candidateState.narrativeText,
        },
      });
      lastResult = result;
      const patch = specialistPatch(result.agent || agentId, result.result);
      // EssayAgent.draft()/improve() return prose (not JSON) — specialistPatch
      // can't turn that into a statePatch field, so parseJson(text) returning
      // null there silently discarded the draft with no error surfaced. Save
      // it as a real document instead of losing it.
      if ((result.agent || agentId) === 'essay' && !parseJson(result.result?.text) && String(result.result?.text || '').trim()) {
        await saveDocument(candidateId, {
          name: `Essay draft — ${new Date().toISOString().slice(0, 10)}`,
          type: 'essay_draft',
          content: result.result.text,
        }).catch(() => {});
      }
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

  async execute({ candidateId, message, action = 'candidate_message', payload = {}, conversationHistory = [], candidateState = {} }) {
    // Undergraduate-only deterministic path (grade-band agents + server-side
    // stage tracker). Every other category — including null/undefined, i.e.
    // pre-onboarding — falls through to the regex/LLM routing below exactly
    // as before.
    if (candidateState?.profile?.category === 'Undergraduate') {
      // Undergrad Rail v2 fork (default OFF). When enabled, the grade-rail owns
      // the turn completely — no school-list handler, no smart/master agent, no
      // grad step machine. Single point of entry; single point of rollback.
      if (undergradRailV2Enabled()) {
        const name = candidateState?.profile?.name || candidateState?.name || 'there';
        const turn = await undergradRailTurn(candidateId, { userMessage: message, name });
        return {
          agent: 'UndergradRailV2',
          message: turn.message,
          statePatch: {},
          metadata: {
            routerSource: 'undergrad_rail_v2', routedAgent: 'UndergradRailV2', routedAgentId: 'undergrad-rail-v2',
            routeIntent: 'Undergrad grade-rail turn', routerError: '', routerLatencyMs: 0,
            executionPlan: ['UndergradRailV2'], primaryAgent: 'UndergradRailV2',
            synthesisAgent: null, finalAgent: 'UndergradRailV2', fallbackUsed: false,
            latencyMs: 0, options: turn.options,
          },
        };
      }

      if (looksLikeUndergradSchoolListRequest(message, conversationHistory)) {
        const turn = await handleUndergradSchoolListRequest(candidateId, message, candidateState, conversationHistory);
        recordUndergradTurnUsage(candidateId, turn);
        return turn;
      }

      const smartUndergrad = undergradSmartAgentEnabled();
      if (smartUndergrad) {
        // Measures how often a turn WOULD have escaped to a grad-shaped
        // specialist under the pre-firewall logic, without changing routing
        // — the firewall below already structurally prevents all of these.
        // Passive, for gauging prior contamination; safe to remove once no
        // longer needed.
        const wouldEscape = [
          wantsProfileAnalysis(message) && 'wantsProfileAnalysis',
          isUndergradEscapeToSpecialist(message, action) && 'isUndergradEscapeToSpecialist',
          isSchoolListRequest(message) && 'isSchoolListRequest',
          isNarrativeChoiceHandoff(message, candidateState?.profile?.category) && 'isNarrativeChoiceHandoff',
        ].filter(Boolean);
        if (wouldEscape.length) {
          console.info('[undergrad-firewall]', { candidateId, reasons: wouldEscape, messagePreview: String(message || '').slice(0, 120) });
          recordCandidateActivity(candidateId, {
            type: 'undergrad_firewall_guard_hit',
            label: `Undergrad firewall blocked a would-be escape: ${wouldEscape.join(', ')}`,
            metadata: { reasons: wouldEscape },
          }).catch(() => {});
        }
      }
      // Undergrad smart-agent owns 100% of undergrad conversation. Grad-shaped
      // structured-block generation (<PROFILE>/<SCORES>/<PROGRAMS> from
      // AdvisorAgent) MUST NEVER run for undergrad candidates — it broke
      // Tal's grade-10 school-list request in the 2026-07-09 transcript. While
      // the flag is on, none of the legacy escapes below (wantsProfileAnalysis,
      // isUndergradEscapeToSpecialist, isSchoolListRequest's forceMatching in
      // resolveRoutingDecision, isNarrativeChoiceHandoff — undergrad has no
      // narrative modal) may divert a turn away from UndergradAgent. The ONLY
      // exception is an actual file upload: it still goes to DocumentAgent
      // first for text extraction, then the extracted text flows into
      // UndergradAgent's own turn — never to ProfileAgent's grad-shaped
      // extraction.
      if (smartUndergrad) {
        const hasFileUpload = !!(payload?.upload?.content || payload?.upload?.url);
        let undergradMessage = message;
        if (hasFileUpload) {
          const extraction = await new MainAgent().handle(candidateId, message, {
            conversationHistory,
            forcedAgent: 'document',
            extra: { ...payload, upload: payload.upload, profile: candidateState.profile || {} },
          });
          const extractedText = extraction?.result?.text || '';
          if (extractedText) undergradMessage = `${message}\n\n[Uploaded document text extracted by DocumentAgent]:\n${extractedText}`.trim();
        }
        const turn = await new UndergradAgent().handle(candidateId, undergradMessage, { candidateState, conversationHistory });
        recordUndergradTurnUsage(candidateId, turn);
        return turn;
      }

      // Flag off: byte-identical to the pre-smart-agent behavior. CV/document
      // uploads, essay review, and calendar requests still resolve to their
      // existing specialists first; only the generic "advisor" catch-all
      // conversation is replaced by UndergradMasterAgent.
      if (!wantsProfileAnalysis(message) && !isUndergradEscapeToSpecialist(message, action)) {
        const turn = await new UndergradMasterAgent().handle(candidateId, message, { candidateState, conversationHistory });
        recordUndergradTurnUsage(candidateId, turn);
        return turn;
      }
    }

    // Top-level, unconditional grad/MBA/PhD/Personal-Development school-list
    // override — mirrors the Undergraduate branch's
    // looksLikeUndergradSchoolListRequest check above, which already wins
    // over every other undergrad routing decision. A candidate explicitly
    // asking to see/generate their school list must win over EVERY other
    // in-progress specialist flow (narrative coaching, community/study-
    // partner matching, or any future stage-lock) — those specialists have
    // no way to recognize "actually I want something completely different"
    // and previously trapped a candidate in an unrelated questionnaire loop
    // indefinitely (2026-07-12 Tal transcript: two rounds of community
    // study-partner questions in response to an explicit "generate my
    // complete school list, I cannot see any schools" plea). This runs
    // BEFORE the narrative-coaching block and before the router, so it beats
    // every stage-lock unconditionally — same priority as the Undergraduate
    // check above. It is a one-turn escape valve: it returns without ever
    // touching narrativeCoaching or any other persisted stage state, so
    // whatever was active resumes normally on the very next turn.
    if (candidateState?.profile?.category !== 'Undergraduate' && isGradSchoolListOverrideRequest(message)) {
      const existingPrograms = validateProgramList(candidateState.programs);
      if (existingPrograms.valid) {
        // Already generated earlier — re-surface it instead of burning
        // tokens (and risking a different list) regenerating from scratch.
        // Also covers the case where the list was generated but the
        // frontend/chat never actually displayed it.
        return {
          agent: 'matching',
          message: `Here's your school list again — ${existingPrograms.count} schools across reach, target, and likely. Check the University List tab for the full breakdown.`,
          statePatch: { programs: existingPrograms.programs },
          metadata: {
            routerSource: 'grad_school_list_override', routedAgent: 'MatchingAgent', routedAgentId: 'matching',
            routeIntent: 'Re-surface the existing school list on an explicit request', routerError: '', routerLatencyMs: 0,
            executionPlan: ['MatchingAgent'], primaryAgent: 'MatchingAgent', synthesisAgent: null, finalAgent: 'MatchingAgent',
            fallbackUsed: false, latencyMs: 0, resurfaced: true, existingProgramCount: existingPrograms.count,
          },
        };
      }
      // No adequate list yet. Only actually generate one if there's enough
      // real signal to generate from (same gate resolveRoutingDecision's own
      // forceMatching already uses) — an early "show me schools" with no
      // profile/scores yet is not this override's concern, and forcing a
      // real MatchingAgent call with nothing to match against would just
      // fail or fabricate. Falls through to normal routing below instead,
      // same as if this override didn't exist.
      const hasEnoughSignalToGenerate = hasMatchableProfileSignal(candidateState);
      if (hasEnoughSignalToGenerate) {
        // Generate one now via the exact same plan "Recommend my portfolio"
        // already triggers (SPECIALIST_PATTERNS' 'matching' entry),
        // regardless of what specialist stage-lock was about to intercept
        // this turn.
        const overridePlan = buildExecutionPlanForAgent('matching');
        return this.runSpecialistPlan({
          candidateId, message, conversationHistory, payload, candidateState, plan: overridePlan,
          routingMetadata: {
            routerSource: 'grad_school_list_override', routedAgent: agentDisplayName('matching'), routedAgentId: 'matching',
            routeIntent: 'Explicit school-list request overriding an in-progress specialist flow', routerError: '', routerLatencyMs: 0,
            executionPlan: overridePlan.map(agentDisplayName),
            primaryAgent: agentDisplayName(overridePlan[overridePlan.length - 1]), synthesisAgent: 'AdvisorAgent', finalAgent: 'AdvisorAgent',
            fallbackUsed: false,
          },
        });
      }
    }

    // NARRATIVE_COACHING_V2 (grad/MBA/PhD/Personal-Development only — the
    // Undergraduate branch above already returned). Once the candidate has
    // confirmed target schools and hasn't yet locked a final narrativeText,
    // the coaching session owns the turn completely: no other routing
    // (advisor/matching/essay/etc.) runs while it's active, matching how the
    // Undergraduate branch above bypasses the generic router.
    if (candidateState?.profile?.category !== 'Undergraduate' && narrativeCoachingV2Enabled()) {
      const inNarrativeStage = Array.isArray(candidateState.chosenSchools)
        && candidateState.chosenSchools.length > 0
        && !candidateState.narrativeText;

      if (inNarrativeStage) {
        const emptyTurnMetadata = {
          routerSource: 'narrative_coaching_v2', routedAgent: 'NarrativeCoachAgent', executionPlan: ['NarrativeCoachAgent'],
          primaryAgent: 'NarrativeCoachAgent', synthesisAgent: null, finalAgent: 'NarrativeCoachAgent',
          fallbackUsed: false, latencyMs: 0, toolCalls: [], usage: null, model: null, narrativeLocked: false,
        };

        async function runCoachTurn(coachCandidateState) {
          const turn = await new NarrativeCoachAgent().handle(candidateId, message, { conversationHistory, candidateState: coachCandidateState });
          if (!turn.metadata?.narrativeLocked) return turn;
          const final = await finalizeCoachingSession(candidateId, {
            textLength: turn.statePatch?.narrativeText?.length,
            pivotRiskBand: coachCandidateState.narrativeCoaching?.sessionContext?.pivotRisk?.band,
          });
          return {
            agent: 'NarrativeCoachAgent',
            message: final.message,
            statePatch: { ...turn.statePatch, ...final.statePatch },
            metadata: { ...turn.metadata, narrativeLocked: true, options: final.options },
          };
        }

        // Clearly off-topic requests (scholarship/essay/calendar/interview)
        // fall through to the normal MainAgent routing below instead of
        // being forced into the coach — see narrativeOffTopicEscape above.
        if (!narrativeOffTopicEscape(message)) {
          if (!candidateState.narrativeCoaching?.rawGoal) {
            // Kickoff: ask the single open question first; the candidate's next
            // reply becomes rawGoal and starts the coaching session in the same
            // turn (no wasted round trip re-asking a question already answered).
            if (!String(message || '').trim() || message === '__idle_checkin__') {
              return { agent: 'NarrativeCoachAgent', message: NARRATIVE_KICKOFF_QUESTION, statePatch: {}, metadata: emptyTurnMetadata };
            }
            const narrativeCoaching = startCoachingSession({ ...candidateState, narrativeCoaching: { rawGoal: message } });
            const turn = await runCoachTurn({ ...candidateState, narrativeCoaching });
            if (!repeatsLastAssistantTurn(turn.message, conversationHistory)) {
              // narrativeCoaching persists exactly like profile/programs/
              // scholarships: it's a real statePatch field, merged into stored
              // candidate state the same generic way every turn, and reloaded
              // as part of candidateState on the next request. Explicit here
              // (rather than only relying on the caller not overwriting it)
              // so a session's rawGoal/sessionContext is never lost turn to turn.
              return { ...turn, statePatch: { ...turn.statePatch, narrativeCoaching } };
            }
            console.error('[narrative-loop-detected]', { candidateId, stage: 'kickoff', message: turn.message });
          } else if (isCoachingActive(candidateState)) {
            const turn = await runCoachTurn(candidateState);
            if (!repeatsLastAssistantTurn(turn.message, conversationHistory)) {
              return { ...turn, statePatch: { ...turn.statePatch, narrativeCoaching: candidateState.narrativeCoaching } };
            }
            console.error('[narrative-loop-detected]', { candidateId, stage: 'active', message: turn.message });
          }
        }
      }
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
    return this.runSpecialistPlan({ candidateId, message, conversationHistory, payload, candidateState, plan, routingMetadata });
  }
}
