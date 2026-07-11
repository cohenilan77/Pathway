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

function explicitlyNone(value) {
  return value === false || (typeof value === 'string' && /^(?:none|no|not yet|no evidence)$/i.test(value.trim()));
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
  // Fields the candidate has already been asked to confirm once
  // (deterministic-kpi-response.js records these on profile.profileCompleteness.askedFields
  // so it isn't re-asked). Scorers read this back to resolve a KPI that would
  // otherwise stay permanently null/needsConfirmation forever.
  const askedFields = array(
    profile.profileCompleteness?.askedFields
    || profile.candidateFacts?.profileCompleteness?.askedFields,
  );
  const gpa = normalizeGpa(profile.gpa ?? profile.GPA ?? profile.academics?.gpa ?? raw.gpa, profile.gpaScale ?? profile.academics?.gpaScale);
  const academicRecord = profile.transcriptStrength
    || profile.academics?.transcriptStrength
    || profile.academic
    || profile.academicRecord
    || profile.education
    || profile.degrees
    || null;
  const test = testFact(profile, scores);
  const sourceFields = [];
  const missingFields = [];
  const note = (key, present) => (present ? sourceFields : missingFields).push(key);
  note('gpa', gpa.gpa != null || array(academicRecord).length > 0);
  note('testScore', test.testScore != null || bool(profile.testOptional));
  const workYears = firstNumber(
    profile.workYears, profile.yearsExperience, profile.yearsOfExperience, profile.experienceYears,
    profile.workExperienceYears, profile.work_experience_years, profile.workExperience,
    profile.professionalExperience, profile.experience?.workYears, profile.experience?.years,
  );
  note('workYears', workYears != null);
  const achievements = array(profile.achievementsImpact || profile.achievements || profile.keyAchievements || profile.majorAchievements || profile.professionalAchievements || profile.experience?.achievements);
  const activities = [
    ...array(profile.activities || profile.extracurriculars),
    ...array(profile.community || profile.communityActivities || profile.communityInvolvement),
  ];
  const awards = array(profile.awards || profile.honors || profile.awardsProjects);
  // researchDirection is the PhD-track extraction field name (lib/candidate-facts.js,
  // lib/candidate-kpi-schemas.js) for research interests/direction. It carries real
  // research signal even with no formal "experience" entry yet, so it counts here too.
  const researchExperience = array(profile.researchExperience || profile.research?.experience || profile.researchDirection);
  const publications = array(profile.publications || profile.research?.publications);
  const recommenders = array(profile.recommenders || profile.strongestRecommenders || profile.recommendations);
  // postPhdGoal is the PhD-track equivalent of postMbaGoal — without this alias a
  // stated post-PhD goal (e.g. "tenure track academia") was silently dropped.
  const careerGoal = profile.careerGoal || profile.postDegreeRole || profile.postMbaGoal || profile.postMBAGoal || profile.postPhdGoal || profile.targetRole || profile.goals?.career || null;
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
      // A CV degree/education record is a valid academic baseline even when
      // it does not include a GPA. Keep it as evidence, not as an invented GPA.
      transcriptStrength: academicRecord,
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
      workYearsConfirmed: askedFields.includes('professional'),
      currentRole: profile.currentRole || profile.role || profile.jobTitle || profile.currentPosition || profile.experience?.currentRole || null,
      currentCompany: profile.currentCompany || profile.company || profile.employer || profile.organization || profile.experience?.currentCompany || null,
      companies: array(profile.companies || profile.employers || profile.workHistory?.map?.(item => item.company)),
      roleSeniority: profile.roleSeniority || profile.seniority || profile.currentRole || profile.experience?.roleSeniority || null,
      employerStrength: profile.employerStrength || profile.employerBrand || profile.companyStrength || profile.experience?.employerStrength || null,
      careerProgression: profile.careerProgression || profile.progression || profile.promotions || profile.experience?.careerProgression || null,
      progressionExplicitlyNone: explicitlyNone(profile.careerProgression) || explicitlyNone(profile.promotions),
      achievements,
      achievementsExplicitlyNone: explicitlyNone(profile.achievementsImpact) || explicitlyNone(profile.achievements) || explicitlyNone(profile.hasAchievements),
      quantifiedImpact: array(profile.quantifiedImpact || profile.impactMetrics || profile.measurableImpact || profile.experience?.quantifiedImpact),
      careerGapFlagged: bool(profile.careerGapFlagged),
      careerGapExplanation: profile.careerGapExplanation || null,
      internationalExposure: array(profile.internationalExposure || profile.crossBorderExperience),
      internationalCountries: array(profile.countriesWorked || profile.countriesLivedWorked || profile.internationalExperience || profile.experience?.countries),
      languages: array(profile.languages || profile.languageSkills),
    },
    leadership: {
      managedPeople: bool(profile.managedPeople ?? profile.peopleManagement ?? profile.leadership?.managedPeople),
      teamSize: firstNumber(profile.teamSize, profile.leadership?.teamSize),
      ledProjects: array(profile.ledProjects || profile.projectsLed || profile.leadership?.ledProjects),
      leadershipScope: profile.leadershipScope || profile.leadershipEvidence || profile.leadership?.scope || null,
      impactEvidence: array(profile.leadershipImpact || profile.leadershipAchievements || profile.leadership?.impactEvidence),
      explicitlyNone: explicitlyNone(profile.leadershipEvidence) || explicitlyNone(profile.hasLeadership) || (Object.hasOwn(profile, 'managedPeople') && profile.managedPeople === false && explicitlyNone(profile.leadershipScope)),
    },
    activities: {
      activities,
      depthYears: firstNumber(profile.activityDepthYears, profile.volunteeringYears, profile.activitiesDepthYears),
      strongestActivity: profile.strongestActivity || null,
      awards,
      volunteeringYears: firstNumber(profile.volunteeringYears, profile.communityYears, profile.activities?.volunteeringYears),
      communityImpact: profile.communityImpact || profile.communityContribution || profile.community || null,
      communityExplicitlyNone: explicitlyNone(profile.community) || explicitlyNone(profile.communityInvolvement) || explicitlyNone(profile.hasCommunityActivities),
    },
    research: {
      researchExperience,
      publications,
      thesis: profile.thesis || profile.research?.thesis || null,
      methods: array(profile.methods || profile.research?.methods),
      // Deliberately NOT falling back to researchDirection/researchField here:
      // facultyFit()'s high tier means "named faculty/lab/supervisor alignment,"
      // which a bare research-interests statement doesn't establish. Its medium
      // tier ("research direction exists, alignment broad") already fires once
      // researchExperience picks up researchDirection above — that's the correct
      // signal strength for research interests alone, with no named supervisor.
      facultyFitEvidence: array(profile.facultyFitEvidence || profile.targetFaculty || profile.research?.facultyFitEvidence),
    },
    narrative: {
      goalClarity: profile.goalClarity || null,
      whyNow: profile.whyNow || profile.timingReason || null,
      // researchDirection/researchField is the PhD analog of "why this degree" —
      // there is no separate PhD-specific "why" field extracted today.
      whyDegree: profile.whyDegree || profile.whyMBA || profile.mbaMotivation || profile.degreeMotivation || profile.researchDirection || profile.researchField || null,
      careerGoal,
      storyStrength: profile.storyStrength || null,
    },
    recommenders: {
      strongestRecommenders: recommenders,
      directEvaluatorConfirmed: bool(profile.directEvaluatorConfirmed ?? profile.recommenderDirectEvaluator ?? recommenders.some(item => /boss|manager|supervisor|professor|advisor/i.test(JSON.stringify(item)))),
      recommenderStatus: profile.recommenderStatus || null,
      evidenceSpecificity: profile.recommenderEvidenceSpecificity || null,
    },
    evidence: {
      sourceFields,
      missingFields,
      confidenceByField: Object.fromEntries([...sourceFields.map(key => [key, 'high']), ...missingFields.map(key => [key, 'low'])]),
      askedFields,
    },
  };
}
