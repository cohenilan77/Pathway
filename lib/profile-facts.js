export function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function inferTrack(profile = {}) {
  const category = String(profile.category || '');
  const degree = String(profile.degree || profile.program || profile.programType || '').toLowerCase();
  if (category === 'Undergraduate') return 'Undergraduate';
  if (category === 'Postgraduate / Doctoral' || /phd|doctoral|doctorate/.test(degree)) return 'Postgraduate / Doctoral';
  if (/mba/.test(degree)) return 'MBA';
  if (category === 'Personal Development') return 'Personal Development';
  return 'Graduate';
}

export function inferSubjectFamily(profile = {}) {
  const text = `${profile.subjectFamily || ''} ${profile.degree || ''} ${profile.field || ''} ${profile.intendedMajor || ''} ${profile.industry || ''}`.toLowerCase();
  if (/business|mba|finance|management|marketing/.test(text)) return 'business';
  if (/law|llm|jd|legal/.test(text)) return 'law';
  if (/medicine|medical|health|md\b/.test(text)) return 'health';
  if (/design|art|media|creative|mfa|portfolio/.test(text)) return 'arts-design';
  if (/computer|engineering|technology|data|science|stem|math/.test(text)) return 'stem';
  if (/policy|government|politic|social/.test(text)) return 'social-science-policy';
  if (/education|teaching/.test(text)) return 'education';
  return profile.subjectFamily || null;
}

function array(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function bool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return /^(true|yes|confirmed|met)$/i.test(value.trim());
  return false;
}

function normalizeGpa(value, explicitScale) {
  const raw = parseNumber(value);
  if (raw == null) return { gpa: null, gpaScale: parseNumber(explicitScale) };
  const scale = parseNumber(explicitScale) || (raw <= 4 ? 4 : raw <= 5 ? 5 : raw <= 10 ? 10 : raw <= 100 ? 100 : null);
  if (!scale) return { gpa: raw, gpaScale: null };
  return { gpa: scale === 4 ? raw : Math.round((raw / scale) * 400) / 100, gpaScale: scale };
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function testFact(profile, scores) {
  const candidates = [
    ['GMAT', profile.gmat, profile.tests?.gmat, scores.gmat],
    ['GRE', profile.gre, profile.tests?.gre, scores.gre],
    ['SAT', profile.sat, profile.tests?.sat, scores.sat],
    ['ACT', profile.act, profile.tests?.act, scores.act],
    ['LSAT', profile.lsat, profile.tests?.lsat, scores.lsat],
    ['MCAT', profile.mcat, profile.tests?.mcat, scores.mcat],
  ];
  for (const [type, ...values] of candidates) {
    const score = firstNumber(...values);
    if (score != null) return { testType: type, testScore: score };
  }
  const namedType = String(profile.testType || profile.standardizedTest?.type || '').toUpperCase() || null;
  return { testType: namedType, testScore: firstNumber(profile.testScore, profile.standardizedTest?.score) };
}

export function normalizeProfileFacts(profile = {}, scores = {}, raw = {}) {
  const gpa = normalizeGpa(profile.gpa ?? profile.GPA ?? profile.academics?.gpa ?? raw.gpa, profile.gpaScale ?? profile.academics?.gpaScale);
  const test = testFact(profile, scores);
  const sourceFields = [];
  const missingFields = [];
  const note = (key, present) => (present ? sourceFields : missingFields).push(key);
  note('gpa', gpa.gpa != null || !!profile.transcriptStrength);
  note('testScore', test.testScore != null || bool(profile.testOptional));
  const workYears = firstNumber(profile.workYears, profile.yearsExperience, profile.workExperience, profile.experience?.workYears);
  note('workYears', workYears != null);
  const achievements = array(profile.achievements || profile.experience?.achievements);
  const activities = array(profile.activities || profile.extracurriculars);
  const awards = array(profile.awards || profile.honors || profile.awardsProjects);
  const researchExperience = array(profile.researchExperience || profile.research?.experience);
  const publications = array(profile.publications || profile.research?.publications);
  const recommenders = array(profile.recommenders || profile.strongestRecommenders);
  const careerGoal = profile.careerGoal || profile.postDegreeRole || profile.targetRole || null;
  note('careerGoal', !!careerGoal);
  note('recommenders', recommenders.length > 0);

  return {
    category: profile.category || null,
    track: inferTrack(profile),
    degree: profile.degree || profile.program || null,
    subjectFamily: inferSubjectFamily(profile),
    targetCountries: array(profile.targetCountries || profile.countries || profile.destination),
    targetSchools: array(profile.targetSchools || profile.chosenSchools || raw.chosenSchools),
    academics: {
      ...gpa,
      transcriptStrength: profile.transcriptStrength || profile.academics?.transcriptStrength || null,
      academicRigor: profile.academicRigor || profile.academics?.academicRigor || null,
      prerequisitesMet: profile.prerequisitesMet == null ? null : bool(profile.prerequisitesMet),
      missingPrerequisites: array(profile.missingPrerequisites || profile.academics?.missingPrerequisites),
    },
    testing: {
      ...test,
      englishTestType: profile.englishTestType || profile.englishTest?.type || null,
      englishScore: firstNumber(profile.englishScore, profile.englishTest?.score),
      testOptional: bool(profile.testOptional),
      missingTest: test.testScore == null && !bool(profile.testOptional),
    },
    experience: {
      workYears,
      roleSeniority: profile.roleSeniority || profile.currentRole || profile.experience?.roleSeniority || null,
      employerStrength: profile.employerStrength || profile.experience?.employerStrength || null,
      careerProgression: profile.careerProgression || profile.experience?.careerProgression || null,
      achievements,
      quantifiedImpact: array(profile.quantifiedImpact || profile.experience?.quantifiedImpact),
      careerGapFlagged: bool(profile.careerGapFlagged),
      careerGapExplanation: profile.careerGapExplanation || null,
      internationalCountries: array(profile.countriesLivedWorked || profile.internationalExperience || profile.experience?.countries),
      languages: array(profile.languages),
    },
    leadership: {
      managedPeople: bool(profile.managedPeople || profile.leadership?.managedPeople),
      teamSize: firstNumber(profile.teamSize, profile.leadership?.teamSize),
      ledProjects: array(profile.ledProjects || profile.leadership?.ledProjects),
      leadershipScope: profile.leadershipScope || profile.leadership?.scope || null,
      impactEvidence: array(profile.leadershipImpact || profile.leadership?.impactEvidence),
    },
    activities: {
      activities,
      depthYears: firstNumber(profile.activityDepthYears, profile.volunteeringYears, profile.activitiesDepthYears),
      strongestActivity: profile.strongestActivity || null,
      awards,
      volunteeringYears: firstNumber(profile.volunteeringYears, profile.activities?.volunteeringYears),
      communityImpact: profile.communityImpact || null,
    },
    research: {
      researchExperience,
      publications,
      thesis: profile.thesis || profile.research?.thesis || null,
      methods: array(profile.methods || profile.research?.methods),
      facultyFitEvidence: array(profile.facultyFitEvidence || profile.targetFaculty || profile.research?.facultyFitEvidence),
    },
    narrative: {
      goalClarity: profile.goalClarity || null,
      whyNow: profile.whyNow || null,
      whyDegree: profile.whyDegree || profile.whyMBA || null,
      careerGoal,
      storyStrength: profile.storyStrength || null,
    },
    recommenders: {
      strongestRecommenders: recommenders,
      directEvaluatorConfirmed: bool(profile.directEvaluatorConfirmed || recommenders.some(item => /boss|manager|supervisor|professor|advisor/i.test(JSON.stringify(item)))),
      recommenderStatus: profile.recommenderStatus || null,
      evidenceSpecificity: profile.recommenderEvidenceSpecificity || null,
    },
    evidence: {
      sourceFields,
      missingFields,
      confidenceByField: Object.fromEntries([...sourceFields.map(key => [key, 'high']), ...missingFields.map(key => [key, 'low'])]),
    },
  };
}
