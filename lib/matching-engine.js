import { checkEligibility } from './eligibility-engine.js';
import { parseNumber } from './profile-facts.js';

const clamp = value => Math.max(5, Math.min(95, Math.round(value)));
const list = value => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

function enoughBenchmarks(program) {
  return [program.medianGPA, program.avgGPA, program.avgGpa, program.medianTest, program.avgGMAT, program.avgGmat, program.avgGRE, program.avgSAT, program.avgACT, program.avgLSAT, program.avgMCAT]
    .some(value => parseNumber(value) != null)
    || program.requiresTest === true || program.requiresPortfolio === true || program.requiresPrerequisites === true;
}

function statusFromFit(fit) {
  if (fit > 80) return 'Strong';
  if (fit >= 50) return 'Competitive';
  return 'Plausible';
}

function gapScore(candidate, median, moderateGap, largeGap) {
  if (candidate == null || median == null) return null;
  const gap = candidate - median;
  if (gap >= 0) return 88;
  if (gap >= -moderateGap) return 76;
  if (gap >= -largeGap) return 60;
  return 38;
}

function weighted(values) {
  const known = values.filter(item => Number.isFinite(item.value));
  const weight = known.reduce((sum, item) => sum + item.weight, 0);
  return weight ? known.reduce((sum, item) => sum + item.value * item.weight, 0) / weight : null;
}

function programTestMedian(program, testType) {
  const type = String(testType || '').toUpperCase();
  return parseNumber(program.medianTest)
    ?? parseNumber(program[`median${type}`])
    ?? parseNumber(program[`avg${type}`])
    ?? (type === 'GMAT' ? parseNumber(program.avgGMAT ?? program.avgGmat) : null);
}

export function scoreProgramFit({ facts, kpiResult, program = {} }) {
  if (!enoughBenchmarks(program)) {
    return {
      ...program,
      evidenceGaps: list(program.evidenceGaps),
      riskFlags: [...new Set([...list(program.riskFlags), 'Official benchmark data needs verification.'])],
      fitDrivers: list(program.fitDrivers),
      scoreDetails: { deterministicApplied: false, reason: 'Insufficient official benchmark data.' },
    };
  }

  const eligibility = checkEligibility(facts, program);
  const medianGPA = parseNumber(program.medianGPA ?? program.avgGPA ?? program.avgGpa);
  const medianTest = programTestMedian(program, facts.testing.testType);
  const gpaFit = gapScore(facts.academics.gpa, medianGPA, 0.2, 0.5);
  const testFit = gapScore(facts.testing.testScore, medianTest, 30, 50);
  const isMba = facts.track === 'MBA' || /mba|business school/i.test(`${program.programGroup || ''} ${program.name || ''}`);
  const workFit = facts.experience.workYears == null ? null
    : isMba ? facts.experience.workYears >= 4 && facts.experience.workYears <= 7 ? 78 : facts.experience.workYears >= 2 ? 65 : 45
      : facts.experience.workYears >= 1 ? 72 : 50;
  let fit = weighted([{ value: gpaFit, weight: 38 }, { value: testFit, weight: 38 }, { value: workFit, weight: 24 }]);
  if (!Number.isFinite(fit)) fit = 60;
  const fitDrivers = [...list(program.fitDrivers)];
  const riskFlags = [...list(program.riskFlags)];
  const evidenceGaps = [...list(program.evidenceGaps), ...eligibility.missingGates];
  const corpus = `${program.name || ''} ${program.programGroup || ''} ${program.notes || ''} ${program.programInfo || ''}`.toLowerCase();
  const goal = String(facts.narrative.careerGoal || '').toLowerCase();
  if ((facts.subjectFamily && corpus.includes(String(facts.subjectFamily).split('-')[0])) || (goal && goal.split(/\s+/).some(word => word.length > 5 && corpus.includes(word)))) {
    fit += 5; fitDrivers.push('Strong subject or career-goal alignment');
  }
  if (/faculty|lab|research|recruit|industry|employer|alumni/.test(corpus) && (facts.research.facultyFitEvidence.length || goal)) {
    fit += 5; fitDrivers.push('Program resources align with the candidate direction');
  }
  if ((program.requiresPortfolio && (facts.activities.activities.length || facts.experience.achievements.length)) || (program.requiresPrerequisites && facts.academics.prerequisitesMet)) {
    fit += 5; fitDrivers.push('Direct evidence supports a program requirement');
  }
  const achievementScore = kpiResult.scores.achievementsImpact;
  if (achievementScore >= 75) { fit += 5; fitDrivers.push('Strong achievement and impact evidence'); }
  else if (Number.isFinite(achievementScore) && achievementScore <= 45) { riskFlags.push('Confirmed achievement impact is limited'); }
  const leadershipScore = kpiResult.scores.leadership;
  if (leadershipScore >= 75) { fit += 5; fitDrivers.push('Strong leadership evidence'); }
  else if (Number.isFinite(leadershipScore) && leadershipScore <= 50) { fit -= 5; riskFlags.push('Confirmed leadership evidence is weak'); }
  if (/ultra competitive|competitive/i.test(program.selectivityLabel || '') && !facts.recommenders.directEvaluatorConfirmed) {
    riskFlags.push('Direct evaluator recommender not confirmed');
    evidenceGaps.push('Recommendation strategy pending');
  }
  if (kpiResult.scores.narrative >= 75) { fit += 5; fitDrivers.push('Clear degree and career narrative'); }
  else if (Number.isFinite(kpiResult.scores.narrative) && kpiResult.scores.narrative < 55) { fit -= 5; riskFlags.push('Confirmed narrative/program fit is weak'); }
  if (kpiResult.scores.goalClarity >= 75) { fit += 3; fitDrivers.push('Clear post-degree goal'); }
  if (kpiResult.scores.recommenders >= 70) { fit += 2; fitDrivers.push('Direct evaluator recommender'); }
  if (kpiResult.scores.internationalExposure >= 70) { fit += 3; fitDrivers.push('International exposure'); }
  if (kpiResult.scores.community >= 70) { fit += 2; fitDrivers.push('Sustained community involvement'); }
  if (facts.experience.careerGapFlagged && !facts.experience.careerGapExplanation) { fit -= 5; riskFlags.push('Unexplained career gap'); }
  const selectivity = Number(program.selectivityScore || 0);
  if (/ultra competitive/i.test(program.selectivityLabel || '') || selectivity >= 85) fit -= 10;
  else if (/accessible/i.test(program.selectivityLabel || '') || (selectivity > 0 && selectivity < 40)) fit += 5;

  let tier;
  let admissionStatus;
  if (!eligibility.eligible) {
    fit = Math.min(35, fit);
    tier = 'locked';
    admissionStatus = 'Not Eligible';
  } else if (eligibility.status === 'Below Baseline') {
    fit = Math.min(49, fit);
    tier = 'stretch';
    admissionStatus = 'Below Baseline';
  } else {
    fit = clamp(fit);
    tier = fit > 80 ? 'safe' : fit >= 50 ? 'possible' : 'stretch';
    admissionStatus = statusFromFit(fit);
  }
  fit = clamp(fit);
  return {
    ...program,
    fit,
    tier,
    admissionStatus,
    evidenceGaps: [...new Set(evidenceGaps)],
    riskFlags: [...new Set(riskFlags)],
    fitDrivers: [...new Set(fitDrivers)],
    scoreDetails: {
      deterministicApplied: true,
      hardMetricBaseline: Math.round(weighted([{ value: gpaFit, weight: 38 }, { value: testFit, weight: 38 }, { value: workFit, weight: 24 }]) || 60),
      eligibility,
      finalFit: fit,
      readinessIndex: true,
    },
  };
}

export function balanceMbaPortfolio(programs = []) {
  const result = programs.map(program => ({ ...program }));
  const eligible = result.filter(program => program.tier !== 'locked' && program.admissionStatus !== 'Below Baseline');
  if (eligible.length < 8) return result;
  const reaches = eligible.filter(program => program.tier === 'stretch');
  const strong = eligible.filter(program => program.tier === 'safe');
  if (reaches.length < 2) {
    const candidates = eligible.filter(program => program.tier !== 'stretch')
      .sort((a, b) => Number(b.selectivityScore || 0) - Number(a.selectivityScore || 0));
    for (const program of candidates.slice(0, 2 - reaches.length)) {
      program.fit = Math.min(49, Number(program.fit || 49));
      program.tier = 'stretch';
      program.admissionStatus = 'Plausible';
      program.riskFlags = [...new Set([...list(program.riskFlags), 'High program selectivity creates reach-level application risk'])];
    }
  }
  if (strong.length < 3) {
    const candidates = eligible.filter(program => program.tier === 'possible')
      .sort((a, b) => Number(a.selectivityScore || 50) - Number(b.selectivityScore || 50));
    for (const program of candidates.slice(0, 3 - strong.length)) {
      if (Number(program.fit || 0) < 68) continue;
      program.fit = Math.max(81, Number(program.fit));
      program.tier = 'safe';
      program.admissionStatus = 'Strong';
      program.fitDrivers = [...new Set([...list(program.fitDrivers), 'Hard metrics support a strong-fit portfolio role'])];
    }
  }
  const possibleCount = eligible.filter(program => program.tier === 'possible').length;
  if (possibleCount < 4) {
    const safeCandidates = eligible.filter(program => program.tier === 'safe')
      .sort((a, b) => Number(b.selectivityScore || 50) - Number(a.selectivityScore || 50));
    const maxMoves = Math.min(4 - possibleCount, Math.max(0, safeCandidates.length - 3));
    for (const program of safeCandidates.slice(0, maxMoves)) {
      program.fit = Math.max(60, Math.min(80, Number(program.fit || 75)));
      program.tier = 'possible';
      program.admissionStatus = 'Competitive';
      program.riskFlags = [...new Set([...list(program.riskFlags), 'Selective program retained as a competitive portfolio option'])];
    }
  }
  return result;
}
