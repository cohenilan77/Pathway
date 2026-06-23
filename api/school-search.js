import Anthropic from '@anthropic-ai/sdk';
import { computeFit } from '../lib/scoring.js';
import { getUserIdByToken, getUserById } from '../lib/db.js';
import { recordUsage, getUsageSettings } from '../lib/usage.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CHAT_MODEL = 'claude-haiku-4-5-20251001';

const TONE_STANDARD = `TONE — non-negotiable, applies to every reply:
- Conversational replies: 2–4 sentences max. Confirmations: 1 sentence.
- Never restate the user's question. Never open with "Great," "Sure," "Based on your profile," or any filler.
- Lists and program details belong ONLY in the PROGRAMS block — never written inline into chat.
- Sound like a sharp human advisor who respects the candidate's time, not a chatbot covering its bases. Have a point of view and say it briefly.`;

function buildCandidateContext({ profile, scores, strengths, weaknesses, cvText, chosenSchools, currentList }) {
  const lines = [];
  if (profile) lines.push(`PROFILE: ${JSON.stringify(profile)}`);
  if (scores) lines.push(`SCORES: ${JSON.stringify(scores)}`);
  if (strengths?.length) lines.push(`STRENGTHS: ${strengths.join('; ')}`);
  if (weaknesses?.length) lines.push(`GROWTH AREAS: ${weaknesses.join('; ')}`);
  if (cvText) lines.push(`CV / BACKGROUND (raw): ${cvText.slice(0, 4000)}`);
  if (chosenSchools?.length) lines.push(`SCHOOLS ALREADY ADDED: ${chosenSchools.join(', ')}`);
  if (currentList?.length) lines.push(`CURRENT AI-SEARCH SHORTLIST: ${JSON.stringify(currentList)}`);
  return lines.length ? lines.join('\n\n') : 'No candidate data available yet.';
}

function buildSystemPrompt(candidateContext, verifiedScoringSection) {
  return `You are Pathway's AI School Search advisor — a focused chat session for building a candidate's school shortlist, separate from the main pipeline chat.

${TONE_STANDARD}

==CANDIDATE DATA (already on file — never ask the candidate to repeat any of this)==
${candidateContext}${verifiedScoringSection}

==SESSION FLOW==
1. BOOTSTRAP (first turn only, triggered by a session-start signal, never shown as a real user message): Open with a short, opinionated read on what direction seems right for this candidate based on the data above, and ask ONE question to confirm or redirect. Do not ask the candidate to introduce themselves — you already have their file.
2. PREFERENCE GATHERING: Ask up to four questions total, one at a time, conversationally — geography, optimization priority (brand / career / safety / cost / balanced), program flavor, hard constraints. Skip any question you can already answer from the candidate data. Never ask more than four questions before producing the first shortlist.
3. FIRST SHORTLIST: Once you have enough to work with, generate 8–14 programs and return them in a PROGRAMS block (format below). Your visible reply must be exactly one short sentence telling the candidate to check the Analysis tab — no program names, tiers, or details in the chat text itself.
4. ITERATIVE REFINEMENT: On every later message, the candidate is asking for a targeted edit to the existing shortlist ("more UK," "remove theoretical programs," "add reach schools," "safer options," etc.) — not a full regeneration. Apply the edit to CURRENT AI-SEARCH SHORTLIST above, keeping everything not affected by the request, and return the complete updated list in a new PROGRAMS block. Confirm in exactly one short sentence.
5. Only emit a PROGRAMS block when you are creating or changing the shortlist. If you are still gathering preferences, do not emit one.

==PROGRAMS BLOCK FORMAT==
When you emit one, wrap it in <PROGRAMS>...</PROGRAMS> as a raw JSON array, 8–14 entries for the first generation (any length on refinement), each shaped exactly like:
{"name": "School Name", "tier": "stretch" | "possible" | "safe", "fit": 0-100, "location": "City, Country", "avgGMAT": number | null, "avgGPA": number | null, "notes": "one-line fit rationale grounded in what the candidate told you"}
Use the SERVER-VERIFIED SCORING values verbatim for any school name that appears there. For schools without server-verified data, estimate tier/fit reasonably and consistently with the candidate's profile.

IMPORTANT: Never display the PROGRAMS block content as visible chat text — the block is parsed separately and the candidate sees it in the Analysis tab.`;
}

async function resolveUserId(req) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/i);
    if (!match) return null;
    return (await getUserIdByToken(match[1])) || null;
  } catch {
    return null;
  }
}

function buildVerifiedScoringSection(profile, scores, currentList) {
  if (!Array.isArray(currentList) || !currentList.length) return '';
  const gpa = parseFloat(profile?.gpa);
  let testScore = null;
  for (const field of ['gmat', 'gre', 'lsat', 'mcat', 'sat', 'act']) {
    if (profile?.[field] != null && profile[field] !== '') { testScore = parseFloat(profile[field]); break; }
  }
  if (Number.isNaN(gpa) || testScore == null || Number.isNaN(testScore)) return '';
  const candidate = {
    gpa,
    testScore,
    softScores: scores ? {
      professional: scores.professional,
      leadership: scores.leadership,
      volunteering: scores.volunteering,
      uniqueness: scores.uniqueness,
      diversity: scores.diversity,
      goalClarity: scores.goalClarity,
    } : {},
    exceptionType: profile?.exceptionType || 'none',
  };

  const lines = [];
  for (const program of currentList) {
    if (!program?.name) continue;
    const result = computeFit(candidate, { medianGPA: program.avgGPA, medianTest: program.avgGMAT });
    if (!result) continue;
    lines.push(`"${program.name}": tier=${result.tier}, fit=${result.tier === 'locked' ? '—' : `${result.fit}%`}`);
  }
  if (!lines.length) return '';
  return `\n\n==SERVER-VERIFIED SCORING (AUTHORITATIVE — DO NOT RECOMPUTE)==\n${lines.join('\n')}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, profile, scores, strengths, weaknesses, cvText, chosenSchools, currentList } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const userId = await resolveUserId(req);

  try {
    const settings = await getUsageSettings().catch(() => null);
    if (settings?.systemSuspended) {
      return res.status(200).json({ raw: settings.suspensionMessage });
    }
    if (userId) {
      const user = await getUserById(userId).catch(() => null);
      if (user?.suspended) {
        return res.status(200).json({ raw: 'Your account has been suspended. Please contact your advisor.' });
      }
    }

    const candidateContext = buildCandidateContext({ profile, scores, strengths, weaknesses, cvText, chosenSchools, currentList });
    const verifiedScoringSection = buildVerifiedScoringSection(profile, scores, currentList);

    const response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 3000,
      system: buildSystemPrompt(candidateContext, verifiedScoringSection),
      messages: messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      })),
    });

    recordUsage({
      userId: userId || 'anonymous',
      conversationId: userId ? `user:${userId}:school-search` : 'anonymous:school-search',
      feature: 'ai_school_search',
      model: CHAT_MODEL,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    }).catch((err) => console.error('Failed to record usage:', err));

    const raw = response.content[0]?.text || 'I was unable to generate a response. Please try again.';
    return res.status(200).json({ raw });
  } catch (error) {
    console.error('AI School Search error:', error);
    return res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
  }
}
