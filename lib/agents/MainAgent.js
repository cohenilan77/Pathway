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
- settings: Profile updates, notification preferences, account settings

Respond with ONLY a JSON object: { "agent": "<agent_name>", "intent": "<one sentence summary>" }`;

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
  settings: () => new SettingsAgent(),
};

export class MainAgent extends BaseAgent {
  constructor() {
    super({ name: 'MainAgent', systemPrompt: ROUTER_PROMPT, maxTokens: 256 });
  }

  async route(message) {
    const result = await this.execute([{ role: 'user', content: message }]);
    try {
      const clean = result.text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return { agent: 'chat', intent: message };
    }
  }

  async handle(candidateId, message, { conversationHistory = [], extra = {} } = {}) {
    const startedAt = Date.now();

    const { agent: agentName, intent } = await this.route(message);
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
          ? await agent.parse(candidateId, extra.rawText)
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
      case 'settings':
        result = extra.summarize
          ? await agent.summarizeSettings(candidateId)
          : await agent.handle(candidateId, message);
        break;
      default:
        result = await new ChatAgent().chat(candidateId, message, conversationHistory);
    }

    const latencyMs = Date.now() - startedAt;
    await logAgentInteraction(candidateId, agentName, intent).catch(() => {});

    return { agent: agentName, intent, result, latencyMs };
  }
}
