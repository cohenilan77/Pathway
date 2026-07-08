import { CANDIDATE_KPI_SCHEMAS, calculateCandidateOverall, getCandidateKpiWeights } from './candidate-kpi-schemas.js';
import { scoreUndergradProfile } from './undergrad/profile-temperature.js';

const TRACK_WEIGHTS = Object.fromEntries(
  Object.keys(CANDIDATE_KPI_SCHEMAS).map(track => [track, getCandidateKpiWeights({}, track)]),
);

const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const text = value => String(value || '').toLowerCase();
const has = value => Array.isArray(value) ? value.length > 0 : !!value;

// A KPI scored this low on anything less than solid (high-confidence) evidence
// is too weak to silently finalize — it should trigger a confirmation
// follow-up instead of being treated as the candidate's final result.
const LOW_SCORE_THRESHOLD = 55;

function detail(score, reason, evidence, confidence = 'medium') {
  if (score == null) return { score: null, reason, evidence, confidence: 'low', incomplete: true };
  const result = { score: clamp(score), reason, evidence, confidence, incomplete: false };
  if (result.score < LOW_SCORE_THRESHOLD && (confidence === 'medium' || confidence === 'low')) {
    result.needsConfirmation = true;
  }
  return result;
}

function academic(facts) {
  const { gpa, transcriptStrength, missingPrerequisites } = facts.academics;
  let result;
  if (gpa != null) {
    const score = gpa >= 3.85 ? 90 : gpa >= 3.65 ? 80 : gpa >= 3.35 ? 70 : gpa >= 3 ? 55 : 35;
    result = detail(score, `GPA ${gpa} falls in the deterministic academic band.`, 'Profile GPA', 'high');
  } else if (transcriptStrength) {
    const strength = text(transcriptStrength);
    const score = /strong|excellent|top/.test(strength) ? 80 : /weak|low/.test(strength) ? 40 : 60;
    result = detail(score, `Transcript strength is recorded as ${transcriptStrength}.`, 'Transcript strength', 'medium');
  } else result = detail(null, 'Academic evidence is incomplete.', 'No verified GPA or transcript strength', 'low');
  if (missingPrerequisites?.length && result.score > 60) return detail(60, `${result.reason} Missing prerequisites cap readiness at 60.`, 'Profile GPA and prerequisite gaps', result.confidence);
  return result;
}

function testing(facts) {
  const { testType, testScore, testOptional } = facts.testing;
  if (testScore == null) return testOptional
    ? detail(60, 'The target track is test optional and no score is reported.', 'Test-optional status', 'medium')
    : detail(null, 'A required or useful standardized test score is missing.', 'No test evidence', 'low');
  const thresholds = {
    GMAT: [730, 700, 650], GRE: [330, 320, 310], SAT: [1530, 1450, 1350], ACT: [35, 32, 29], LSAT: [172, 165, 160], MCAT: [520, 512, 505],
  };
  const bands = thresholds[String(testType || '').toUpperCase()];
  if (!bands) return detail(60, `${testType || 'Test'} ${testScore} is recorded but has no v1 benchmark.`, 'Profile test score', 'medium');
  const score = testScore >= bands[0] ? 90 : testScore >= bands[1] ? 80 : testScore >= bands[2] ? 65 : 45;
  return detail(score, `${testType} ${testScore} falls in the deterministic testing band.`, 'Profile test score', 'high');
}

// Per-track sanity ceiling for calculated work years. A candidate whose CV
// parses to more years than plausible for their track has a bad date
// extraction, not a genuinely exceptional career — flag it for confirmation
// rather than auto-scoring an inflated number.
const PROFESSIONAL_EXPERIENCE_CEILING = { Undergraduate: 5, Graduate: 10, 'Postgraduate / Doctoral': 10, MBA: 15 };

function professional(facts) {
  const years = facts.experience.workYears;
  if (years == null) return detail(null, 'Relevant experience duration is not confirmed.', 'Missing work-years evidence', 'low');
  const ceiling = PROFESSIONAL_EXPERIENCE_CEILING[facts.track] ?? 15;
  if (years > ceiling) {
    return {
      ...detail(null, `Calculated ${years} years of experience, which is unusually high for ${facts.track} — please confirm or clarify work history.`, 'Work history exceeds sanity ceiling', 'low'),
      needsConfirmation: true,
    };
  }
  let score = years >= 7 && has(facts.experience.achievements) ? 85 : years >= 4 ? 75 : years >= 1 ? 60 : 35;
  if (/strong|elite|top|global/.test(text(facts.experience.employerStrength))) score += 5;
  if (has(facts.experience.quantifiedImpact)) score += 5;
  return detail(Math.min(95, score), `${years} years of experience${has(facts.experience.achievements) ? ' with achievement evidence' : ''}.`, 'Work history', 'high');
}

function achievementsImpact(facts) {
  const achievements = facts.experience.achievements || [];
  const quantified = facts.experience.quantifiedImpact || [];
  if (facts.experience.achievementsExplicitlyNone) {
    return detail(40, 'The candidate explicitly confirmed no achievement or impact evidence.', 'Candidate confirmation', 'high');
  }
  if (quantified.length && achievements.length) return detail(88, 'Achievements include quantified, candidate-specific impact.', 'Achievements and impact metrics', 'high');
  if (quantified.length) return detail(82, 'The profile includes quantified impact evidence.', 'Impact metrics', 'high');
  if (achievements.length) return detail(68, 'Achievements are present, but measurable impact is limited.', 'Achievement evidence', 'medium');
  return detail(null, 'Achievement and impact evidence has not been provided.', 'Missing achievement evidence', 'low');
}

function leadership(facts) {
  const lead = facts.leadership;
  if (lead.explicitlyNone) return detail(40, 'The candidate explicitly confirmed no leadership evidence.', 'Candidate confirmation', 'high');
  if ((lead.managedPeople || lead.teamSize > 0) && has(lead.impactEvidence)) return detail(88, 'People leadership includes measurable impact.', 'Leadership evidence', 'high');
  if (lead.managedPeople || lead.teamSize > 0 || has(lead.ledProjects)) return detail(has(lead.impactEvidence) ? 80 : 70, 'The profile shows ownership of people, teams, or projects.', 'Leadership evidence', 'medium');
  if (lead.leadershipScope || facts.activities.strongestActivity) return detail(60, 'Leadership appears activity- or scope-based but impact evidence is limited.', 'Profile leadership/activity', 'medium');
  return detail(null, 'Leadership evidence has not been provided.', 'Missing leadership evidence', 'low');
}

function progression(facts) {
  const value = text(facts.experience.careerProgression);
  if (facts.experience.progressionExplicitlyNone) {
    return detail(40, 'The candidate explicitly confirmed no progression or increasing responsibility.', 'Candidate confirmation', 'high');
  }
  if (/promotion|increasing|rapid|progress|advanced|senior|manager|director|head/.test(value)) {
    return detail(85, 'Clear promotions or increasing responsibility are recorded.', 'Career progression', 'high');
  }
  if (value) return detail(65, 'Career progression evidence is present, but its strength is not fully quantified.', 'Career progression', 'medium');
  return detail(null, 'Career progression evidence has not been provided.', 'Missing progression evidence', 'low');
}

function international(facts) {
  const countries = facts.experience.internationalCountries?.length || 0;
  const languages = facts.experience.languages?.length || 0;
  if (countries >= 3 || (countries >= 2 && languages >= 2)) return detail(85, 'The profile shows broad international and multilingual exposure.', 'Countries/languages', 'high');
  if (countries >= 2 || languages >= 2) return detail(70, 'The profile shows meaningful cross-border or multilingual exposure.', 'Countries/languages', 'medium');
  if (facts.experience.internationalExposure?.length) return detail(70, 'Cross-border work evidence is recorded.', 'International exposure', 'medium');
  return detail(null, 'International exposure evidence has not been provided.', 'Missing international evidence', 'low');
}

function research(facts) {
  const r = facts.research;
  if (has(r.publications) || r.thesis || (has(r.researchExperience) && has(r.methods))) return detail(85, 'Research is supported by publications, thesis, role, or methods evidence.', 'Research profile', 'high');
  if (has(r.researchExperience) || has(r.methods)) return detail(62, 'Academic or project research is present, with limited scholarly output.', 'Research profile', 'medium');
  return detail(null, 'Research evidence has not been provided.', 'Missing research evidence', 'low');
}

function publications(facts) {
  const values = facts.research.publications || [];
  if (values.some(item => /peer|journal|published/i.test(JSON.stringify(item)))) return detail(85, 'Peer-reviewed or public scholarly output is recorded.', 'Publications', 'high');
  if (values.length || facts.research.thesis) return detail(65, 'A thesis, conference item, poster, or scholarly project is recorded.', 'Scholarly output', 'medium');
  return detail(null, 'Publication or thesis evidence has not been provided.', 'Missing scholarly output', 'low');
}

function facultyFit(facts) {
  if (has(facts.research.facultyFitEvidence)) return detail(85, 'Named faculty, lab, or supervisor alignment is recorded.', 'Faculty-fit evidence', 'high');
  if (has(facts.research.researchExperience)) return detail(60, 'Research direction exists, but faculty alignment is broad.', 'Research direction', 'medium');
  return detail(null, 'Faculty or lab fit has not been provided.', 'Missing faculty-fit evidence', 'low');
}

function recommenders(facts) {
  const r = facts.recommenders;
  if (r.directEvaluatorConfirmed && /specific|strong|concrete/i.test(text(r.evidenceSpecificity))) return detail(88, 'A direct evaluator can provide concrete evidence.', 'Recommender profile', 'high');
  if (r.directEvaluatorConfirmed) return detail(72, 'A direct evaluator is confirmed, but evidence specificity is limited.', 'Recommender profile', 'medium');
  if (has(r.strongestRecommenders)) return detail(Math.min(60, /high|senior|famous/i.test(text(r.recommenderStatus)) ? 60 : 55), 'Recommenders are named, but direct evaluation is not confirmed.', 'Recommender profile', 'medium');
  return detail(null, 'No direct evaluator recommender is confirmed yet.', 'Missing recommender strategy', 'low');
}

function activities(facts) {
  const years = facts.activities.depthYears;
  if (years >= 3) return detail(85, 'Activities show at least three years of sustained depth.', 'Activity duration', 'high');
  if (years >= 1) return detail(70, 'Activities show one to two years of regular involvement.', 'Activity duration', 'medium');
  if (has(facts.activities.activities) || facts.activities.strongestActivity) return detail(50, 'Activities are present but depth is not established.', 'Activity list', 'medium');
  return detail(null, 'Activity evidence has not been provided.', 'Missing activity evidence', 'low');
}

function volunteering(facts) {
  const years = facts.activities.volunteeringYears;
  if (years >= 3) return detail(90, 'Volunteering is sustained for at least three years.', 'Volunteering duration', 'high');
  if (years >= 1) return detail(70, 'Volunteering is regular for one to two years.', 'Volunteering duration', 'medium');
  if (facts.activities.communityImpact) return detail(45, 'Community involvement exists but duration is unclear.', 'Community impact', 'medium');
  return detail(null, 'Volunteering evidence has not been provided.', 'Missing volunteering evidence', 'low');
}

function community(facts) {
  const activities = facts.activities;
  if (activities.communityExplicitlyNone) {
    return detail(40, 'The candidate explicitly confirmed no community or extracurricular involvement.', 'Candidate confirmation', 'high');
  }
  const years = activities.volunteeringYears ?? activities.depthYears;
  if (years >= 3 && (activities.communityImpact || has(activities.activities))) {
    return detail(88, 'Community involvement is sustained and supported by contribution evidence.', 'Community duration and impact', 'high');
  }
  if (years >= 1) return detail(72, 'Community or extracurricular involvement is sustained for at least one year.', 'Community duration', 'medium');
  if (activities.communityImpact || has(activities.activities)) return detail(58, 'Community or extracurricular activity is present, but depth is unclear.', 'Community evidence', 'medium');
  return detail(null, 'Community or extracurricular evidence has not been provided.', 'Missing community evidence', 'low');
}

function awards(facts) {
  const values = facts.activities.awards || [];
  if (values.some(item => /national|international|world|country/i.test(JSON.stringify(item)))) return detail(90, 'National or international recognition is recorded.', 'Awards', 'high');
  if (values.length) return detail(values.some(item => /certificate/i.test(JSON.stringify(item))) ? 50 : 70, 'Recognized awards or projects are recorded.', 'Awards', 'medium');
  return detail(null, 'Awards or recognition evidence has not been provided.', 'Missing awards evidence', 'low');
}

function narrative(facts) {
  const n = facts.narrative;
  const count = [n.whyDegree, n.whyNow, n.careerGoal].filter(Boolean).length;
  if (count === 3) return detail(86, 'Why degree, why now, and career goal form a specific narrative.', 'Narrative facts', 'high');
  if (count >= 1) return detail(65, 'The profile has direction, but the application logic remains incomplete.', 'Narrative facts', 'medium');
  return detail(null, 'Why degree, why now, and career goal are incomplete.', 'Missing narrative evidence', 'low');
}

function goals(facts) {
  const goal = text(facts.narrative.careerGoal);
  if (!goal) return detail(null, 'No career or academic goal is confirmed.', 'Missing goal', 'low');
  const specific = /manager|consultant|analyst|engineer|researcher|professor|founder|director|doctor|lawyer|product|investment|tenure|academia|faculty|professorship|postdoc/.test(goal);
  const contextual = / at | in | within | by |usa|uk|europe|years?/.test(goal);
  return detail(specific && contextual ? 85 : specific ? 70 : 50, specific ? 'A target role is identified.' : 'A general direction is identified.', 'Career goal', specific ? 'medium' : 'low');
}

function potential(facts, scores) {
  const growth = scores.professional >= 75 || scores.research >= 75 || scores.leadership >= 75;
  return growth ? detail(85, 'Strong trajectory, achievement, research, or leadership signals support upside.', 'Profile trajectory', 'medium') : detail(65, 'The profile shows a normal positive trajectory with room to develop.', 'Profile trajectory', 'medium');
}

function uniqueness(facts) {
  const corpus = JSON.stringify([facts.experience.achievements, facts.activities.awards, facts.narrative.storyStrength]);
  if (/founded|built|national|international|rare|patent|surviv/i.test(corpus)) return detail(85, 'Rare achievement, buildership, or an unusual path is recorded.', 'Distinctive evidence', 'medium');
  if (has(facts.experience.achievements) || has(facts.activities.awards)) return detail(65, 'The profile contains some distinctive achievement evidence.', 'Achievements/awards', 'medium');
  return detail(null, 'Distinctive evidence has not been provided.', 'Missing uniqueness evidence', 'low');
}

function weightedOverall(scores, track) {
  return calculateCandidateOverall(scores, {}, track);
}

// Maps the normalized `facts` shape (and, when available, the raw candidate
// profile) into the profile/evidence pair the Undergraduate scoring engine
// expects. Facts already carry most Undergraduate evidence (grades,
// activities, leadership, narrative); the raw profile fills in fields facts
// does not retain (grade, curriculum, subjects, targeted schools/documents).
function undergradProfileFromFacts(facts, rawProfile = {}) {
  return {
    grade: rawProfile.grade ?? rawProfile.currentGrade,
    curriculum: rawProfile.curriculum,
    gpa: facts.academics.gpa ?? rawProfile.gpa,
    transcriptStrength: facts.academics.transcriptStrength,
    subjects: rawProfile.subjects || rawProfile.favoriteSubjects,
    interests: rawProfile.interests,
    favoriteSubjects: rawProfile.favoriteSubjects,
    majorInterests: rawProfile.majorInterests,
    intendedMajor: rawProfile.intendedMajor || rawProfile.major || facts.narrative.careerGoal,
    activities: facts.activities.activities.length ? facts.activities.activities : (rawProfile.activities || rawProfile.extracurriculars),
    strongestActivity: facts.activities.strongestActivity || rawProfile.strongestActivity,
    leadership: rawProfile.leadership,
    leadershipEvidence: rawProfile.leadershipEvidence || facts.leadership.leadershipScope,
    awardsProjects: rawProfile.awardsProjects,
    awards: facts.activities.awards.length ? facts.activities.awards : rawProfile.awards,
    projects: rawProfile.projects,
    tests: rawProfile.tests,
    testingPlan: rawProfile.testingPlan,
    testScore: facts.testing.testScore ?? rawProfile.testScore,
    testType: facts.testing.testType,
    sat: rawProfile.sat,
    act: rawProfile.act,
    targetCountries: facts.targetCountries.length ? facts.targetCountries : rawProfile.targetCountries,
    countries: rawProfile.countries,
    destination: rawProfile.destination,
    chosenSchools: facts.targetSchools.length ? facts.targetSchools : rawProfile.chosenSchools,
    targetUniversities: rawProfile.targetUniversities,
    programs: rawProfile.programs,
    documents: rawProfile.documents,
    essays: rawProfile.essays,
    calendar: rawProfile.calendar,
    tasks: rawProfile.tasks,
    pathwayType: rawProfile.pathwayType,
    direction: rawProfile.direction,
    profileStage: rawProfile.profileStage,
    narrativeSeeds: rawProfile.narrativeSeeds,
    storyStrength: rawProfile.storyStrength,
    universityStyle: rawProfile.universityStyle,
    schoolPreference: rawProfile.schoolPreference,
  };
}

export function scoreCandidateKPIs(facts, rawProfile = {}) {
  if (facts.track === 'Undergraduate') {
    const profile = undergradProfileFromFacts(facts, rawProfile);
    return scoreUndergradProfile(profile, facts);
  }
  const scoreDetails = {
    academic: academic(facts), testScore: testing(facts), professional: professional(facts), leadership: leadership(facts),
    careerProgression: progression(facts), achievementsImpact: achievementsImpact(facts),
    internationalExposure: international(facts), community: community(facts), research: research(facts),
    publications: publications(facts), facultyFit: facultyFit(facts), recommenders: recommenders(facts), activities: activities(facts),
    volunteering: volunteering(facts), awards: awards(facts), narrative: narrative(facts), goalClarity: goals(facts),
  };
  const preliminaryScores = Object.fromEntries(
    Object.entries(scoreDetails)
      .filter(([, value]) => Number.isFinite(value.score))
      .map(([key, value]) => [key, value.score]),
  );
  scoreDetails.potential = potential(facts, preliminaryScores);
  scoreDetails.uniqueness = uniqueness(facts);
  const relevant = Object.keys(TRACK_WEIGHTS[facts.track] || TRACK_WEIGHTS.Graduate);
  const scores = Object.fromEntries(
    relevant
      .filter(key => Number.isFinite(scoreDetails[key]?.score))
      .map(key => [key, scoreDetails[key].score]),
  );
  const overall = weightedOverall(scores, facts.track);
  scores.overall = overall;
  const ranked = relevant
    .map(key => [key, scoreDetails[key]])
    .filter(([, value]) => value && Number.isFinite(value.score))
    .sort((a, b) => b[1].score - a[1].score);
  const strengths = ranked.filter(([, value]) => value.score >= 65).slice(0, 5).map(([, value]) => value.reason);
  const weaknesses = ranked.slice().reverse().filter(([, value]) => value.score <= 60).slice(0, 5).map(([, value]) => value.reason);
  const tasks = [];
  if (facts.academics.gpa == null && !facts.academics.transcriptStrength) tasks.push('Upload a transcript or official GPA evidence.');
  if (facts.testing.missingTest) tasks.push(`Confirm whether a standardized test is required and add a ${facts.testing.testType || 'relevant test'} plan.`);
  const leadershipKnown = facts.leadership.managedPeople || facts.leadership.teamSize > 0
    || facts.leadership.ledProjects.length > 0 || !!facts.leadership.leadershipScope
    || facts.leadership.impactEvidence.length > 0 || facts.leadership.explicitlyNone;
  if (!leadershipKnown) tasks.push('Add one concrete leadership example with scope and outcome.');
  if (!facts.experience.achievements.length && !facts.experience.quantifiedImpact.length) tasks.push('Add one measurable professional achievement or impact example.');
  if (!facts.experience.careerProgression && !facts.experience.progressionExplicitlyNone) tasks.push('Clarify promotions or increasing responsibility across roles.');
  if (!facts.recommenders.directEvaluatorConfirmed) tasks.push('Confirm your strongest direct evaluator recommender and the achievement they can describe.');
  if (!facts.narrative.careerGoal) tasks.push('Define a specific post-degree role, sector, and target timeline.');
  if (facts.experience.careerGapFlagged && !facts.experience.careerGapExplanation) tasks.push('Explain the flagged career gap with dates and productive activity.');
  if (facts.track === 'Postgraduate / Doctoral' && !has(facts.research.facultyFitEvidence)) tasks.push('Identify target faculty or labs and document the research fit.');
  if (facts.track === 'Undergraduate' && !has(facts.activities.activities)) tasks.push('Add sustained activities with duration, role, and measurable contribution.');
  // Missing evidence and low-and-weak scores both need a confirmation
  // follow-up; collect them once here so the caller can fold them into a
  // single consolidated question instead of asking KPI by KPI.
  const confirmationsNeeded = Object.entries(scoreDetails)
    .filter(([, value]) => value?.needsConfirmation)
    .map(([key]) => key);
  return {
    track: facts.track,
    scores,
    overall,
    scoreDetails,
    strengths: strengths.length ? strengths : ['A baseline profile is available for deterministic review.'],
    weaknesses: weaknesses.length ? weaknesses : ['More verified evidence is needed to sharpen the assessment.'],
    tasks: [...new Set(tasks)].slice(0, 6),
    missingFields: facts.evidence.missingFields,
    confirmationsNeeded,
  };
}

export function assessScoringConfidence(facts) {
  const missing = [];
  const leadershipKnown = facts.leadership.managedPeople || facts.leadership.teamSize > 0 || facts.leadership.ledProjects.length > 0
    || !!facts.leadership.leadershipScope || facts.leadership.impactEvidence.length > 0 || facts.leadership.explicitlyNone;
  if (facts.track === 'MBA') {
    if (facts.academics.gpa == null && !facts.academics.transcriptStrength) missing.push('GPA or transcript strength');
    if (facts.testing.testScore == null && !facts.testing.testOptional) missing.push('GMAT/GRE or test-optional confirmation');
    if (facts.experience.workYears == null) missing.push('work years');
    if (!facts.experience.currentRole || !facts.experience.currentCompany) missing.push('current role/company');
    if (!facts.experience.achievements.length && !facts.experience.quantifiedImpact.length) missing.push('one measurable achievement');
    if (!leadershipKnown) missing.push('one leadership example or confirmation there is none');
    if (!facts.narrative.careerGoal || !facts.narrative.whyDegree) missing.push('post-MBA goal and why MBA');
  } else if (facts.track === 'Undergraduate') {
    if (facts.academics.gpa == null && !facts.academics.transcriptStrength) missing.push('grades or transcript strength');
    if (!facts.activities.activities.length && !facts.activities.strongestActivity) missing.push('activities and depth');
    if (!facts.narrative.careerGoal) missing.push('intended major or direction');
  } else if (facts.track === 'Postgraduate / Doctoral') {
    if (facts.academics.gpa == null && !facts.academics.transcriptStrength) missing.push('GPA or transcript strength');
    if (!facts.research.researchExperience.length && !facts.research.thesis) missing.push('research or thesis evidence');
    if (!facts.research.facultyFitEvidence.length) missing.push('faculty or lab fit');
    if (!facts.recommenders.directEvaluatorConfirmed) missing.push('direct academic evaluator recommender');
  } else {
    if (facts.academics.gpa == null && !facts.academics.transcriptStrength && facts.experience.workYears == null) {
      missing.push('academic or professional baseline');
    }
    if (!facts.narrative.careerGoal) missing.push('career or academic goal');
  }
  return { confidence: missing.length === 0 ? 'high' : missing.length <= 2 ? 'medium' : 'low', missingFields: missing };
}

export function trackWeights(track) {
  return { ...(TRACK_WEIGHTS[track] || TRACK_WEIGHTS.Graduate) };
}
