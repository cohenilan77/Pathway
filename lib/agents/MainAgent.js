import { BaseAgent } from './BaseAgent.js';
import { MatchingAgent } from './sub/MatchingAgent.js';
import { ProfileAgent } from './sub/ProfileAgent.js';
import { SearchAgent } from './sub/SearchAgent.js';
import { EssayAgent } from './sub/EssayAgent.js';
import { ChatAgent } from './sub/ChatAgent.js';
import { AdvisorAgent } from './sub/AdvisorAgent.js';
import { InterviewAgent } from './sub/InterviewAgent.js';
import { NaggerAgent } from './sub/NaggerAgent.js';
import { CalendarAgent } from './sub/CalendarAgent.js';
import { CommunityAgent } from './sub/CommunityAgent.js';
import { DocumentAgent } from './sub/DocumentAgent.js';
import { SimulationAgent } from './sub/SimulationAgent.js';
import { SettingsAgent } from './sub/SettingsAgent.js';
import { ScholarshipAgent } from './sub/ScholarshipAgent.js';
import { logAgentInteraction } from './tools/update.js';
import { buildCandidateFacts, candidateFactsPrompt } from '../candidate-facts.js';
import { getKpiPromptSummary } from '../admissions-kpi.js';
import { requestedProgramFormat } from '../program-format.js';
import { buildSystemPrompt, DEFAULT_AI_CONFIG } from '../../api/chat.js';
import { UndergradMasterAgent } from './UndergradMasterAgent.js';
import { UndergradAgent } from './UndergradAgent.js';
import { handleUndergradSchoolListRequest } from '../undergrad/handle-school-list.js';
import { looksLikeUndergradSchoolListRequest } from '../undergrad/school-list-intent.js';
import { recordUsage } from '../usage.js';

// Usage & Cost dashboard feature labels (api/admin-usage.js FEATURE_LABELS) for
// each specialist this agent can dispatch to. Agents with no closer match fall
// back to 'general_chat', the same default recordUsage() itself applies.
const FEATURE_BY_AGENT = {
  matching: 'program_matching',
  search: 'program_matching',
  profile: 'profile_analysis',
  essay: 'essay_workshop',
  interview: 'mock_interview',
  document: 'document_parsing',
  scholarship: 'scholarship_search',
};

function featureForAgent(agentName) {
  return FEATURE_BY_AGENT[agentName] || 'general_chat';
}

const FEATURE_BY_UNDERGRAD_AGENT = {
  ProfileIntakeAgent: 'profile_analysis',
  AcademicStrengthAgent: 'profile_analysis',
  UniversityMatchingAgent: 'program_matching',
  PortfolioEvidenceAgent: 'program_matching',
  EssayNarrativeAgent: 'essay_workshop',
};

function recordUndergradUsage({ candidateId, agentLabel, usage, model }) {
  if (!usage) return;
  recordUsage({
    userId: candidateId,
    conversationId: candidateId ? `user:${candidateId}` : 'anonymous',
    feature: FEATURE_BY_UNDERGRAD_AGENT[agentLabel] || 'general_chat',
    model: model || '',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens,
    webSearchRequests: usage.server_tool_use?.web_search_requests,
    endpoint: `undergrad:${agentLabel}`,
    useWebSearch: false,
  }).catch((err) => console.error('Failed to record usage:', err));
}

function smartUndergradEnabled(env = process.env) {
  return String(env.UNDERGRAD_SMART_AGENT || 'true').toLowerCase() !== 'false';
}

// Logs the specialist's own direct Anthropic call to the Usage & Cost
// dashboard. This is separate from logAgentInteraction (candidate-activity
// log) and from any later AdvisorAgent continuation call chat.js logs on its
// own — each is a distinct API call with its own usage, so there is no
// double-counting.
function recordSpecialistUsage({ candidateId, agentName, usage, model }) {
  if (!usage) return;
  recordUsage({
    userId: candidateId,
    conversationId: candidateId ? `user:${candidateId}` : 'anonymous',
    feature: featureForAgent(agentName),
    model: model || '',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens,
    webSearchRequests: usage.server_tool_use?.web_search_requests,
    endpoint: agentName,
    useWebSearch: false,
  }).catch((err) => console.error('Failed to record usage:', err));
}

const ROUTER_PROMPT = `You are the Pathway AI orchestrator. Analyze the user's message and select the best agent.

Agents and their purposes:
- advisor: General admissions strategy, journey progression, profile follow-up questions, and "what next" guidance
- matching: School selection, fit analysis, target list building
- profile: CV parsing, profile building, background extraction
- search: School database queries, program info, rankings, requirements
- essay: Essay review, feedback, drafting, improvement
- chat: General Q&A, strategy, admissions advice
- interview: Mock interviews, answer evaluation, prep guides
- nagger: Reminders, nudges, deadline warnings, motivation
- calendar: Adding/viewing deadlines, interview dates, test dates
- community: Study partners, peer matching, group activities
- document: Upload processing, document management, file listing
- simulation: Admission probability prediction, what-if scenarios
- settings-agent: Profile updates, notification preferences, account settings
- scholarship: Scholarships, financial aid, funding, fellowships, stipends

Routing distinctions:
- A supplied CV/resume/transcript or substantial background text routes to profile (the coordinator adds document processing first).
- Requests for recommended schools, matches, or a portfolio route to matching (the coordinator adds search first).
- Factual program requirements/rankings without personalized matching route to search.
- Use advisor for ordinary guided admissions conversation; use chat only for general Q&A outside the structured journey.

Respond with ONLY a JSON object: { "agent": "<agent_name>", "intent": "<one sentence summary>" }`;

export const ROUTER_AGENT_IDS = new Set([
  'advisor', 'matching', 'profile', 'search', 'chat', 'essay', 'interview',
  'nagger', 'calendar', 'community', 'document', 'simulation', 'settings-agent',
  'scholarship',
]);

const ESSAY_REVIEW_VERB_RE = /\b(review|feedback|critique|thoughts on this|how (?:is|does) (?:this|it) (?:read|sound)|improve this|what do you think|is this good|rate this|grade this)\b/i;
const ESSAY_INLINE_PROMPT_RE = /(?:prompt|question)\s*(?:is|:)\s*["“]?([^"\n]{10,300}?)["”]?(?:\n|$)/i;
const ESSAY_SHAPED_MIN_LENGTH = 600;

// Detects a candidate pasting an essay draft straight into chat instead of
// using the Documents/Essays UI (the only caller that normally sets
// extra.essay/extra.prompt). Returns null for ordinary short messages
// (draft() flow is unchanged), {action:'clarify'} for long prose with no
// clear review/draft signal, or {action:'review', essay, prompt} once both
// a substantial pasted essay and a review intent are present.
export function detectPastedEssayIntent(message) {
  const text = String(message || '');
  if (text.length <= ESSAY_SHAPED_MIN_LENGTH) return null;
  if (!ESSAY_REVIEW_VERB_RE.test(text)) return { action: 'clarify' };
  const inlinePrompt = text.match(ESSAY_INLINE_PROMPT_RE)?.[1]?.trim();
  return {
    action: 'review',
    essay: text,
    prompt: inlinePrompt || 'Not explicitly stated — infer the likely prompt from the essay content and note that assumption in the review.',
  };
}

const AGENTS = {
  advisor: () => new AdvisorAgent(),
  matching: () => new MatchingAgent(),
  profile: () => new ProfileAgent(),
  search: () => new SearchAgent(),
  essay: () => new EssayAgent(),
  chat: () => new ChatAgent(),
  interview: () => new InterviewAgent(),
  nagger: () => new NaggerAgent(),
  calendar: () => new CalendarAgent(),
  community: () => new CommunityAgent(),
  document: () => new DocumentAgent(),
  simulation: () => new SimulationAgent(),
  'settings-agent': () => new SettingsAgent(),
  scholarship: () => new ScholarshipAgent(),
};

export class MainAgent extends BaseAgent {
  constructor() {
    super({ name: 'MainAgent', systemPrompt: ROUTER_PROMPT, maxTokens: 256 });
  }

  async route(input, { strict = false } = {}) {
    const message = typeof input === 'string' ? input : JSON.stringify(input);
    const startedAt = Date.now();
    try {
      const result = await this.execute([{ role: 'user', content: message }]);
      const clean = result.text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed || !ROUTER_AGENT_IDS.has(parsed.agent)) throw new Error(`Invalid routed agent: ${parsed?.agent || 'missing'}`);
      return {
        ...parsed,
        routerUsage: result.usage || null,
        routerModel: result.raw?.model || this.model,
        routerLatencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (strict) throw error;
      return { agent: 'chat', intent: message };
    }
  }

  async handle(candidateId, message, { conversationHistory = [], extra = {}, forcedAgent = null } = {}) {
    const startedAt = Date.now();

    // Undergraduate-only deterministic path. Only reached when this method is
    // called without a forcedAgent (i.e. as the top-level entry point, as
    // /api/agents/orchestrate does) so the HybridCoordinator's own
    // document/profile/matching/etc. specialist plan is never intercepted.
    // Every other category — including null/undefined, i.e. pre-onboarding —
    // falls through to the LLM router below exactly as before.
    if (!forcedAgent && extra?.profile?.category === 'Undergraduate') {
      const candidateState = {
        profile: extra.profile, scores: extra.scores, programs: extra.programs,
        chosenSchools: extra.chosenSchools, stage: extra.stage,
        strengths: extra.strengths, weaknesses: extra.weaknesses, tasks: extra.tasks,
        undergrad: extra.undergrad,
      };
      if (looksLikeUndergradSchoolListRequest(message, conversationHistory)) {
        const turn = await handleUndergradSchoolListRequest(candidateId, message, candidateState, conversationHistory);
        const latencyMs = Date.now() - startedAt;
        recordUndergradUsage({ candidateId, agentLabel: turn.agent, usage: turn.metadata.usage, model: turn.metadata.model });
        return {
          agent: 'advisor',
          intent: 'undergrad_school_list',
          result: { text: turn.message, toolUses: [], usage: turn.metadata.usage, raw: null, statePatch: turn.statePatch, metadata: turn.metadata },
          latencyMs,
        };
      }

      if (smartUndergradEnabled()) {
        const hasFileUpload = !!(extra?.upload?.content || extra?.upload?.url);
        let undergradMessage = message;
        if (hasFileUpload) {
          const extraction = await new MainAgent().handle(candidateId, message, {
            conversationHistory,
            forcedAgent: 'document',
            extra: { ...extra, upload: extra.upload, profile: extra.profile || {} },
          });
          const extractedText = extraction?.result?.text || '';
          if (extractedText) undergradMessage = `${message}\n\n[Uploaded document text extracted by DocumentAgent]:\n${extractedText}`.trim();
        }
        const turn = await new UndergradAgent().handle(candidateId, undergradMessage, { candidateState, conversationHistory });
        const latencyMs = Date.now() - startedAt;
        recordUndergradUsage({ candidateId, agentLabel: turn.agent, usage: turn.metadata.usage, model: turn.metadata.model });
        return {
          agent: 'advisor',
          intent: 'undergrad_smart_agent',
          result: { text: turn.message, toolUses: [], usage: turn.metadata.usage, raw: null, statePatch: turn.statePatch, metadata: turn.metadata },
          latencyMs,
        };
      }

      const { isUndergradEscapeToSpecialist, wantsProfileAnalysis } = await import('../hybrid-coordinator.js');
      // Ordinary conversation stays in the deterministic undergrad path even
      // when it trips a specialist keyword pattern (e.g. "recommend a
      // university list" → matching): those specialists have no undergrad
      // context, and previously an escaped turn could land on
      // ProfileAgent.audit() — no bound lookup tool, no profile data — which
      // hallucinated a "no database access" reply with a leaked candidate
      // ID. Only a genuine CV/profile-bearing paste (isUndergradEscapeToSpecialist)
      // or a profile-reveal request ("ready to see my full profile", which
      // only the full AdvisorAgent below can answer with real
      // <PROFILE>/<SCORES> blocks) leaves this path.
      if (!wantsProfileAnalysis(message) && !isUndergradEscapeToSpecialist(message)) {
        const turn = await new UndergradMasterAgent().handle(candidateId, message, {
          candidateState,
          conversationHistory,
        });
        const latencyMs = Date.now() - startedAt;
        await logAgentInteraction(candidateId, turn.agent, 'Undergrad master agent', {
          status: 'success', model: '', inputTokens: 0, outputTokens: 0, cacheTokens: 0, totalTokens: 0, latencyMs,
        }).catch(() => {});
        recordUndergradUsage({ candidateId, agentLabel: turn.agent, usage: turn.metadata.usage, model: turn.metadata.model });
        return {
          agent: 'advisor',
          intent: 'undergrad_deterministic',
          result: { text: turn.message, toolUses: [], usage: turn.metadata.usage, raw: null, statePatch: turn.statePatch, metadata: turn.metadata },
          latencyMs,
        };
      }
    }

    const { agent: agentName, intent } = forcedAgent
      ? { agent: forcedAgent, intent: `Coordinator delegated ${forcedAgent}` }
      : await this.route(message);
    const agentFactory = AGENTS[agentName];

    if (!agentFactory) {
      const fallback = new ChatAgent();
      const result = await fallback.chat(candidateId, message, conversationHistory, {
        profile: extra.profile, scores: extra.scores, chosenSchools: extra.chosenSchools,
      });
      return { agent: 'chat', intent, result, latencyMs: Date.now() - startedAt };
    }

    const agent = agentFactory();
    let result;

    switch (agentName) {
      case 'advisor': {
        const isIdleCheckin = message === '__idle_checkin__';
        const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
        const historyMessages = rawHistory
          .filter((m) => m?.role !== 'system' && m?.text && m.text !== '__idle_checkin__')
          .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
        const lastEntry = historyMessages[historyMessages.length - 1];
        const alreadyIncludesMessage = !isIdleCheckin && lastEntry?.role === 'user' && lastEntry.content === message;
        const advisorMessages = (!isIdleCheckin && message && !alreadyIncludesMessage)
          ? [...historyMessages, { role: 'user', content: message }]
          : historyMessages;

        if (!advisorMessages.length || advisorMessages[advisorMessages.length - 1].role !== 'user') {
          result = { text: '', toolUses: [], usage: null, raw: null };
          break;
        }

        const kpiPromptSummary = await getKpiPromptSummary();
        const candidateFacts = buildCandidateFacts({
          cvExtraction: extra.profileSources?.fileText || extra.cvExtraction || extra.profile?.candidateFacts?.cvExtraction || {},
          extraText: [extra.profileSources?.pastedText, extra.profileSources?.additionalText, extra.extraText, extra.systemContext].filter(Boolean).join('\n'),
          profileSources: extra.profileSources || extra.profile?.candidateFacts?.profileSources || {},
          messages: rawHistory,
          profile: extra.profile || {},
          scores: extra.scores,
          candidateType: extra.profile?.category || extra.profile?.degree,
          targetSchools: [
            ...(Array.isArray(extra.profile?.targetSchools) ? extra.profile.targetSchools : []),
            ...(Array.isArray(extra.chosenSchools) ? extra.chosenSchools : []),
          ],
        });
        const lockedTargetsContext = Array.isArray(extra.chosenSchools) && extra.chosenSchools.length
          ? `\n\nLOCKED TARGET SCHOOLS (authoritative current state): ${extra.chosenSchools.join(' | ')}. The candidate already selected and confirmed these schools using the app. Never ask them to name, choose, narrow, or lock target schools again. Continue from the current Narrative question.`
          : '';
        const idleContext = isIdleCheckin
          ? `\n\nIDLE RE-ENGAGEMENT (priority override): The user has been inactive for 60 seconds. Generate a brief, warm, contextual check-in (1-2 sentences MAX). Reference something specific and useful from their profile or top task — never say "still there?", never ask a generic question. End with → 2-3 specific chips tied to their current state. Do not echo previous questions.`
          : '';
        // Raw app state alongside the distilled candidateFacts, mirroring
        // api/chat.js — chat-collected answers (grade, subjects, activities)
        // stay visible even when a fact missed the distilled extraction.
        const candidateDataContext = (extra.profile && Object.keys(extra.profile).length)
          ? `\n\nCANDIDATE PROFILE DATA (authoritative, sent by the app on this turn):\n${JSON.stringify({ profile: extra.profile, scores: extra.scores || undefined, chosenSchools: (Array.isArray(extra.chosenSchools) && extra.chosenSchools.length) ? extra.chosenSchools : undefined }, null, 2)}`
          : '';
        // Narrative Coaching v2 (NARRATIVE_COACHING_V2): once locked via
        // NarrativeCoachAgent, every AdvisorAgent turn (including CV-stage
        // rewrites, per our audit of what currently handles CV rewrites)
        // must treat the narrative as source of truth.
        const narrativeContext = extra.narrativeText
          ? `\n\nCANDIDATE NARRATIVE (source of truth): "${extra.narrativeText}"\n\nEvery response — including CV bullet rewrites — must be consistent with this narrative. If the candidate's request conflicts with it, note the conflict and ask before drifting.`
          : '';
        const systemPrompt = buildSystemPrompt(DEFAULT_AI_CONFIG, extra.language, kpiPromptSummary, '', extra.systemContext)
          + `\n\n${candidateFactsPrompt(candidateFacts)}${candidateDataContext}${lockedTargetsContext}${narrativeContext}${idleContext}`;

        let lastResponse = null;
        const rawText = await agent.chat(advisorMessages, {
          systemPrompt,
          formatConstraint: requestedProgramFormat(extra.profile, rawHistory),
          hasPrograms: Array.isArray(extra.programs) && extra.programs.length > 0,
          onAttempt: (response) => { lastResponse = response; },
        });
        result = { text: rawText, toolUses: [], usage: lastResponse?.usage || null, raw: lastResponse || null };
        break;
      }
      case 'matching':
        result = await agent.match(candidateId, extra.preferences);
        break;
      case 'profile':
        result = extra.rawText
          ? await agent.parse(candidateId, extra.rawText, { profile: extra.profile, conversationHistory })
          : await agent.audit(candidateId);
        break;
      case 'search':
        result = await agent.search(message);
        break;
      case 'essay':
        if (extra.essay && extra.prompt) {
          result = await agent.review(extra.essay, extra.prompt, extra.school, extra.narrativeText);
        } else if (extra.essay && extra.feedback) {
          result = await agent.improve(extra.essay, extra.feedback, extra.narrativeText);
        } else {
          // The Documents/Essays UI always sets extra.essay/extra.prompt
          // explicitly; a candidate who pastes a draft straight into chat and
          // says "review this" never populates them, so this used to fall
          // straight to draft() and silently write a brand-new essay over
          // whatever they pasted. Detect that shape here instead.
          const essayIntent = detectPastedEssayIntent(message);
          if (essayIntent?.action === 'review') {
            result = await agent.review(essayIntent.essay, essayIntent.prompt, extra.school, extra.narrativeText);
          } else if (essayIntent?.action === 'clarify') {
            result = { text: 'Is this a draft you want reviewed, or should I write one? If it\'s for review, what\'s the essay prompt/question?', toolUses: [], usage: null, raw: null };
          } else {
            result = await agent.draft(message, extra.profile, extra.school, extra.wordLimit, extra.narrativeText);
          }
        }
        break;
      case 'chat':
        // The router's error fallback also lands here, so this path must carry
        // the candidate data the frontend sends — otherwise the model answers
        // with no profile and tells the candidate it has no access to it.
        result = await agent.chat(candidateId, message, conversationHistory, {
          profile: extra.profile, scores: extra.scores, chosenSchools: extra.chosenSchools,
        });
        break;
      case 'interview':
        if (extra.answer && extra.question) {
          result = await agent.evaluateAnswer(extra.answer, extra.question, extra.school, extra.narrativeText);
        } else if (extra.school && !extra.questionType) {
          result = await agent.prepGuide(extra.school, extra.narrativeText);
        } else {
          result = await agent.startMock(candidateId, extra.school, extra.questionType, extra.narrativeText);
        }
        break;
      case 'nagger':
        result = extra.milestone
          ? await agent.celebrateMilestone(candidateId, extra.milestone)
          : await agent.generateNudge(candidateId);
        break;
      case 'calendar':
        result = extra.viewSchedule
          ? await agent.getSchedule(candidateId, extra.days)
          : await agent.handle(candidateId, message);
        break;
      case 'community':
        result = extra.findPartners
          ? await agent.findStudyPartners(candidateId)
          : await agent.handle(candidateId, message);
        break;
      case 'scholarship':
        result = extra.searchScholarships
          ? await agent.search(candidateId, extra.profile || {})
          : await agent.handle(candidateId, message, extra.profile || {});
        break;
      case 'document':
        if (extra.upload) {
          result = await agent.processUpload(candidateId, extra.upload);
        } else {
          result = await agent.listDocuments(candidateId, extra.documentType);
        }
        break;
      case 'simulation':
        result = extra.hypotheticalChanges
          ? await agent.whatIf(candidateId, extra.hypotheticalChanges)
          : await agent.predictOutcomes(candidateId, extra.targetSchools || []);
        break;
      case 'settings-agent':
        result = extra.summarize
          ? await agent.summarizeSettings(candidateId)
          : await agent.handle(candidateId, message);
        break;
      default:
        result = await new ChatAgent().chat(candidateId, message, conversationHistory, {
          profile: extra.profile, scores: extra.scores, chosenSchools: extra.chosenSchools,
        });
    }

    const latencyMs = Date.now() - startedAt;
    const usage = result?.usage || {};
    const inputTokens = Number(usage.input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0);
    const cacheTokens = Number(usage.cache_creation_input_tokens || 0) + Number(usage.cache_read_input_tokens || 0);
    const loggedAgentName = agentName === 'settings-agent'
      ? 'SettingsAgent'
      : `${agentName.charAt(0).toUpperCase()}${agentName.slice(1)}Agent`;
    await logAgentInteraction(candidateId, loggedAgentName, intent, {
      status: 'success',
      model: result?.raw?.model || '',
      inputTokens,
      outputTokens,
      cacheTokens,
      totalTokens: inputTokens + outputTokens + cacheTokens,
      latencyMs,
    }).catch(() => {});
    recordSpecialistUsage({ candidateId, agentName, usage: result?.usage, model: result?.raw?.model });

    return { agent: agentName, intent, result, latencyMs };
  }
}
