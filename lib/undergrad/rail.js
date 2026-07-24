// Undergrad Rail v2 — orchestration.
//
// The one place the Run agent, Track agent, and Reviewer are sequenced. Both
// the HTTP endpoint (api/undergrad.js) and the coordinator fork
// (lib/hybrid-coordinator.js) call these functions, so the behaviour is
// identical however an undergrad turn arrives.
//
// deps = { store, anthropic } — injected so this is testable and so callers
// reuse a single client/store per request.
import { getStore } from '../store.js';
import { createAnthropicClient } from '../anthropic-client.js';
import { loadState, saveState, emptyState } from './state.js';
import { buildRunPrompt, parseOptions, ensureGoodbye } from './run-agent.js';
import { runTracker } from './track-agent.js';
import { reviewPersonalStatement } from './reviewer.js';
import { pickWeakestField } from './resume.js';
import { getTranscript, appendTranscript, clearTranscript } from './transcript.js';

const MODEL = process.env.UNDERGRAD_MODEL || 'claude-sonnet-4-6';

function makeDeps(deps = {}) {
  return { store: deps.store || getStore(), anthropic: deps.anthropic || createAnthropicClient() };
}

function textOf(res) {
  return (res?.content || []).map(b => (b.type === 'text' ? b.text : '')).join('').trim();
}

// "Year 10" / "grade 11" / "12" / 11 → integer grade.
export function parseGrade(input) {
  const g = Number(String(input ?? '').replace(/\D/g, ''));
  return Number.isFinite(g) && g > 0 ? g : 10;
}

// ---------- OPEN: login / chat mount ----------
export async function openSession(userId, { name } = {}, deps) {
  const { store, anthropic } = makeDeps(deps);
  const state = await loadState(userId, store);

  // FIRST EVER — this exact first message, per spec.
  if (!state) {
    return {
      type: 'first_time',
      message: 'What grade are you in?',
      options: ['Year 10', 'Year 11', 'Year 12'],
      awaiting: 'entryGrade',
    };
  }

  const weakest = pickWeakestField(state);
  const r = await anthropic.messages.create({
    model: MODEL, max_tokens: 400,
    messages: [{ role: 'user', content: `
Write a SHORT welcome-back for ${state.name}. Phase ${state.phase}, mode "${state.mode}".
Last session: ${state.lastSessionSummary || 'profile setup'}
Spike: ${state.spike.stage}${state.spike.named ? ` (${state.spike.named})` : ''}
Today's focus: ${weakest.field} — ${weakest.reason}

Exactly:
1. "Welcome back, ${state.name}."
2. ONE bullet — what we did last time (specific, not generic)
3. ONE bullet — what we're on today
4. ONE short question to start
End with [OPTIONS: "..." | "..." | "👋 Goodbye"]
No fluff.` }],
  });

  const { text, options } = parseOptions(textOf(r));
  state.lastActivityAt = new Date().toISOString();
  await saveState(state, store);

  return { type: 'welcome_back', message: text, options: ensureGoodbye(options) };
}

// ---------- TURN ----------
export async function turnSession(userId, { userMessage, name } = {}, deps) {
  const { store, anthropic } = makeDeps(deps);
  let state = await loadState(userId, store);

  // First answer captures entry grade → sets phase AND freezes mode.
  if (!state) {
    state = emptyState(userId, name || 'there', parseGrade(userMessage));
    await saveState(state, store);
  }

  const history = await getTranscript(userId, store);
  const r = await anthropic.messages.create({
    model: MODEL, max_tokens: 800,
    system: buildRunPrompt(state),
    messages: [...history, { role: 'user', content: userMessage }],
  });

  const { text, options } = parseOptions(textOf(r));
  await appendTranscript(userId, userMessage, text, store);

  state.lastActivityAt = new Date().toISOString();
  await saveState(state, store);

  return { type: 'turn', message: text, options: ensureGoodbye(options) };
}

// ---------- END: Goodbye tapped OR idle timeout ----------
export async function endSession(userId, deps) {
  const { store, anthropic } = makeDeps(deps);
  let state = await loadState(userId, store);
  if (!state) return { type: 'session_end', message: '', signOff: 'See you soon. 👋', logout: true };

  const transcript = await getTranscript(userId, store, { asText: true });

  // Nothing said — close silently, no tracker call.
  if (!transcript || transcript.length < 40) {
    await clearTranscript(userId, store);
    return { type: 'session_end', message: '', signOff: `See you soon, ${state.name}. 👋`, logout: true };
  }

  // 1. TRACKER — fires once, here (sole author of state).
  state = await runTracker(state, transcript, anthropic);
  await saveState(state, store);

  // 2. RUN AGENT writes the close, reading the JUST-updated state.
  const weakest = pickWeakestField(state);
  const r = await anthropic.messages.create({
    model: MODEL, max_tokens: 400,
    messages: [{ role: 'user', content: `
Close today's session for ${state.name}. SHORT bullets, no fluff:
- one line: what we covered — ${state.lastSessionSummary}
- "Before next time:" 1-3 actions from ${JSON.stringify(state.openTasks)}
- one line: what we'll pick up next — ${weakest.field}` }],
  });

  await clearTranscript(userId, store);

  return {
    type: 'session_end',
    message: textOf(r),
    signOff: `See you soon, ${state.name}. 👋`,
    logout: true,
  };
}

// ---------- REVIEW: Y12 PS upload ----------
export async function reviewPS(userId, { psText } = {}, deps) {
  const { store, anthropic } = makeDeps(deps);
  const state = await loadState(userId, store);
  if (!state || state.phase !== 'Y12') {
    return {
      type: 'blocked',
      message: "We'll get to your personal statement in Year 12. Right now we're building the thing it'll be about.",
    };
  }
  const feedback = await reviewPersonalStatement(state, psText, anthropic);
  return { type: 'ps_review', message: feedback, options: ensureGoodbye(['Walk me through fix 1', 'Let me revise it']) };
}
