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
  let fit = Number(kpiResult.overall || 50);
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
  if (/ultra competitive|competitive/i.test(program.selectivityLabel || '') && !facts.recommenders.directEvaluatorConfirmed) {
    fit -= 5; riskFlags.push('Direct evaluator recommender not confirmed');
  }
  if (kpiResult.scores.narrative < 55) { fit -= 5; riskFlags.push('Narrative and program-fit evidence is weak'); }
  if (facts.experience.careerGapFlagged && !facts.experience.careerGapExplanation) { fit -= 5; riskFlags.push('Unexplained career gap'); }

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
      startingOverall: kpiResult.overall,
      eligibility,
      finalFit: fit,
      readinessIndex: true,
    },
  };
}
