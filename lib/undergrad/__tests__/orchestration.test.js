import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUndergradAdvisorOutput, shortUndergradChat } from '../advisor-output.js';
import { processUndergradInput, runScheduledNagger } from '../engine.js';
import { makeTask } from '../schemas.js';
import { eventsFromTask, addDeadlineEvent } from '../agents/calendar-agent.js';

const NOW = Date.parse('2026-07-06T12:00:00Z');

test('undergrad chat is one to three short sentences with one question', () => {
  const chat = shortUndergradChat('Great goal. Here is a long plan. Week one install tools. Which direction interests you? More prose follows.');
  assert.ok((chat.match(/[.!?](?:\s|$)/g) || []).length <= 3);
  assert.match(chat, /\?/);
});

test('undergrad fixed choices preserve order and remove a trailing prompt', () => {
  const chat = shortUndergradChat('Which curriculum do you follow? →\nIB | A-Level | AP / US High School | Israeli | Other\nWhat should we work on next?');
  assert.equal(chat, 'Which curriculum do you follow? → IB | A-Level | AP / US High School | Israeli | Other');
});

test('AI interest creates a high-level structured project without technical setup in chat', () => {
  const output = normalizeUndergradAdvisorOutput('Anthropic is a strong interest. Install Hugging Face tokens and use a GPU. Would you prefer a research-style or app-style project?', { message: 'I want to work at Anthropic and build a project' });
  assert.match(output.chatMessage, /Anthropic|strong interest/i);
  assert.doesNotMatch(output.chatMessage, /Hugging Face|token|GPU/i);
  assert.equal(output.tasks[0].area, 'Activities');
  assert.ok(output.roadmapUpdates.length);
});

test('structured output separates chat, tasks, roadmap, and calendar', () => {
  const result = processUndergradInput(null, { candidateId: 'u1', message: 'AI project', advisorOutput: { chatMessage: 'Good direction. Which project style fits you?', tasks: [{ title: 'Choose project direction', description: 'Compare research, app, and competition formats.', area: 'Activities' }], roadmapUpdates: [{ title: 'AI project', area: 'Activities' }], calendarItems: [] }, now: NOW });
  assert.equal(result.output.chatMessage.includes('?'), true);
  assert.equal(result.state.tasks.length, 1);
  assert.ok(result.state.roadmap.some(item => item.title === 'AI project'));
  assert.equal(result.state.calendar.filter(item => item.visibility !== 'consultant').length, 0);
});

test('meaningful interactions maintain a deduped monthly living-profile snapshot', () => {
  const first = processUndergradInput(null, { candidateId: 'u1', message: 'My GPA improved to 3.8', profileSnapshot: { category: 'Undergraduate', grade: 10, subjects: ['Math'] }, now: NOW });
  const second = processUndergradInput(first.state, { candidateId: 'u1', message: 'I joined a coding club', profileSnapshot: { category: 'Undergraduate', grade: 10, subjects: ['Math'], activities: ['Coding'] }, now: NOW + 1000 });
  assert.equal(second.state.profile.profileStage, 'exploratory');
  assert.deepEqual(second.state.profile.interestCluster, ['Math', 'Computer Science and Data']);
  assert.equal(second.state.profile.monthlySnapshots.length, 1);
  assert.equal(second.state.profile.monthlySnapshots[0].updates.length, 2);
});

test('task has compact header and full description', () => {
  const task = makeTask({ title: 'Complete a very long undergraduate project planning action', description: 'Full implementation detail belongs here.', area: 'Projects' }, NOW);
  assert.ok(task.header.length <= 28);
  assert.equal(task.description, 'Full implementation detail belongs here.');
  assert.equal(task.area, 'Activities');
});

test('past dates are rejected from calendar', () => {
  const task = makeTask({ title: 'Old test', area: 'Testing', deadline: '2025-01-01' }, NOW);
  assert.equal(eventsFromTask(task, NOW).some(event => event.title === 'Old test' || event.date === '2025-01-01'), false);
  const state = { calendar: [] };
  assert.equal(addDeadlineEvent(state, { title: 'Old deadline', date: '2025-01-01' }, NOW), state);
});

test('admissions language is softened', () => {
  const chat = shortUndergradChat('This gets you into MIT. Which priority should we choose?');
  assert.doesNotMatch(chat, /gets you into/i);
  assert.match(chat, /strengthens your profile/i);
});

test('nagger is idempotent and never emits chat messages', () => {
  const stale = { candidateId: 'u1', profile: {}, tasks: [], calendar: [], reminders: [], alerts: [], progress: [], notes: [], log: [], lastActiveAt: NOW - 40 * 86400000 };
  const first = runScheduledNagger(stale, { candidateId: 'u1', now: NOW });
  const second = runScheduledNagger(first.state, { candidateId: 'u1', now: NOW + 1000 });
  assert.ok(first.created.reminders.length && first.created.followUps.length && first.created.alerts.length);
  assert.equal(second.created.reminders.length, 0);
  assert.equal(second.created.followUps.length, 0);
  assert.equal(second.created.alerts.length, 0);
  assert.equal('chatMessage' in first.created, false);
});
