// Undergrad Rail v2 — nudges (templated, ZERO model calls).
//
// Rules: one question · rotate so we don't repeat the last · max 1 per 10 days
// · after 3 unanswered, stop and surface to the consultant (never escalate).
// Replying to a nudge opens a normal one-exchange session.
import { getStore } from '../store.js';
import { appendMessage } from '../chat.js';

export const TEMPLATES = {
  grades:     ['What are your latest grades?', 'How did this term go?'],
  activities: ['Did you join that club?', 'Anything new outside class?'],
  interests:  ['Still into {topic}?', 'Anything new caught your interest?'],
  subjects:   ['Any subject changes this year?'],
  goals:      ['Still thinking the same direction?'],
  tasks:      ['Did you get to {task}?', 'How did {task} go?'],
  spike:      ['What have you been spending most time on lately?'],
  general:    ['What did you focus on this week?', 'Any new achievements?'],
};

export const pick = (pool, last) => pool.filter(q => q !== last)[0] || pool[0];

// Fills {topic}/{task} placeholders from known state, with safe fallbacks so a
// template never ships a literal "{task}" to a student.
export function interpolate(question, state) {
  const topic = state.coverage?.interests?.facts?.slice(-1)[0]?.value || 'that';
  const task = state.openTasks?.[0]?.task || 'that thing you were going to try';
  return question.replace('{topic}', topic).replace('{task}', task);
}

// Delivers the nudge into the candidate's durable chat as an AI advisor
// message, so it surfaces exactly like any other advisor message (and, if the
// candidate opted in, routes to Telegram via appendMessage's existing logic).
export async function sendNudge(userId, question, store = getStore()) {
  await appendMessage(userId, { senderId: 'undergrad-nudge', senderRole: 'ai', text: question });
  return question;
}
