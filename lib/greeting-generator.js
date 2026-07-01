// Greeting Generator
// Creates personalized AI-generated login greetings for candidates

import Anthropic from '@anthropic-ai/sdk';
import { getStore } from './store.js';
import { getCandidateClock } from './candidate-clock.js';
import { getUserAssignments } from './assignments.js';

const client = new Anthropic();

function getDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function generateLoginGreeting(userId, user, data) {
  const store = getStore();
  const dateKey = getDateKey();
  const cacheKey = `greeting:${userId}:${dateKey}`;

  // Check cache first
  const cached = await store.get(cacheKey);
  if (cached) return cached;

  try {
    const clock = await getCandidateClock(userId);
    const assignments = await getUserAssignments(userId);
    const overdueCount = assignments.filter(a => a.status === 'overdue').length;
    const inProgressCount = assignments.filter(a => a.status === 'in-progress').length;
    const pendingCount = assignments.filter(a => a.status === 'not-started').length;

    // Get recent chat context
    const recentChat = (data?.chat || []).slice(-3).map(msg => ({
      role: msg.role,
      text: msg.text?.substring(0, 100),
    }));

    // Format context for the AI
    const currentStage = clock?.stage || 'unknown';
    const daysInStage = clock ? Math.floor((Date.now() - clock.currentStageStartedAt) / (24 * 60 * 60 * 1000)) : 0;

    const prompt = `You are a supportive education advisor. Generate a personalized, warm login greeting for a candidate.

Candidate Context:
- Name: ${user.name || 'there'}
- Journey Type: ${clock?.journeyType || 'Unknown'}
- Current Stage: ${currentStage}
- Days in Current Stage: ${daysInStage}
- Overdue Assignments: ${overdueCount}
- In Progress: ${inProgressCount}
- Pending Work: ${pendingCount}
- Recent Profile Data: ${data?.category || 'Not specified'}
- Last Activity: ${clock?.lastPortalActivityAt ? new Date(clock.lastPortalActivityAt).toLocaleDateString() : 'Unknown'}

${user.strengths ? `Notable Strengths: ${user.strengths.join(', ')}` : ''}
${user.weaknesses ? `Areas to Improve: ${user.weaknesses.join(', ')}` : ''}

Generate a greeting that:
1. Warmly welcomes them back using their first name (or "there" if not available)
2. Acknowledges their current stage and progress
3. Recommends ONE specific action for today
4. Motivates them gently if inactive or has overdue work
5. Keep it conversational and under 2 sentences

Return ONLY the greeting text, no additional commentary.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const greetingText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Determine next focus area based on stage and assignments
    let nextFocusArea = 'Continue your journey';
    if (overdueCount > 0) nextFocusArea = 'Complete overdue work';
    else if (inProgressCount > 0) nextFocusArea = 'Continue your in-progress work';
    else if (pendingCount > 0) nextFocusArea = 'Start your next assignment';
    else if (currentStage) nextFocusArea = `Progress in ${currentStage}`;

    const greeting = {
      userId,
      greeting: greetingText.trim(),
      nextFocusArea,
      generatedAt: Date.now(),
      stage: currentStage,
      daysInStage,
    };

    // Cache for 24 hours
    await store.set(cacheKey, greeting, { ex: 24 * 60 * 60 });

    return greeting;
  } catch (error) {
    console.error('Error generating greeting:', error);
    // Return a fallback greeting
    return {
      userId,
      greeting: `Welcome back${user.name ? `, ${user.name}` : ''}! Let's continue your journey.`,
      nextFocusArea: 'Continue your journey',
      generatedAt: Date.now(),
      error: error.message,
    };
  }
}

export async function getLoginGreeting(userId, user, data) {
  const dateKey = getDateKey();
  const cacheKey = `greeting:${userId}:${dateKey}`;
  const store = getStore();

  // Try to get from cache first
  const cached = await store.get(cacheKey);
  if (cached) return cached;

  // Generate new greeting if not cached
  return generateLoginGreeting(userId, user, data);
}

export async function clearGreetingCache(userId) {
  const store = getStore();
  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const cacheKey = `greeting:${userId}:${dateKey}`;
    await store.del(cacheKey);
  }
}
