// TaskAgent — converts meaningful advisor advice into ONE structured, stored,
// trackable task. Advice that is just conversation (questions, acknowledgements)
// produces no task; only actionable imperatives do.

import { makeTask } from '../schemas.js';
import { upsertTask } from '../store.js';
import { DAY_MS } from '../constants.js';

const ACTION_VERBS = /\b(start|begin|create|build|join|launch|apply|register|sign up|draft|write|prepare|schedule|book|complete|finish|reach out|contact|email|submit|take|retake|study for|enroll|found|organi[sz]e|volunteer|research|enter|compete|attend|participate|pursue|develop)\b/i;
const NON_ACTION = /\?\s*$|^(great|nice|well done|congrat|good job|that'?s|interesting|i see|thanks)\b/i;

const AREA_HINTS = [
  ['Testing', /\b(sat|act|psat|toefl|ielts|test|exam|practice test)\b/i],
  ['Research', /\b(research|lab|paper|thesis|professor|study)\b/i],
  ['Leadership', /\b(lead|president|captain|found|organi[sz]e|club officer)\b/i],
  ['Awards', /\b(olympiad|competition|award|contest|hackathon)\b/i],
  ['Volunteering', /\b(volunteer|community service|nonprofit|tutor)\b/i],
  ['Essays', /\b(essay|personal statement|common app|supplement)\b/i],
  ['Applications', /\b(application|apply|early action|early decision|submit)\b/i],
  ['Projects', /\b(project|app|build|portfolio|startup|website)\b/i],
  ['Activities', /\b(club|team|activity|society|sport)\b/i],
  ['Academic depth', /\b(course|class|calculus|gpa|academic|study|subject)\b/i],
];

function areaFor(advice) {
  for (const [area, rx] of AREA_HINTS) if (rx.test(advice)) return area;
  return 'Academic depth';
}

function titleFor(advice) {
  let t = String(advice || '').trim().replace(/^(you should|try to|i suggest( you)?|consider|maybe|please)\s+/i, '');
  t = t.replace(/[.!]+$/, '').trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.length > 90 ? `${t.slice(0, 87)}...` : t;
}

export function isActionableAdvice(advice) {
  const text = String(advice || '').trim();
  if (!text || text.length < 6) return false;
  if (NON_ACTION.test(text)) return false;
  return ACTION_VERBS.test(text);
}

// Build (but do not store) a structured task from a single piece of advice.
// Returns null when the advice is not actionable.
export function taskFromAdvice(advice, { candidateId = null, now = Date.now(), deadlineDays = 30, priority = 'high' } = {}) {
  if (!isActionableAdvice(advice)) return null;
  const area = areaFor(advice);
  const deadline = now + deadlineDays * DAY_MS;
  return makeTask({
    candidateId,
    title: titleFor(advice),
    header: titleFor(advice),
    description: String(advice || '').trim(),
    area,
    owner: 'candidate',
    priority,
    deadline,
    status: 'todo',
    expectedImpact: impactFor(area),
    reminderCadence: 'weekly',
    consultantAlertRule: 'alert if no update after 14 days',
    source: 'advisor',
  }, now);
}

function impactFor(area) {
  switch (area) {
    case 'Research': return 'improves major fit and academic depth';
    case 'Testing': return 'raises testing readiness and admissions eligibility';
    case 'Leadership': return 'strengthens leadership and activities profile';
    case 'Awards': return 'adds distinction and recognition';
    case 'Essays': return 'improves essay and application readiness';
    case 'Applications': return 'advances application readiness';
    case 'Volunteering': return 'deepens community impact';
    default: return 'strengthens overall profile depth';
  }
}

// Create + store the task in one step. Returns { state, task } (task null if not actionable).
export function createTaskFromAdvice(state, advice, opts = {}) {
  const task = taskFromAdvice(advice, opts);
  if (!task) return { state, task: null };
  return { state: upsertTask(state, task, opts.now), task };
}
