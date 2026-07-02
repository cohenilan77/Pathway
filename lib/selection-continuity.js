// Deterministic journey continuation after the candidate confirms target
// schools. The chat card and the Analysis tab both send the exact message
// "I'd like to move forward with: A, B, C." (the card adds "Take me to the
// next step of my journey."). This module guarantees that turn always moves
// the candidate into the narrative stage, no matter what the model returned.

const FORWARD_PREFIX = /^i'?d like to move forward with:\s*/i;

export const N1_QUESTION = "What's the specific moment or experience that convinced you this is the right path?";

export function selectionFromMessage(text) {
  const message = String(text || '').trim();
  if (!FORWARD_PREFIX.test(message)) return null;
  let rest = message.replace(FORWARD_PREFIX, '');
  rest = rest.replace(/\.\s*Take me to the next step[\s\S]*$/i, '');
  rest = rest.replace(/\.\s*$/, '');
  const schools = rest.split(',').map(s => s.trim()).filter(Boolean);
  return schools.length ? schools : null;
}

export function ensureSelectionContinuity(raw, lastUserText) {
  const schools = selectionFromMessage(lastUserText);
  if (!schools) return raw;

  let next = String(raw || '');

  // Never let the model rebuild the portfolio on a selection turn. A
  // regenerated PROGRAMS block would overwrite the exact list the candidate
  // just picked their targets from.
  next = next.replace(/<PROGRAMS>[\s\S]*?<\/PROGRAMS>/gi, '').trim();

  if (!/<CHOSEN_SCHOOLS>/i.test(next)) {
    next = `<CHOSEN_SCHOOLS>${JSON.stringify(schools)}</CHOSEN_SCHOOLS>\n${next}`;
  }

  const visible = next.replace(/<([A-Z_]+)>[\s\S]*?<\/\1>/g, '').trim();
  // A reply that re-asks the candidate to pick schools, or that carries no
  // question at all, would strand them. Replace or extend it with the first
  // narrative question so the journey always continues.
  const reAsksForSchools = /excite you most|name them and|which schools|3-5 schools/i.test(visible);
  if (reAsksForSchools || !visible.includes('?')) {
    const blocks = next.match(/<([A-Z_]+)>[\s\S]*?<\/\1>/g) || [];
    const keepVisible = reAsksForSchools ? '' : visible;
    const continuation = `Your targets are locked in: ${schools.join(', ')}. Now let's shape your story. ${N1_QUESTION}`;
    next = [...blocks, keepVisible, continuation].filter(Boolean).join('\n');
  }
  return next;
}
