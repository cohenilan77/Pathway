import { BaseAgent } from '../BaseAgent.js';
import { getCandidateProfile } from '../tools/search.js';
import { getCalendarEvents } from '../tools/update.js';
import { getUserData } from '../../db.js';
import { getStore } from '../../store.js';
import { buildNaggerPlan } from '../../nagger-plan.js';

const SYSTEM_PROMPT = `You are a proactive deadline tracker and motivational coach for Pathway.

Your role: monitor candidate progress, identify at-risk deadlines, and send personalized nudges.

When generating nudges:
- Be direct but warm — not robotic
- Reference specific upcoming deadlines and tasks
- Prioritize by urgency (< 7 days = critical, 8-30 days = soon, > 30 days = upcoming)
- Acknowledge completed milestones with brief encouragement
- Keep messages short: 2-4 sentences max

Nudge types: deadline_warning, task_reminder, motivational, milestone_celebration, inactivity_alert

For UNDERGRADUATE nudges — tone and urgency must match grade level:
- Grade 9-10: warm, exploratory, discovery-focused — "try new things", "explore more", "enjoy the journey"
- Grade 11: goal-oriented with urgency — "start building your list", "prepare for testing", "think about recommendations"
- Grade 12: application-mode urgency — specific deadlines, essay status, submission counts
Pathway-aware:
- "focused" student: encourage deepening their specific interest (competitions, research, leadership in that field)
- "exploring" student: encourage breadth and new experiences (join a new club, try a subject, attend an event)
Never nag about a gap that has already been closed (check shouldStop field before sending).`;

export class NaggerAgent extends BaseAgent {
  constructor() {
    super({ name: 'NaggerAgent', systemPrompt: SYSTEM_PROMPT });
  }

  async generateNudge(candidateId) {
    const planKey = `candidate:nagger-plan:${candidateId}`;
    const [profile, state, events, previousPlan] = await Promise.all([
      getCandidateProfile(candidateId),
      getUserData(candidateId).catch(() => ({})),
      getCalendarEvents(candidateId, { from: Date.now() }),
      getStore().get(planKey).catch(() => null),
    ]);

    const fullProfile = { ...(profile || {}), ...(state?.profile || {}) };
    const naggerPlan = buildNaggerPlan({ profile: fullProfile, state: { ...(state || {}), naggerPlan: previousPlan || state?.naggerPlan }, events });
    await getStore().set(planKey, naggerPlan).catch(() => {});
    if (!naggerPlan.shouldNudge) {
      return {
        text: JSON.stringify({ type: 'no_action', message: '', shouldSend: false, naggerPlan }),
        usage: null,
        raw: null,
      };
    }

    const messages = [
      {
        role: 'user',
        content: `Generate one useful, non-duplicative nudge for ${fullProfile?.name || 'this candidate'}.\n\nApproved lifecycle plan:\n${JSON.stringify(naggerPlan)}\n\nUse only nextBestNudge and its real task/deadline context. Return JSON: { type, message, urgency, cta, shouldSend: true, naggerPlan }`,
      },
    ];
    const result = await this.execute(messages);
    await getStore().set(planKey, {
      ...naggerPlan,
      lastNudgeAt: Date.now(),
      lastNudgeKey: naggerPlan.nudgeKey,
      shouldNudge: false,
    }).catch(() => {});
    return result;
  }

  async nudgeUndergrad(candidateId, grade, pathwayType, topWeakness) {
    const profile = await getCandidateProfile(candidateId);
    const gradeNum = parseInt(grade) || 10;
    const urgencyLevel = gradeNum >= 12 ? 'critical' : gradeNum >= 11 ? 'high' : 'low';

    const pathwayContext = pathwayType === 'focused'
      ? `The student knows what they want to study. Help them deepen their specific focus.`
      : pathwayType === 'exploring'
        ? `The student is still exploring. Encourage trying new activities and discovering interests.`
        : `The student has a partial direction. Help them commit and build depth in one or two areas.`;

    const gradeContext = gradeNum >= 12
      ? `Grade 12 — application mode. Be specific about deadlines, essays, and submission counts.`
      : gradeNum >= 11
        ? `Grade 11 — ramp up. Focus on testing plans, university list, and early essay thinking.`
        : `Grade 9-10 — discovery phase. Keep tone warm and exploratory. No urgency pressure.`;

    const messages = [
      {
        role: 'user',
        content: `Generate an undergrad nudge for ${profile?.name || 'this student'} (Grade ${grade}).\n\nPathway context: ${pathwayContext}\nGrade context: ${gradeContext}\nTop weakness to address: ${topWeakness || 'not specified'}\nUrgency level: ${urgencyLevel}\n\nRules:\n- Keep to 2-3 sentences\n- Do NOT nag about gaps already closed\n- Match tone to grade level (warm for 9-10, goal-focused for 11, urgent for 12)\n\nReturn JSON: { type, message, urgency ("critical"|"soon"|"upcoming"|"motivational"), cta, shouldStop (true if this gap is already closed and nudge should not be sent) }`,
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
