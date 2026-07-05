// Consultant notes → follow-ups (Part 5 §7). A note with a next action and/or a
// follow-up date materializes a stored task and a calendar check-in event.

import { makeNote, makeCalendarEvent } from '../schemas.js';
import { makeTask } from '../schemas.js';
import { addNote, upsertTask, upsertCalendarEvent } from '../store.js';

export function addConsultantNote(state, input, now = Date.now()) {
  const note = makeNote(input, now);
  let next = addNote(state, note, now);
  let task = null;
  let event = null;

  if (note.nextAction) {
    task = makeTask({
      candidateId: note.candidateId,
      title: note.nextAction,
      description: `From consultant note (${note.kind}): ${note.body}`.slice(0, 400),
      area: 'Admin',
      owner: 'consultant',
      priority: 'medium',
      deadline: note.followUpDate || null,
      source: 'consultant_note',
      consultantAlertRule: 'alert if no update after 7 days',
    }, now);
    next = upsertTask(next, task, now);
  }

  if (note.followUpDate) {
    event = makeCalendarEvent({
      candidateId: note.candidateId,
      type: 'consultant_check_in',
      title: note.nextAction || `Follow-up: ${note.kind}`,
      date: note.followUpDate,
      linkedTaskId: task ? task.id : null,
      area: 'Admin',
      owner: 'consultant',
      visibility: 'consultant',
    }, now);
    next = upsertCalendarEvent(next, event, now);
  }

  return { state: next, note, task, event };
}
