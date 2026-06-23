const LOCKED_GPA_GAP = 0.5;
const LOCKED_TEST_GAP = 50;

const TIER_CAPS = { safe: 82, possible: 55, stretch: 20 };

function gpaGapScore(gap) {
  if (gap >= 0) return 100;
  if (gap >= -0.2) return 75;
  if (gap >= -0.4) return 40;
  return 0;
}

function testGapScore(gap) {
  if (gap >= 0) return 100;
  if (gap >= -10) return 75;
  if (gap >= -30) return 40;
  return 0;
}

function softBooster(avgSoft) {
  if (avgSoft >= 80) return 15;
  if (avgSoft >= 60) return 10;
  if (avgSoft >= 40) return 5;
  return 0;
}

function averageSoftScores(softScores) {
  const vals = ['professional', 'leadership', 'volunteering', 'uniqueness', 'diversity', 'goalClarity']
    .map((k) => softScores?.[k])
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function buildUnlockConditions(gpaGap, testGap) {
  const items = [];
  if (gpaGap < -LOCKED_GPA_GAP) items.push('Raise your GPA closer to the program median before applying');
  if (testGap < -LOCKED_TEST_GAP) items.push('Retake the standardized test and target the program median');
  return items.slice(0, 2);
}

function tierFromFit(fit) {
  if (fit < 20) return 'stretch';
  if (fit <= 55) return 'possible';
  return 'safe';
}

// Pure, deterministic fit scoring — no LLM involved. candidate: { gpa, testScore,
// softScores: { professional, leadership, volunteering, uniqueness, diversity, goalClarity },
// exceptionType: 'true' | 'partial' | 'none', nationalityOverrepresented, nationalityUnderrepresented,
// sectorOverrepresented, sectorUnderrepresented, careerGapFlagged }. program: { medianGPA, medianTest,
// acceptanceRate (0-100) }. Returns null when there isn't enough data to score.
export function computeFit(candidate, program) {
  const gpa = candidate?.gpa;
  const testScore = candidate?.testScore;
  const medianGPA = program?.medianGPA;
  const medianTest = program?.medianTest;
  if ([gpa, testScore, medianGPA, medianTest].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
    return null;
  }

  const gpaGap = gpa - medianGPA;
  const testGap = testScore - medianTest;
  const exceptionType = candidate.exceptionType || 'none';
  const isSevereGap = gpaGap < -LOCKED_GPA_GAP || testGap < -LOCKED_TEST_GAP;

  if (isSevereGap && exceptionType !== 'true') {
    if (exceptionType === 'partial') {
      // Falls through to standard scoring below, tier forced to stretch.
    } else {
      return {
        fit: 0,
        tier: 'locked',
        unlockConditions: buildUnlockConditions(gpaGap, testGap),
        exceptionFlag: false,
      };
    }
  }

  const avgSoft = averageSoftScores(candidate.softScores);
  let fit = (gpaGapScore(gpaGap) + testGapScore(testGap)) / 2 + softBooster(avgSoft);

  if (typeof program.acceptanceRate === 'number') {
    if (program.acceptanceRate < 10) fit -= 10;
    else if (program.acceptanceRate < 20) fit -= 5;
  }
  if (candidate.nationalityOverrepresented) fit -= 5;
  if (candidate.nationalityUnderrepresented) fit += 5;
  if (candidate.sectorOverrepresented) fit -= 5;
  if (candidate.sectorUnderrepresented) fit += 5;
  const volunteering = candidate.softScores?.volunteering;
  if (volunteering >= 80) fit += 3;
  else if (typeof volunteering === 'number' && volunteering < 40) fit -= 3;
  const leadership = candidate.softScores?.leadership;
  if (leadership >= 80) fit += 5;
  else if (typeof leadership === 'number' && leadership < 40) fit -= 3;
  const uniqueness = candidate.softScores?.uniqueness;
  if (uniqueness >= 80) fit += 5;
  else if (typeof uniqueness === 'number' && uniqueness < 40) fit -= 5;
  if (candidate.careerGapFlagged) fit -= 5;

  const exceptionFlag = exceptionType === 'true' && isSevereGap;
  const tier = isSevereGap && exceptionType === 'partial' ? 'stretch' : tierFromFit(fit);
  fit = Math.min(fit, TIER_CAPS[tier] ?? 100);
  if (exceptionFlag) fit = Math.max(fit, 18);
  fit = Math.max(5, Math.min(95, Math.round(fit)));

  return { fit, tier, unlockConditions: [], exceptionFlag };
}
