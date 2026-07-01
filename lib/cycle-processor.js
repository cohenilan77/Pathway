// Weekly and Monthly Cycle Processor
// Handles automated weekly check-ins and monthly reviews

import Anthropic from '@anthropic-ai/sdk';
import { getStore } from './store.js';
import {
  getCandidateClock,
  markWeeklyCheckInCompleted,
  markMonthlyReviewCompleted,
  isWeeklyCheckInDue,
  isMonthlyReviewDue,
  getUndergradNudgeIntervalMs,
  isTranscriptNudgeDue,
  markTranscriptNudgeSent,
} from './candidate-clock.js';
import { getUserAssignments } from './assignments.js';
import { getUserData } from './db.js';

const client = new Anthropic();

function undergradGradeNumber(profile) {
  const grade = String(profile?.grade || '').match(/\d{1,2}/)?.[0];
  return grade ? Number(grade) : null;
}

// pathwayType-aware nudge angle: "exploring" students get nudged to try new things,
// "focused" students get nudged to go deeper on their existing direction.
function pathwayNudgeAngle(profile) {
  if (profile?.pathwayType === 'exploring') {
    return 'This student is still exploring — nudge them to TRY one new activity or subject area that could help them discover direction, rather than pushing a specific major.';
  }
  if (profile?.pathwayType === 'focused') {
    return `This student has a clear direction (${profile?.intendedMajor || 'their stated interest'}) — nudge them to DEEPEN it further (a related leadership role, project, or award), not to explore something unrelated.`;
  }
  return '';
}

export async function generateWeeklyCheckIn(userId, user, candidateData) {
  try {
    const clock = await getCandidateClock(userId);
    const assignments = await getUserAssignments(userId);
    const completedThisWeek = assignments.filter(a => {
      const completedTime = a.completedAt;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return completedTime && completedTime > weekAgo;
    });

    const incompleteAssignments = assignments.filter(a => a.status !== 'completed');
    const pathwayAngle = pathwayNudgeAngle(candidateData?.profile);

    const prompt = `You are an education advisor conducting a weekly check-in. Generate a brief, encouraging weekly summary for ${user.name || 'the candidate'}.

Context:
- Current Stage: ${clock?.stage || 'Unknown'}
- Assignments Completed This Week: ${completedThisWeek.length}
- Incomplete Assignments: ${incompleteAssignments.length}
- Current Scores: ${JSON.stringify(candidateData?.scores || {})}
- Week Number: ${Math.floor((Date.now() - clock?.currentStageStartedAt) / (7 * 24 * 60 * 60 * 1000)) || 0}
${pathwayAngle ? `- Pathway guidance: ${pathwayAngle}` : ''}

Generate a 2-3 sentence weekly summary that:
1. Celebrates specific accomplishments from this week
2. Acknowledges any challenges or incomplete work
3. Points to the most important priority for next week, following the pathway guidance above if given
Only nudge on gaps that are still present in the context above — never mention a gap that isn't listed.

Be warm, specific, and encouraging. Keep it under 80 words.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text : '';

    const checkIn = {
      userId,
      type: 'weekly',
      generatedAt: Date.now(),
      summary: summary.trim(),
      completedThisWeek: completedThisWeek.length,
      incompleteAssignments: incompleteAssignments.length,
      stage: clock?.stage,
    };

    // Store the check-in
    const store = getStore();
    await store.lpush(`weeklycheckins:${userId}`, checkIn);

    // Mark as completed in clock. Undergraduate cadence scales with grade urgency
    // (light/quarterly for Grade 9-10, frequent/deadline-driven for Grade 11-12)
    // instead of the fixed 7-day default used for other tracks.
    const isUndergrad = clock?.journeyType === 'undergraduate';
    const intervalMs = isUndergrad ? getUndergradNudgeIntervalMs(undergradGradeNumber(candidateData?.profile)) : undefined;
    await markWeeklyCheckInCompleted(userId, intervalMs);

    return checkIn;
  } catch (error) {
    console.error('Error generating weekly check-in:', error);
    return {
      userId,
      type: 'weekly',
      generatedAt: Date.now(),
      summary: 'Keep up the great work! Continue focusing on your current assignments.',
      error: error.message,
    };
  }
}

export async function generateMonthlyReview(userId, user, candidateData) {
  try {
    const clock = await getCandidateClock(userId);
    const assignments = await getUserAssignments(userId);
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const completedThisMonth = assignments.filter(a => {
      const completedTime = a.completedAt;
      return completedTime && completedTime > monthAgo;
    });

    const overdueAssignments = assignments.filter(a => a.status === 'overdue');
    const pathwayAngle = pathwayNudgeAngle(candidateData?.profile);
    const transcriptDue = await isTranscriptNudgeDue(userId);

    const prompt = `You are an education advisor conducting a monthly review. Generate a comprehensive monthly summary for ${user.name || 'the candidate'}.

Context:
- Journey Type: ${clock?.journeyType || 'Unknown'}
- Grade: ${candidateData?.profile?.grade || 'Unknown'}
- Current Stage: ${clock?.stage || 'Unknown'}
- Days in Current Stage: ${Math.floor((Date.now() - clock?.currentStageStartedAt) / (24 * 60 * 60 * 1000))}
- Assignments Completed This Month: ${completedThisMonth.length}
- Overdue Assignments: ${overdueAssignments.length}
- Current Scores: ${JSON.stringify(candidateData?.scores || {})}
- Strengths: ${candidateData?.strengths?.slice(0, 3).join(', ') || 'Not yet identified'}
- Areas to Improve: ${candidateData?.weaknesses?.slice(0, 3).join(', ') || 'Not yet identified'}
${pathwayAngle ? `- Pathway guidance: ${pathwayAngle}` : ''}
${transcriptDue ? '- A new transcript/report card has not been uploaded this semester — ask for a re-upload.' : ''}

Generate a 4-5 sentence monthly review that:
1. Summarizes progress made this month
2. Identifies 1-2 key achievements
3. Flags any concerns (overdue work, stage duration, etc.) — only concerns actually listed above, never an invented or already-resolved gap
4. Recommends strategic adjustments if needed, following the pathway guidance above if given
5. Sets clear priorities for next month, including the transcript re-upload if flagged above

Be professional, balanced, and action-focused. Keep it under 150 words.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text : '';

    const review = {
      userId,
      type: 'monthly',
      generatedAt: Date.now(),
      summary: summary.trim(),
      completedThisMonth: completedThisMonth.length,
      overdueAssignments: overdueAssignments.length,
      stage: clock?.stage,
      stageProgress: `${Math.floor((Date.now() - clock?.currentStageStartedAt) / (24 * 60 * 60 * 1000))} days`,
      transcriptNudgeSent: transcriptDue,
    };

    // Store the review
    const store = getStore();
    await store.lpush(`monthlyreviews:${userId}`, review);

    // Mark as completed in clock
    await markMonthlyReviewCompleted(userId);
    if (transcriptDue) await markTranscriptNudgeSent(userId);

    return review;
  } catch (error) {
    console.error('Error generating monthly review:', error);
    return {
      userId,
      type: 'monthly',
      generatedAt: Date.now(),
      summary: 'You\'re making steady progress. Keep focused on your current stage and continue completing assignments on time.',
      error: error.message,
    };
  }
}

export async function processCandidateCycles(userId) {
  try {
    const user = require('./db.js').getUserById(userId);
    const userData = await getUserData(userId);
    const clock = await getCandidateClock(userId);

    if (!user || !clock) return { processed: false, error: 'User or clock not found' };

    const results = {
      weekly: null,
      monthly: null,
    };

    // Check and process weekly cycle
    if (await isWeeklyCheckInDue(userId)) {
      results.weekly = await generateWeeklyCheckIn(userId, await user, userData);
    }

    // Check and process monthly cycle
    if (await isMonthlyReviewDue(userId)) {
      results.monthly = await generateMonthlyReview(userId, await user, userData);
    }

    return { processed: true, results };
  } catch (error) {
    console.error('Error processing cycles:', error);
    return { processed: false, error: error.message };
  }
}

export async function getWeeklyCheckInHistory(userId, limit = 10) {
  const store = getStore();
  const history = await store.lrange(`weeklycheckins:${userId}`, 0, limit - 1);
  return history || [];
}

export async function getMonthlyReviewHistory(userId, limit = 10) {
  const store = getStore();
  const history = await store.lrange(`monthlyreviews:${userId}`, 0, limit - 1);
  return history || [];
}

export async function getLatestCycleReview(userId) {
  const store = getStore();
  const latestWeekly = await store.lindex(`weeklycheckins:${userId}`, 0);
  const latestMonthly = await store.lindex(`monthlyreviews:${userId}`, 0);

  return {
    weekly: latestWeekly,
    monthly: latestMonthly,
    lastUpdate: Math.max(
      latestWeekly?.generatedAt || 0,
      latestMonthly?.generatedAt || 0
    ),
  };
}

// For batch processing (runs as scheduled task)
export async function processAllDueCycles(userIds) {
  const results = [];
  for (const userId of userIds) {
    const result = await processCandidateCycles(userId);
    if (result.processed) {
      results.push({ userId, ...result.results });
    }
  }
  return results;
}
