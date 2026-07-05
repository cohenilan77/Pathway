export const CANDIDATE_KPI_SCHEMAS = {
  Undergraduate: {
    key: 'undergraduate',
    kpis: [
      ['academic', 'Academic', 18], ['testScore', 'Testing', 10], ['activities', 'Activities', 11],
      ['leadership', 'Leadership', 10], ['volunteering', 'Community / Service', 7], ['awards', 'Awards / Impact', 8],
      ['narrative', 'Essays / Narrative', 8], ['goalClarity', 'Goal Clarity', 8],
      ['potential', 'Potential', 12], ['uniqueness', 'Uniqueness', 8],
    ],
    requiredFacts: ['grade', 'curriculum', 'academic', 'activities', 'intendedMajor'],
    optionalFacts: ['testScore', 'leadershipEvidence', 'community', 'awards', 'narrative', 'targetSchools'],
    extractionFields: ['grade', 'curriculum', 'gpa', 'grades', 'subjects', 'activities', 'leadershipEvidence', 'awards', 'tests', 'intendedMajor', 'countries', 'targetSchools'],
    missingQuestionRules: { testScore: 'Ask only when testing is age/grade appropriate.', leadershipEvidence: 'Missing evidence is incomplete, never zero.' },
    scoringRules: { incomplete: 'Exclude unknown dimensions from the weighted denominator.', confirmedAbsent: 'Score low only after explicit confirmation.' },
    evidenceConfidence: { high: 'Transcript or explicit answer', medium: 'CV/activity description', low: 'Inference only' },
  },
  MBA: {
    key: 'mba',
    kpis: [
      ['professional', 'Professional Experience', 14], ['leadership', 'Leadership', 12],
      ['careerProgression', 'Career Progression', 10], ['achievementsImpact', 'Achievements / Impact', 10],
      ['testScore', 'Testing', 10], ['academic', 'Academic', 10],
      ['narrative', 'Narrative / Why MBA', 10], ['goalClarity', 'Post-MBA Goal Clarity', 9],
      ['recommenders', 'Recommenders', 6], ['internationalExposure', 'International Exposure', 5],
      ['community', 'Community / Extracurricular', 4],
    ],
    requiredFacts: ['workYears', 'leadershipEvidence', 'careerProgression', 'achievementsImpact', 'whyMBA', 'postMbaGoal'],
    optionalFacts: ['testScore', 'academic', 'recommenders', 'internationalExposure', 'community', 'targetSchools'],
    extractionFields: ['roles', 'roleStartDate', 'roleEndDate', 'workYears', 'militaryYears', 'civilianWorkYears', 'currentRole', 'currentCompany', 'companies', 'leadershipEvidence', 'careerProgression', 'achievementsImpact', 'gpa', 'gmat', 'gre', 'whyMBA', 'postMbaGoal', 'recommenders', 'internationalExposure', 'community', 'targetSchools'],
    missingQuestionRules: { workYears: 'Ask only when role dates are absent, unclear, or impossible to resolve.', leadershipEvidence: 'Ask once when missing; do not lower the score until absence is confirmed.', targetSchools: 'Before programs, ask whether schools are known or recommendations are wanted.' },
    scoringRules: { incomplete: 'Do not score missing evidence as weak.', confirmedAbsent: 'A confirmed lack of evidence may receive a low score.', schoolFit: 'Never include school fit in the candidate-level KPI score.' },
    evidenceConfidence: { high: 'Dated CV evidence or explicit answer', medium: 'Consistent multi-source evidence', low: 'Single ambiguous inference' },
  },
  Graduate: {
    key: 'graduate',
    kpis: [
      ['academic', 'Academic', 20], ['professional', 'Professional Experience', 12],
      ['research', 'Research / Projects', 14], ['achievementsImpact', 'Achievements / Impact', 10],
      ['testScore', 'Testing', 10], ['narrative', 'SOP / Narrative', 13],
      ['goalClarity', 'Goal Clarity', 12], ['recommenders', 'Recommenders', 9],
    ],
    requiredFacts: ['academic', 'degree', 'goalClarity', 'narrative'],
    optionalFacts: ['professional', 'research', 'achievementsImpact', 'testScore', 'recommenders', 'targetSchools'],
    extractionFields: ['degree', 'field', 'gpa', 'coursework', 'projects', 'roles', 'research', 'publications', 'tests', 'goals', 'narrative', 'recommenders', 'targetSchools'],
    missingQuestionRules: { testScore: 'Ask only if required or useful for the target program.', research: 'Treat absent evidence as incomplete until confirmed.' },
    scoringRules: { incomplete: 'Renormalize across evidenced KPIs.', schoolFit: 'Program fit is calculated per school only.' },
    evidenceConfidence: { high: 'Transcript, publication, portfolio, or explicit answer', medium: 'CV evidence', low: 'Inference only' },
  },
  'Postgraduate / Doctoral': {
    key: 'phd',
    kpis: [
      ['academic', 'Academic Depth', 17], ['research', 'Research Experience', 22],
      ['publications', 'Publications / Outputs', 12], ['facultyFit', 'Research Direction / Faculty Fit', 15],
      ['potential', 'Research Potential', 12], ['narrative', 'Proposal / Narrative', 9],
      ['recommenders', 'Academic Recommenders', 8], ['goalClarity', 'Research Goal Clarity', 5],
    ],
    requiredFacts: ['academic', 'research', 'researchDirection', 'recommenders'],
    optionalFacts: ['publications', 'facultyFit', 'potential', 'narrative', 'targetSchools'],
    extractionFields: ['degrees', 'gpa', 'thesis', 'research', 'methods', 'publications', 'researchDirection', 'facultyFit', 'proposal', 'writingSample', 'recommenders', 'targetSchools'],
    missingQuestionRules: { publications: 'No publication found means incomplete, not weak.', facultyFit: 'Ask after research direction is known.' },
    scoringRules: { incomplete: 'Do not invent low research scores from missing documents.', schoolFit: 'Supervisor/program fit is per program, not a top profile KPI.' },
    evidenceConfidence: { high: 'Paper, thesis, proposal, or direct academic evidence', medium: 'CV or explicit answer', low: 'Inference only' },
  },
  'Personal Development': {
    key: 'personal',
    kpis: [
      ['professional', 'Professional Experience', 20], ['leadership', 'Leadership', 15],
      ['achievementsImpact', 'Achievements / Impact', 15], ['goalClarity', 'Goals', 20],
      ['narrative', 'Personal Brand', 15], ['potential', 'Growth Potential', 15],
    ],
    requiredFacts: ['currentRole', 'goalClarity'],
    optionalFacts: ['leadershipEvidence', 'achievementsImpact', 'skills', 'narrative', 'community'],
    extractionFields: ['roles', 'currentRole', 'currentCompany', 'skills', 'leadershipEvidence', 'achievementsImpact', 'goals', 'narrative', 'community'],
    missingQuestionRules: { currentRole: 'Ask only if no current role can be resolved.', leadershipEvidence: 'Missing evidence remains incomplete.' },
    scoringRules: { incomplete: 'Score only evidenced dimensions.', confirmedAbsent: 'Low scores require explicit confirmation.' },
    evidenceConfidence: { high: 'Dated CV evidence or explicit answer', medium: 'Consistent description', low: 'Inference only' },
  },
};

export function resolveCandidateSchemaKey(profile = {}, candidateType) {
  const category = String(profile?.category || '').toLowerCase();
  const degree = String(profile?.degree || profile?.program || profile?.candidateFacts?.degree || profile?.candidateFacts?.program || '').toLowerCase();
  const requested = String(candidateType || profile?.candidateFacts?.selectedCandidateType || '').toLowerCase();
  const combined = `${requested} ${category} ${degree}`;
  if (/undergrad|bachelor|high school/.test(combined)) return 'Undergraduate';
  if (/\bmba\b/.test(`${requested} ${degree}`) || category === 'mba') return 'MBA';
  if (/phd|doctoral|doctorate|postgraduate/.test(combined)) return 'Postgraduate / Doctoral';
  if (/personal development|career development/.test(combined)) return 'Personal Development';
  return 'Graduate';
}

export function getCandidateKpiSchema(profile = {}, candidateType) {
  return CANDIDATE_KPI_SCHEMAS[resolveCandidateSchemaKey(profile, candidateType)];
}

export function getCandidateKpiWeights(profile = {}, candidateType) {
  const schema = getCandidateKpiSchema(profile, candidateType);
  return Object.fromEntries((schema?.kpis || []).map(([key, , weight]) => [key, Number(weight) || 0]));
}

export function calculateCandidateOverall(scores = {}, profile = {}, candidateType) {
  const weights = getCandidateKpiWeights(profile, candidateType);
  const entries = Object.entries(weights).filter(([key, weight]) => weight > 0 && Number.isFinite(scores?.[key]));
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!totalWeight) return 0;
  return Math.round(entries.reduce((sum, [key, weight]) => sum + scores[key] * weight, 0) / totalWeight);
}

export function getCandidateKpiDisplayItems(scores = {}, profile = {}, candidateType) {
  const mbaSignals = ['careerProgression', 'achievementsImpact', 'internationalExposure', 'community']
    .filter(key => Object.prototype.hasOwnProperty.call(scores || {}, key)).length;
  const inferredType = candidateType || (mbaSignals >= 2 ? 'MBA' : undefined);
  const schema = getCandidateKpiSchema(profile, inferredType);
  return (schema?.kpis || []).map(([key, label, weight]) => {
    const value = Number.isFinite(scores?.[key]) ? scores[key] : null;
    return {
      key,
      label,
      weight,
      value,
      status: value == null ? 'incomplete' : 'scored',
    };
  });
}
