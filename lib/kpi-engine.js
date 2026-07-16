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

// Candidate-facing dimension names, used only to build the generic
// already-asked-once fallback copy below (every other displayReason spells
// its dimension name out directly at the call site).
const DISPLAY_NAMES = {
  academic: 'Academic', testScore: 'Testing', professional: 'Professional Experience', leadership: 'Leadership',
  careerProgression: 'Career Progression', achievementsImpact: 'Achievements & Impact', internationalExposure: 'International Exposure',
  community: 'Community Involvement', research: 'Research', publications: 'Publications', facultyFit: 'Faculty Fit',
  recommenders: 'Recommenders', activities: 'Activities', volunteering: 'Volunteering', awards: 'Awards & Recognition',
  narrative: 'Narrative', goalClarity: 'Goal Clarity', potential: 'Potential', uniqueness: 'Uniqueness',
};

const GENERIC_DISPLAY_REASON = 'More detail is needed here — your advisor will follow up.';

// `reason` stays internal (logging, agent call log, debugging) and is never
// shown to the candidate. `displayReason` is the candidate-facing sentence —
// always [dimension] — [what's missing or weak] — [what to do about it] —
// written explicitly at each call site so a raw internal reason can never
// leak into Core Strengths / Growth Areas.
function detail(score, reason, evidence, confidence = 'medium', displayReason) {
  const shownReason = displayReason || GENERIC_DISPLAY_REASON;
  if (score == null) return { score: null, status: 'incomplete', reason, evidence, confidence: 'low', incomplete: true, displayReason: shownReason };
  const result = { score: clamp(score), status: 'scored', reason, evidence, confidence, incomplete: false, displayReason: shownReason };
  if (result.score < LOW_SCORE_THRESHOLD && (confidence === 'medium' || confidence === 'low')) {
    result.needsConfirmation = true;
  }
  return result;
}

const MISSING_KPI_PROMPTS = {
  academic: 'What is your GPA or transcript strength, and are any prerequisite courses missing?',
  testScore: 'What standardized test score do you have, or is this target program test-optional for you?',
  professional: 'What are your current role, company, and total years of relevant experience?',
  leadership: 'What is one leadership example, including your role, scope, and measurable result?',
  careerProgression: 'What promotions, expanded responsibilities, or progression have you had?',
  achievementsImpact: 'What measurable achievements or impact can you prove with numbers or specific outcomes?',
  internationalExposure: 'What international work, study, languages, or cross-border exposure should be counted?',
  community: 'What community, extracurricular, or service work have you done, and for how long?',
  research: 'What research, thesis, publication, lab, or analytical project evidence do you have?',
  publications: 'What publications, thesis work, posters, or public scholarly outputs should be counted?',
  facultyFit: 'Which faculty, labs, supervisors, or research directions match your intended work?',
  recommenders: 'Who are your recommenders, and what can each one prove?',
  activities: 'What sustained activities have you done, including duration, role, and contribution?',
  volunteering: 'What volunteering or service work have you done, and for how long?',
  awards: 'What awards, honors, competitions, certificates, or recognition have you received?',
  narrative: 'Why this degree, why now, and what story should connect your background to your goal?',
  goalClarity: 'What specific academic or career goal are you pursuing after this program?',
  potential: 'What trajectory, growth signal, or upside evidence should the advisor consider?',
  uniqueness: 'What distinctive experience, buildership, background, or achievement makes you different?',
};

function missingPromptFor(key) {
  return MISSING_KPI_PROMPTS[key] || `What evidence should be used to score ${key}?`;
}

function decorateScoreDetails(scoreDetails) {
  return Object.fromEntries(Object.entries(scoreDetails).map(([key, value]) => {
    if (!value) return [key, value];
    if (value.incomplete || value.status === 'incomplete') {
      return [key, {
        ...value,
        status: 'incomplete',
        reason: value.reason || 'Required evidence for this KPI was not found in the uploaded profile.',
        missingPrompt: value.missingPrompt || missingPromptFor(key),
      }];
    }
    return [key, { ...value, status: 'scored' }];
  }));
}

function academic(facts) {
  const { gpa, transcriptStrength, missingPrerequisites } = facts.academics;
  let result;
  if (gpa != null) {
    const score = gpa >= 3.85 ? 90 : gpa >= 3.65 ? 80 : gpa >= 3.35 ? 70 : gpa >= 3 ? 55 : 35;
    const display = score >= 80
      ? `Academic — GPA of ${gpa} is strong for this track — a solid anchor point for your applications.`
      : score >= 55
        ? `Academic — GPA of ${gpa} is workable but not a standout — pairing it with a strong test score or achievements will help.`
        : `Academic — GPA of ${gpa} is below typical benchmarks for this track — a strong test score, upward grade trend, or addenda note would help offset it.`;
    result = detail(score, `GPA ${gpa} falls in the deterministic academic band.`, 'Profile GPA', 'high', display);
  } else if (transcriptStrength) {
    const strength = text(transcriptStrength);
    const score = /strong|excellent|top/.test(strength) ? 80 : /weak|low/.test(strength) ? 40 : 60;
    const display = score >= 80
      ? `Academic — Transcript strength is recorded as strong — a solid anchor for your academic story.`
      : score <= 40
        ? `Academic — Transcript strength is recorded as weak — a GPA number, upward trend, or addenda note would strengthen this.`
        : `Academic — Transcript strength is recorded but not distinctive — sharing your actual GPA would sharpen this.`;
    result = detail(score, `Transcript strength is recorded as ${transcriptStrength}.`, 'Transcript strength', 'medium', display);
  } else result = detail(null, 'Academic evidence is incomplete.', 'No verified GPA or transcript strength', 'low', 'Academic — No GPA or transcript strength on file — share your GPA (or transcript strength) so this can be scored.');
  if (missingPrerequisites?.length && result.score > 60) {
    return detail(60, `${result.reason} Missing prerequisites cap readiness at 60.`, 'Profile GPA and prerequisite gaps', result.confidence,
      'Academic — GPA supports readiness, but missing prerequisite coursework caps this score — list the prerequisites still needed and your plan to complete them.');
  }
  return result;
}

function testing(facts) {
  const { testType, testScore, testOptional } = facts.testing;
  if (testScore == null) return testOptional
    ? detail(60, 'The target track is test optional and no score is reported.', 'Test-optional status', 'medium',
      'Testing — This track is test-optional and no score is on file — no action needed unless you want a score to strengthen your profile.')
    : detail(null, 'A required or useful standardized test score is missing.', 'No test evidence', 'low',
      'Testing — No standardized test score is on file — share a score or confirm this program is test-optional for you.');
  const thresholds = {
    GMAT: [730, 700, 650], GRE: [330, 320, 310], SAT: [1530, 1450, 1350], ACT: [35, 32, 29], LSAT: [172, 165, 160], MCAT: [520, 512, 505],
  };
  const bands = thresholds[String(testType || '').toUpperCase()];
  if (!bands) return detail(60, `${testType || 'Test'} ${testScore} is recorded but has no v1 benchmark.`, 'Profile test score', 'medium',
    `Testing — ${testType || 'Your test'} score of ${testScore} is recorded but has no established benchmark for this program — no immediate action needed.`);
  const score = testScore >= bands[0] ? 90 : testScore >= bands[1] ? 80 : testScore >= bands[2] ? 65 : 45;
  const display = score >= 80
    ? `Testing — ${testType} ${testScore} is a strong score for this track — keep it as an anchor across your applications.`
    : score >= 65
      ? `Testing — ${testType} ${testScore} is workable but not a standout — a retake or a stronger secondary strength could help.`
      : `Testing — ${testType} ${testScore} is below typical benchmarks for this track — consider a retake or lean more heavily on other strengths.`;
  return detail(score, `${testType} ${testScore} falls in the deterministic testing band.`, 'Profile test score', 'high', display);
}

// Per-track sanity ceiling for calculated work years. A candidate whose CV
// parses to more years than plausible for their track has a bad date
// extraction, not a genuinely exceptional career — flag it for confirmation
// rather than auto-scoring an inflated number.
//
// These numbers exist to catch CV date-parsing errors, not to gatekeep
// genuinely experienced candidates: a decade-plus of real work experience
// going into a Graduate or Doctoral program (career-changers, executive
// students, second-degree candidates) is normal, not implausible, so the
// ceilings were raised well above the point where that's still a bad-parse
// signal rather than a real profile.
const PROFESSIONAL_EXPERIENCE_CEILING = { Undergraduate: 5, Graduate: 20, 'Postgraduate / Doctoral': 20, MBA: 20 };

function professional(facts) {
  const years = facts.experience.workYears;
  if (years == null) return detail(null, 'Relevant experience duration is not confirmed.', 'Missing work-years evidence', 'low',
    'Professional Experience — Work-experience years are not confirmed — share your work history with dates so this can be scored.');
  const ceiling = PROFESSIONAL_EXPERIENCE_CEILING[facts.track] ?? 15;
  if (years > ceiling && !facts.experience.workYearsConfirmed) {
    return {
      ...detail(null, `Calculated ${years} years of experience, which is unusually high for ${facts.track} — please confirm or clarify work history.`, 'Work history exceeds sanity ceiling', 'low',
        `Professional Experience — The calculated ${years} years is unusually high for ${facts.track} — confirm your actual work history so this can be scored accurately.`),
      needsConfirmation: true,
    };
  }
  let score = years >= 7 && has(facts.experience.achievements) ? 85 : years >= 4 ? 75 : years >= 1 ? 60 : 35;
  if (/strong|elite|top|global/.test(text(facts.experience.employerStrength))) score += 5;
  if (has(facts.experience.quantifiedImpact)) score += 5;
  const confidence = years > ceiling ? 'medium' : 'high';
  const confirmedNote = years > ceiling ? ' (previously flagged for confirmation; now scored with the candidate-confirmed figure).' : '';
  const finalScore = Math.min(95, score);
  const display = finalScore >= 80
    ? `Professional Experience — Strong, achievement-backed work history for this track — a clear asset in your applications.`
    : finalScore >= 60
      ? `Professional Experience — Solid work history, but achievement evidence is limited — add measurable outcomes to strengthen it.`
      : `Professional Experience — Work history is limited or early-stage for this track — highlight scope, ownership, or results wherever possible.`;
  return detail(finalScore, `${years} years of experience${has(facts.experience.achievements) ? ' with achievement evidence' : ''}${confirmedNote}`, 'Work history', confidence, display);
}

function achievementsImpact(facts) {
  const achievements = facts.experience.achievements || [];
  const quantified = facts.experience.quantifiedImpact || [];
  if (facts.experience.achievementsExplicitlyNone) {
    return detail(40, 'The candidate explicitly confirmed no achievement or impact evidence.', 'Candidate confirmation', 'high',
      'Achievements & Impact — No achievement or impact evidence confirmed — share one measurable result (numbers, scale, or outcome) to add here.');
  }
  if (quantified.length && achievements.length) return detail(88, 'Achievements include quantified, candidate-specific impact.', 'Achievements and impact metrics', 'high',
    'Achievements & Impact — Includes quantified, candidate-specific impact — a strong asset, keep leading with these numbers.');
  if (quantified.length) return detail(82, 'The profile includes quantified impact evidence.', 'Impact metrics', 'high',
    'Achievements & Impact — Impact is quantified but not tied to a named achievement — pairing a specific achievement with your numbers will sharpen this.');
  if (achievements.length) return detail(68, 'Achievements are present, but measurable impact is limited.', 'Achievement evidence', 'medium',
    'Achievements & Impact — Achievements are listed, but measurable impact is limited — add numbers (%, $, scale, time saved) to strengthen this.');
  return detail(null, 'Achievement and impact evidence has not been provided.', 'Missing achievement evidence', 'low',
    'Achievements & Impact — No achievement or impact evidence on file — share a specific accomplishment with a measurable result.');
}

function leadership(facts) {
  const lead = facts.leadership;
  if (lead.explicitlyNone) return detail(40, 'The candidate explicitly confirmed no leadership evidence.', 'Candidate confirmation', 'high',
    'Leadership — No leadership evidence confirmed — share one example of leading people or a project, even informally.');
  if ((lead.managedPeople || lead.teamSize > 0) && has(lead.impactEvidence)) return detail(88, 'People leadership includes measurable impact.', 'Leadership evidence', 'high',
    'Leadership — People leadership backed by measurable impact — a strong asset in your profile.');
  if (lead.managedPeople || lead.teamSize > 0 || has(lead.ledProjects)) {
    return detail(has(lead.impactEvidence) ? 80 : 70, 'The profile shows ownership of people, teams, or projects.', 'Leadership evidence', 'medium',
      'Leadership — Shows ownership of people or projects, but measurable outcomes are limited — add concrete results (team size, results, numbers).');
  }
  if (lead.leadershipScope || facts.activities.strongestActivity) return detail(60, 'Leadership appears activity- or scope-based but impact evidence is limited.', 'Profile leadership/activity', 'medium',
    'Leadership — Shows activity and scope but limited measurable impact — add concrete outcomes (team size, results, numbers).');
  return detail(null, 'Leadership evidence has not been provided.', 'Missing leadership evidence', 'low',
    'Leadership — No leadership evidence on file — share one example of leading people, a project, or an initiative.');
}

function progression(facts) {
  const value = text(facts.experience.careerProgression);
  if (facts.experience.progressionExplicitlyNone) {
    return detail(40, 'The candidate explicitly confirmed no progression or increasing responsibility.', 'Candidate confirmation', 'high',
      'Career Progression — No promotions or increasing responsibility confirmed — share how your role or scope has grown over time.');
  }
  if (/promotion|increasing|rapid|progress|advanced|senior|manager|director|head/.test(value)) {
    return detail(85, 'Clear promotions or increasing responsibility are recorded.', 'Career progression', 'high',
      'Career Progression — Clear promotions or increasing responsibility on record — a strong asset in your narrative.');
  }
  if (value) return detail(65, 'Career progression evidence is present, but its strength is not fully quantified.', 'Career progression', 'medium',
    'Career Progression — Some progression is noted, but it is not clearly quantified — add titles, dates, and scope changes.');
  return detail(null, 'Career progression evidence has not been provided.', 'Missing progression evidence', 'low',
    'Career Progression — No career progression evidence on file — share your role history and any promotions or expanded scope.');
}

function international(facts) {
  const countries = facts.experience.internationalCountries?.length || 0;
  const languages = facts.experience.languages?.length || 0;
  if (countries >= 3 || (countries >= 2 && languages >= 2)) return detail(85, 'The profile shows broad international and multilingual exposure.', 'Countries/languages', 'high',
    'International Exposure — Broad international and multilingual exposure — a strong differentiator.');
  if (countries >= 2 || languages >= 2) return detail(70, 'The profile shows meaningful cross-border or multilingual exposure.', 'Countries/languages', 'medium',
    'International Exposure — Meaningful cross-border or multilingual exposure — worth highlighting explicitly in your narrative.');
  if (facts.experience.internationalExposure?.length) return detail(70, 'Cross-border work evidence is recorded.', 'International exposure', 'medium',
    'International Exposure — Some cross-border work experience is recorded — adding specific countries or languages would strengthen this.');
  return detail(null, 'International exposure evidence has not been provided.', 'Missing international evidence', 'low',
    'International Exposure — No international or multilingual exposure on file — share any cross-border work, study, or language skills.');
}

function research(facts) {
  const r = facts.research;
  if (has(r.publications) || r.thesis || (has(r.researchExperience) && has(r.methods))) return detail(85, 'Research is supported by publications, thesis, role, or methods evidence.', 'Research profile', 'high',
    'Research — Backed by publications, thesis, or methods evidence — a strong asset for research-focused programs.');
  if (has(r.researchExperience) || has(r.methods)) return detail(62, 'Academic or project research is present, with limited scholarly output.', 'Research profile', 'medium',
    'Research — Academic or project research is present, but scholarly output is limited — a paper, poster, or write-up would strengthen this.');
  return detail(null, 'Research evidence has not been provided.', 'Missing research evidence', 'low',
    'Research — No research evidence on file — share any research, thesis, or analytical project experience.');
}

function publications(facts) {
  const values = facts.research.publications || [];
  if (values.some(item => /peer|journal|published/i.test(JSON.stringify(item)))) return detail(85, 'Peer-reviewed or public scholarly output is recorded.', 'Publications', 'high',
    'Publications — Peer-reviewed or public scholarly output on record — a strong asset for research-focused programs.');
  if (values.length || facts.research.thesis) return detail(65, 'A thesis, conference item, poster, or scholarly project is recorded.', 'Scholarly output', 'medium',
    'Publications — A thesis, conference item, or scholarly project is recorded — publishing or presenting it further would strengthen this.');
  return detail(null, 'Publication or thesis evidence has not been provided.', 'Missing scholarly output', 'low',
    'Publications — No publications, thesis, or scholarly output on file — share any research writing, even unpublished.');
}

function facultyFit(facts) {
  if (has(facts.research.facultyFitEvidence)) return detail(85, 'Named faculty, lab, or supervisor alignment is recorded.', 'Faculty-fit evidence', 'high',
    'Faculty Fit — Named faculty, lab, or supervisor alignment on record — a strong signal of program fit.');
  if (has(facts.research.researchExperience)) return detail(60, 'Research direction exists, but faculty alignment is broad.', 'Research direction', 'medium',
    'Faculty Fit — A research direction exists, but faculty or lab alignment is broad — name specific faculty or labs you would want to work with.');
  return detail(null, 'Faculty or lab fit has not been provided.', 'Missing faculty-fit evidence', 'low',
    'Faculty Fit — No faculty or lab fit on file — identify specific faculty, labs, or supervisors matching your research direction.');
}

function recommenders(facts) {
  const r = facts.recommenders;
  if (r.directEvaluatorConfirmed && /specific|strong|concrete/i.test(text(r.evidenceSpecificity))) return detail(88, 'A direct evaluator can provide concrete evidence.', 'Recommender profile', 'high',
    'Recommenders — A direct evaluator can provide concrete, specific evidence — a strong asset in your application.');
  if (r.directEvaluatorConfirmed) return detail(72, 'A direct evaluator is confirmed, but evidence specificity is limited.', 'Recommender profile', 'medium',
    'Recommenders — A direct evaluator is confirmed, but the evidence they can cite is limited — ask them for specific examples or outcomes.');
  if (has(r.strongestRecommenders)) {
    return detail(Math.min(60, /high|senior|famous/i.test(text(r.recommenderStatus)) ? 60 : 55), 'Recommenders are named, but direct evaluation is not confirmed.', 'Recommender profile', 'medium',
      'Recommenders — Named, but no direct evaluator is confirmed — confirm a recommender who directly supervised, taught, or evaluated your work.');
  }
  return detail(null, 'No direct evaluator recommender is confirmed yet.', 'Missing recommender strategy', 'low',
    'Recommenders — No direct evaluator confirmed as a recommender yet — confirm a senior colleague who knows your work closely.');
}

function activities(facts) {
  const years = facts.activities.depthYears;
  if (years >= 3) return detail(85, 'Activities show at least three years of sustained depth.', 'Activity duration', 'high',
    'Activities — At least three years of sustained depth — a strong, differentiated asset.');
  if (years >= 1) return detail(70, 'Activities show one to two years of regular involvement.', 'Activity duration', 'medium',
    'Activities — One to two years of regular involvement — sustaining this further would strengthen it.');
  if (has(facts.activities.activities) || facts.activities.strongestActivity) return detail(50, 'Activities are present but depth is not established.', 'Activity list', 'medium',
    'Activities — Activities are listed, but sustained depth is not established — share duration and your specific role.');
  return detail(null, 'Activity evidence has not been provided.', 'Missing activity evidence', 'low',
    'Activities — No sustained activities on file — share any clubs, projects, or extracurriculars with duration and role.');
}

function volunteering(facts) {
  const years = facts.activities.volunteeringYears;
  if (years >= 3) return detail(90, 'Volunteering is sustained for at least three years.', 'Volunteering duration', 'high',
    'Volunteering — Sustained for at least three years — a strong, credible commitment.');
  if (years >= 1) return detail(70, 'Volunteering is regular for one to two years.', 'Volunteering duration', 'medium',
    'Volunteering — Regular involvement for one to two years — continuing this will strengthen it further.');
  if (facts.activities.communityImpact) return detail(45, 'Community involvement exists but duration is unclear.', 'Community impact', 'medium',
    'Volunteering — Community involvement exists, but duration is unclear — share how long you have been involved.');
  return detail(null, 'Volunteering evidence has not been provided.', 'Missing volunteering evidence', 'low',
    'Volunteering — No volunteering or service work on file — share any community or service involvement, even informal.');
}

function community(facts) {
  const activities = facts.activities;
  if (activities.communityExplicitlyNone) {
    return detail(40, 'The candidate explicitly confirmed no community or extracurricular involvement.', 'Candidate confirmation', 'high',
      'Community Involvement — No community or extracurricular involvement confirmed — share any volunteering or activities, even informal ones.');
  }
  const years = activities.volunteeringYears ?? activities.depthYears;
  if (years >= 3 && (activities.communityImpact || has(activities.activities))) {
    return detail(88, 'Community involvement is sustained and supported by contribution evidence.', 'Community duration and impact', 'high',
      'Community Involvement — Sustained and backed by real contribution evidence — a strong asset.');
  }
  if (years >= 1) return detail(72, 'Community or extracurricular involvement is sustained for at least one year.', 'Community duration', 'medium',
    'Community Involvement — Sustained for at least one year — adding specific contributions or outcomes would strengthen this.');
  if (activities.communityImpact || has(activities.activities)) return detail(58, 'Community or extracurricular activity is present, but depth is unclear.', 'Community evidence', 'medium',
    'Community Involvement — Some involvement is present, but depth is unclear — share how long you have been involved and your specific role.');
  return detail(null, 'Community or extracurricular evidence has not been provided.', 'Missing community evidence', 'low',
    'Community Involvement — No community or extracurricular evidence on file — share any volunteering, clubs, or service work.');
}

function awards(facts) {
  const values = facts.activities.awards || [];
  if (values.some(item => /national|international|world|country/i.test(JSON.stringify(item)))) return detail(90, 'National or international recognition is recorded.', 'Awards', 'high',
    'Awards & Recognition — National or international recognition on record — a strong differentiator.');
  if (values.length) {
    const isCertificate = values.some(item => /certificate/i.test(JSON.stringify(item)));
    return detail(isCertificate ? 50 : 70, 'Recognized awards or projects are recorded.', 'Awards', 'medium',
      isCertificate
        ? 'Awards & Recognition — Recognition is recorded, but it is certificate-level rather than competitive — a competition, honor, or scholarship would strengthen this.'
        : 'Awards & Recognition — Recognized awards or projects are on record — worth expanding on in your narrative.');
  }
  return detail(null, 'Awards or recognition evidence has not been provided.', 'Missing awards evidence', 'low',
    'Awards & Recognition — No awards or recognition on file — share any honors, competitions, certificates, or recognition you have received.');
}

function narrative(facts) {
  const n = facts.narrative;
  const count = [n.whyDegree, n.whyNow, n.careerGoal].filter(Boolean).length;
  if (count === 3) return detail(86, 'Why degree, why now, and career goal form a specific narrative.', 'Narrative facts', 'high',
    'Narrative — Why this degree, why now, and your career goal form a specific, coherent story — a strong foundation for essays.');
  if (count >= 1) return detail(65, 'The profile has direction, but the application logic remains incomplete.', 'Narrative facts', 'medium',
    'Narrative — Some direction is present, but the application logic is not fully connected — tie your background, timing, and goal together explicitly.');
  return detail(null, 'Why degree, why now, and career goal are incomplete.', 'Missing narrative evidence', 'low',
    'Narrative — Why this degree, why now, and your career goal are not yet established — share your motivation and the story connecting them.');
}

function goals(facts) {
  const goal = text(facts.narrative.careerGoal);
  if (!goal) return detail(null, 'No career or academic goal is confirmed.', 'Missing goal', 'low',
    'Goal Clarity — No career or academic goal confirmed — share a specific target role, sector, or program direction.');
  const specific = /manager|consultant|analyst|engineer|researcher|professor|founder|director|doctor|lawyer|product|investment|tenure|academia|faculty|professorship|postdoc/.test(goal);
  const contextual = / at | in | within | by |usa|uk|europe|years?/.test(goal);
  const display = specific && contextual
    ? 'Goal Clarity — A specific, well-contextualized target role is identified — a strong asset for your narrative.'
    : specific
      ? 'Goal Clarity — A specific target role is identified, but the context (where, when, why) is thin — add timeline and setting details.'
      : 'Goal Clarity — Only a general direction is identified — add a specific target role, industry, and timeline.';
  return detail(specific && contextual ? 85 : specific ? 70 : 50, specific ? 'A target role is identified.' : 'A general direction is identified.', 'Career goal', specific ? 'medium' : 'low', display);
}

function potential(facts, scores) {
  const growth = scores.professional >= 75 || scores.research >= 75 || scores.leadership >= 75;
  return growth
    ? detail(85, 'Strong trajectory, achievement, research, or leadership signals support upside.', 'Profile trajectory', 'medium',
      'Potential — Strong trajectory signals from experience, research, or leadership — a genuine asset in your profile.')
    : detail(65, 'The profile shows a normal positive trajectory with room to develop.', 'Profile trajectory', 'medium',
      'Potential — Shows a normal positive trajectory — highlighting a specific growth story would strengthen this further.');
}

function uniqueness(facts) {
  const corpus = JSON.stringify([facts.experience.achievements, facts.activities.awards, facts.narrative.storyStrength]);
  if (/founded|built|national|international|rare|patent|surviv/i.test(corpus)) return detail(85, 'Rare achievement, buildership, or an unusual path is recorded.', 'Distinctive evidence', 'medium',
    'Uniqueness — A rare achievement, buildership, or unusual path is recorded — a genuine differentiator.');
  if (has(facts.experience.achievements) || has(facts.activities.awards)) return detail(65, 'The profile contains some distinctive achievement evidence.', 'Achievements/awards', 'medium',
    'Uniqueness — Some distinctive achievement evidence is present — sharpen the story around what makes it unusual.');
  return detail(null, 'Distinctive evidence has not been provided.', 'Missing uniqueness evidence', 'low',
    'Uniqueness — No distinctive or differentiating evidence on file — share anything unconventional about your path, background, or achievements.');
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

  // SAFETY NET: no KPI may stay permanently null after the candidate
  // has already been asked about it once (facts.evidence.askedFields,
  // sourced from profile.profileCompleteness.askedFields). If a
  // specific scorer still can't resolve a value on this pass, force a
  // conservative best-available score instead of leaving it blocked
  // forever. professional() above already resolves its own known
  // repeat offender with real evidence (workYearsConfirmed); this is
  // the catch-all for anything else that reaches this state.
  const askedFields = new Set(facts.evidence.askedFields || []);
  for (const key of relevant) {
    const d = scoreDetails[key];
    if (d && d.score == null && askedFields.has(key)) {
      const dimensionName = DISPLAY_NAMES[key] || key;
      scoreDetails[key] = {
        ...d, score: 55, status: 'scored', incomplete: false, confidence: 'low', needsConfirmation: false,
        reason: `${d.reason} Already asked once — proceeding with a conservative estimate rather than leaving this blocked.`,
        displayReason: `${dimensionName} — No evidence recorded — scored conservatively; share more detail to improve this.`,
      };
    }
  }

  const detailedScoreDetails = decorateScoreDetails(scoreDetails);
  const scores = Object.fromEntries(
    relevant
      .filter(key => Number.isFinite(detailedScoreDetails[key]?.score))
      .map(key => [key, detailedScoreDetails[key].score]),
  );
  const overall = weightedOverall(scores, facts.track);
  scores.overall = overall;
  const ranked = relevant
    .map(key => [key, detailedScoreDetails[key]])
    .filter(([, value]) => value && Number.isFinite(value.score))
    .sort((a, b) => b[1].score - a[1].score);
  // Candidate-facing Core Strengths / Growth Areas bullets must only ever
  // use displayReason — the internal `reason` field is for logging/debug/the
  // agent call log and must never render in the product.
  const strengths = ranked.filter(([, value]) => value.score >= 65).slice(0, 5).map(([, value]) => value.displayReason || GENERIC_DISPLAY_REASON);
  const weaknesses = ranked.slice().reverse().filter(([, value]) => value.score <= 60).slice(0, 5).map(([, value]) => value.displayReason || GENERIC_DISPLAY_REASON);
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
  // `incomplete` (score still null — nothing was ever collected for it) must
  // gate exactly like `needsConfirmation` (a weak-but-present score) does;
  // otherwise a genuinely missing KPI silently drops out of `scores` below
  // instead of ever being asked about. `incomplete` is scoped to `relevant`
  // (this track's actual weighted KPIs) so a candidate is never asked to
  // confirm a dimension their track doesn't even score (e.g. an MBA
  // candidate isn't asked about facultyFit).
  const confirmationsNeeded = [...new Set([
    ...Object.entries(scoreDetails).filter(([, value]) => value?.needsConfirmation).map(([key]) => key),
    ...relevant.filter(key => scoreDetails[key]?.incomplete),
  ])];
  return {
    track: facts.track,
    scores,
    overall,
    scoreDetails: detailedScoreDetails,
    strengths: strengths.length ? strengths : ['A baseline profile is available for deterministic review.'],
    weaknesses: weaknesses.length ? weaknesses : ['More verified evidence is needed to sharpen the assessment.'],
    tasks: [...new Set(tasks)].slice(0, 6),
    missingFields: facts.evidence.missingFields,
    confirmationsNeeded,
    missingQuestions: relevant
      .map(key => detailedScoreDetails[key])
      .filter(value => value?.status === 'incomplete' && value.missingPrompt)
      .map(value => value.missingPrompt),
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
