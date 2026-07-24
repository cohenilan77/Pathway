// Undergrad Rail v2 — TRACK agent.
//
// The Track agent WRITES. It never talks to the student. It runs exactly once
// per session (at session end) and is the SOLE author of coverage + spike.
// It fails safe: any extraction/parse error keeps prior state untouched — a
// bad transcript must never corrupt a year of accumulated state.
import { COVERAGE_DIMENSIONS, SPIKE_LADDER } from './state.js';

const MODEL = process.env.UNDERGRAD_TRACKER_MODEL || 'claude-sonnet-4-6';

export function buildTrackerPrompt(state, transcript) {
  return `
Extract structured state from this advising session transcript.

KNOWN STATE:
${JSON.stringify({ coverage: state.coverage, spike: state.spike }, null, 2)}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON (no markdown fences):
{
  "coverage": { "<dimension>": [ { "value":"", "confidence":0.0, "provenance":"stated|inferred|document", "source":"short quote or note" } ] },
  "spike": { "stage": one of ${JSON.stringify(SPIKE_LADDER)}, "candidates":[], "named": null, "evidence":[], "reasoning":"one line" },
  "sessionSummary": "2-3 sentences a consultant could read cold",
  "openTasks": [ { "task":"", "assignedAt":"ISO", "followUpAfterDays":14 } ],
  "flags": ["disengaged"|"scattered_profile"|"spike_stalled"|"grades_slipping"]
}

PROVENANCE RULES — a consultant reads this and must know what is verified:
- "stated"   = the student explicitly said it
- "inferred" = you concluded it → confidence MUST be below 0.7
- "document" = from an uploaded document
Never mark "stated" something the student did not actually say.

Dimensions: ${COVERAGE_DIMENSIONS.join(', ')}
`;
}

export async function runTracker(state, transcript, anthropic) {
  let extracted;
  try {
    const res = await anthropic.messages.create({
      model: MODEL, max_tokens: 1500,
      messages: [{ role: 'user', content: buildTrackerPrompt(state, transcript) }],
    });
    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
    extracted = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('[tracker] failed, keeping prior state:', e.message);
    return state;                       // FAIL SAFE — never corrupt state
  }
  return merge(state, extracted);
}

function merge(state, ex) {
  const now = new Date().toISOString();

  for (const [dim, facts] of Object.entries(ex.coverage || {})) {
    if (!state.coverage[dim]) continue;
    if (!Array.isArray(facts)) continue;
    facts.forEach(f => state.coverage[dim].facts.push({ ...f, at: now }));
    state.coverage[dim].lastUpdated = now;
    state.coverage[dim].confidence = rollup(state.coverage[dim].facts);
  }

  if (ex.spike) {
    // Spike moves FORWARD only. One bad chat must not undo a year of progress.
    const oldI = SPIKE_LADDER.indexOf(state.spike.stage);
    const newI = SPIKE_LADDER.indexOf(ex.spike.stage);
    if (newI > oldI) { state.spike.stage = ex.spike.stage; state.spike.lastMovedAt = now; }
    if (ex.spike.candidates?.length) state.spike.candidates = ex.spike.candidates;
    if (ex.spike.named) state.spike.named = ex.spike.named;
    state.spike.evidence.push(...(ex.spike.evidence || []));
  }

  state.lastSessionSummary = ex.sessionSummary || state.lastSessionSummary;
  state.openTasks = ex.openTasks || state.openTasks;
  state.flags = ex.flags || [];
  state.sessions.push({ endedAt: now, summary: ex.sessionSummary });
  return state;
}

function rollup(facts) {
  if (!facts.length) return 0;
  const s = facts.slice(-5).map(f => f.confidence * (f.provenance === 'stated' ? 1 : 0.7));
  return Math.min(1, s.reduce((a, b) => a + b, 0) / s.length);
}
