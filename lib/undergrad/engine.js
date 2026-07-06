// Undergrad execution orchestrator (Part 3). Runs the per-input pipeline:
//   candidate input
//   → UndergradProfileAgent extracts facts
//   → ProfileProgressAgent updates score/progress
//   → RoadmapAgent (re)builds roadmap
//   → TaskAgent creates tasks from meaningful advice
//   → CalendarAgent creates calendar/reminder events
//   → EngagementLog records everything
// Only ever called for Undergraduate candidates (the caller gates on category).

import { ensureUndergradState, touchActivity, logEvent, upsertTask, upsertRoadmapItem, upsertCalendarEvent, recordMonthlySnapshot } from './store.js';
import { makeTask, makeRoadmapItem, makeCalendarEvent } from './schemas.js';
import { raiseAlert } from './agents/consultant-alert-agent.js';
import { normalizeUndergradAdvisorOutput } from './advisor-output.js';
import { extractProfileFacts, applyProfileFacts } from './agents/undergrad-profile-agent.js';
import { recordProgress } from './agents/profile-progress-agent.js';
import { syncRoadmap } from './agents/roadmap-agent.js';
import { createTaskFromAdvice } from './agents/task-agent.js';
import { syncCalendarForTask } from './agents/calendar-agent.js';
import { runNagger } from './agents/nagger-agent.js';

function adviceLines(advice) {
  if (Array.isArray(advice)) return advice.filter(Boolean);
  return String(advice || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function processUndergradInput(state, input = {}) {
  const now = input.now || Date.now();
  const candidateId = input.candidateId || state?.candidateId || null;
  let next = ensureUndergradState(state, candidateId);

  // 0. Activity + message log.
  next = touchActivity(next, now);
  if (input.message) next = logEvent(next, 'candidate_message', { text: String(input.message).slice(0, 240) }, now);
  if (input.files?.length) next = logEvent(next, 'file_upload', { count: input.files.length }, now);

  // 1. Profile facts.
  const facts = extractProfileFacts({
    text: input.message || input.text || '',
    files: input.files || [],
    transcripts: input.transcripts || [],
    activities: input.activities || [],
    consultantNotes: input.consultantNotes || [],
  });
  next = applyProfileFacts(next, facts, now);

  // 2. Progress/scores.
  if (input.scores) next = recordProgress(next, input.scores, { candidateId, now });

  // 3. Roadmap (rebuild when empty, or when new facts arrived).
  const roadmapEmpty = !(next.roadmap || []).length;
  if (roadmapEmpty || Object.keys(facts).length > 0 || input.forceRoadmap) {
    next = syncRoadmap(next, {
      candidateId,
      profile: next.profile,
      grade: input.grade,
      targetCountry: input.targetCountry,
      targetMajor: input.targetMajor,
      now,
    });
  }

  const output = normalizeUndergradAdvisorOutput(input.advisorOutput || input.advice, { message: input.message });
  for (const draft of output.roadmapUpdates) next = upsertRoadmapItem(next, makeRoadmapItem({ candidateId, ...draft }, now), now);

  // Preferred path: explicit task objects. Legacy prose remains supported.
  const createdTasks = [];
  for (const draft of output.tasks) {
    const task = makeTask({ candidateId, ...draft }, now);
    next = upsertTask(next, task, now);
    createdTasks.push(task);
    next = syncCalendarForTask(next, task, now);
  }
  for (const line of input.advisorOutput ? [] : adviceLines(input.advice)) {
    if (line) next = logEvent(next, 'advisor_advice', { text: line.slice(0, 240) }, now);
    const { state: s2, task } = createTaskFromAdvice(next, line, { candidateId, now });
    next = s2;
    if (task) {
      createdTasks.push(task);
      next = syncCalendarForTask(next, task, now);
    }
  }

  for (const draft of output.calendarItems) {
    const date = new Date(draft.date).getTime();
    if (Number.isFinite(date) && date >= now) next = upsertCalendarEvent(next, makeCalendarEvent({ candidateId, ...draft }, now), now);
  }
  for (const draft of output.consultantAlerts) next = raiseAlert(next, { candidateId, ...draft }, now).state;

  next = recordMonthlySnapshot(next, {
    profile: input.profileSnapshot || {},
    scores: input.scores || {},
    message: input.message,
    tasks: next.tasks,
  }, now);

  return { state: next, createdTasks, output };
}

// Scheduled/checkable pass — creates reminders + consultant alerts.
export function runScheduledNagger(state, opts = {}) {
  return runNagger(ensureUndergradState(state), opts);
}
