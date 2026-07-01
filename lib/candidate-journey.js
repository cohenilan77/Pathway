// Candidate Journey System
// Manages journey types, stages, assignments, and progress tracking

export const JOURNEY_TYPES = {
  undergraduate: 'undergraduate',
  graduate: 'graduate',
  mba: 'mba',
  phd: 'phd',
  personalDevelopment: 'personalDevelopment',
};

export const JOURNEY_LABELS = {
  undergraduate: 'Undergraduate',
  graduate: 'Graduate',
  mba: 'MBA',
  phd: 'PhD or Doctoral',
  personalDevelopment: 'Personal Development',
};

// Main journey paths for each type
export const JOURNEY_PATHS = {
  undergraduate: [
    'Profile',
    'Roadmap',
    'Activities',
    'Universities',
    'Testing',
    'Essays',
    'Applications',
  ],
  graduate: [
    'Profile',
    'Recommender',
    'Analysis',
    'Programs',
    'Narrative',
    'Fit',
    'CV',
    'Essay or SOP',
    'Interview',
  ],
  mba: [
    'Profile Analysis',
    'School Strategy',
    'Career Narrative',
    'GMAT or GRE',
    'CV',
    'Essays',
    'Recommendations',
    'Interview',
  ],
  phd: [
    'Profile',
    'Academic Depth',
    'Research Experience',
    'Research Direction',
    'Supervisor Fit',
    'Proposal',
    'Writing Sample',
    'Recommendations',
    'Interview',
  ],
  personalDevelopment: [
    'Profile',
    'Goals',
    'Strengths',
    'Gaps',
    'Skills Plan',
    'Experience Plan',
    'Personal Brand',
    'Execution',
    'Review',
  ],
};

// Stage definitions with details
export const STAGE_DEFINITIONS = {
  undergraduate: {
    profile: {
      name: 'Profile',
      purpose: 'Build a comprehensive academic and personal profile',
      duration: '1-2 weeks',
      requirements: ['Full name', 'Contact email', 'Current GPA', 'Timezone'],
      nextAction: 'Complete your academic profile',
    },
    roadmap: {
      name: 'Roadmap',
      purpose: 'Create a long-term strategy for the application process',
      duration: '1-2 weeks',
      requirements: ['Target universities selected', 'Testing timeline planned'],
      nextAction: 'Select 10-15 target universities',
    },
    activities: {
      name: 'Activities',
      purpose: 'Strengthen your extracurricular profile',
      duration: '4-12 weeks',
      requirements: ['3+ documented activities'],
      nextAction: 'Document your top 3 activities',
    },
    universities: {
      name: 'Universities',
      purpose: 'Develop a balanced university list',
      duration: '2-4 weeks',
      requirements: ['Reach, target, and likely universities identified'],
      nextAction: 'Create your university shortlist',
    },
    testing: {
      name: 'Testing',
      purpose: 'Prepare for and complete standardized tests',
      duration: '8-16 weeks',
      requirements: ['SAT or ACT score submitted', 'Target score achieved'],
      nextAction: 'Complete a practice test',
    },
    essays: {
      name: 'Essays',
      purpose: 'Write compelling and personalized essays',
      duration: '6-10 weeks',
      requirements: ['Personal statement drafted', 'University-specific essays written'],
      nextAction: 'Draft your personal statement',
    },
    applications: {
      name: 'Applications',
      purpose: 'Submit strong applications and prepare for interviews',
      duration: '2-4 weeks',
      requirements: ['All applications submitted'],
      nextAction: 'Submit your first application',
    },
  },
  graduate: {
    profile: {
      name: 'Profile',
      purpose: 'Build your professional and academic profile',
      duration: '1-2 weeks',
      requirements: ['Work experience documented', 'Academic background clear'],
      nextAction: 'Complete your professional profile',
    },
    recommender: {
      name: 'Recommender',
      purpose: 'Identify and secure strong recommenders',
      duration: '2-3 weeks',
      requirements: ['3 recommenders identified and contacted'],
      nextAction: 'Identify 3-4 potential recommenders',
    },
    analysis: {
      name: 'Analysis',
      purpose: 'Analyze your strengths and gaps',
      duration: '1-2 weeks',
      requirements: ['Self-assessment completed'],
      nextAction: 'Complete your competency analysis',
    },
    programs: {
      name: 'Programs',
      purpose: 'Develop a strategic list of target programs',
      duration: '2-4 weeks',
      requirements: ['5-10 target programs identified'],
      nextAction: 'Research and select target programs',
    },
    narrative: {
      name: 'Narrative',
      purpose: 'Craft your compelling career narrative',
      duration: '2-3 weeks',
      requirements: ['Career goals and narrative drafted'],
      nextAction: 'Develop your career narrative',
    },
    fit: {
      name: 'Fit',
      purpose: 'Evaluate and demonstrate program fit',
      duration: '2-3 weeks',
      requirements: ['Program fit analysis completed'],
      nextAction: 'Assess your fit with target programs',
    },
    cv: {
      name: 'CV',
      purpose: 'Polish your CV for graduate programs',
      duration: '1-2 weeks',
      requirements: ['CV finalized and reviewed'],
      nextAction: 'Review and update your CV',
    },
    essayOrSop: {
      name: 'Essay or SOP',
      purpose: 'Write compelling statements of purpose',
      duration: '3-4 weeks',
      requirements: ['Statements drafted and reviewed'],
      nextAction: 'Draft your statement of purpose',
    },
    interview: {
      name: 'Interview',
      purpose: 'Prepare for and conduct interviews',
      duration: '2-4 weeks',
      requirements: ['Interview preparation completed'],
      nextAction: 'Prepare for interviews',
    },
  },
  mba: {
    profileAnalysis: {
      name: 'Profile Analysis',
      purpose: 'Assess your MBA profile and readiness',
      duration: '1-2 weeks',
      requirements: ['Career history documented'],
      nextAction: 'Complete your MBA profile assessment',
    },
    schoolStrategy: {
      name: 'School Strategy',
      purpose: 'Develop a balanced school list',
      duration: '2-3 weeks',
      requirements: ['5-7 MBA schools selected'],
      nextAction: 'Identify target MBA programs',
    },
    careerNarrative: {
      name: 'Career Narrative',
      purpose: 'Develop a compelling career story',
      duration: '2-3 weeks',
      requirements: ['Career goals and narrative clear'],
      nextAction: 'Define your career goals',
    },
    testPrep: {
      name: 'GMAT or GRE',
      purpose: 'Prepare for and ace the entrance exam',
      duration: '8-12 weeks',
      requirements: ['Target score achieved'],
      nextAction: 'Create your test prep plan',
    },
    cv: {
      name: 'CV',
      purpose: 'Tailor your CV for MBA programs',
      duration: '1-2 weeks',
      requirements: ['MBA CV finalized'],
      nextAction: 'Update your MBA CV',
    },
    essays: {
      name: 'Essays',
      purpose: 'Craft compelling MBA essays',
      duration: '4-6 weeks',
      requirements: ['All essays drafted and refined'],
      nextAction: 'Start drafting MBA essays',
    },
    recommendations: {
      name: 'Recommendations',
      purpose: 'Secure strong letters of recommendation',
      duration: '2-3 weeks',
      requirements: ['3 recommendations submitted'],
      nextAction: 'Request recommendations',
    },
    interview: {
      name: 'Interview',
      purpose: 'Excel in MBA interviews',
      duration: '2-4 weeks',
      requirements: ['Interview preparation completed'],
      nextAction: 'Prepare for interviews',
    },
  },
  phd: {
    profile: {
      name: 'Profile',
      purpose: 'Establish your academic foundation',
      duration: '1-2 weeks',
      requirements: ['Academic background documented'],
      nextAction: 'Complete your academic profile',
    },
    academicDepth: {
      name: 'Academic Depth',
      purpose: 'Demonstrate advanced subject knowledge',
      duration: '4-8 weeks',
      requirements: ['Relevant coursework identified'],
      nextAction: 'Document your academic expertise',
    },
    researchExperience: {
      name: 'Research Experience',
      purpose: 'Highlight relevant research background',
      duration: '2-4 weeks',
      requirements: ['Research projects documented'],
      nextAction: 'Compile your research experience',
    },
    researchDirection: {
      name: 'Research Direction',
      purpose: 'Define your research interests and direction',
      duration: '2-4 weeks',
      requirements: ['Research interests articulated'],
      nextAction: 'Define your research interests',
    },
    supervisorFit: {
      name: 'Supervisor Fit',
      purpose: 'Identify and evaluate potential supervisors',
      duration: '3-6 weeks',
      requirements: ['3-5 potential supervisors identified'],
      nextAction: 'Research potential supervisors',
    },
    proposal: {
      name: 'Proposal',
      purpose: 'Develop a compelling research proposal',
      duration: '3-4 weeks',
      requirements: ['Research proposal drafted'],
      nextAction: 'Start your research proposal',
    },
    writingSample: {
      name: 'Writing Sample',
      purpose: 'Submit a strong academic writing sample',
      duration: '1-2 weeks',
      requirements: ['Writing sample selected'],
      nextAction: 'Prepare your writing sample',
    },
    recommendations: {
      name: 'Recommendations',
      purpose: 'Secure strong academic recommendations',
      duration: '2-3 weeks',
      requirements: ['3 recommendations submitted'],
      nextAction: 'Request academic recommendations',
    },
    interview: {
      name: 'Interview',
      purpose: 'Prepare for and succeed in interviews',
      duration: '2-4 weeks',
      requirements: ['Interview preparation completed'],
      nextAction: 'Prepare for interviews',
    },
  },
  personalDevelopment: {
    profile: {
      name: 'Profile',
      purpose: 'Understand your current state',
      duration: '1-2 weeks',
      requirements: ['Current skills and experience documented'],
      nextAction: 'Complete your profile',
    },
    goals: {
      name: 'Goals',
      purpose: 'Define your development goals',
      duration: '1-2 weeks',
      requirements: ['Short and long-term goals set'],
      nextAction: 'Define your goals',
    },
    strengths: {
      name: 'Strengths',
      purpose: 'Identify and leverage your strengths',
      duration: '1-2 weeks',
      requirements: ['Key strengths identified'],
      nextAction: 'Identify your strengths',
    },
    gaps: {
      name: 'Gaps',
      purpose: 'Identify skill and experience gaps',
      duration: '1-2 weeks',
      requirements: ['Development gaps identified'],
      nextAction: 'Identify your development gaps',
    },
    skillsPlan: {
      name: 'Skills Plan',
      purpose: 'Create a skills development roadmap',
      duration: '2-3 weeks',
      requirements: ['Skills development plan created'],
      nextAction: 'Create your skills plan',
    },
    experiencePlan: {
      name: 'Experience Plan',
      purpose: 'Plan experience-building activities',
      duration: '2-3 weeks',
      requirements: ['Experience plan defined'],
      nextAction: 'Plan experience-building activities',
    },
    personalBrand: {
      name: 'Personal Brand',
      purpose: 'Build and communicate your personal brand',
      duration: '2-3 weeks',
      requirements: ['Personal brand elements developed'],
      nextAction: 'Develop your personal brand',
    },
    execution: {
      name: 'Execution',
      purpose: 'Execute your development plan',
      duration: 'Ongoing',
      requirements: ['Weekly progress documented'],
      nextAction: 'Continue executing your plan',
    },
    review: {
      name: 'Review',
      purpose: 'Review progress and adjust plans',
      duration: '1 week',
      requirements: ['Progress reviewed and documented'],
      nextAction: 'Review your progress',
    },
  },
};

export const ASSIGNMENT_STATUSES = {
  notStarted: 'not-started',
  inProgress: 'in-progress',
  completed: 'completed',
  overdue: 'overdue',
  cancelled: 'cancelled',
};

export const REMINDER_SCHEDULE = [
  { daysBeforeDue: 7, label: '7 days before' },
  { daysBeforeDue: 2, label: '2 days before' },
  { daysBeforeDue: 0, label: 'Due today' },
  { daysAfterDue: 2, label: '2 days overdue' },
  { daysAfterDue: 7, label: '7 days overdue' },
];

export const INACTIVITY_THRESHOLDS = {
  gentle: 3 * 24 * 60 * 60 * 1000, // 3 days
  moderate: 7 * 24 * 60 * 60 * 1000, // 7 days
  serious: 14 * 24 * 60 * 60 * 1000, // 14 days
  critical: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export const STAGE_MAX_DURATION = {
  undergraduate: 12 * 7 * 24 * 60 * 60 * 1000, // 12 weeks
  graduate: 8 * 7 * 24 * 60 * 60 * 1000, // 8 weeks
  mba: 8 * 7 * 24 * 60 * 60 * 1000, // 8 weeks
  phd: 12 * 7 * 24 * 60 * 60 * 1000, // 12 weeks
  personalDevelopment: 4 * 7 * 24 * 60 * 60 * 1000, // 4 weeks
};

// Get the next best action based on candidate state
export function calculateNextBestAction(candidate, assignments = [], currentStage) {
  if (!candidate.journeyType) {
    return 'Complete your first-login setup';
  }

  if (!candidate.contactEmail) {
    return 'Confirm your contact email';
  }

  // Check for overdue assignments
  const overdueAssignments = assignments.filter(
    a => a.status === ASSIGNMENT_STATUSES.overdue
  );
  if (overdueAssignments.length > 0) {
    return `Complete overdue: ${overdueAssignments[0].title}`;
  }

  // Check for in-progress work
  const inProgress = assignments.find(
    a => a.status === ASSIGNMENT_STATUSES.inProgress
  );
  if (inProgress) {
    return `Continue: ${inProgress.title}`;
  }

  // Check for upcoming deadlines
  const upcoming = assignments
    .filter(a => a.status === ASSIGNMENT_STATUSES.notStarted && a.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  if (upcoming) {
    return `Start: ${upcoming.title}`;
  }

  // Default based on stage
  if (currentStage) {
    const stageDef = Object.values(STAGE_DEFINITIONS)
      .find(journey => journey[currentStage.key]);
    if (stageDef && stageDef[currentStage.key]) {
      return stageDef[currentStage.key].nextAction;
    }
  }

  return 'Continue your journey';
}
