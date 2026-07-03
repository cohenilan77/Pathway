import { buildSystemPrompt, resolveConfig, DEFAULT_AI_CONFIG } from '../advisor-prompt.js';
import { AGENT_META_INSTRUCTION } from './agentClient.js';

// Every specialist except scholarship/visa/research reuses the existing, heavily
// tuned advisor prompt (buildSystemPrompt) verbatim as its domain knowledge base —
// per the rebuild's "reuse current agents, don't rewrite domain logic" requirement.
// A short ROLE SCOPE preamble is layered on top so the same underlying knowledge
// answers a narrower question when it's one of several specialists running in
// parallel for a single turn, instead of trying to run the whole 8-step pipeline.
function roleScope(label, focus) {
  return `You are the ${label} inside Pathway's multi-agent admissions advisory system. A separate Router/Planner has already decided this turn needs your expertise specifically for: ${focus}\n` +
    `Your full domain instructions follow below (they describe the entire advisor persona/pipeline) — use them as your knowledge base, but only act on the parts relevant to your focus this turn. Do not restart onboarding steps, do not ask about topics outside your focus (another specialist owns those), and do not repeat questions already answered earlier in the conversation. If your focus genuinely requires information you don't have, say so via missingInformation/suggestedFollowUp below rather than guessing.\n\n`;
}

function fullPrompt(ctx, label, focus) {
  const config = resolveConfig(ctx.aiConfig);
  const base = buildSystemPrompt(config, ctx.language, ctx.kpiPromptSummary, ctx.verifiedScoringSection, ctx.stageContext);
  return roleScope(label, focus) + base + AGENT_META_INSTRUCTION;
}

function lightPrompt(intro) {
  return (ctx) => `${intro}\n\nBe warm, strategic, and precise — never robotic. Keep visible replies to at most 2 short sentences or 4 compact bullets, matching Pathway's advisor tone. Never invent specific dollar amounts, deadlines, or legal requirements you are not confident about — use the web_search tool to check current, real information before stating specifics, and say so briefly in-line ("per current guidance...") rather than presenting a guess as fact. Never expose internal reasoning, JSON, or tags other than the ones explicitly requested below.${ctx.language && ctx.language !== 'English' ? `\n\nRespond in ${ctx.language}.` : ''}${AGENT_META_INSTRUCTION}`;
}

export const AGENT_REGISTRY = [
  {
    id: 'profile',
    label: 'Profile Agent',
    description: "Extracts and scores the candidate's profile (CV/background, STRENGTHS/WEAKNESSES/TASKS, SCORES).",
    keywords: /\b(cv|resume|r[ée]sum[ée]|background|gpa|profile|score|scores|strengths?|weakness|extract)\b/i,
    ownsBlocks: ['PROFILE', 'SCORES', 'STRENGTHS', 'WEAKNESSES', 'TASKS'],
    useWebSearch: true,
    buildSystem: (ctx) => fullPrompt(ctx, 'Profile Agent', 'profile extraction, competitiveness scoring, and identifying strengths/weaknesses/action items from the CV, background, or answers the candidate has shared'),
  },
  {
    id: 'university_match',
    label: 'University Match Agent',
    description: 'Builds/refines the school and program portfolio (PROGRAMS, CHOSEN_SCHOOLS) using fit/selectivity scoring.',
    keywords: /\b(school|schools|university|universities|college|program|programs|portfolio|shortlist|match|recommend|admission chance|fit)\b/i,
    ownsBlocks: ['PROGRAMS', 'CHOSEN_SCHOOLS'],
    useWebSearch: true,
    buildSystem: (ctx) => fullPrompt(ctx, 'University Match Agent', "matching the candidate to schools/programs, computing fit/tier/selectivity, and building or refining their <PROGRAMS> portfolio"),
  },
  {
    id: 'scholarship',
    label: 'Scholarship Agent',
    description: 'Surfaces scholarship, funding, and financial-aid options relevant to the candidate and their target programs.',
    keywords: /\b(scholarships?|funding|financial aid|tuition|fellowships?|grants?|cost of|afford\w*)\b/i,
    ownsBlocks: [],
    useWebSearch: true,
    buildSystem: lightPrompt(
      "You are the Scholarship Agent, a specialist in graduate/undergraduate scholarships, fellowships, assistantships, and financial aid. Given the candidate's profile, target category/degree, and named or shortlisted schools (from the conversation and any PROGRAMS/CHOSEN_SCHOOLS context provided), identify concrete funding paths: named scholarships/fellowships they may qualify for, university-specific aid, need- vs merit-based options, and application/deadline guidance. Be specific to their profile and schools, never generic 'apply for scholarships' advice."
    ),
  },
  {
    id: 'admissions',
    label: 'Admissions Agent',
    description: "Answers general admissions-process questions (requirements, deadlines, eligibility gates, application logistics).",
    keywords: /\b(admissions?|apply|applications?|deadlines?|requirements?|eligib\w*|prerequisites?)\b/i,
    ownsBlocks: [],
    useWebSearch: true,
    buildSystem: (ctx) => fullPrompt(ctx, 'Admissions Agent', 'general admissions process questions — requirements, eligibility gates, deadlines, and application logistics for the programs the candidate is targeting'),
  },
  {
    id: 'visa',
    label: 'Visa Agent',
    description: 'Advises on student visa / immigration considerations for the candidate\'s target study destination.',
    keywords: /\b(visa|immigration|i-20|study permit|work permit|opt\b|cpt\b|sponsor)\b/i,
    ownsBlocks: [],
    useWebSearch: true,
    buildSystem: lightPrompt(
      "You are the Visa Agent, a specialist in student visa and immigration considerations for international students (e.g. US F-1/OPT, UK Student visa, Canada study permit, Schengen national visas). Given the candidate's nationality (if known) and target study destination, explain the relevant visa category, key requirements, and realistic timeline. Always caveat that immigration rules change and a licensed immigration advisor should confirm specifics before the candidate relies on your answer."
    ),
  },
  {
    id: 'strategy',
    label: 'Strategy Agent',
    description: 'Builds the narrative/application strategy (Upgrade vs Pivot framing, core narrative, positioning).',
    keywords: /\b(narrative|strategy|upgrade|pivot|positioning|story|theme)\b/i,
    ownsBlocks: [],
    useWebSearch: false,
    buildSystem: (ctx) => fullPrompt(ctx, 'Strategy Agent', "narrative/application strategy — the Upgrade vs Pivot framing, core narrative, master theme, and positioning advice from STEP 5 (Narrative Strategy) of the advisor's pipeline"),
  },
  {
    id: 'essay',
    label: 'Essay Agent',
    description: 'Drafts and reviews application essays (ESSAY, INSIGHTS blocks).',
    keywords: /\b(essays?|personal statement|sop\b|statement of purpose|prompts?)\b/i,
    ownsBlocks: ['ESSAY', 'INSIGHTS'],
    useWebSearch: false,
    buildSystem: (ctx) => fullPrompt(ctx, 'Essay Agent', 'drafting, reviewing, and strengthening application essays per STEP 7 (Essay Workshop) of the pipeline'),
  },
  {
    id: 'interview',
    label: 'Interview Agent',
    description: 'Runs mock admissions interviews and produces interview debriefs (INTERVIEW_RESULT block).',
    keywords: /\b(interviews?|mock interview)\b/i,
    ownsBlocks: ['INTERVIEW_RESULT'],
    useWebSearch: false,
    buildSystem: (ctx) => fullPrompt(ctx, 'Interview Agent', 'running the mock admissions interview simulation and producing the interview debrief per STEP 8 of the pipeline'),
  },
  {
    id: 'research',
    label: 'Research Agent',
    description: 'Looks up real, current facts about schools/programs/scholarships not in the KPI database.',
    keywords: /\b(research|look up|find out|current|latest|real data|verify)\b/i,
    ownsBlocks: [],
    useWebSearch: true,
    buildSystem: lightPrompt(
      "You are the Research Agent. Use the web_search tool to find real, current, verifiable information the candidate is asking about (a school's requirements, a program's median stats, a deadline, a scholarship's details, or anything else not already in the conversation). Cite what you found in plain language (no raw URLs needed) and be explicit when something could not be verified rather than guessing."
    ),
  },
];

export const DEFAULT_AGENT_ID = 'admissions';

export function getAgent(id) {
  return AGENT_REGISTRY.find((a) => a.id === id) || null;
}

export function allAgentIds() {
  return AGENT_REGISTRY.map((a) => a.id);
}

export { DEFAULT_AI_CONFIG };
