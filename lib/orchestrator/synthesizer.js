import { runAgentCompletion, extractText, usageFrom } from './agentClient.js';

const DATA_BLOCK_TAGS = ['PROFILE', 'SCORES', 'STRENGTHS', 'WEAKNESSES', 'TASKS', 'PROGRAMS', 'CHOSEN_SCHOOLS', 'INSIGHTS', 'ESSAY', 'INTERVIEW_RESULT'];

// Structured blocks (PROFILE/SCORES/PROGRAMS/...) are parsed by the frontend as
// strict JSON — an LLM rewrite risks corrupting them, so they're merged
// mechanically: for each tag, keep the block from whichever specialist "owns" that
// domain (see specialists.js ownsBlocks), falling back to the first specialist that
// emitted it. Only the surrounding conversational text goes through LLM synthesis.
function extractBlocks(text) {
  const blocks = {};
  let stripped = text || '';
  for (const tag of DATA_BLOCK_TAGS) {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
    const matches = [...stripped.matchAll(re)];
    if (matches.length) blocks[tag] = `<${tag}>${matches[matches.length - 1][1]}</${tag}>`;
    stripped = stripped.replace(re, '').trim();
  }
  return { blocks, visibleText: stripped };
}

function mergeBlocks(specialistResults) {
  const merged = {};
  for (const tag of DATA_BLOCK_TAGS) {
    const owner = specialistResults.find((r) => r.ownsBlocks?.includes(tag) && r.blocks[tag]);
    const any = specialistResults.find((r) => r.blocks[tag]);
    const chosen = owner || any;
    if (chosen) merged[tag] = chosen.blocks[tag];
  }
  return DATA_BLOCK_TAGS.filter((t) => merged[t]).map((t) => merged[t]).join('');
}

function dedupeSentences(text) {
  const seen = new Set();
  return text
    .split(/\n+/)
    .filter((line) => {
      const key = line.trim().toLowerCase();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n')
    .trim();
}

// Merges every specialist's visible reply into ONE coherent candidate-facing
// response — the candidate must only ever see a single answer, never a stitched
// list of per-agent replies.
export async function synthesize({ specialistOutputs, language }) {
  const withBlocks = specialistOutputs.map((r) => ({ ...r, ...extractBlocks(r.text) }));
  const structuredBlocks = mergeBlocks(withBlocks);

  const contributors = withBlocks.filter((r) => r.visibleText);
  if (!contributors.length) {
    return { raw: structuredBlocks, usage: { inputTokens: 0, outputTokens: 0 }, method: 'blocks_only' };
  }

  // Low-confidence safety net: if every specialist that ran this turn is unsure and
  // at least one has a concrete follow-up question, surface that question instead of
  // merging weak/partial answers into something that reads as confident.
  const confidences = specialistOutputs.map((r) => r.confidence).filter((c) => typeof c === 'number');
  const allLowConfidence = confidences.length === specialistOutputs.length && confidences.every((c) => c < 40);
  if (allLowConfidence) {
    const followUp = specialistOutputs.find((r) => r.suggestedFollowUp)?.suggestedFollowUp;
    if (followUp) return { raw: followUp, usage: { inputTokens: 0, outputTokens: 0 }, method: 'low_confidence_followup' };
  }

  if (contributors.length === 1) {
    const raw = `${structuredBlocks}${contributors[0].visibleText}`;
    return { raw, usage: { inputTokens: 0, outputTokens: 0 }, method: 'passthrough' };
  }

  const system = `You are the Synthesizer inside Pathway's multi-agent admissions advisory system. Several specialist agents each answered part of the candidate's message; merge their visible replies into ONE coherent, warm, non-repetitive response the candidate will read as a single advisor speaking with one voice. Remove duplication, resolve any conflicting statements (prefer the more specific/confident one), and keep the total reply concise — match Pathway's advisor tone (max ~2 short sentences per idea, compact bullets where useful). Never mention "agents", "specialists", internal routing, or that multiple sources were merged. Do not invent new facts beyond what the specialists said. Respond with ONLY the final visible reply text — no JSON, no tags, no preamble.${language && language !== 'English' ? `\n\nRespond in ${language}.` : ''}`;

  const userContent = contributors
    .map((r) => `[${r.label}]\n${r.visibleText}`)
    .join('\n\n---\n\n');

  try {
    const response = await runAgentCompletion({
      system: [{ type: 'text', text: system }],
      messages: [{ role: 'user', content: userContent }],
      useWebSearch: false,
      maxTokens: 2048,
    });
    const mergedText = extractText(response) || dedupeSentences(contributors.map((r) => r.visibleText).join('\n\n'));
    return { raw: `${structuredBlocks}${mergedText}`, usage: usageFrom(response), method: 'llm' };
  } catch (err) {
    // Deterministic fallback: concatenate + dedupe rather than fail the whole turn.
    const mergedText = dedupeSentences(contributors.map((r) => r.visibleText).join('\n\n'));
    return { raw: `${structuredBlocks}${mergedText}`, usage: { inputTokens: 0, outputTokens: 0 }, method: 'fallback_concat', error: err.message };
  }
}
