import { createAnthropicClient } from '../lib/anthropic-client.js';
import { getKpiPromptSummary } from '../lib/admissions-kpi.js';
import { computeFit } from '../lib/scoring.js';
import { normalizeProgramList } from '../lib/program-normalizer.js';
import { getUserIdByToken, getUserById } from '../lib/db.js';
import { canContinueWhatsAppAiAdvisor } from '../lib/whatsappAiAdvisor/guard.js';
import {
  recordUsage,
  getUsageSettings,
  getAllUsageRecords,
  costForUserToday,
  createAlert,
  repriceUsageRecord,
} from '../lib/usage.js';
import { isHeadroomEnabled, compressText, compressMessages, estimateCompressionPercent, HeadroomFlags } from '../lib/headroom.js';
import { logTokenUsage } from '../lib/token-usage-logger.js';
import { AI_CONFIG_SECTIONS, DEFAULT_AI_CONFIG, resolveConfig, buildSystemPrompt } from '../lib/advisor-prompt.js';
import { isOrchestratorEnabled } from '../lib/orchestrator/flags.js';
import { runOrchestration } from '../lib/orchestrator/index.js';

const client = createAnthropicClient();
const CHAT_MODEL = 'claude-haiku-4-5-20251001';
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };
const MAX_OUTPUT_TOKENS = 16000;
const FALLBACK_OUTPUT_TOKENS = 8192;

// Lets the model look up real data for schools/programs outside the KPI database (see
// DATA SOURCING ORDER in the system prompt). Search tool-use/tool-result blocks count
// against max_tokens just like visible text, so useWebSearch can be turned off (e.g. on
// a final retry) to guarantee the full budget goes to the actual reply instead of search
// transcripts. Also falls back to a plain completion if the tool isn't enabled on this
// API key at all, instead of failing the whole chat turn.
async function createChatCompletion({ system, messages, useWebSearch = true, maxTokens = MAX_OUTPUT_TOKENS }) {
  const params = { model: CHAT_MODEL, max_tokens: maxTokens, system, messages };
  if (useWebSearch) params.tools = [WEB_SEARCH_TOOL];
  try {
    return await client.messages.create(params);
  } catch (err) {
    if (/max_tokens|maximum output/i.test(err?.message || '') && maxTokens !== FALLBACK_OUTPUT_TOKENS) {
      console.error(`max_tokens=${maxTokens} rejected, retrying with ${FALLBACK_OUTPUT_TOKENS}:`, err.message);
      return createChatCompletion({ system, messages, useWebSearch, maxTokens: FALLBACK_OUTPUT_TOKENS });
    }
    if (useWebSearch && /web_search/i.test(err?.message || '')) {
      console.error('web_search tool unavailable, retrying without it:', err.message);
      return createChatCompletion({ system, messages, useWebSearch: false, maxTokens });
    }
    throw err;
  }
}

// Web search responses interleave tool-use/tool-result blocks with text blocks, so the
// final reply is the concatenation of every text block, not just content[0].
function extractText(response) {
  const text = (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text || 'I was unable to generate a response. Please try again.';
}

function normalizeProgramsInRaw(raw) {
  if (typeof raw !== 'string' || !raw.includes('<PROGRAMS>')) return raw;
  return raw.replace(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/g, (match, body) => {
    let cleanBody = String(body || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      const parsed = JSON.parse(cleanBody);
      const normalized = normalizeProgramList(parsed);
      if (!Array.isArray(normalized)) return match;
      return `<PROGRAMS>${JSON.stringify(normalized)}</PROGRAMS>`;
    } catch {
      return match;
    }
  });
}

function parseProgramsFromRaw(raw) {
  if (typeof raw !== 'string' || !raw.includes('<PROGRAMS>')) return [];
  const programs = [];
  const matches = raw.matchAll(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/g);
  for (const match of matches) {
    const cleanBody = String(match[1] || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      const parsed = JSON.parse(cleanBody);
      const normalized = normalizeProgramList(parsed);
      if (Array.isArray(normalized)) programs.push(...normalized);
    } catch {
      // Invalid JSON is handled by the existing missing-block retry path.
    }
  }
  return programs;
}

function programTier(program) {
  const tier = String(program?.tier || '').toLowerCase();
  if (['safe', 'possible', 'stretch', 'locked'].includes(tier)) return tier;
  const fit = Number(program?.fit);
  if (Number.isFinite(fit)) {
    if (fit >= 80) return 'safe';
    if (fit >= 50) return 'possible';
    return 'stretch';
  }
  return 'possible';
}

function needsPortfolioMixRetry(raw) {
  const programs = parseProgramsFromRaw(raw);
  if (programs.length < 10) return false;

  const unlocked = programs.filter((program) => programTier(program) !== 'locked');
  if (unlocked.length < 8) return false;

  const counts = unlocked.reduce((acc, program) => {
    const tier = programTier(program);
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});
  const activeTiers = Object.entries(counts).filter(([, count]) => count > 0);
  const largestShare = Math.max(...Object.values(counts)) / unlocked.length;

  const allStrong = activeTiers.length === 1 && counts.safe === unlocked.length;
  if (allStrong) {
    const averageFit = unlocked.reduce((sum, program) => sum + (Number(program?.fit) || 0), 0) / unlocked.length;
    const ultraCount = unlocked.filter((program) => /ultra/i.test(String(program?.selectivityLabel || ''))).length;
    // A rare all-green portfolio is acceptable only when the fit values themselves
    // support an exceptional candidate and the list includes genuinely selective options.
    return !(averageFit >= 86 && ultraCount >= 2);
  }

  return activeTiers.length <= 1 || largestShare >= 0.85;
}

const TEST_SCORE_FIELDS = ['gmat', 'gre', 'lsat', 'mcat', 'sat', 'act'];

function buildCandidateFromProfile(profile, scores) {
  if (!profile) return null;
  const gpa = parseFloat(profile.gpa);
  let testScore = null;
  for (const field of TEST_SCORE_FIELDS) {
    if (profile[field] != null && profile[field] !== '') {
      testScore = parseFloat(profile[field]);
      break;
    }
  }
  if (Number.isNaN(gpa) || testScore == null || Number.isNaN(testScore)) return null;
  const degree = `${profile.degree || profile.program || ''}`.toLowerCase();
  const track = profile.category === 'Undergraduate'
    ? 'undergraduate'
    : profile.category === 'Postgraduate / Doctoral' || /\bphd|doctoral|doctorate\b/.test(degree)
      ? 'phd'
      : /\bmba\b/.test(degree)
        ? 'mba'
        : 'graduate';
  return {
    track,
    gpa,
    testScore,
    softScores: scores ? {
      activities: scores.activities,
      awards: scores.awards,
      research: scores.research,
      publications: scores.publications,
      facultyFit: scores.facultyFit,
      careerProgression: scores.careerProgression,
      internationalExposure: scores.internationalExposure,
      professional: scores.professional,
      leadership: scores.leadership,
      volunteering: scores.volunteering,
      uniqueness: scores.uniqueness,
      diversity: scores.diversity,
      goalClarity: scores.goalClarity,
      potential: scores.potential,
      recommenders: scores.recommenders,
    } : {},
    exceptionType: profile.exceptionType || 'none',
  };
}

function programMedianTest(program = {}) {
  const fields = ['avgGMAT', 'avgGRE', 'avgLSAT', 'avgMCAT', 'avgSAT', 'avgACT'];
  for (const field of fields) {
    if (program[field] != null && program[field] !== '') return program[field];
  }
  return undefined;
}

// Deterministically re-scores any school the client already has on record (from a prior
// PROGRAMS/CHOSEN_SCHOOLS block) using lib/scoring.js, so Claude is handed ground-truth
// fit/tier/unlockConditions/exceptionFlag values instead of recomputing them itself.
function buildVerifiedScoringSection(profile, scores, programs) {
  if (!Array.isArray(programs) || !programs.length) return '';
  const candidate = buildCandidateFromProfile(profile, scores);
  if (!candidate) return '';

  const lines = [];
  for (const program of programs) {
    if (!program?.name) continue;
    const result = computeFit(candidate, { medianGPA: program.avgGPA, medianTest: programMedianTest(program) });
    if (!result) continue;
    const fields = [`tier=${result.tier}`, `fit=${result.tier === 'locked' ? '—' : `${result.fit}%`}`];
    if (result.unlockConditions?.length) fields.push(`unlockConditions=${JSON.stringify(result.unlockConditions)}`);
    if (result.exceptionFlag) fields.push('exceptionFlag=true');
    lines.push(`"${program.name}": ${fields.join(', ')}`);
  }
  if (!lines.length) return '';

  return `\n\n==SERVER-VERIFIED SCORING (AUTHORITATIVE — DO NOT RECOMPUTE)==\nThese values were computed deterministically from the candidate's actual GPA/test score vs. each school's stated median — not by you. For any of these exact school names appearing in a PROGRAMS or CHOSEN_SCHOOLS block this turn, use this exact tier, fit, unlockConditions, and exceptionFlag verbatim. Do not adjust, inflate, or recompute them.\n${lines.join('\n')}`;
}

// Infers which pipeline "feature" the candidate is currently in, based on the most
// recent assistant message — used purely for usage/cost attribution, never for
// altering the actual conversation/system prompt behavior.
function inferFeature(messages) {
  const lastAi = [...(messages || [])].reverse().find((m) => m.role === 'ai');
  const text = (lastAi?.text || '').toLowerCase();
  if (!text) return 'general_chat';
  if (text.includes('mock interview') || text.includes('admissions interview simulation')) return 'mock_interview';
  if (text.includes('essay') || text.includes('prompt or question')) return 'essay_workshop';
  if (text.includes('cv you shared') || text.includes('strengthen it') || text.includes('rewrite them') || text.includes('cv section')) return 'cv_optimization';
  if (text.includes('narrative') || text.includes('upgrade') || text.includes('pivot')) return 'narrative_strategy';
  if (text.includes('programs') || text.includes('portfolio') || text.includes('schools excite') || text.includes('school list')) return 'program_matching';
  if (text.includes('profile') || text.includes('scores') || text.includes('competitiveness')) return 'profile_analysis';
  return 'general_chat';
}

async function resolveUserId(req) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/i);
    if (!match) return null;
    const userId = await getUserIdByToken(match[1]);
    return userId || null;
  } catch {
    return null;
  }
}

// Checks budgets/limits defensively — any error here must never break normal chat,
// so failures are logged and treated as "no action needed."
async function checkUsageLimits(userId) {
  try {
    const settings = await getUsageSettings();

    // Per-candidate enforcement uses only that authenticated user's daily counter.
    // Org budgets below are admin-alert-only, and suspended users are blocked before
    // this function runs. Missing auth must not fall back to a shared "anonymous"
    // counter that could block unrelated candidates.
    const hasResolvedUser = !!userId;
    const maxCostPerUser = Number(settings.maxCostPerUser) || 0;
    const userCost = hasResolvedUser ? await costForUserToday(userId) : 0;

    let monthlyCost = 0;
    let dailyCost = 0;
    if (settings.usageLimitsEnabled) {
      const allRecords = await getAllUsageRecords();
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
      const dayKey = now.toISOString().slice(0, 10);
      for (const r of allRecords) {
        const d = new Date(r.createdAt);
        const correctedCost = repriceUsageRecord(r).totalCost;
        if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) monthlyCost += correctedCost;
        if (d.toISOString().slice(0, 10) === dayKey) dailyCost += correctedCost;
      }
    }

    const monthlyBudget = Number(settings.monthlyBudget) || 0;
    const dailyBudget = Number(settings.dailyBudget) || 0;
    const monthlyPercent = settings.usageLimitsEnabled && monthlyBudget > 0 ? monthlyCost / monthlyBudget : 0;
    const dailyPercent = settings.usageLimitsEnabled && dailyBudget > 0 ? dailyCost / dailyBudget : 0;
    const userPercent = hasResolvedUser && maxCostPerUser > 0 ? userCost / maxCostPerUser : 0;

    const userOverLimit = hasResolvedUser && maxCostPerUser > 0 && userCost >= maxCostPerUser;
    const userNearLimit = hasResolvedUser && maxCostPerUser > 0 && userPercent >= 0.8;
    const orgOverLimit = settings.usageLimitsEnabled
      && ((monthlyBudget > 0 && monthlyCost >= monthlyBudget) || (dailyBudget > 0 && dailyCost >= dailyBudget));
    const orgNearLimit = settings.usageLimitsEnabled && (monthlyPercent >= 0.8 || dailyPercent >= 0.8);

    if (settings.limitAction === 'block_messages' && userOverLimit) {
      return { settings, action: 'block' };
    }
    if (settings.limitAction === 'warn_user' && (userOverLimit || userNearLimit)) {
      return { settings, action: 'warn' };
    }
    if (orgOverLimit || orgNearLimit) {
      return { settings, action: 'notify', overLimit: orgOverLimit };
    }
    return { settings, action: null };
  } catch (err) {
    console.error('Usage limit check failed (ignoring, allowing request to proceed):', err);
    return { settings: null, action: null };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ sections: AI_CONFIG_SECTIONS, defaults: DEFAULT_AI_CONFIG });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, aiConfig, language, conversationId, profile, scores, programs, stage, systemContext } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const userId = await resolveUserId(req);
  if (userId) {
    const channelUser = await getUserById(userId).catch(() => null);
    if (canContinueWhatsAppAiAdvisor(channelUser)) {
      return res.status(200).json({
        raw: 'Your AI Advisor is currently running on WhatsApp. Continue there, or ask your consultant to pause WhatsApp to use the website Advisor again.',
        channelRedirect: 'whatsapp',
      });
    }
  }
  const feature = inferFeature(messages);
  const usageUserId = userId || 'anonymous';
  const convoId = conversationId || (userId ? `user:${userId}` : 'anonymous');

  try {
    // System-wide suspension switch — short-circuit before any Anthropic call,
    // returning 200 so the existing chat UI renders the message inline.
    const settingsCheck = await getUsageSettings().catch(() => null);
    if (settingsCheck?.systemSuspended) {
      return res.status(200).json({ raw: settingsCheck.suspensionMessage });
    }

    // Admin "suspend" is an absolute override — it blocks the user regardless of their
    // daily usage counter, and regardless of any per-user/session limit settings.
    if (userId) {
      const user = await getUserById(userId).catch(() => null);
      if (user?.suspended) {
        return res.status(200).json({ raw: 'Your account has been suspended. Please contact your advisor.' });
      }
    }

    const { action } = await checkUsageLimits(userId);
    if (action === 'block') {
      return res.status(200).json({ raw: 'You have reached your usage limit for this period. Please contact your advisor or try again later.' });
    }
    if (action === 'notify') {
      createAlert({
        type: 'usage_limit',
        message: `Usage limit threshold reached for user ${usageUserId} (feature: ${feature}).`,
      }).catch((err) => console.error('Failed to create usage alert:', err));
    }

    const kpiPromptSummary = await getKpiPromptSummary();
    const verifiedScoringSection = buildVerifiedScoringSection(profile, scores, normalizeProgramList(programs));

    // MULTI_AGENT_ORCHESTRATOR=1 routes this turn through the LLM router -> planner ->
    // parallel specialists -> synthesizer pipeline (lib/orchestrator/) instead of the
    // single monolithic AdvisorAgent completion below. Flag OFF (the default) falls
    // straight through to the unchanged single-agent path — nothing below this branch
    // is touched by the flag.
    if (isOrchestratorEnabled()) {
      const orchestrated = await runOrchestration({
        messages,
        aiConfig,
        language,
        conversationId: convoId,
        userId: usageUserId,
        feature,
        profile,
        scores,
        programs,
        stage,
        systemContext,
        kpiPromptSummary,
        verifiedScoringSection,
      });
      let orchestratedRaw = orchestrated.raw;
      if (action === 'warn') {
        orchestratedRaw = `${orchestratedRaw}\n\n⚠️ You are approaching the AI usage limit for this period. Some features may be limited.`;
      }
      return res.status(200).json({ raw: orchestratedRaw, orchestration: orchestrated.summary });
    }

    const systemPrompt = buildSystemPrompt(resolveConfig(aiConfig), language, kpiPromptSummary, verifiedScoringSection, systemContext);
    let anthropicMessages = messages
      .filter((message) => message?.role !== 'system' && message?.text)
      .map((message) => ({
        role: message.role === 'ai' ? 'assistant' : 'user',
        content: message.text,
      }));

    // Headroom is OFF by default and any failure here (proxy down, SDK missing,
    // timeout) falls back to the original system prompt/chat history untouched —
    // see lib/headroom.js. role mapping, web search behavior, the retry loop, and
    // the structured blocks (PROFILE/SCORES/STRENGTHS/.../TASKS) are all built from
    // these same strings before/after this step and are unaffected by compression.
    const headroomEnabled = isHeadroomEnabled();
    console.log(`[Headroom] Status: HEADROOM_ENABLED=${process.env.HEADROOM_ENABLED}, HEADROOM_MODE=${process.env.HEADROOM_MODE}, isEnabled=${headroomEnabled}`);
    const headroomStats = {
      enabled: headroomEnabled,
      mode: process.env.HEADROOM_MODE || 'off',
      error: null,
      originalInputChars: systemPrompt.length + JSON.stringify(anthropicMessages).length,
      optimizedInputChars: systemPrompt.length + JSON.stringify(anthropicMessages).length,
    };
    let compressedSystemPrompt = systemPrompt;
    if (headroomStats.enabled) {
      const errors = [];
      console.log(`[Headroom] Flags: compressSystem=${HeadroomFlags.compressSystem}, compressChat=${HeadroomFlags.compressChat}`);
      if (HeadroomFlags.compressSystem) {
        const sysResult = await compressText(systemPrompt, { label: 'chat_system_prompt' });
        console.log(`[Headroom] System prompt: ${systemPrompt.length} → ${sysResult.text.length} chars, compressed=${sysResult.compressed}, error=${sysResult.error}`);
        if (sysResult.error) errors.push(sysResult.error);
        compressedSystemPrompt = sysResult.text;
      }
      if (HeadroomFlags.compressChat) {
        const chatResult = await compressMessages(anthropicMessages, { label: 'chat_history' });
        const origSize = JSON.stringify(anthropicMessages).length;
        const newSize = JSON.stringify(chatResult.messages).length;
        console.log(`[Headroom] Chat history: ${origSize} → ${newSize} chars, compressed=${chatResult.compressed}, error=${chatResult.error}`);
        if (chatResult.error) errors.push(chatResult.error);
        anthropicMessages = chatResult.messages;
      }
      headroomStats.error = errors.length ? errors.join('; ') : null;
      headroomStats.optimizedInputChars = compressedSystemPrompt.length + JSON.stringify(anthropicMessages).length;
      const originalChars = headroomStats.originalInputChars;
      const optimizedChars = headroomStats.optimizedInputChars;
      const pct = originalChars > 0 ? ((originalChars - optimizedChars) / originalChars * 100).toFixed(1) : 0;
      console.log(`[Headroom] Original: ${originalChars} chars, Optimized: ${optimizedChars} chars, Saved: ${pct}%`);
    }

    // The model occasionally confirms a portfolio is "live in the Analysis tab" without actually
    // including the <PROGRAMS> block that turn, leaving the tab empty until the user re-asks.
    // Retry on that mismatch — it's usually a transient generation glitch — before giving up.
    // From the 2nd attempt onward, append a corrective note pointing out exactly what was missing
    // instead of blindly resending the same input, since an identical retry tends to fail the same way.
    const CORRECTIVE_NOTE = '\n\nCORRECTION NEEDED: your previous attempt at this exact turn claimed that analysis, a portfolio/list, or a shortlist was ready but did not include the required structured blocks in that same response. If analysis is ready, put complete <PROFILE>, <SCORES>, <STRENGTHS>, <WEAKNESSES>, <TASKS>, and <PROGRAMS> blocks FIRST, before any visible sentence. If only a portfolio/list/shortlist is ready, put the complete <PROGRAMS> block first. Keep each object compact but valid. If exact published data is unavailable, use the closest comparable benchmark and say so briefly in notes; do not stall, do not apologize, and do not omit the block. For LLM programs, do not force LSAT/GRE if the program does not require/report it; omit irrelevant test fields and evaluate legal academic record, professional legal/policy experience, writing, language proof, specialization fit, and recommendations. If a program requires no standardized test, use test gap score 100 and skip the test locked gate.';
    const PORTFOLIO_MIX_NOTE = '\n\nCORRECTION NEEDED: your previous <PROGRAMS> block created a same-color or heavily clustered portfolio. Rebuild the PROGRAMS block as a strategic admissions portfolio, not a top-fit ranking: at least 10 schools, usually a visible spread of Strong Fit/safe, Competitive/possible, and realistic Reach/stretch for normal candidates. Do not add impossible elite schools just to create red rows. Keep fit bucket separate from selectivity label, preserve the existing scoring/fit rules, and make each programInfo paragraph specific, complete, and cut cleanly at a sentence boundary.';
    const FINAL_COMPACT_NOTE = '\n\nFINAL RETRY FORMAT: Return ONLY strict structured blocks first, with no prose before them. If this is the CV analysis-ready flow, return <PROFILE>{...}</PROFILE><SCORES>{...}</SCORES><STRENGTHS>[...]</STRENGTHS><WEAKNESSES>[...]</WEAKNESSES><TASKS>[...]</TASKS><PROGRAMS>[...]</PROGRAMS> followed by exactly: Your analysis is ready. Tap below to view your profile, scores, and school matches. If this is only a portfolio/list flow, return <PROGRAMS>[...]</PROGRAMS> followed by one short confirmation sentence. Generate at least 10 programs, normally 10-14 if needed to fit the token budget, using a dynamic portfolio mix rather than fixed bucket quotas. Every program object must have name, tier, fit, location, programGroup, admissionStatus, selectivityLabel, selectivitySource, selectivityScore, evidenceGaps, riskFlags, fitDrivers, programInfo, and notes. Omit irrelevant test fields rather than inventing them.';
    let raw;
    let retryReason = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      // Web search tool-use/tool-result content counts against max_tokens like any other
      // output, so a school requiring a search can get truncated mid-<PROGRAMS> block before
      // it ever reaches the closing tag. Drop the tool on the final attempt so the entire
      // token budget goes to the reply itself — the model still has the parallel-program
      // analogy fallback (DATA SOURCING ORDER step 3) to fall back on.
      // The system prompt is identical across every retry attempt in this loop (only the
      // appended retry note changes), so it's marked as an Anthropic prompt-cache breakpoint:
      // attempt 0 pays full price to write the cache, attempts 1-3 read it back at a steep
      // discount instead of reprocessing the same multi-thousand-token prompt from scratch.
      const retryNote = attempt === 0
        ? ''
        : `${retryReason === 'portfolio_mix' ? PORTFOLIO_MIX_NOTE : CORRECTIVE_NOTE}${attempt >= 2 ? FINAL_COMPACT_NOTE : ''}`;
      const system = [
        { type: 'text', text: compressedSystemPrompt, cache_control: { type: 'ephemeral' } },
        ...(retryNote ? [{ type: 'text', text: retryNote }] : []),
      ];
      const response = await createChatCompletion({
        system,
        messages: anthropicMessages,
        useWebSearch: attempt < 2,
      });

      // Log real token usage from Anthropic API response (for dashboard compression metrics)
      logTokenUsage({
        userId: usageUserId,
        conversationId: convoId,
        feature,
        model: CHAT_MODEL,
        usage: response.usage,
        endpoint: 'chat',
        attempt,
        useWebSearch: attempt < 2,
        stopReason: response.stop_reason,
        headroomEnabled: headroomStats.enabled,
        headroomMode: headroomStats.mode,
        headroomError: headroomStats.error,
        originalInputChars: headroomStats.originalInputChars,
        optimizedInputChars: headroomStats.optimizedInputChars,
      }).catch((err) => console.error('Failed to log token usage:', err));

      recordUsage({
        userId: usageUserId,
        conversationId: convoId,
        feature,
        model: CHAT_MODEL,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        endpoint: 'chat',
        attempt,
        useWebSearch: attempt < 2,
        stopReason: response.stop_reason,
        headroomEnabled: headroomStats.enabled,
        headroomMode: headroomStats.mode,
        headroomError: headroomStats.error,
        originalInputChars: headroomStats.originalInputChars,
        optimizedInputChars: headroomStats.optimizedInputChars,
        estimatedCompressionPercent: estimateCompressionPercent(headroomStats.originalInputChars, headroomStats.optimizedInputChars),
        cacheCreationInputTokens: response.usage?.cache_creation_input_tokens,
        cacheReadInputTokens: response.usage?.cache_read_input_tokens,
        webSearchRequests: response.usage?.server_tool_use?.web_search_requests,
      }).catch((err) => console.error('Failed to record usage:', err));

      raw = extractText(response);

      const claimsPortfolioLive = /(portfolio|university list|shortlist) is live in the Analysis tab/i.test(raw);
      const claimsAnalysisReady = /Your analysis is ready/i.test(raw);
      const hasProgramsBlock = /<PROGRAMS>[\s\S]*?<\/PROGRAMS>/.test(raw);
      const hasAnalysisBlocks = /<PROFILE>[\s\S]*?<\/PROFILE>/.test(raw)
        && /<SCORES>[\s\S]*?<\/SCORES>/.test(raw)
        && hasProgramsBlock;
      const hasRequiredBlocks = (!claimsPortfolioLive || hasProgramsBlock) && (!claimsAnalysisReady || hasAnalysisBlocks);
      const badPortfolioMix = hasRequiredBlocks && hasProgramsBlock && needsPortfolioMixRetry(raw);
      if (hasRequiredBlocks && !badPortfolioMix) break;
      retryReason = badPortfolioMix ? 'portfolio_mix' : 'missing_blocks';
      if (response.stop_reason === 'max_tokens') {
        console.error(`Chat response hit max_tokens on attempt ${attempt} without completing its <PROGRAMS> block (feature: ${feature})`);
      } else if (badPortfolioMix) {
        console.error(`Chat response produced a clustered same-color <PROGRAMS> portfolio on attempt ${attempt} (feature: ${feature}); retrying.`);
      }
    }

    raw = normalizeProgramsInRaw(raw);

    const claimsPortfolioLive = /(portfolio|university list|shortlist) is live in the Analysis tab/i.test(raw);
    const claimsAnalysisReady = /Your analysis is ready/i.test(raw);
    const hasProgramsBlock = /<PROGRAMS>[\s\S]*?<\/PROGRAMS>/.test(raw);
    const hasAnalysisBlocks = /<PROFILE>[\s\S]*?<\/PROFILE>/.test(raw)
      && /<SCORES>[\s\S]*?<\/SCORES>/.test(raw)
      && hasProgramsBlock;
    if (claimsPortfolioLive && !hasProgramsBlock) {
      raw = "Sorry, that portfolio didn't generate correctly on my end — no need to repeat yourself, just say \"try again\" and I'll regenerate it from what you already told me.";
    }
    if (claimsAnalysisReady && !hasAnalysisBlocks) {
      raw = "I still need the missing profile details before I can generate accurate scores and school matches.";
    }

    if (action === 'warn') {
      raw = `${raw}\n\n⚠️ You are approaching the AI usage limit for this period. Some features may be limited.`;
    }
    return res.status(200).json({ raw });
  } catch (error) {
    console.error('Anthropic API error:', error);
    return res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
  }
}
