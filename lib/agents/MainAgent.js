import { BaseAgent } from './BaseAgent.js';
import { MatchingAgent } from './sub/MatchingAgent.js';
import { ProfileAgent } from './sub/ProfileAgent.js';
import { SearchAgent } from './sub/SearchAgent.js';
import { EssayAgent } from './sub/EssayAgent.js';
import { ChatAgent } from './sub/ChatAgent.js';
import { InterviewAgent } from './sub/InterviewAgent.js';
import { NaggerAgent } from './sub/NaggerAgent.js';
import { CalendarAgent } from './sub/CalendarAgent.js';
import { CommunityAgent } from './sub/CommunityAgent.js';
import { DocumentAgent } from './sub/DocumentAgent.js';
import { SimulationAgent } from './sub/SimulationAgent.js';
import { SettingsAgent } from './sub/SettingsAgent.js';
import { logAgentInteraction } from './tools/update.js';

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

Routing distinctions:
- A supplied CV/resume/transcript or substantial background text routes to profile (the coordinator adds document processing first).
- Requests for recommended schools, matches, or a portfolio route to matching (the coordinator adds search first).
- Factual program requirements/rankings without personalized matching route to search.
- Use advisor for ordinary guided admissions conversation; use chat only for general Q&A outside the structured journey.

Respond with ONLY a JSON object: { "agent": "<agent_name>", "intent": "<one sentence summary>" }`;

export const ROUTER_AGENT_IDS = new Set([
  'advisor', 'matching', 'profile', 'search', 'chat', 'essay', 'interview',
  'nagger', 'calendar', 'community', 'document', 'simulation', 'settings-agent',
]);

const AGENTS = {
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

    const { agent: agentName, intent } = forcedAgent
      ? { agent: forcedAgent, intent: `Coordinator delegated ${forcedAgent}` }
      : await this.route(message);
    const agentFactory = AGENTS[agentName];

    if (!agentFactory) {
      const fallback = new ChatAgent();
      const result = await fallback.chat(candidateId, message, conversationHistory);
      return { agent: 'chat', intent, result, latencyMs: Date.now() - startedAt };
    }

    const agent = agentFactory();
    let result;

    switch (agentName) {
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
          result = await agent.review(extra.essay, extra.prompt, extra.school);
        } else if (extra.essay && extra.feedback) {
          result = await agent.improve(extra.essay, extra.feedback);
        } else {
          result = await agent.draft(message, extra.profile, extra.school, extra.wordLimit);
        }
        break;
      case 'chat':
        result = await agent.chat(candidateId, message, conversationHistory);
        break;
      case 'interview':
        if (extra.answer && extra.question) {
          result = await agent.evaluateAnswer(extra.answer, extra.question, extra.school);
        } else if (extra.school && !extra.questionType) {
          result = await agent.prepGuide(extra.school);
        } else {
          result = await agent.startMock(candidateId, extra.school, extra.questionType);
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
        result = await new ChatAgent().chat(candidateId, message, conversationHistory);
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

    return { agent: agentName, intent, result, latencyMs };
  }
}
