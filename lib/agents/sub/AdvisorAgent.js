import { createAnthropicClient } from '../../anthropic-client.js';
import { normalizeProgramList } from '../../program-normalizer.js';
import { countFormatMatches } from '../../program-format.js';
import { recordAgentMetric } from '../../agent-metrics.js';

const client = createAnthropicClient();
const MODEL = 'claude-haiku-4-5-20251001';
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };
const MAX_OUTPUT_TOKENS = 16000;
const FALLBACK_OUTPUT_TOKENS = 8192;

const CORRECTIVE_NOTE = '\n\nCORRECTION NEEDED: your previous attempt at this exact turn claimed that analysis, a portfolio/list, or a shortlist was ready but did not include the required structured blocks in that same response. If analysis is ready, put complete <PROFILE>, <SCORES>, <STRENGTHS>, <WEAKNESSES>, <TASKS>, and <PROGRAMS> blocks FIRST, before any visible sentence. If only a portfolio/list/shortlist is ready, put the complete <PROGRAMS> block first. Keep each object compact but valid. If exact published data is unavailable, use the closest comparable benchmark and say so briefly in notes; do not stall, do not apologize, and do not omit the block. For LLM programs, do not force LSAT/GRE if the program does not require/report it; omit irrelevant test fields and evaluate legal academic record, professional legal/policy experience, writing, language proof, specialization fit, and recommendations. If a program requires no standardized test, use test gap score 100 and skip the test locked gate.';

const FORMAT_SHORT_NOTE = '\n\nCORRECTION NEEDED: most programs in your previous <PROGRAMS> block do not match the candidate\'s selected duration and attendance format, so they will be filtered out and the candidate would see almost no schools. Regenerate the PROGRAMS block with at least 12 programs that ALL explicitly satisfy the selected format (e.g. 2-year full-time means no 1-year, 10/12/16-month, part-time, evening, weekend, online, or Executive MBA programs). Set "studyFormat" and numeric "durationYears" on every program object. If a school\'s flagship program is the wrong format, pick a different school rather than bending the format.';

const PORTFOLIO_MIX_NOTE = '\n\nCORRECTION NEEDED: your previous <PROGRAMS> block created a same-color or heavily clustered portfolio. Rebuild the PROGRAMS block as a strategic admissions portfolio, not a top-fit ranking: at least 10 schools, usually a visible spread of Strong Fit/safe, Competitive/possible, and realistic Reach/stretch for normal candidates. Do not add impossible elite schools just to create red rows. Keep fit bucket separate from selectivity label, preserve the existing scoring/fit rules, and make each programInfo paragraph specific, complete, and cut cleanly at a sentence boundary.';

const FINAL_COMPACT_NOTE = '\n\nFINAL RETRY FORMAT: Return ONLY strict structured blocks first, with no prose before them. If this is the CV analysis-ready flow, return <PROFILE>{...}</PROFILE><SCORES>{...}</SCORES><STRENGTHS>[...]</STRENGTHS><WEAKNESSES>[...]</WEAKNESSES><TASKS>[...]</TASKS><PROGRAMS>[...]</PROGRAMS> followed by exactly: Your analysis is ready. Tap below to view your profile, scores, and school matches. If this is only a portfolio/list flow, return <PROGRAMS>[...]</PROGRAMS> followed by one short confirmation sentence. Generate at least 10 programs, normally 10-14 if needed to fit the token budget, using a dynamic portfolio mix rather than fixed bucket quotas. Every program object must have name, tier, fit, location, programGroup, admissionStatus, selectivityLabel, selectivitySource, selectivityScore, evidenceGaps, riskFlags, fitDrivers, programInfo, and notes. Omit irrelevant test fields rather than inventing them.';

export class AdvisorAgent {
  async createCompletion({ system, messages, useWebSearch = true, maxTokens = MAX_OUTPUT_TOKENS }) {
    const params = { model: MODEL, max_tokens: maxTokens, system, messages };
    if (useWebSearch) params.tools = [WEB_SEARCH_TOOL];
    const startedAt = Date.now();
    try {
      const response = await client.messages.create(params);
      await recordAgentMetric({ agentName: 'AdvisorAgent', model: MODEL, usage: response.usage, latencyMs: Date.now() - startedAt });
      return response;
    } catch (err) {
      await recordAgentMetric({ agentName: 'AdvisorAgent', model: MODEL, latencyMs: Date.now() - startedAt, error: true });
      if (/max_tokens|maximum output/i.test(err?.message || '') && maxTokens !== FALLBACK_OUTPUT_TOKENS) {
        console.error(`max_tokens=${maxTokens} rejected, retrying with ${FALLBACK_OUTPUT_TOKENS}:`, err.message);
        return this.createCompletion({ system, messages, useWebSearch, maxTokens: FALLBACK_OUTPUT_TOKENS });
      }
      if (useWebSearch && /web_search/i.test(err?.message || '')) {
        console.error('web_search tool unavailable, retrying without it:', err.message);
        return this.createCompletion({ system, messages, useWebSearch: false, maxTokens });
      }
      throw err;
    }
  }

  extractText(response) {
    const text = (response.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || 'I was unable to generate a response. Please try again.';
  }

  normalizeProgramsInRaw(raw) {
    if (typeof raw !== 'string' || !raw.includes('<PROGRAMS>')) return raw;
    return raw.replace(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/g, (match, body) => {
      const cleanBody = String(body || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
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

  parseProgramsFromRaw(raw) {
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

  programTier(program) {
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

  needsPortfolioMixRetry(raw) {
    const programs = this.parseProgramsFromRaw(raw);
    if (programs.length < 10) return false;

    const unlocked = programs.filter((p) => this.programTier(p) !== 'locked');
    if (unlocked.length < 8) return false;

    const counts = unlocked.reduce((acc, p) => {
      const tier = this.programTier(p);
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});
    const activeTiers = Object.entries(counts).filter(([, count]) => count > 0);
    const largestShare = Math.max(...Object.values(counts)) / unlocked.length;

    const allStrong = activeTiers.length === 1 && counts.safe === unlocked.length;
    if (allStrong) {
      const averageFit = unlocked.reduce((sum, p) => sum + (Number(p?.fit) || 0), 0) / unlocked.length;
      const ultraCount = unlocked.filter((p) => /ultra/i.test(String(p?.selectivityLabel || ''))).length;
      return !(averageFit >= 86 && ultraCount >= 2);
    }

    return activeTiers.length <= 1 || largestShare >= 0.85;
  }

  // Main entry point: runs the advisor chat with up to 4 retry attempts.
  // systemPrompt: the pre-built (possibly headroom-compressed) system prompt string.
  // onAttempt(response, attempt, { useWebSearch }): called after each Claude response for usage logging.
  async chat(messages, { systemPrompt, onAttempt, formatConstraint = null } = {}) {
    let raw;
    let retryReason = '';

    // The portfolio-mix retry exists for the initial portfolio generation.
    // On a selection/advance turn (candidate confirming targets or asking to
    // move on) it must never fire: it regenerates the whole portfolio, eats
    // the confirmation, and traps the candidate in a pick-your-schools loop.
    const lastUserContent = String([...messages].reverse().find(m => m.role === 'user')?.content || '');
    const isAdvanceTurn = /move forward with|take me to the next step|advance to the next step/i.test(lastUserContent);

    for (let attempt = 0; attempt < 4; attempt++) {
      const retryNote = attempt === 0
        ? ''
        : `${retryReason === 'portfolio_mix' ? PORTFOLIO_MIX_NOTE : retryReason === 'format_short' ? FORMAT_SHORT_NOTE : CORRECTIVE_NOTE}${attempt >= 2 ? FINAL_COMPACT_NOTE : ''}`;
      const system = [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ...(retryNote ? [{ type: 'text', text: retryNote }] : []),
      ];
      const useWebSearch = attempt < 2;
      const response = await this.createCompletion({ system, messages, useWebSearch });

      if (onAttempt) onAttempt(response, attempt, { useWebSearch });

      raw = this.extractText(response);

      const claimsPortfolioLive = /(portfolio|university list|shortlist) is live in the Analysis tab/i.test(raw);
      const claimsAnalysisReady = /Your analysis is ready/i.test(raw);
      const hasProgramsBlock = /<PROGRAMS>[\s\S]*?<\/PROGRAMS>/.test(raw);
      const hasAnalysisBlocks = /<PROFILE>[\s\S]*?<\/PROFILE>/.test(raw)
        && /<SCORES>[\s\S]*?<\/SCORES>/.test(raw)
        && hasProgramsBlock;
      const hasRequiredBlocks = (!claimsPortfolioLive || hasProgramsBlock) && (!claimsAnalysisReady || hasAnalysisBlocks);
      const isGenerationTurn = hasRequiredBlocks && hasProgramsBlock && !isAdvanceTurn && !/<CHOSEN_SCHOOLS>/i.test(raw);
      // Would the candidate's selected duration/attendance format filter gut
      // this portfolio? A big list that shrinks below 10 after filtering
      // needs regeneration, or the candidate ends up with 3-4 schools.
      const formatCounts = isGenerationTurn && formatConstraint ? countFormatMatches(raw, formatConstraint) : null;
      const formatShort = !!formatCounts && formatCounts.total >= 10 && formatCounts.kept < 10;
      const badPortfolioMix = isGenerationTurn && !formatShort && this.needsPortfolioMixRetry(raw);

      if (hasRequiredBlocks && !badPortfolioMix && !formatShort) break;

      retryReason = formatShort ? 'format_short' : badPortfolioMix ? 'portfolio_mix' : 'missing_blocks';
      if (response.stop_reason === 'max_tokens') {
        console.error(`[AdvisorAgent] Response hit max_tokens on attempt ${attempt}`);
      } else if (formatShort) {
        console.error(`[AdvisorAgent] Portfolio mostly fails the selected format on attempt ${attempt} (${formatCounts.kept}/${formatCounts.total} match); retrying.`);
      } else if (badPortfolioMix) {
        console.error(`[AdvisorAgent] Clustered same-color portfolio on attempt ${attempt}; retrying.`);
      }
    }

    raw = this.normalizeProgramsInRaw(raw);

    const claimsPortfolioLive = /(portfolio|university list|shortlist) is live in the Analysis tab/i.test(raw);
    const claimsAnalysisReady = /Your analysis is ready/i.test(raw);
    const hasProgramsBlock = /<PROGRAMS>[\s\S]*?<\/PROGRAMS>/.test(raw);
    const hasAnalysisBlocks = /<PROFILE>[\s\S]*?<\/PROFILE>/.test(raw)
      && /<SCORES>[\s\S]*?<\/SCORES>/.test(raw)
      && hasProgramsBlock;

    if (claimsPortfolioLive && !hasProgramsBlock) {
      raw = 'Sorry, that portfolio didn\'t generate correctly on my end — no need to repeat yourself, just say "try again" and I\'ll regenerate it from what you already told me.';
    }
    if (claimsAnalysisReady && !hasAnalysisBlocks) {
      raw = 'I still need the missing profile details before I can generate accurate scores and school matches.';
    }

    return raw;
  }
}
