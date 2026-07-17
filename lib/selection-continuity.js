// Deterministic journey continuation after the candidate confirms target
// schools. The chat card and the Analysis tab both send the exact message
// "I'd like to move forward with: A, B, C." (the card may add "Take me to the
// next step of my journey."). This module guarantees that turn always moves
// the candidate into the narrative stage, no matter what the model returned.

const FORWARD_PREFIX = /^i'?d like to move forward with:\s*/i;

export const N1_QUESTION = "What's the specific moment or experience that convinced you this is the right path?";
export const N2_QUESTION = "What concrete impact do you want to have in 5-10 years?";
export const N3_QUESTION = "Is there a gap, career pivot, or unconventional element in your background we should address?";
export const N4_QUESTION = "What makes you distinctive compared to a typical applicant for your chosen schools?";
export const NARRATIVE_QUESTIONS = [N1_QUESTION, N2_QUESTION, N3_QUESTION, N4_QUESTION];

// Postgraduate / Doctoral counterpart of the MBA/Graduate N1-N4 narrative
// questions above — see PHD STEP 5 (RESEARCH POSITIONING) in api/chat.js.
// PhD candidates never get Upgrade/Pivot narrative framing, so this module
// must not force the MBA-style N1 question onto a PhD candidate either.
export const R1_QUESTION = "What's the core research question or problem your PhD would tackle, and why does it matter to the field?";
export const R2_QUESTION = "What gap in the existing literature or what hypothesis would you address?";
export const R3_QUESTION = "What methods/data would you use, and what have you already done (publications, thesis, projects)?";
export const R4_QUESTION = "Which faculty or labs at your target programs align with this agenda?";
export const PHD_RESEARCH_QUESTIONS = [R1_QUESTION, R2_QUESTION, R3_QUESTION, R4_QUESTION];

// A chip tap ("MBA", "Yes", "Not sure") is not a real answer to a narrative
// question — advancing off one would skip straight past N1-N4 without the
// candidate ever actually answering. 12 chars is a deliberately low bar: any
// genuine sentence clears it easily, while short chip values don't.
const SUBSTANTIVE_ANSWER_MIN_LENGTH = 12;

function lastNarrativeQuestionAskedIndex(conversationHistory, questions) {
  const history = Array.isArray(conversationHistory) ? conversationHistory : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry?.role !== 'ai' && entry?.role !== 'assistant') continue;
    const text = String(entry?.text || entry?.content || '');
    const index = questions.findIndex(question => text.includes(question));
    if (index !== -1) return index;
  }
  return -1;
}

// The N1->N2->N3->N4 (or PhD R1->R4) progression through the Narrative /
// Research Positioning stage relied entirely on the model correctly inferring
// from chat history which question it already asked — no code-level guard,
// unlike ensureSelectionContinuity above. Confirmed live failure: the exact
// same N1 question repeated verbatim after every candidate message, including
// after explicit school confirmations, because nothing ever forced the
// conversation forward.
export function ensureNarrativeProgress(raw, conversationHistory, lastUserText, isPhd = false) {
  const text = String(raw || '');
  const questions = isPhd ? PHD_RESEARCH_QUESTIONS : NARRATIVE_QUESTIONS;
  const currentIndex = questions.findIndex(question => text.includes(question));
  if (currentIndex === -1) return text;

  const lastAskedIndex = lastNarrativeQuestionAskedIndex(conversationHistory, questions);
  if (lastAskedIndex === -1 || lastAskedIndex !== currentIndex) return text;

  const answer = String(lastUserText || '').trim();
  if (answer.length <= SUBSTANTIVE_ANSWER_MIN_LENGTH) return text;

  if (currentIndex === questions.length - 1) {
    // Final question repeating — there's nothing to advance to. Let the
    // model's own STEP 5 / PHD STEP 5 instructions handle presenting the next
    // stage; just surface that this happened.
    console.error('[narrative-question-loop-detected]', { questionIndex: currentIndex, forced: false, isPhd });
    return text;
  }

  console.error('[narrative-question-loop-detected]', { questionIndex: currentIndex, forced: true, isPhd });
  const nextQuestion = questions[currentIndex + 1];
  const stripped = text.split(questions[currentIndex]).join('').trim();
  return stripped ? `${stripped} ${nextQuestion}` : nextQuestion;
}

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

export function ensureSelectionContinuity(raw, lastUserText, isPhd = false) {
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
  // school-choice question. The selection action itself must always advance
  // to Narrative (or, for PhD, Research Positioning) immediately and ask the
  // first question of that stage.
  const stageLine = isPhd ? "Now let's build your research narrative." : "Now let's shape your Narrative & Strategy.";
  const firstQuestion = isPhd ? R1_QUESTION : N1_QUESTION;
  const continuation = `Your targets are locked in: ${schools.join(', ')}. ${stageLine} ${firstQuestion}`;
  return [...chosenBlock, ...blocks.filter(block => !/^<PROGRAMS>/i.test(block)), continuation].filter(Boolean).join('\n');
}
