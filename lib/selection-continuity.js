// Deterministic journey continuation after the candidate confirms target
// schools. The chat card and the Analysis tab both send the exact message
// "I'd like to move forward with: A, B, C." (the card may add "Take me to the
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

  // Analysis can send many schools. Prefer a pipe delimiter when present so
  // names like "University of California, Berkeley" stay intact. Keep comma
  // support for older messages already saved in existing conversations.
  const delimiter = rest.includes('|') ? '|' : ',';
  const schools = rest.split(delimiter).map(s => s.trim()).filter(Boolean);
  return schools.length ? schools : null;
}

export function ensureSelectionContinuity(raw, lastUserText) {
  const schools = selectionFromMessage(lastUserText);
  if (!schools) return raw;

  const next = String(raw || '')
    // Never let the model rebuild the portfolio on a selection turn. A
    // regenerated PROGRAMS block would overwrite the exact list the candidate
    // just picked their targets from.
    .replace(/<PROGRAMS>[\s\S]*?<\/PROGRAMS>/gi, '')
    .trim();

  const blocks = next.match(/<([A-Z_]+)>[\s\S]*?<\/\1>/g) || [];
  const chosenBlock = blocks.some(block => /^<CHOSEN_SCHOOLS>/i.test(block))
    ? []
    : [`<CHOSEN_SCHOOLS>${JSON.stringify(schools)}</CHOSEN_SCHOOLS>`];

  // Do not preserve the model's visible text on this turn. It may contain a
  // polite confirmation, a repeated prompt to narrow the portfolio, or another
  // school-choice question. The selection action itself must always advance to
  // Narrative immediately and ask N1.
  const continuation = `Your targets are locked in: ${schools.join(', ')}. Now let's shape your story. ${N1_QUESTION}`;
  return [...chosenBlock, ...blocks.filter(block => !/^<PROGRAMS>/i.test(block)), continuation].filter(Boolean).join('\n');
}
