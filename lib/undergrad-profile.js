const STAGE_BY_GRADE = { 9: 'discovery', 10: 'exploratory', 11: 'preliminary', 12: 'application' };

export function undergradGradeNumber(profile = {}) {
  const match = String(profile.grade ?? profile.currentGrade ?? '').match(/\d{1,2}/);
  const grade = match ? Number(match[0]) : null;
  return grade >= 9 && grade <= 12 ? grade : null;
}

export function isUndergraduateProfile(profile = {}, candidateType = '') {
  return String(candidateType || profile.selectedCandidateType || profile.category || '').toLowerCase() === 'undergraduate';
}

export function undergradProfileStage(profile = {}) {
  const explicit = String(profile.profileStage || '').toLowerCase();
  if (['discovery', 'exploratory', 'preliminary', 'application'].includes(explicit)) return explicit;
  return STAGE_BY_GRADE[undergradGradeNumber(profile)] || 'discovery';
}

function values(value) {
  if (Array.isArray(value)) return value.flatMap(values);
  if (value && typeof value === 'object') return Object.values(value).flatMap(values);
  return value == null ? [] : String(value).split(/[,|;/]+/).map(item => item.trim()).filter(Boolean);
}

export function undergradInterestCluster(profile = {}) {
  const raw = values([
    profile.interestCluster, profile.subjects, profile.interests, profile.favoriteSubjects,
    profile.majorInterests, profile.intendedMajor, profile.activities, profile.strongestActivity,
  ]);
  const clusters = [];
  const add = label => { if (!clusters.includes(label)) clusters.push(label); };
  for (const item of raw) {
    const text = item.toLowerCase();
    if (/math|calculus|statistics/.test(text)) add('Math');
    if (/econom|finance|business/.test(text)) add('Economics and Business');
    if (/computer|coding|software|ai|machine learning|data/.test(text)) add('Computer Science and Data');
    if (/engineer|robot|physics/.test(text)) add('Engineering');
    if (/bio|chem|medicine|health/.test(text)) add('Life Sciences and Medicine');
    if (/history|politic|law|humanit|language/.test(text)) add('Humanities and Social Sciences');
    if (/art|design|music|creative|architecture/.test(text)) add('Arts and Design');
  }
  return clusters.length ? clusters : [...new Set(raw)].slice(0, 4);
}

export function isUndergradExploring(profile = {}) {
  return /explor|still figuring|not sure|couple of ideas|partial/i.test(String(profile.pathwayType || profile.direction || ''))
    || !String(profile.intendedMajor || '').trim();
}

function known(value) {
  if (value === 0 || value === false) return true;
  if (Array.isArray(value)) return value.some(known);
  if (value && typeof value === 'object') return Object.values(value).some(known);
  return value != null && !/^\s*(?:|unknown|n\/a|not sure|tbd)\s*$/i.test(String(value));
}

export function undergradBaseline(profile = {}) {
  const grade = undergradGradeNumber(profile);
  const stage = undergradProfileStage(profile);
  const interestCluster = undergradInterestCluster(profile);
  const checks = {
    grade: !!grade,
    curriculum: known(profile.curriculum),
    academic: known(profile.academic || profile.gpa || profile.grades || profile.transcriptStatus || profile.transcript),
    interests: interestCluster.length > 0,
    geography: known(profile.targetCountries || profile.countries || profile.destination),
    activities: known(profile.activities || profile.extracurriculars || profile.strongestActivity),
  };
  if (grade >= 11) {
    checks.activityDepth = known(profile.strongestActivity || profile.leadership || profile.leadershipEvidence);
    checks.testing = known(profile.tests || profile.testScore || profile.sat || profile.act || profile.testingPlan);
    checks.universityStyle = known(profile.universityStyle || profile.schoolPreference);
  }
  return { grade, stage, interestCluster, checks, missing: Object.keys(checks).filter(key => !checks[key]), ready: Object.values(checks).every(Boolean) };
}

export function undergradReadyForExploratoryPrograms(candidateFacts = {}) {
  if (!isUndergraduateProfile(candidateFacts, candidateFacts.selectedCandidateType)) return false;
  const baseline = undergradBaseline(candidateFacts);
  const listMoment = candidateFacts.schoolListRequested
    || known(candidateFacts.universityStyle || candidateFacts.schoolPreference)
    || candidateFacts.schoolChoice === 'recommendations';
  return baseline.ready && listMoment;
}

export function normalizeUndergradProfile(profile = {}) {
  if (!isUndergraduateProfile(profile)) return profile;
  return { ...profile, profileStage: undergradProfileStage(profile), interestCluster: undergradInterestCluster(profile) };
}

export function normalizeUndergradPrograms(programs = [], profile = {}) {
  const stage = undergradProfileStage(profile);
  return (Array.isArray(programs) ? programs : []).map(program => {
    const tier = String(program.tier || '').toLowerCase();
    let admissionStatus = program.admissionStatus;
    if (stage === 'discovery' || stage === 'exploratory') admissionStatus = 'Exploratory';
    else if (stage === 'preliminary') admissionStatus = tier === 'safe' ? 'Preliminary Likely' : tier === 'possible' ? 'Preliminary Target' : 'Preliminary Reach';
    else if (!admissionStatus) admissionStatus = tier === 'safe' ? 'Likely' : tier === 'possible' ? 'Target' : tier === 'locked' ? 'Locked' : 'Reach';
    return {
      ...program,
      profileStage: stage,
      programGroup: (stage === 'discovery' || stage === 'exploratory') ? 'Exploratory undergraduate path' : (program.programGroup || 'Undergraduate'),
      admissionStatus,
    };
  });
}
