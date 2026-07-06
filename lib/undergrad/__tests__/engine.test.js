import test from 'node:test';
import assert from 'node:assert/strict';

import { DAY_MS, isUndergradCandidate } from '../constants.js';
import { emptyUndergradState } from '../store.js';
import { extractProfileFacts, applyProfileFacts, weakProfileAreas } from '../agents/undergrad-profile-agent.js';
import { buildRoadmap, syncRoadmap } from '../agents/roadmap-agent.js';
import { taskFromAdvice, isActionableAdvice, createTaskFromAdvice } from '../agents/task-agent.js';
import { eventsFromTask, syncCalendarForTask } from '../agents/calendar-agent.js';
import { recordProgress, progressSeries } from '../agents/profile-progress-agent.js';
import { raiseAlert } from '../agents/consultant-alert-agent.js';
import { addConsultantNote } from '../agents/notes-agent.js';
import { runNagger, detectOverdueTasks, detectInactive, detectIgnoredReminders } from '../agents/nagger-agent.js';
import { monthlyReport } from '../agents/report-agent.js';
import { processUndergradInput, runScheduledNagger } from '../engine.js';
import { miniCalendar, roadmapBySection } from '../candidate-view.js';
import { buildControlTower, filterCandidatesForViewer } from '../control-tower.js';
import { makeTask, makeCalendarEvent, makeReminder } from '../schemas.js';

const NOW = Date.UTC(2026, 0, 15); // fixed clock
const cid = 'cand_1';

// 1 — profile fact extraction creates a profile graph update
test('undergrad profile fact extraction creates profile graph update', () => {
  const facts = extractProfileFacts({ text: 'I am president of the debate club. My GPA is 3.9. I took the SAT once.' });
  assert.ok(facts.leadership?.length, 'leadership extracted');
  assert.ok(facts.academics?.length, 'academics extracted');
  assert.ok(facts.testing?.length, 'testing extracted');
  const state = applyProfileFacts(emptyUndergradState(cid), facts, NOW);
  assert.ok(state.profile.leadership.length >= 1);
  assert.ok(state.log.some(l => l.event === 'profile_fact_updated'));
});

// 2 — roadmap item creation
test('undergrad roadmap item creation', () => {
  const items = buildRoadmap({ candidateId: cid, profile: {}, grade: 'Grade 11', targetMajor: 'Economics', now: NOW });
  assert.ok(items.length >= 6);
  const sections = new Set(items.map(i => i.section));
  assert.ok(sections.has('This week') && sections.has('Summer') && sections.has('Application season'));
  const state = syncRoadmap(emptyUndergradState(cid), { candidateId: cid, profile: {}, grade: 'Grade 11', now: NOW });
  assert.ok(state.roadmap.length >= 6);
  assert.ok(state.log.some(l => l.event === 'roadmap_item_created'));
  assert.ok(state.log.some(l => l.event === 'roadmap_updated'));
  // idempotent: re-sync does not duplicate
  const again = syncRoadmap(state, { candidateId: cid, profile: {}, grade: 'Grade 11', now: NOW });
  assert.equal(again.roadmap.length, state.roadmap.length);
});

// 3 — calendar event creation
test('undergrad calendar event creation', () => {
  const task = makeTask({ candidateId: cid, title: 'Register for SAT', area: 'Testing', deadline: NOW + 20 * DAY_MS }, NOW);
  const state = syncCalendarForTask(emptyUndergradState(cid), task, NOW);
  assert.ok(state.calendar.length >= 2);
  assert.ok(state.calendar.some(e => e.type === 'test_date'));
  assert.ok(state.log.some(l => l.event === 'calendar_event_created'));
});

// 4 — mini calendar today/week/overdue
test('undergrad mini calendar today/week/overdue', () => {
  let s = emptyUndergradState(cid);
  s = { ...s, calendar: [
    makeCalendarEvent({ candidateId: cid, type: 'due_date', title: 'Today task', date: NOW }, NOW),
    makeCalendarEvent({ candidateId: cid, type: 'due_date', title: 'In 3 days', date: NOW + 3 * DAY_MS }, NOW),
    makeCalendarEvent({ candidateId: cid, type: 'application_deadline', title: 'Was due', date: NOW - 5 * DAY_MS }, NOW),
  ] };
  const mini = miniCalendar(s, NOW);
  assert.equal(mini.counts.today, 1);
  assert.ok(mini.counts.thisWeek >= 2);
  assert.equal(mini.counts.overdue, 1);
  assert.ok(mini.nextDeadline);
});

// 5 — advice converted into task  &  6 — TaskAgent creates structured task
test('undergrad advice converted into task (structured)', () => {
  assert.equal(isActionableAdvice('Great job!'), false);
  assert.equal(isActionableAdvice('Start an economics research project.'), true);
  const task = taskFromAdvice('Start an economics research project.', { candidateId: cid, now: NOW });
  assert.ok(task);
  assert.equal(task.area, 'Activities');
  assert.equal(task.owner, 'candidate');
  assert.equal(task.priority, 'high');
  assert.equal(task.reminderCadence, 'weekly');
  assert.ok(task.deadline);
  assert.match(task.expectedImpact, /major fit|academic depth/);
  assert.match(task.consultantAlertRule, /14 days/);
});

// 6b — createTaskFromAdvice stores + logs
test('TaskAgent stores and logs the created task', () => {
  const { state, task } = createTaskFromAdvice(emptyUndergradState(cid), 'Join the robotics team.', { candidateId: cid, now: NOW });
  assert.ok(task);
  assert.equal(state.tasks.length, 1);
  assert.ok(state.log.some(l => l.event === 'task_created'));
});

// 7 — CalendarAgent creates event from task
test('CalendarAgent creates events from a task', () => {
  const task = makeTask({ candidateId: cid, title: 'Submit Common App', area: 'Applications', deadline: NOW + 10 * DAY_MS }, NOW);
  const events = eventsFromTask(task, NOW);
  assert.ok(events.some(e => e.type === 'application_deadline'));
  assert.ok(events.some(e => e.type === 'reminder_date'));
  assert.ok(events.some(e => e.type === 'consultant_review_date'));
});

// 8 — overdue task detection
test('overdue task detection', () => {
  const s = { ...emptyUndergradState(cid), tasks: [
    makeTask({ candidateId: cid, title: 'Late', deadline: NOW - 2 * DAY_MS, status: 'todo' }, NOW),
    makeTask({ candidateId: cid, title: 'Future', deadline: NOW + 2 * DAY_MS, status: 'todo' }, NOW),
  ] };
  const overdue = detectOverdueTasks(s, NOW);
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].title, 'Late');
});

// 9 — inactive candidate detection
test('inactive candidate detection', () => {
  assert.equal(detectInactive({ lastActiveAt: NOW - 10 * DAY_MS }, NOW), true);
  assert.equal(detectInactive({ lastActiveAt: NOW - 2 * DAY_MS }, NOW), false);
});

// 10 — ignored reminder detection
test('ignored reminder detection', () => {
  const s = { ...emptyUndergradState(cid), reminders: [
    makeReminder({ candidateId: cid, title: 'Old', sentAt: NOW - 5 * DAY_MS, status: 'sent' }, NOW),
    makeReminder({ candidateId: cid, title: 'Fresh', sentAt: NOW - 1 * DAY_MS, status: 'sent' }, NOW),
  ] };
  assert.equal(detectIgnoredReminders(s, NOW).length, 1);
});

// 11 — NaggerAgent creates a candidate reminder
test('NaggerAgent creates candidate reminders', () => {
  const s = { ...emptyUndergradState(cid), lastActiveAt: NOW - 20 * DAY_MS, tasks: [
    makeTask({ candidateId: cid, title: 'Overdue essay', area: 'Essays', deadline: NOW - 3 * DAY_MS, status: 'todo', priority: 'high' }, NOW),
  ] };
  const { state, created } = runNagger(s, { now: NOW, candidateId: cid, candidateName: 'Ann' });
  assert.ok(created.reminders.length >= 1);
  assert.ok(state.log.some(l => l.event === 'reminder_sent'));
});

// 12 — ConsultantAlertAgent creates a consultant alert
test('ConsultantAlertAgent creates a consultant alert (deduped)', () => {
  const first = raiseAlert(emptyUndergradState(cid), { candidateId: cid, reason: 'Student inactive', severity: 'medium', recommendedAction: 'Reach out.' }, NOW);
  assert.ok(first.alert);
  assert.equal(first.state.alerts.length, 1);
  assert.ok(first.state.log.some(l => l.event === 'consultant_alerted'));
  const second = raiseAlert(first.state, { candidateId: cid, reason: 'Student inactive' }, NOW);
  assert.equal(second.alert, null, 'duplicate open alert not created');
});

// 13 — ProfileProgressAgent creates score history
test('ProfileProgressAgent creates score history with deltas', () => {
  let s = recordProgress(emptyUndergradState(cid), { academics: 60, testing: 40 }, { candidateId: cid, now: NOW });
  assert.equal(s.progress.length, 1);
  s = recordProgress(s, { academics: 72, testing: 40 }, { candidateId: cid, now: NOW + DAY_MS });
  assert.equal(s.progress.length, 2);
  assert.equal(s.progress[1].changes.academics.delta, 12);
  assert.ok(s.log.some(l => l.event === 'profile_score_changed'));
  assert.equal(progressSeries(s, 'academics').length, 2);
});

// 14 — graduate candidate does not get undergrad roadmap
test('graduate candidate does not get undergrad roadmap UI/state', () => {
  assert.equal(isUndergradCandidate('Undergraduate'), true);
  assert.equal(isUndergradCandidate('Graduate'), false);
  assert.equal(isUndergradCandidate({ category: 'Postgraduate / Doctoral' }), false);
  const tower = buildControlTower([
    { id: 'g1', name: 'Grad', category: 'Graduate', stage: 'Programs', nextAction: 'Choose schools' },
  ], { viewer: { role: 'admin' }, now: NOW });
  assert.equal(tower.journeyMonitor[0].kind, 'journey');
  assert.equal(tower.journeyMonitor[0].pendingNextAction, 'Choose schools');
});

// 15 — Control Tower aggregates all candidate types
test('Candidate Control Tower aggregates all candidate types', () => {
  const under = processUndergradInput(emptyUndergradState('u1'), {
    candidateId: 'u1', message: 'My GPA is 3.2 and I have no leadership.', advice: 'Start a coding club.', grade: 'Grade 11', scores: { academics: 55 }, now: NOW,
  }).state;
  const candidates = [
    { id: 'u1', name: 'Uma', category: 'Undergraduate', undergrad: under },
    { id: 'g1', name: 'Gil', category: 'Graduate', stage: 'Narrative', nextAction: 'Write essays' },
    { id: 'p1', name: 'Pia', category: 'Postgraduate / Doctoral', stage: 'Proposal', nextAction: 'Draft proposal' },
    { id: 'd1', name: 'Dan', category: 'Personal Development', stage: 'Goals', nextAction: 'Set goals' },
  ];
  const tower = buildControlTower(candidates, { viewer: { role: 'admin' }, now: NOW });
  assert.equal(tower.candidateCount, 4);
  assert.equal(tower.riskTable.length, 4);
  const types = new Set(tower.riskTable.map(r => r.candidateType));
  assert.ok(types.has('Undergraduate') && types.has('Graduate') && types.has('Postgraduate / Doctoral') && types.has('Personal Development'));
  assert.ok(tower.journeyMonitor.some(j => j.kind === 'roadmap'));
  assert.ok(tower.journeyMonitor.some(j => j.kind === 'journey'));
  assert.ok(tower.taskCalendar.length >= 1);
});

// 16 — consultant sees only assigned candidates
test('consultant sees only assigned candidates', () => {
  const candidates = [
    { id: 'a', name: 'A', category: 'Undergraduate', assignedConsultantId: 'c1' },
    { id: 'b', name: 'B', category: 'Graduate', assignedConsultantId: 'c2' },
    { id: 'c', name: 'C', category: 'Undergraduate' },
  ];
  const seen = filterCandidatesForViewer(candidates, { role: 'consultant', id: 'c1', assignedCandidateIds: ['c'] });
  const ids = seen.map(c => c.id).sort();
  assert.deepEqual(ids, ['a', 'c']); // assigned by field + by explicit list
});

// 17 — admin sees all candidates
test('admin sees all candidates', () => {
  const candidates = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(filterCandidatesForViewer(candidates, { role: 'admin' }).length, 3);
  assert.equal(filterCandidatesForViewer(candidates, { role: 'candidate', id: 'b' }).length, 1);
});

// 18 — consultant note creates follow-up task/event
test('consultant note creates follow-up task and calendar event', () => {
  const { state, task, event } = addConsultantNote(emptyUndergradState(cid), {
    candidateId: cid, kind: 'call summary', body: 'Talked with parent.', nextAction: 'Send university shortlist', followUpDate: NOW + 7 * DAY_MS,
  }, NOW);
  assert.ok(task && task.owner === 'consultant');
  assert.ok(event && event.type === 'consultant_check_in');
  assert.equal(state.notes.length, 1);
  assert.ok(state.tasks.some(t => t.id === task.id));
  assert.ok(state.calendar.some(e => e.id === event.id));
});

// 19 — monthly report pulls roadmap/tasks/score history/notes
test('monthly report pulls roadmap, tasks, score history, notes', () => {
  let s = processUndergradInput(emptyUndergradState(cid), {
    candidateId: cid, message: 'GPA 3.0, no research.', advice: 'Start an economics research project.', grade: 'Grade 11', scores: { academics: 50 }, now: NOW,
  }).state;
  s = recordProgress(s, { academics: 62 }, { candidateId: cid, now: NOW + DAY_MS });
  s = addConsultantNote(s, { candidateId: cid, kind: 'recommendation', body: 'Focus on research.', nextAction: 'Find a mentor', followUpDate: NOW + 14 * DAY_MS }, NOW + DAY_MS).state;
  // complete one task
  s = { ...s, tasks: s.tasks.map((t, i) => (i === 0 ? { ...t, status: 'done', updatedAt: NOW + 2 * DAY_MS } : t)) };
  const report = monthlyReport(s, { now: NOW + 3 * DAY_MS, candidateName: 'Uma' });
  assert.equal(report.candidateName, 'Uma');
  assert.ok(report.roadmapTotal >= 6);
  assert.ok(report.completedCount >= 1);
  assert.ok(report.scoreChanges.academics && report.scoreChanges.academics.delta === 12);
  assert.ok(report.consultantNotes.length >= 1);
  assert.ok(report.nextMonthPriorities.length >= 1);
});

// end-to-end pipeline + scheduled nagger
test('processUndergradInput runs the full pipeline and logs everything', () => {
  const { state, createdTasks } = processUndergradInput(emptyUndergradState(cid), {
    candidateId: cid, message: 'I am in grade 10, GPA 3.4, no awards yet.', advice: 'Enter a math olympiad this year.',
    grade: 'Grade 10', targetMajor: 'Computer Science', scores: { academics: 58, activities: 40 }, now: NOW,
  });
  assert.ok(createdTasks.length >= 1);
  assert.ok(state.roadmap.length >= 6);
  assert.ok(state.calendar.length >= 1);
  assert.ok(state.progress.length === 1);
  const events = new Set(state.log.map(l => l.event));
  for (const e of ['candidate_message', 'profile_fact_updated', 'roadmap_item_created', 'task_created', 'calendar_event_created']) {
    assert.ok(events.has(e), `log has ${e}`);
  }
  const nag = runScheduledNagger({ ...state, lastActiveAt: NOW - 30 * DAY_MS }, { now: NOW, candidateId: cid });
  assert.ok(nag.created.reminders.length >= 1);
});
