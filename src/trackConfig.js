export const DEFAULT_STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV', 'Essay', 'Interview'];
export const UNDERGRAD_STEPS = ['Profile', 'Roadmap', 'Activities', 'Universities', 'Testing', 'Essays', 'Applications'];

export const TRACK_CONFIG = {
  Undergraduate: {
    key: 'undergraduate',
    scoreLabel: 'University Readiness',
    steps: UNDERGRAD_STEPS,
    docLabel: 'Roadmap, activities, testing, essays, applications',
    nav: [
      ['dashboard', 'Dashboard', 'dashboard'],
      ['studentProfile', 'Student Profile', 'advisor'],
      ['roadmap', 'Roadmap', 'analysis'],
      ['activities', 'Activities', 'documents'],
      ['universities', 'University List', 'analysis'],
      ['testing', 'Testing', 'documentDepository'],
      ['essays', 'Essays', 'documents'],
      ['applications', 'Applications', 'documentDepository'],
    ],
    kpis: [
      ['academic', 'Academic', 'Grades, subject strength, and academic consistency.'],
      ['testScore', 'Testing', 'SAT, ACT, PSAT, AP, TOEFL, IELTS, or testing plan.'],
      ['activities', 'Activities', 'Depth, consistency, and meaningful extracurricular direction.'],
      ['leadership', 'Leadership', 'Initiative, responsibility, and influence inside or outside school.'],
      ['volunteering', 'Volunteering', 'Community contribution and sustained service.'],
      ['awards', 'Awards', 'Competitions, certificates, honors, projects, and recognition.'],
      ['narrative', 'Essays/Narrative', 'Personal story, reflection, and future application voice.'],
      ['goalClarity', 'Goal Clarity', 'Intended major, country preference, and university direction.'],
      ['potential', 'Potential', 'Long-term growth signal for the student journey.'],
      ['uniqueness', 'Uniqueness', 'Distinctive interests, background, projects, or perspective.'],
    ],
    scoreWeights: {
      academic: 18,
      testScore: 10,
      activities: 11,
      leadership: 10,
      volunteering: 7,
      awards: 8,
      narrative: 8,
      goalClarity: 8,
      potential: 12,
      uniqueness: 8,
    },
    universityScoringModel: 'undergraduate-major-fit',
    universityDescriptionModel: 'undergraduate-intended-major',
    recommendationEngine: 'reach-target-likely-portfolio',
    consultantWorkflow: ['weeklyCoaching', 'monthlyReview', 'semesterReview', 'summerPlanning', 'annualReview'],
    roadmap: ['Weekly Coaching', 'Monthly Review', 'Semester Review', 'Summer Planning', 'Annual Review'],
    onboarding: ['grade', 'curriculum', 'transcript', 'subjects', 'intendedMajor', 'countries', 'activities', 'strongestActivity', 'leadership', 'awardsProjects', 'tests', 'universityStyle'],
  },
  MBA: {
    key: 'mba',
    scoreLabel: 'MBA Competitiveness',
    steps: DEFAULT_STEPS,
    docLabel: 'CV, essays, recommendations, interview prep',
    kpis: [
      ['professional', 'Professional', 'Work impact, role scope, and employer quality.'],
      ['leadership', 'Leadership', 'People leadership, ownership, and influence.'],
      ['careerProgression', 'Career Progression', 'Promotions, increasing responsibility, and trajectory.'],
      ['internationalExposure', 'International Exposure', 'Cross-border work, languages, and global perspective.'],
      ['testScore', 'Testing', 'GMAT or GRE strength against MBA medians.'],
      ['academic', 'Academic', 'GPA, rigor, and analytical readiness.'],
      ['narrative', 'Narrative', 'Career logic, why MBA, and school fit.'],
    ],
    scoreWeights: {
      professional: 20,
      leadership: 18,
      careerProgression: 14,
      internationalExposure: 8,
      testScore: 13,
      academic: 12,
      narrative: 15,
    },
    universityScoringModel: 'mba-career-outcomes-fit',
    universityDescriptionModel: 'mba-recruiting-alumni-outcomes',
    recommendationEngine: 'strategic-admissions-portfolio',
    consultantWorkflow: ['profileAnalysis', 'schoolStrategy', 'narrative', 'cv', 'essays', 'interview'],
  },
  Graduate: {
    key: 'graduate',
    scoreLabel: 'Competitiveness Score',
    steps: DEFAULT_STEPS,
    docLabel: 'CV, essays, SOP, recommendations',
    kpis: [
      ['academic', 'Academic', 'GPA, prerequisites, and academic fit.'],
      ['professional', 'Professional', 'Relevant work, internships, or project experience.'],
      ['leadership', 'Leadership', 'Initiative, responsibility, and impact.'],
      ['research', 'Research', 'Research, thesis, publications, or analytical projects.'],
      ['testScore', 'Testing', 'GRE, GMAT, or relevant exam strength.'],
      ['narrative', 'Narrative', 'SOP logic, goals, and program fit.'],
      ['goalClarity', 'Goals', 'Clear academic and career direction.'],
    ],
    scoreWeights: {
      academic: 22,
      professional: 14,
      leadership: 10,
      research: 14,
      testScore: 13,
      narrative: 14,
      goalClarity: 13,
    },
    universityScoringModel: 'graduate-academic-program-fit',
    universityDescriptionModel: 'graduate-discipline-outcomes',
    recommendationEngine: 'strategic-admissions-portfolio',
    consultantWorkflow: ['profileAnalysis', 'programFit', 'sop', 'documents', 'interview'],
  },
  'Postgraduate / Doctoral': {
    key: 'phd',
    scoreLabel: 'Research Readiness',
    steps: ['Profile', 'Academic Depth', 'Research Experience', 'Research Direction', 'Supervisor Fit', 'Proposal', 'Writing Sample', 'Recommendations', 'Interview'],
    docLabel: 'Research proposal, writing sample, CV, papers',
    kpis: [
      ['academic', 'Academic', 'Academic depth and transcript strength.'],
      ['research', 'Research', 'Research experience, methods, and agenda fit.'],
      ['publications', 'Publications', 'Papers, posters, thesis, or scholarly output.'],
      ['facultyFit', 'Faculty Fit', 'Supervisor, lab, and research alignment.'],
      ['potential', 'Research Potential', 'Originality, rigor, and long-term scholarly promise.'],
      ['narrative', 'Narrative', 'Research story and proposal clarity.'],
      ['recommenders', 'Recommendations', 'Academic references and evaluator strength.'],
    ],
    scoreWeights: {
      academic: 18,
      research: 22,
      publications: 14,
      facultyFit: 16,
      potential: 14,
      narrative: 8,
      recommenders: 8,
    },
    universityScoringModel: 'phd-research-faculty-fit',
    universityDescriptionModel: 'phd-faculty-lab-funding-placement',
    recommendationEngine: 'research-fit-portfolio',
    consultantWorkflow: ['researchAgenda', 'supervisorFit', 'proposal', 'writingSample', 'recommendations'],
  },
  'Personal Development': {
    key: 'personal',
    scoreLabel: 'Growth Score',
    steps: ['Profile', 'Goals', 'Strengths', 'Gaps', 'Skills Plan', 'Experience Plan', 'Personal Brand', 'Execution', 'Review'],
    docLabel: 'CV, action plan, skills plan, portfolio',
    kpis: [
      ['professional', 'Professional', 'Current experience and work readiness.'],
      ['leadership', 'Leadership', 'Ownership, initiative, and collaboration.'],
      ['goalClarity', 'Goals', 'Direction and next-step clarity.'],
      ['narrative', 'Personal Brand', 'Story, positioning, and communication.'],
      ['potential', 'Potential', 'Growth capacity and execution signal.'],
    ],
    scoreWeights: {
      professional: 22,
      leadership: 18,
      goalClarity: 20,
      narrative: 18,
      potential: 22,
    },
    universityScoringModel: 'career-growth-fit',
    universityDescriptionModel: 'skills-outcome-fit',
    recommendationEngine: 'growth-roadmap',
    consultantWorkflow: ['goals', 'skillsPlan', 'experiencePlan', 'personalBrand', 'executionReview'],
  },
};

export function resolveTrack(profile = {}) {
  const category = profile?.category;
  const degree = `${profile?.degree || profile?.program || ''}`.toLowerCase();
  if (category === 'Undergraduate') return 'Undergraduate';
  if (category === 'Postgraduate / Doctoral' || /\bphd|doctoral|doctorate\b/.test(degree)) return 'Postgraduate / Doctoral';
  if (/\bmba\b/.test(degree)) return 'MBA';
  if (category === 'Personal Development') return 'Personal Development';
  return 'Graduate';
}

export function getTrackConfig(profile = {}) {
  return TRACK_CONFIG[resolveTrack(profile)] || TRACK_CONFIG.Graduate;
}
