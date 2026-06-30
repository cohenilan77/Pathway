// Next Best Action Engine
// Recommends the most impactful actions for candidates

import { getUserAssignments, getOverdueAssignments } from './assignments.js';
import { getCandidateClock } from './candidate-clock.js';

export const ACTION_CATEGORIES = {
  setupCompletion: 'setup-completion',
  profileCompletion: 'profile-completion',
  documentWriting: 'document-writing',
  testPrep: 'test-prep',
  scoreImprovement: 'score-improvement',
  universityResearch: 'university-research',
  interviewPrep: 'interview-prep',
  applicationSubmission: 'application-submission',
  skillsDevelopment: 'skills-development',
  experiencePlanning: 'experience-planning',
};

async function calculateActionPriority(action, candidate, assignments, scores, stage) {
  let priority = 0;
  let urgency = 0;

  // Base priority from action category and impact
  if (action.impact === 'high') priority += 10;
  else if (action.impact === 'medium') priority += 5;
  else priority += 2;

  // Urgency from due date
  if (action.dueDate) {
    const daysUntilDue = Math.floor((new Date(action.dueDate) - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntilDue < 0) urgency = 15; // overdue
    else if (daysUntilDue < 3) urgency = 12; // due soon
    else if (daysUntilDue < 7) urgency = 8; // due this week
    else if (daysUntilDue < 14) urgency = 4; // due this month
  }

  // Boost priority if there are gaps in this area
  if (action.relatedWeaknesses && candidate.weaknesses) {
    const matchingWeaknesses = action.relatedWeaknesses.filter(w => candidate.weaknesses.includes(w));
    priority += matchingWeaknesses.length * 3;
  }

  // Reduce priority if already in progress
  if (action.status === 'in-progress') {
    priority += 2; // boost for continuation
  }

  return { priority: priority + urgency, urgency, daysUntilDue: action.dueDate ? Math.floor((new Date(action.dueDate) - Date.now()) / (24 * 60 * 60 * 1000)) : null };
}

async function generateStageSpecificActions(journeyType, stage, stageNumber, candidate, scores, assignments) {
  const actions = [];

  // Stage-based actions for undergraduate
  if (journeyType === 'undergraduate') {
    if (stageNumber === 0) { // Profile
      if (!candidate.gpa) {
        actions.push({
          category: ACTION_CATEGORIES.profileCompletion,
          title: 'Complete your academic profile',
          description: 'Add your current GPA, school, and academic achievements',
          impact: 'high',
          relatedWeaknesses: [],
        });
      }
    }
    if (stageNumber === 1) { // Roadmap
      actions.push({
        category: ACTION_CATEGORIES.universityResearch,
        title: 'Select 10-15 target universities',
        description: 'Research and create your university shortlist',
        impact: 'high',
        relatedWeaknesses: ['university-fit'],
      });
    }
    if (stageNumber === 4) { // Testing
      if ((scores?.sat || 0) < 1500) {
        actions.push({
          category: ACTION_CATEGORIES.testPrep,
          title: 'Complete SAT practice test',
          description: 'Take a full SAT simulation to assess current level',
          impact: 'high',
          relatedWeaknesses: ['test-readiness'],
        });
      }
    }
    if (stageNumber === 5) { // Essays
      actions.push({
        category: ACTION_CATEGORIES.documentWriting,
        title: 'Draft your personal statement',
        description: 'Write your first draft focusing on authentic voice and key themes',
        impact: 'high',
        relatedWeaknesses: ['essay-writing'],
      });
    }
    if (stageNumber === 6) { // Applications
      actions.push({
        category: ACTION_CATEGORIES.applicationSubmission,
        title: 'Submit your first application',
        description: 'Complete and submit your top-choice application',
        impact: 'high',
        relatedWeaknesses: [],
      });
    }
  }

  // Stage-based actions for graduate
  if (journeyType === 'graduate') {
    if (stageNumber === 1) { // Recommender
      actions.push({
        category: ACTION_CATEGORIES.profileCompletion,
        title: 'Identify and contact recommenders',
        description: 'Select 3-4 strong recommenders and send them guidance',
        impact: 'high',
        relatedWeaknesses: [],
      });
    }
    if (stageNumber === 3) { // Programs
      actions.push({
        category: ACTION_CATEGORIES.universityResearch,
        title: 'Research and select target programs',
        description: 'Identify 5-10 graduate programs that align with your goals',
        impact: 'high',
        relatedWeaknesses: ['program-fit'],
      });
    }
    if (stageNumber === 4) { // Narrative
      actions.push({
        category: ACTION_CATEGORIES.documentWriting,
        title: 'Develop your career narrative',
        description: 'Clarify your goals, background, and why graduate school now',
        impact: 'high',
        relatedWeaknesses: ['story-clarity'],
      });
    }
    if (stageNumber >= 6) { // CV/Essays onwards
      actions.push({
        category: ACTION_CATEGORIES.documentWriting,
        title: 'Polish your statement of purpose',
        description: 'Write and refine your SOP or personal statement',
        impact: 'high',
        relatedWeaknesses: ['essay-writing'],
      });
    }
  }

  // Stage-based actions for MBA
  if (journeyType === 'mba') {
    if (stageNumber === 1) { // School Strategy
      actions.push({
        category: ACTION_CATEGORIES.universityResearch,
        title: 'Identify your MBA target schools',
        description: 'Research and select 5-7 MBA programs that match your profile',
        impact: 'high',
        relatedWeaknesses: ['school-fit'],
      });
    }
    if (stageNumber === 3) { // Test Prep
      if ((scores?.gmat || 0) < 700) {
        actions.push({
          category: ACTION_CATEGORIES.testPrep,
          title: 'Create GMAT prep study plan',
          description: 'Set up your GMAT study schedule and materials',
          impact: 'high',
          relatedWeaknesses: ['test-readiness'],
        });
      }
    }
    if (stageNumber >= 5) { // Essays
      actions.push({
        category: ACTION_CATEGORIES.documentWriting,
        title: 'Craft your MBA essays',
        description: 'Write compelling essays addressing career goals and school fit',
        impact: 'high',
        relatedWeaknesses: ['essay-writing'],
      });
    }
  }

  // Stage-based actions for PhD
  if (journeyType === 'phd') {
    if (stageNumber === 3) { // Research Direction
      actions.push({
        category: ACTION_CATEGORIES.profileCompletion,
        title: 'Define your research interests',
        description: 'Clarify your research direction and key questions',
        impact: 'high',
        relatedWeaknesses: [],
      });
    }
    if (stageNumber === 4) { // Supervisor Fit
      actions.push({
        category: ACTION_CATEGORIES.universityResearch,
        title: 'Identify potential PhD supervisors',
        description: 'Research and evaluate 5-10 potential supervisors',
        impact: 'high',
        relatedWeaknesses: ['advisor-fit'],
      });
    }
    if (stageNumber === 5) { // Proposal
      actions.push({
        category: ACTION_CATEGORIES.documentWriting,
        title: 'Develop your research proposal',
        description: 'Write a compelling research proposal outline',
        impact: 'high',
        relatedWeaknesses: ['research-clarity'],
      });
    }
  }

  // Personal Development actions
  if (journeyType === 'personalDevelopment') {
    if (stageNumber === 1) { // Goals
      actions.push({
        category: ACTION_CATEGORIES.profileCompletion,
        title: 'Define your development goals',
        description: 'Set specific, measurable short and long-term goals',
        impact: 'high',
        relatedWeaknesses: [],
      });
    }
    if (stageNumber === 4) { // Skills Plan
      actions.push({
        category: ACTION_CATEGORIES.skillsDevelopment,
        title: 'Create your skills development plan',
        description: 'Identify 3-5 key skills and create a learning plan',
        impact: 'high',
        relatedWeaknesses: [],
      });
    }
    if (stageNumber === 7) { // Execution
      actions.push({
        category: ACTION_CATEGORIES.skillsDevelopment,
        title: 'Execute this week\'s learning',
        description: 'Complete this week\'s skill-building activities',
        impact: 'medium',
        relatedWeaknesses: [],
      });
    }
  }

  return actions;
}

export async function calculateNextBestActions(userId, candidate, journeyType, stage, stageNumber) {
  try {
    const assignments = await getUserAssignments(userId);
    const overdueAssignments = await getOverdueAssignments(userId);
    const clock = await getCandidateClock(userId);

    const actions = [];

    // Critical: handle overdue work first
    if (overdueAssignments.length > 0) {
      for (const assignment of overdueAssignments) {
        actions.push({
          category: ACTION_CATEGORIES.profileCompletion,
          title: `Complete overdue: ${assignment.title}`,
          description: `This assignment was due ${Math.ceil((Date.now() - assignment.dueDate) / (24 * 60 * 60 * 1000))} days ago`,
          impact: 'high',
          urgency: 'critical',
          status: assignment.status,
          dueDate: assignment.dueDate,
          relatedWeaknesses: [],
        });
      }
    }

    // High priority: in-progress work
    const inProgress = assignments.filter(a => a.status === 'in-progress');
    if (inProgress.length > 0 && actions.length < 1) {
      actions.push({
        category: ACTION_CATEGORIES.profileCompletion,
        title: `Continue: ${inProgress[0].title}`,
        description: `You've already started this work – complete it`,
        impact: 'high',
        status: 'in-progress',
        dueDate: inProgress[0].dueDate,
        relatedWeaknesses: [],
      });
    }

    // Get stage-specific recommendations
    const stageActions = await generateStageSpecificActions(
      journeyType,
      stage,
      stageNumber,
      candidate,
      candidate.scores,
      assignments
    );
    actions.push(...stageActions);

    // Score and prioritize
    const scoredActions = await Promise.all(
      actions.map(async action => ({
        ...action,
        ...(await calculateActionPriority(action, candidate, assignments, candidate.scores, stage)),
      }))
    );

    // Sort by priority (urgency first, then priority)
    scoredActions.sort((a, b) => {
      if (a.urgency !== b.urgency) return (b.urgency || 0) - (a.urgency || 0);
      return b.priority - a.priority;
    });

    return scoredActions.slice(0, 5); // Return top 5 actions
  } catch (error) {
    console.error('Error calculating next best actions:', error);
    return [];
  }
}

export async function getNextActionSummary(actions) {
  if (actions.length === 0) {
    return 'Continue making progress on your journey';
  }
  return actions[0].title;
}
