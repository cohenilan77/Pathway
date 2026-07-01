import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';
import { getCalendarEvents } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a proactive deadline tracker and motivational coach for Pathway.

Your role: monitor candidate progress, identify at-risk deadlines, and send personalized nudges.

When generating nudges:
- Be direct but warm — not robotic
- Reference specific upcoming deadlines and tasks
- Prioritize by urgency (< 7 days = critical, 8-30 days = soon, > 30 days = upcoming)
- Acknowledge completed milestones with brief encouragement
- Keep messages short: 2-4 sentences max

Nudge types: deadline_warning, task_reminder, motivational, milestone_celebration, inactivity_alert`;

export class NaggerAgent extends BaseAgent {
  constructor() {
    super({ name: 'NaggerAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async generateNudge(candidateId) {
    const [profile, events] = await Promise.all([
      getCandidateProfile(candidateId),
      getCalendarEvents(candidateId, { from: Date.now() }),
    ]);

    const upcoming = events
      .sort((a, b) => a.date - b.date)
      .slice(0, 5)
      .map(e => ({ title: e.title, daysUntil: Math.ceil((e.date - Date.now()) / 86400000) }));

    const messages = [
      {
        role: 'user',
        content: `Generate a nudge for ${profile?.name || 'this candidate'}.\n\nUpcoming deadlines:\n${JSON.stringify(upcoming)}\n\nReturn JSON: { type, message, urgency (critical/soon/upcoming/motivational), cta }`,
      },
    ];
    return this.execute(messages);
  }

  async checkInactivity(candidateId, lastActiveAt) {
    const daysSinceActive = Math.floor((Date.now() - lastActiveAt) / 86400000);
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `${profile?.name || 'This candidate'} has been inactive for ${daysSinceActive} days. Generate a re-engagement message. Keep it under 3 sentences. Return JSON: { message, cta }`,
      },
    ];
    return this.execute(messages);
  }

  async celebrateMilestone(candidateId, milestone) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `${profile?.name || 'The candidate'} just completed: ${milestone}. Write a brief, genuine celebration message (2 sentences). Then suggest the next step.`,
      },
    ];
    return this.execute(messages);
  }
}
