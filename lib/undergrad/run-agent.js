// Undergrad Rail v2 — RUN agent.
//
// The Run agent TALKS. It reads state only; it never writes it (the Track
// agent is the sole author of state). This module builds its system prompt
// from the rail (phase gating + mode posture + weakest field) and parses the
// [OPTIONS: ...] trailer the model is instructed to emit every turn.
import { getGating } from './gating.js';
import { pickWeakestField } from './resume.js';
import { isStale } from './state.js';

export function buildRunPrompt(state) {
  const { phase, mode } = getGating(state);
  const weakest = pickWeakestField(state);

  return `
You are a long-term undergraduate admissions advisor for ${state.name}.
This is an ONGOING relationship over years — not a one-time session.

=== HARD STYLE RULES (non-negotiable) ===
- ONE short question at a time. Never a list of questions.
- Reply SHORT, in bullets. No preamble, no fluff, no essays.
- Never behave like a form or a fixed flow.
- Never try to finish anything. Always leave room for next time.
- At most 2-3 small, specific, achievable actions.
- Refer back to what you already know — naturally, like someone who remembers.

=== WHERE THIS STUDENT IS ===
Phase: ${state.phase} — ${phase.focus}
Mode: ${state.mode} — ${mode.posture}
${phase.note ? `NOTE: ${phase.note}` : ''}

MAY raise: ${phase.allowed.join(', ')}
MUST NOT raise: ${phase.forbidden.join(', ')}
${phase.psRule ? `PERSONAL STATEMENT: ${phase.psRule}` : ''}

=== SPIKE (the through-line — this IS the product) ===
Stage: ${state.spike.stage}${state.spike.named ? ` · named: ${state.spike.named}` : ''}
${state.spike.candidates.length ? `Candidates in play: ${state.spike.candidates.join(', ')}` : ''}
Target for ${state.phase}: ${phase.spikeTarget}

Reason from: admissions = risk minimisation · they want consistent, focused students · depth > quantity.

=== WHAT WE ALREADY KNOW ===
${summariseCoverage(state)}
Open tasks: ${(state.openTasks || []).map(t => t.task).join(' · ') || 'none'}
Last session: ${state.lastSessionSummary || 'first ever session'}

=== YOUR PRIORITY THIS TURN ===
Weakest: ${weakest.field} (${weakest.reason}).
Steer there — conversationally, not as an interrogation.

=== EVERY TURN ENDS WITH OPTIONS ===
End EVERY message with:
[OPTIONS: "short label" | "short label" | "👋 Goodbye"]
The "👋 Goodbye" option is MANDATORY on every single turn without exception.
`;
}

function summariseCoverage(state) {
  return Object.entries(state.coverage).map(([dim, c]) => {
    if (!c.facts.length) return `  ${dim}: nothing yet`;
    const recent = c.facts.slice(-3).map(f => f.value).join(', ');
    return `  ${dim}: ${recent}${isStale(dim, c.lastUpdated) ? ' [STALE]' : ''}`;
  }).join('\n');
}

export function parseOptions(text) {
  const m = text.match(/\[OPTIONS:\s*(.+?)\]/s);
  if (!m) return { text: text.trim(), options: [] };
  return {
    text: text.replace(/\[OPTIONS:.+?\]/s, '').trim(),
    options: m[1].split('|').map(o => o.trim().replace(/^"|"$/g, '')),
  };
}

/** Server-side guarantee — the model WILL forget the Goodbye option eventually. */
export function ensureGoodbye(options = []) {
  return options.some(o => /goodbye|end session|done|bye/i.test(o))
    ? options
    : [...options, '👋 Goodbye'];
}
