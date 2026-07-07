// Deterministic Undergraduate scoring engine (Grade 9-12 aware).
//
// Grade 9-10 candidates get a "development" score (Profile Temperature):
// potential, habits, early evidence, interests, direction, activity
// exploration. Missing SAT/ACT, final essays, a locked university list, or a
// locked major must never be treated as weaknesses at this stage.
//
// Grade 11-12 candidates get an admissions-readiness score (Preliminary /
// Application Readiness): academic strength, testing, activities impact,
// leadership, major fit, university portfolio, essays, and execution
// readiness. This is still never an admission probability.
//
// Scoring here is 100% deterministic code — no model call decides a score.
import {
  undergradGradeNumber,
  undergradProfileStage,
  undergradInterestCluster,
  undergradBaseline,
  isUndergradExploring,
} from '../undergrad-profile.js';

const HELPER_TEXT_DEVELOPMENT = 'This is not an admissions chance. It measures how strong your profile is becoming for your stage.';
const HELPER_TEXT_ADMISSIONS = 'This is coaching guidance, not an admissions guarantee.';

export const DEVELOPMENT_WEIGHTS = {
  academicFoundation: 25,
  curiosityInterests: 18,
  activityExploration: 18,
  initiativeHabits: 14,
  directionFit: 10,
  testingAwareness: 5,
  narrativeSeeds: 5,
  profileCompleteness: 5,
};

export const ADMISSIONS_WEIGHTS = {
  academicStrength: 25,
  testing: 15,
  activitiesImpact: 15,
  leadership: 10,
  majorFit: 10,
  universityPortfolio: 10,
  essaysNarrative: 10,
  executionReadiness: 5,
};

const GRADE_CONFIG = {
  9: { mode: 'development', label: 'Profile Temperature', stage: 'discovery', universityListMode: 'explore', universityListTitle: 'Schools to Explore' },
  10: { mode: 'development', label: 'Profile Temperature', stage: 'exploratory', universityListMode: 'early-fit', universityListTitle: 'Early Fit List' },
  11: { mode: 'preliminary', label: 'Preliminary Readiness', stage: 'preliminary', universityListMode: 'preliminary', universityListTitle: 'Preliminary Shortlist' },
  12: { mode: 'application', label: 'Application Readiness', stage: 'application', universityListMode: 'application', universityListTitle: 'Application Portfolio' },
};

const UNKNOWN_GRADE_CONFIG = { mode: 'development', label: 'Profile Temperature', stage: 'discovery', universityListMode: 'explore', universityListTitle: 'Schools to Explore' };

function has(value) {
  return Array.isArray(value) ? value.length > 0 : !!value;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function detail(score, reason, evidence, confidence = 'medium') {
  if (score == null) return { score: null, reason, evidence, confidence: 'low', incomplete: true };
  return { score: clamp(score), reason, evidence, confidence, incomplete: false };
}

export function undergradGradeConfig(profile = {}) {
  const grade = undergradGradeNumber(profile);
  return grade ? (GRADE_CONFIG[grade] || UNKNOWN_GRADE_CONFIG) : UNKNOWN_GRADE_CONFIG;
}

// ── Grade 9-10: development dimensions ──────────────────────────────────────

function academicFoundation(profile, evidence) {
  const gpa = evidence?.academics?.gpa ?? profile.gpa ?? null;
  const transcript = evidence?.academics?.transcriptStrength || profile.transcriptStrength || profile.grades;
  if (gpa != null) {
    const score = gpa >= 3.7 ? 88 : gpa >= 3.4 ? 76 : gpa >= 3.0 ? 62 : 45;
    return detail(score, `Grades show a ${gpa >= 3.7 ? 'strong' : gpa >= 3.0 ? 'developing' : 'early-stage'} academic foundation.`, 'GPA / grades', 'high');
  }
  if (transcript) return detail(60, 'Academic record is recorded but not yet a full transcript.', 'Reported grades', 'medium');
  return detail(null, 'Grades have not been shared yet — add your latest report card or transcript.', 'No grades on file', 'low');
}

function curiosityInterests(profile) {
  const clusters = undergradInterestCluster(profile);
  if (clusters.length >= 3) return detail(85, 'A clear cluster of interests spans several subjects or activities.', 'Interest clusters', 'high');
  if (clusters.length >= 1) return detail(65, 'At least one genuine interest area is emerging.', 'Interest clusters', 'medium');
  return detail(null, 'Interests are still open — share subjects or activities you enjoy.', 'No interests recorded yet', 'low');
}

function activityExploration(profile, evidence) {
  const activities = evidence?.activities?.activities || [];
  const strongest = evidence?.activities?.strongestActivity || profile.strongestActivity;
  if (activities.length >= 3 || (activities.length >= 1 && strongest)) return detail(80, 'Multiple activities show healthy early exploration.', 'Activity list', 'high');
  if (activities.length >= 1 || strongest) return detail(60, 'At least one activity has been tried so far.', 'Activity list', 'medium');
  return detail(null, 'No activities recorded yet — trying a few clubs, sports, or projects builds this dimension.', 'No activities on file', 'low');
}

function initiativeHabits(profile, evidence) {
  const leadershipEvidence = has(evidence?.leadership?.impactEvidence) || evidence?.leadership?.managedPeople || has(evidence?.leadership?.ledProjects) || known(profile.leadership || profile.leadershipEvidence);
  const awards = has(evidence?.activities?.awards) || known(profile.awardsProjects || profile.awards || profile.projects);
  if (leadershipEvidence && awards) return detail(85, 'Ownership and initiative are backed by projects or recognition.', 'Leadership and projects/awards', 'high');
  if (leadershipEvidence || awards) return detail(65, 'Early initiative is showing through leadership or a project/award.', 'Leadership or projects/awards', 'medium');
  return detail(null, 'No initiative evidence yet — a small project, award, or leadership moment will build this.', 'No initiative evidence yet', 'low');
}

function directionFit(profile) {
  const clusters = undergradInterestCluster(profile);
  const exploring = isUndergradExploring(profile);
  if (!exploring && clusters.length) return detail(75, 'A possible direction is forming and lines up with recorded interests.', 'Pathway direction', 'medium');
  if (clusters.length) return detail(55, 'Direction is still open, but interests give useful early signal.', 'Interest clusters', 'medium');
  return detail(null, 'Direction has not been explored yet — comparing a few possible paths helps here.', 'No direction signal yet', 'low');
}

function testingAwareness(profile, evidence) {
  const known_ = has(evidence?.testing?.testScore != null ? [1] : []) || known(profile.tests || profile.testingPlan || profile.testScore);
  // Missing SAT/ACT at this stage is never a weakness — awareness of the
  // future testing path is all that is measured, so the floor stays neutral.
  if (known_) return detail(75, 'There is early awareness of a future testing plan.', 'Testing plan', 'medium');
  return detail(55, 'No testing plan yet — this is expected at this stage and is not a weakness.', 'No testing plan yet', 'low');
}

function narrativeSeeds(profile, evidence) {
  const seeds = known(profile.narrativeSeeds || profile.storyStrength) || has(evidence?.narrative?.storyStrength ? [1] : []) || known(profile.careerGoal || profile.goals);
  if (seeds) return detail(70, 'Early story material — moments, values, or projects — is being collected.', 'Narrative seeds', 'medium');
  return detail(null, 'No narrative seeds yet — start noting moments and interests that matter to you.', 'No narrative seeds yet', 'low');
}

function profileCompletenessScore(profile) {
  const baseline = undergradBaseline(profile);
  const checks = Object.values(baseline.checks);
  const known_ = checks.filter(Boolean).length;
  const pct = checks.length ? known_ / checks.length : 0;
  if (pct >= 0.8) return detail(85, 'Most baseline profile fields are complete.', 'Profile baseline', 'high');
  if (pct >= 0.4) return detail(60, 'A good share of baseline profile fields are complete.', 'Profile baseline', 'medium');
  return detail(null, 'Baseline profile fields are still mostly missing.', 'Profile baseline incomplete', 'low');
}

function known(value) {
  if (value === 0 || value === false) return true;
  if (Array.isArray(value)) return value.some(known);
  if (value && typeof value === 'object') return Object.values(value).some(known);
  return value != null && !/^\s*(?:|unknown|n\/a|not sure|tbd)\s*$/i.test(String(value));
}

// ── Grade 11-12: admissions-readiness dimensions ────────────────────────────

function academicStrength(profile, evidence) {
  const gpa = evidence?.academics?.gpa ?? profile.gpa ?? null;
  if (gpa != null) {
    const score = gpa >= 3.85 ? 90 : gpa >= 3.65 ? 80 : gpa >= 3.35 ? 68 : gpa >= 3 ? 55 : 35;
    return detail(score, `GPA ${gpa} falls in the deterministic academic band.`, 'GPA', 'high');
  }
  const transcript = evidence?.academics?.transcriptStrength || profile.transcriptStrength;
  if (transcript) return detail(55, 'Transcript strength is recorded without a numeric GPA.', 'Transcript strength', 'medium');
  return detail(null, 'Grades or transcript strength have not been confirmed.', 'No academic evidence', 'low');
}

function testingScore(profile, evidence) {
  const testType = evidence?.testing?.testType || profile.testType;
  const score = evidence?.testing?.testScore ?? profile.testScore ?? profile.sat ?? profile.act;
  if (score == null) return detail(null, 'A testing score has not been confirmed yet.', 'No test score', 'low');
  const bands = { SAT: [1450, 1300, 1100], ACT: [33, 29, 24] }[String(testType || '').toUpperCase()];
  if (!bands) return detail(60, `${testType || 'Test'} ${score} is recorded but has no v1 benchmark.`, 'Test score', 'medium');
  const value = score >= bands[0] ? 88 : score >= bands[1] ? 75 : score >= bands[2] ? 60 : 42;
  return detail(value, `${testType} ${score} falls in the deterministic testing band.`, 'Test score', 'high');
}

function activitiesImpact(profile, evidence) {
  const activities = evidence?.activities?.activities || [];
  const strongest = evidence?.activities?.strongestActivity || profile.strongestActivity;
  const years = evidence?.activities?.depthYears;
  if (years >= 2 || (activities.length >= 2 && strongest)) return detail(85, 'Activities show sustained depth and measurable involvement.', 'Activity depth', 'high');
  if (activities.length >= 1 || strongest) return detail(60, 'Activities are present but sustained depth is not established.', 'Activity list', 'medium');
  return detail(null, 'Activity evidence with depth has not been provided.', 'No activity depth evidence', 'low');
}

function leadershipReadiness(profile, evidence) {
  const lead = evidence?.leadership || {};
  if (lead.managedPeople || lead.teamSize > 0 || has(lead.impactEvidence) || has(lead.ledProjects)) {
    return detail(has(lead.impactEvidence) ? 85 : 68, 'Leadership ownership is recorded.', 'Leadership evidence', 'medium');
  }
  if (known(profile.leadership || profile.leadershipEvidence)) return detail(55, 'Some leadership signal exists but scope is unclear.', 'Leadership signal', 'medium');
  return detail(null, 'Leadership evidence has not been provided.', 'No leadership evidence', 'low');
}

function majorFit(profile) {
  const clusters = undergradInterestCluster(profile);
  const exploring = isUndergradExploring(profile);
  if (!exploring && clusters.length >= 2) return detail(80, 'A specific major direction aligns with recorded interests.', 'Major direction', 'high');
  if (!exploring || clusters.length) return detail(60, 'A major direction is forming but is not fully confirmed.', 'Major direction', 'medium');
  return detail(null, 'A major or subject direction has not been confirmed.', 'No major direction', 'low');
}

function universityPortfolio(profile, evidence) {
  const schools = evidence?.targetSchools || profile.chosenSchools || profile.targetUniversities || profile.programs;
  if (has(schools) && (Array.isArray(schools) ? schools.length >= 3 : true)) return detail(78, 'A university list with multiple schools is underway.', 'University list', 'medium');
  if (has(schools)) return detail(55, 'A university list has started but needs more schools.', 'University list', 'medium');
  return detail(null, 'A university list has not been started.', 'No university list', 'low');
}

function essaysNarrative(profile, evidence) {
  const narrative = evidence?.narrative || {};
  const count = [narrative.whyDegree, narrative.whyNow, narrative.careerGoal].filter(Boolean).length
    + (known(profile.essays) ? 1 : 0);
  if (count >= 2) return detail(78, 'Essay themes or narrative direction are taking shape.', 'Narrative facts', 'medium');
  if (count >= 1) return detail(55, 'Some narrative material exists but themes are not developed.', 'Narrative facts', 'medium');
  return detail(null, 'Personal story themes have not been drafted.', 'No narrative evidence', 'low');
}

function executionReadiness(profile) {
  const docs = known(profile.documents) || known(profile.essays);
  const calendar = known(profile.calendar) || known(profile.tasks);
  if (docs && calendar) return detail(78, 'Documents and deadlines are being actively tracked.', 'Documents/calendar', 'medium');
  if (docs || calendar) return detail(55, 'Some execution tracking exists but is incomplete.', 'Documents/calendar', 'medium');
  return detail(null, 'Deadlines and required documents have not been mapped yet.', 'No execution tracking', 'low');
}

// ── Shared scoring machinery ─────────────────────────────────────────────────

function weightedScore(scoreDetails, weights) {
  let weightSum = 0;
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = scoreDetails[key];
    if (value && Number.isFinite(value.score)) {
      total += value.score * weight;
      weightSum += weight;
    }
  }
  return weightSum ? clamp(total / weightSum) : null;
}

function rankedStrengthsWeaknesses(scoreDetails, weights) {
  const ranked = Object.keys(weights)
    .map(key => [key, scoreDetails[key]])
    .filter(([, value]) => value && Number.isFinite(value.score))
    .sort((a, b) => b[1].score - a[1].score);
  const strengths = ranked.filter(([, v]) => v.score >= 65).slice(0, 5).map(([, v]) => v.reason);
  const weaknesses = ranked.slice().reverse().filter(([, v]) => v.score <= 60).slice(0, 5).map(([, v]) => v.reason);
  return { strengths, weaknesses };
}

const TASK_RULES = {
  academicFoundation: 'Add latest grades or transcript.',
  academicStrength: 'Add latest grades or transcript.',
  activityExploration: 'Choose one activity to deepen this semester.',
  directionFit: 'Compare 2–3 possible major directions.',
  majorFit: 'Compare 2–3 possible major directions.',
  testingAwareness: 'Create a testing plan.',
  testing: 'Create a testing plan.',
  universityPortfolio: 'Review and organize school list.',
  essaysNarrative: 'Draft personal story themes.',
  executionReadiness: 'Map deadlines and missing documents.',
};

function tasksFromGaps(scoreDetails, weights) {
  const tasks = [];
  for (const key of Object.keys(weights)) {
    const value = scoreDetails[key];
    if (value && (value.incomplete || value.score <= 55) && TASK_RULES[key]) tasks.push(TASK_RULES[key]);
  }
  return [...new Set(tasks)].slice(0, 6);
}

function missingFieldsFrom(scoreDetails) {
  return Object.entries(scoreDetails).filter(([, v]) => v.incomplete).map(([key]) => key);
}

export function scoreDevelopmentProfile(profile = {}, evidence = {}) {
  const scoreDetails = {
    academicFoundation: academicFoundation(profile, evidence),
    curiosityInterests: curiosityInterests(profile),
    activityExploration: activityExploration(profile, evidence),
    initiativeHabits: initiativeHabits(profile, evidence),
    directionFit: directionFit(profile),
    testingAwareness: testingAwareness(profile, evidence),
    narrativeSeeds: narrativeSeeds(profile, evidence),
    profileCompleteness: profileCompletenessScore(profile),
  };
  const overall = weightedScore(scoreDetails, DEVELOPMENT_WEIGHTS);
  const { strengths, weaknesses } = rankedStrengthsWeaknesses(scoreDetails, DEVELOPMENT_WEIGHTS);
  return {
    overall,
    scoreDetails,
    strengths: strengths.length ? strengths : ['A baseline profile is available for deterministic review.'],
    weaknesses: weaknesses.length ? weaknesses : ['More evidence will sharpen this over time — no urgent gaps at this stage.'],
    tasks: tasksFromGaps(scoreDetails, DEVELOPMENT_WEIGHTS),
    missingFields: missingFieldsFrom(scoreDetails),
    helperText: HELPER_TEXT_DEVELOPMENT,
  };
}

export function scoreAdmissionsProfile(profile = {}, evidence = {}) {
  const scoreDetails = {
    academicStrength: academicStrength(profile, evidence),
    testing: testingScore(profile, evidence),
    activitiesImpact: activitiesImpact(profile, evidence),
    leadership: leadershipReadiness(profile, evidence),
    majorFit: majorFit(profile),
    universityPortfolio: universityPortfolio(profile, evidence),
    essaysNarrative: essaysNarrative(profile, evidence),
    executionReadiness: executionReadiness(profile),
  };
  const overall = weightedScore(scoreDetails, ADMISSIONS_WEIGHTS);
  const { strengths, weaknesses } = rankedStrengthsWeaknesses(scoreDetails, ADMISSIONS_WEIGHTS);
  return {
    overall,
    scoreDetails,
    strengths: strengths.length ? strengths : ['A baseline profile is available for deterministic review.'],
    weaknesses: weaknesses.length ? weaknesses : ['More verified evidence is needed to sharpen the assessment.'],
    tasks: tasksFromGaps(scoreDetails, ADMISSIONS_WEIGHTS),
    missingFields: missingFieldsFrom(scoreDetails),
    helperText: HELPER_TEXT_ADMISSIONS,
  };
}

export function undergradScoreLabel(profile = {}) {
  return undergradGradeConfig(profile).label;
}

export function undergradUniversityListMode(profile = {}, scoreResult) {
  const config = undergradGradeConfig(profile);
  return scoreResult?.universityListMode || config.universityListMode;
}

export function shouldRunUniversityMatching(profile = {}, scoreResult = {}) {
  const grade = undergradGradeNumber(profile);
  const config = undergradGradeConfig(profile);
  const overall = scoreResult?.overall ?? scoreResult?.scores?.overall;
  const baseline = undergradBaseline(profile);

  if (grade === 9) {
    return { run: true, mode: 'explore', title: 'Schools to Explore', reason: 'Grade 9 always sees an inspiration-only exploration list.' };
  }
  if (grade === 10) {
    return { run: true, mode: 'early-fit', title: 'Early Fit List', reason: 'Grade 10 always sees soft exploratory school examples.' };
  }
  if (grade === 11) {
    const run = (overall != null && overall >= 50) || (baseline.checks.academic && (baseline.checks.pathwayType || baseline.checks.interests));
    return { run, mode: 'preliminary', title: 'Preliminary Shortlist', reason: run ? 'Grade 11 profile has enough academics and direction for a preliminary shortlist.' : 'Grade 11 profile needs more academic or direction evidence before a shortlist.' };
  }
  if (grade === 12) {
    const criticallyIncomplete = !baseline.checks.academic && !baseline.checks.activities && !baseline.checks.interests;
    return { run: !criticallyIncomplete, mode: 'application', title: 'Application Portfolio', reason: criticallyIncomplete ? 'Grade 12 profile is critically incomplete for an application portfolio.' : 'Grade 12 profile supports an application portfolio.' };
  }
  return { run: true, mode: config.universityListMode, title: config.universityListTitle, reason: 'Grade is unknown; defaulting to an exploration-only list.' };
}

export function scoreUndergradProfile(profile = {}, evidence = {}) {
  const grade = undergradGradeNumber(profile);
  const config = undergradGradeConfig(profile);
  const stage = undergradProfileStage(profile);
  const isDevelopment = config.mode === 'development';
  const result = isDevelopment ? scoreDevelopmentProfile(profile, evidence) : scoreAdmissionsProfile(profile, evidence);
  const confidence = grade == null ? 'low' : (result.overall == null ? 'low' : result.missingFields.length <= 2 ? 'high' : 'medium');
  const missingFields = grade == null ? [...new Set([...result.missingFields, 'grade'])] : result.missingFields;

  const scores = { overall: result.overall };
  for (const [key, value] of Object.entries(result.scoreDetails)) scores[key] = value.score;

  return {
    track: 'Undergraduate',
    mode: config.mode,
    label: config.label,
    stage: config.stage || stage,
    universityListMode: config.universityListMode,
    universityListTitle: config.universityListTitle,
    overall: result.overall,
    scores,
    scoreDetails: result.scoreDetails,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    tasks: result.tasks,
    missingFields,
    confidence,
    helperText: result.helperText,
  };
}
