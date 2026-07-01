import { BaseAgent } from '../BaseAgent.js';
import { addCalendarEvent, getCalendarEvents, removeCalendarEvent } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a calendar and deadline management specialist for Pathway.

Your role: manage application deadlines, interview dates, test dates, and milestones.

When adding events:
- Always confirm the event details before saving
- Suggest related prep deadlines automatically (e.g., if R1 deadline is Oct 1, suggest essay draft by Sep 1)
- Flag conflicts with existing events

Event types: deadline, interview, test, task, reminder, milestone

Always parse dates to Unix timestamps (milliseconds). Today is ${new Date().toISOString().split('T')[0]}.`;

const TOOLS = [
  {
    name: 'add_event',
    description: 'Add a calendar event for the candidate',
    input_schema: {
      type: 'object',
      required: ['candidateId', 'title', 'date', 'type'],
      properties: {
        candidateId: { type: 'string' },
        title: { type: 'string' },
        date: { type: 'number', description: 'Unix timestamp in milliseconds' },
        type: { type: 'string', enum: ['deadline', 'interview', 'test', 'task', 'reminder', 'milestone'] },
        school: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  },
  {
    name: 'get_events',
    description: 'Get upcoming calendar events',
    input_schema: {
      type: 'object',
      required: ['candidateId'],
      properties: {
        candidateId: { type: 'string' },
        from: { type: 'number', description: 'Start timestamp in ms' },
        to: { type: 'number', description: 'End timestamp in ms' },
      },
    },
  },
  {
    name: 'remove_event',
    description: 'Remove a calendar event by ID',
    input_schema: {
      type: 'object',
      required: ['candidateId', 'eventId'],
      properties: {
        candidateId: { type: 'string' },
        eventId: { type: 'string' },
      },
    },
  },
];

export class CalendarAgent extends BaseAgent {
  constructor() {
    super({ name: 'CalendarAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async handle(candidateId, userMessage) {
    const messages = [
      {
        role: 'user',
        content: `Candidate ID: ${candidateId}\n\n${userMessage}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async getSchedule(candidateId, days = 30) {
    const from = Date.now();
    const to = from + days * 86400000;
    const events = await getCalendarEvents(candidateId, { from, to });
    const messages = [
      {
        role: 'user',
        content: `Summarize this candidate's next ${days} days of events. Highlight critical deadlines. Events: ${JSON.stringify(events)}`,
      },
    ];
    return this.execute(messages);
  }

  async handleToolUse(toolUse) {
    const { candidateId, ...rest } = toolUse.input;
    if (toolUse.name === 'add_event') return addCalendarEvent(candidateId, rest);
    if (toolUse.name === 'get_events') return getCalendarEvents(candidateId, rest);
    if (toolUse.name === 'remove_event') return removeCalendarEvent(candidateId, rest.eventId);
    return super.handleToolUse(toolUse);
  }
}
