const SKILL_IDS = {
  essayReview: process.env.SKILL_ESSAY_REVIEW,
  cvReview: process.env.SKILL_CV_REVIEW,
  programMatching: process.env.SKILL_PROGRAM_MATCHING,
  riskAssessment: process.env.SKILL_RISK_ASSESSMENT,
  narrativeStrategy: process.env.SKILL_NARRATIVE_STRATEGY,
};

const BUNDLES = {
  essay: ['essayReview', 'narrativeStrategy'],
  cvCoaching: ['cvReview'],
  analysis: ['programMatching', 'riskAssessment'],
};

export function skillsParams(bundleName) {
  if (process.env.SKILLS_ENABLED !== 'true' || !bundleName) return {};
  const ids = (BUNDLES[bundleName] || []).map((key) => SKILL_IDS[key]).filter(Boolean);
  if (!ids.length) return {};
  return {
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02', 'files-api-2025-04-14'],
    container: {
      skills: ids.map((id) => ({ type: 'custom', skill_id: id, version: 'latest' })),
    },
    extraTools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
  };
}
