// Pure deterministic gate logic. No LLM involved.
// A school is "locked" when the candidate's metrics are too far below median.
// These rules fire identically every time and cannot be overridden by soft scores.

const LOCKED_GPA_GAP = 0.5;
const LOCKED_TEST_GAP = 50;

export function isLocked(candidateGPA, candidateTest, medianGPA, medianTest) {
  if (typeof candidateGPA !== 'number' || typeof medianGPA !== 'number') return false;
  if (candidateGPA - medianGPA < -LOCKED_GPA_GAP) return true;
  if (typeof candidateTest === 'number' && typeof medianTest === 'number') {
    if (candidateTest - medianTest < -LOCKED_TEST_GAP) return true;
  }
  return false;
}

// Cap fit at 49 when either metric is more than 0.5/50 below median (before any exception)
export function realismCap(fit, gpaGap, testGap) {
  if (gpaGap < -LOCKED_GPA_GAP || testGap < -LOCKED_TEST_GAP) {
    return Math.min(fit, 49);
  }
  return Math.min(95, Math.max(5, fit));
}

export function unlockConditions(gpaGap, testGap) {
  const items = [];
  if (gpaGap < -LOCKED_GPA_GAP) items.push('Raise GPA closer to program median before applying');
  if (testGap < -LOCKED_TEST_GAP) items.push('Retake the standardized test and target the program median');
  return items.slice(0, 2);
}

// Thin-profile check: returns true when the candidate hasn't supplied key evidence
// for a given program type. "Thin" means fewer than 2 of the expected evidence fields
// are non-null in the collected profile.
export function isThinProfile(collected, programType) {
  const evidenceKeys = {
    mba: ['workExperience', 'gmat', 'leadership', 'careerGoal'],
    phd: ['research', 'publications', 'facultyFit', 'researchStatement'],
    llm: ['lawDegree', 'legalExperience', 'writingSample'],
    md: ['mcat', 'clinicalHours', 'researchExp'],
    default: ['workExperience', 'gpa', 'testScore', 'careerGoal'],
  };
  const keys = evidenceKeys[programType?.toLowerCase()] || evidenceKeys.default;
  const filled = keys.filter((k) => collected?.[k] != null && collected[k] !== '').length;
  return filled < 2;
}
