import { getCandidateKpiSchema, resolveCandidateSchemaKey } from './candidate-kpi-schemas.js';
import { isUndergraduateProfile, normalizeUndergradProfile, undergradBaseline, undergradReadyForExploratoryPrograms } from './undergrad-profile.js';

const EMPTY = new Set(['', 'unknown', 'n/a', 'na', 'not sure', 'tbd', 'null', 'undefined']);
const QUESTION_LABELS = {
  grade: 'current grade', curriculum: 'curriculum', academic: 'GPA or academic record',
  activities: 'activities', intendedMajor: 'intended major', workYears: 'work experience dates',
  leadershipEvidence: 'leadership example and outcome', careerProgression: 'career progression',
  achievementsImpact: 'achievements or measurable impact', testScore: 'test score or testing plan',
  whyMBA: 'why MBA and why now', postMbaGoal: 'post-MBA goal', degree: 'target degree',
  goalClarity: 'target role or academic goal', narrative: 'motivation and narrative',
  research: 'research experience', researchDirection: 'research interests and direction',
  researchField: 'research field or specialization', postPhdGoal: 'career goal immediately after the PhD',
  recommenders: 'recommenders', currentRole: 'current role',
  targetGeography: 'target geography', schoolChoice: 'specific schools vs recommendations',
  targetSchools: 'specific school names',
};

const SCHOOL_LIST_INTENT = /(?:show|generate|build|create|recommend|suggest|refresh|list|see)\s+(?:me\s+)?(?:my\s+)?(?:complete\s+|full\s+|recommended\s+|tailored\s+|possible\s+)?(?:school|program|university)?\s*(?:list|portfolio|matches|schools|programs|universities)|(?:cannot|can't|do not|don't)\s+see[\s\S]{0,80}(?:schools?|programs?|portfolio|list|matches)|\b(?:possible\s+programs|my\s+school\s+list)\b|\bmatch\s+me\b|^\s*(?:recommend|portfolio|school\s+list|university\s+list)\s*[.!]?\s*$/i;

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

export function isKnown(value) {
  if (value === false || value === 0) return true;
  if (value == null) return false;
  if (Array.isArray(value)) return value.some(isKnown);
  if (typeof value === 'object') return Object.values(value).some(isKnown);
  return !EMPTY.has(String(value).trim().toLowerCase());
}

function unique(values) {
  return [...new Set(values.filter(isKnown).map(value => typeof value === 'string' ? value.trim() : value))];
}

function safeJson(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function profileBlocks(messages = []) {
  return messages.flatMap(message => {
    const text = String(message?.text || '');
    return [...text.matchAll(/<PROFILE>([\s\S]*?)<\/PROFILE>/gi)]
      .map(match => safeJson(match[1]))
      .filter(value => value && typeof value === 'object');
  });
}

function allText(messages = [], extraText = '', cvExtraction = '') {
  return [
    typeof cvExtraction === 'string' ? cvExtraction : JSON.stringify(cvExtraction || {}),
    extraText,
    ...messages
      .filter(message => message?.role === 'user' || message?.role === 'candidate')
      .map(message => message?.text || ''),
  ].filter(Boolean).join('\n');
}

function parseScoreFacts(text) {
  const out = {};
  const gpa = text.match(/\bGPA\s*(?:(?:is|was|of|score)\s*)?(?::|=)?\s*(\d(?:\.\d{1,2})?)(?:\s*\/\s*([45](?:\.0)?))?/i);
  const gmat = text.match(/\bGMAT\s*(?:score\s*)?(?:(?:is|was|of)\s*)?(?::|=)?\s*(\d{3})\b/i);
  const gre = text.match(/\bGRE\s*(?:score\s*)?(?:(?:is|was|of)\s*)?(?::|=)?\s*(\d{3})\b/i);
  const sat = text.match(/\bSAT\s*(?:score\s*)?(?:(?:is|was|of)\s*)?(?::|=)?\s*(\d{3,4})\b/i);
  const act = text.match(/\bACT\s*(?:score\s*)?(?:(?:is|was|of)\s*)?(?::|=)?\s*(\d{1,2})\b/i);
  if (gpa) { out.gpa = Number(gpa[1]); out.academic = `GPA ${gpa[1]}${gpa[2] ? `/${gpa[2]}` : ''}`; }
  if (gmat) { out.gmat = Number(gmat[1]); out.testScore = `GMAT ${gmat[1]}`; }
  else if (gre) { out.gre = Number(gre[1]); out.testScore = `GRE ${gre[1]}`; }
  else if (sat) { out.sat = Number(sat[1]); out.testScore = `SAT ${sat[1]}`; }
  else if (act) { out.act = Number(act[1]); out.testScore = `ACT ${act[1]}`; }
  return out;
}

// Shared with extractWorkTimeline() below: a date range on a line describing a
// degree (education) should never be unioned into work-experience months.
const EDUCATION_LINE_PATTERN = /\b(bachelor(?:'s)?|master(?:'s)?|b\.?a\.?|b\.?sc\.?|m\.?a\.?|m\.?sc\.?|ph\.?d\.?|undergraduate degree|graduate degree|graduated from|university|college)\b/i;

function parseEducationFacts(text) {
  const education = unique(String(text || '').split(/\n+|(?<=[.!?])\s+/)
    .map(line => line.trim())
    .filter(line => EDUCATION_LINE_PATTERN.test(line))
    .filter(line => !/\b(?:target|apply|applying|recommend|interested in)\b.{0,30}\b(?:university|college)\b/i.test(line)))
    .slice(0, 8);
  return education.length ? { education, academic: education.join(' | ') } : {};
}

function parseNarrativeFacts(text) {
  const out = {};
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const why = sentences.find(s => /(?:why\s+(?:an?\s+)?mba|why\s+now|motivation\s*(?:is|:|[-–—])|mba\s+(?:because|to|will|would)|pursu(?:e|ing)\s+an?\s+mba|business school\s+(?:because|to)|(?:tools?|knowledge|network|credibility)\b.{0,80}\btransition\s+to)/i.test(s));
  const goal = sentences.find(s => /(?:post[- ]mba|after\s+(?:the\s+)?mba|short[- ]term goal|long[- ]term goal|career goal|target role|want to (?:become|move|transition|work|lead|build))/i.test(s));
  const whyNow = sentences.find(s => /(?:why\s+now|now(?:\s+is)?\s+(?:the\s+)?time|time\s+to\s+(?:move|transition)|glass\s+ceiling|market\s+(?:is\s+)?(?:too\s+)?small|after\s+.{0,100}\s+(?:deal|project).{0,50}\s+(?:closed|concluded|finished))/i.test(s));
  if (why) { out.whyMBA = why; out.narrative = why; }
  if (whyNow) {
    out.whyNow = whyNow;
    if (!out.whyMBA) out.whyMBA = whyNow;
    if (!out.narrative) out.narrative = whyNow;
  }
  if (goal) { out.postMbaGoal = goal; out.goalClarity = goal; }
  return out;
}

function parseTargetFacts(text) {
  const out = {};
  const recommendationIntent = SCHOOL_LIST_INTENT.test(text) || /want recommendations|recommend a portfolio/i.test(text);
  const namedIntent = /(?:target schools?|schools? (?:are|include)|applying to|specific schools?)/i.test(text);
  if (recommendationIntent) out.schoolChoice = 'recommendations';
  if (namedIntent) out.schoolChoice = 'specific';
  return out;
}

function parseGeographyFacts(text) {
  const value = String(text || '');
  const patterns = [
    ['USA', /(?:^|\n|\b(?:target|study|destination|considering|schools?|programs?)\s*(?:is|are|in|:|-)?\s*)(?:the\s+)?(?:usa|u\.s\.|united states)(?:\s+only)?\b/i],
    ['UK', /(?:^|\n|\b(?:target|study|destination|considering|schools?|programs?)\s*(?:is|are|in|:|-)?\s*)(?:the\s+)?(?:uk|u\.k\.|united kingdom)(?:\s+only)?\b/i],
    ['Canada', /(?:^|\n|\b(?:target|study|destination|considering|schools?|programs?)\s*(?:is|are|in|:|-)?\s*)canada(?:\s+only)?\b/i],
    ['Europe', /(?:^|\n|\b(?:target|study|destination|considering|schools?|programs?)\s*(?:is|are|in|:|-)?\s*)europe(?:\s+only)?\b/i],
    ['Global', /\b(?:open to anywhere|global portfolio|anywhere in the world)\b/i],
  ];
  const targetCountries = patterns.filter(([, pattern]) => pattern.test(value)).map(([country]) => country);
  return targetCountries.length ? { targetCountries, destination: targetCountries.join(', ') } : {};
}

function parseProgramFacts(text) {
  // The onboarding choice is often stored only in chat history. Preserve the
  // unambiguous MBA selection so a generic "Graduate" category does not route
  // the candidate through the general-master's completeness schema.
  if (/(?:^|\n)\s*MBA\s*(?:$|\n)|\b(?:targeting|applying\s+(?:to|for)|pursuing)\s+(?:an?\s+)?MBA\b/i.test(String(text || ''))) {
    return { degree: 'MBA', programType: 'MBA' };
  }
  return {};
}

function monthIndex(year, month = 1) {
  return Number(year) * 12 + Math.max(0, Number(month) - 1);
}

function parseDateToken(token, now) {
  const value = String(token || '').trim();
  if (/present|current|now/i.test(value)) return monthIndex(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const match = value.match(/(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,/-]*)?(19\d{2}|20\d{2})/i);
  if (!match) return null;
  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  return monthIndex(Number(match[2]), months[String(match[1] || '').toLowerCase()] || 1);
}

export function extractWorkTimeline(text, now = new Date()) {
  const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  const range = /((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,/-]*)?(?:19\d{2}|20\d{2}))\s*(?:[-–—]|\bto\b)\s*((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s,/-]*)?(?:19\d{2}|20\d{2})|present|current|now)/ig;
  const roles = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(range)) {
      const startMonth = parseDateToken(match[1], now);
      const endMonth = parseDateToken(match[2], now);
      if (startMonth == null || endMonth == null || endMonth <= startMonth || endMonth - startMonth > 720) continue;
      const context = [lines[index - 1], line, lines[index + 1]].filter(Boolean).join(' | ');
      const militaryPattern = /\b(idf|army|military|armed forces?|navy|air force|defen[cs]e force|national service)\b/i;
      const lineWithoutDates = line.replace(range, ' ').replace(/[|•·,;:-]/g, ' ').trim();
      const military = militaryPattern.test(line) || (!lineWithoutDates && militaryPattern.test(lines[index - 1] || ''));
      // Education/award/certification date ranges are not work experience.
      // Military service is preserved even if a line also reads as academic
      // (e.g. a service academy), matching militaryPattern's own precedence above.
      const education = !military && (
        EDUCATION_LINE_PATTERN.test(line)
        || (!lineWithoutDates && EDUCATION_LINE_PATTERN.test(lines[index - 1] || ''))
      );
      if (education) continue;
      roles.push({
        startDate: match[1], endDate: match[2], startMonth, endMonth,
        military, context,
      });
    }
  });
  const total = new Set(), military = new Set(), civilian = new Set();
  roles.forEach(role => {
    for (let month = role.startMonth; month < role.endMonth; month += 1) {
      total.add(month);
      (role.military ? military : civilian).add(month);
    }
  });
  const latest = roles.slice().sort((a, b) => b.endMonth - a.endMonth)[0];
  const current = roles.find(role => /present|current|now/i.test(role.endDate)) || latest;
  const companies = unique(roles.map(role => role.context
    .replace(range, ' ')
    .replace(/\s*[|•·]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()).filter(value => value && value.length <= 140));
  const years = months => Math.round((months / 12) * 10) / 10;
  return {
    roles,
    workMonths: total.size,
    workYears: years(total.size),
    militaryYears: years(military.size),
    civilianWorkYears: years(civilian.size),
    currentRole: current?.context || null,
    currentCompany: current?.context || null,
    companies,
    datesResolved: roles.length > 0,
  };
}

function extractEvidence(text) {
  const lines = String(text || '').split(/\n+|(?<=[.!?])\s+/).map(line => line.trim()).filter(Boolean);
  const leadershipEvidence = unique(lines.filter(line => /\b(led|managed|supervised|founded|captain|headed|mentored|directed|owned|leadership|commander|commanded|in charge of|team of \d+|\d+\s+(?:soldiers|people|staff|reports))/i.test(line))).slice(0, 8);
  const achievementsImpact = unique(lines.filter(line => /\b(achieved|increased|reduced|grew|improved|launched|built|won|awarded|promoted|saved|generated|impact)\b|\b\d+(?:\.\d+)?%/i.test(line))).slice(0, 8);
  return {
    leadershipEvidence,
    achievementsImpact,
    careerProgression: unique(lines.filter(line => /\b(promoted|promotion|progressed|advanced|senior|manager|director|head|partner|increasing responsibility)/i.test(line))).slice(0, 8),
    internationalExposure: unique(lines.filter(line => /\b(international|global|cross-border|countries|languages|multinational|overseas)/i.test(line))).slice(0, 8),
    community: unique(lines.filter(line => /\b(volunteer|community|nonprofit|ngo|extracurricular|pro bono|mentored)/i.test(line))).slice(0, 8),
  };
}

function confirmedAbsent(text, field) {
  const rules = {
    leadershipEvidence: /\b(no|without|do not have|don't have|never had)\b.{0,35}\b(leadership|led|managed)/i,
    community: /\b(no|without|do not have|don't have|never)\b.{0,35}\b(volunteer|community|extracurricular)/i,
    research: /\b(no|without|do not have|don't have|never)\b.{0,35}\bresearch/i,
    recommenders: /\b(no|without|do not have|don't have)\b.{0,35}\brecommender/i,
  };
  return rules[field]?.test(text) || false;
}

function inferredAskedFields(messages = []) {
  const assistantText = messages.filter(m => m?.role === 'ai' || m?.role === 'assistant').map(m => m.text || '').join('\n');
  const patterns = {
    workYears: /how many years|work experience|employment dates/i,
    leadershipEvidence: /leadership|when you led|managed a team/i,
    careerProgression: /promotion|career progression|increasing responsibility/i,
    achievementsImpact: /achievement|measurable impact|quantif/i,
    testScore: /gmat|gre|sat|act|test score|testing plan/i,
    academic: /gpa|grades|transcript|academic record/i,
    whyMBA: /why mba|why now/i,
    postMbaGoal: /post[- ]mba|career goal|target role/i,
    recommenders: /recommender|recommendation/i,
    research: /research experience|thesis|publication/i,
    targetSchools: /specific schools|want recommendations/i,
    // Doctoral one-at-a-time follow-ups — remembering these is what stops the
    // same research KPI being asked twice across turns.
    researchField: /research field|field of study|field of research|speciali[sz]ation/i,
    researchDirection: /research (?:interests?|direction|problems?|questions?)|problems? (?:do you want|you want) to (?:solve|work on)/i,
    postPhdGoal: /post[- ]phd|after (?:your|the) phd|academia,? or industry/i,
    targetGeography: /where do you want to study|target geography|which countr/i,
  };
  return Object.entries(patterns).filter(([, pattern]) => pattern.test(assistantText)).map(([field]) => field);
}

function fieldValue(facts, field) {
  const aliases = {
    academic: facts.academic || facts.gpa || facts.grades || facts.transcriptStatus || facts.transcript || facts.education || facts.degrees || facts.school || facts.university,
    testScore: facts.testScore || facts.gmat || facts.gre || facts.sat || facts.act || facts.tests,
    activities: facts.activities || facts.extracurriculars || facts.strongestActivity,
    subjects: facts.subjects || facts.interests || facts.favoriteSubjects || facts.interestCluster,
    achievementsImpact: facts.achievementsImpact || facts.achievements || facts.awards,
    leadershipEvidence: facts.leadershipEvidence || facts.leadership,
    careerProgression: facts.careerProgression,
    whyMBA: facts.whyMBA || facts.whyMba || facts.narrative,
    postMbaGoal: facts.postMbaGoal || facts.goals || facts.goalClarity,
    goalClarity: facts.goalClarity || facts.goals || facts.postMbaGoal,
    narrative: facts.narrative || facts.whyMBA || facts.whyMba || facts.whyNow || facts.goalClarity || facts.postMbaGoal,
    researchDirection: facts.researchDirection || facts.researchInterests || facts.goals,
    researchField: facts.researchField || facts.field || facts.specialization || facts.thesis,
    postPhdGoal: facts.postPhdGoal || facts.goalClarity || facts.postMbaGoal || facts.goals,
    currentRole: facts.currentRole || facts.role,
  };
  return aliases[field] ?? facts[field];
}

export function isAdvanceRequest(value) {
  const text = String(value || '').trim();
  return /^(?:next|continue|advance|proceed|move on)(?:\s+(?:my|the|to))?(?:\s+(?:analysis|next step|pipeline))?[.!]?$/i.test(text)
    || /(?:please\s+)?(?:advance|proceed|move)\s+(?:me\s+)?to\s+the\s+next\s+(?:step|stage)/i.test(text)
    || /continue\s+(?:with\s+)?(?:my|the)?\s*analysis/i.test(text)
    || /recommend\s+(?:me\s+)?(?:my\s+)?(?:school\s+)?portfolio/i.test(text)
    || /extract\s+(?:it\s+)?from\s+(?:the\s+|my\s+)?(?:cv|resume|résumé)/i.test(text)
    || isSchoolListRequest(text);
}

export function isSchoolListRequest(value) {
  const text = String(value || '').trim();
  return SCHOOL_LIST_INTENT.test(text)
    || /^(?:next|continue|proceed|move on)[.!]?$/i.test(text);
}

export function hasStrongProfileBaseline({ sourceTextExists = false, usefulEvidenceCount = 0 } = {}) {
  return sourceTextExists === true && Number(usefulEvidenceCount) >= 3;
}

export function buildCandidateFacts(input = {}) {
  const {
    cvExtraction = {}, extraText = '', profileSources = {}, messages = [], profile = {}, scores = {},
    candidateType, targetSchools = [], askedFields = [], now = new Date(),
  } = input;
  const sourceFileText = profileSources?.fileText || cvExtraction;
  const sourceExtraText = [
    profileSources?.pastedText,
    profileSources?.additionalText,
    extraText,
    profile?.normalizedSourceEnglish,
    profile?.candidateFacts?.normalizedSourceEnglish,
  ].filter(Boolean).join('\n\n');
  const text = allText(messages, sourceExtraText, sourceFileText);
  const blocks = profileBlocks(messages);
  const extractedObject = cvExtraction && typeof cvExtraction === 'object' ? cvExtraction : {};
  const merged = Object.assign({}, extractedObject, ...blocks, profile?.candidateFacts || {}, profile);
  Object.assign(merged, parseEducationFacts(text), parseScoreFacts(text), parseNarrativeFacts(text), parseTargetFacts(text), parseGeographyFacts(text), parseProgramFacts(text));
  const timeline = extractWorkTimeline(text, now);
  if (timeline.datesResolved) Object.assign(merged, timeline);
  const evidence = extractEvidence(text);
  for (const [key, value] of Object.entries(evidence)) {
    if (value.length) merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] : [merged[key]]), ...value]);
  }
  merged.targetSchools = unique([...(Array.isArray(merged.targetSchools) ? merged.targetSchools : []), ...targetSchools]);
  if (merged.targetSchools.length) merged.schoolChoice = 'specific';
  merged.selectedCandidateType = resolveCandidateSchemaKey(merged, candidateType);
  if (isUndergraduateProfile(merged, merged.selectedCandidateType)) Object.assign(merged, normalizeUndergradProfile({ ...merged, category: 'Undergraduate' }));
  merged.scores = scores && typeof scores === 'object' ? { ...scores } : {};
  merged.sources = {
    uploadedFileText: isKnown(profileSources?.fileText || cvExtraction),
    pastedText: isKnown(profileSources?.pastedText),
    additionalText: isKnown(profileSources?.additionalText || extraText),
    chatHistory: messages.length > 0,
    profileState: isKnown(profile),
    scores: isKnown(scores),
    selectedCandidateType: true,
    targetSchools: merged.targetSchools.length > 0,
    normalizationRequested: profileSources?.normalizeToEnglish === true,
    normalizationLanguage: profile?.normalizationLanguage || merged.normalizationLanguage || profileSources?.targetLanguage || null,
  };
  merged.sourceLanguages = unique([
    ...(Array.isArray(profile?.sourceLanguages) ? profile.sourceLanguages : [profile?.sourceLanguages]),
    ...(Array.isArray(merged.sourceLanguages) ? merged.sourceLanguages : [merged.sourceLanguages]),
  ]);
  merged.normalizationLanguage = profile?.normalizationLanguage || merged.normalizationLanguage || profileSources?.targetLanguage || null;

  const schema = getCandidateKpiSchema(merged, candidateType);
  const required = schema.requiredFacts || [];
  const optional = schema.optionalFacts || [];
  const knownFields = unique([...required, ...optional].filter(field => isKnown(fieldValue(merged, field))));
  const missingFields = required.filter(field => !isKnown(fieldValue(merged, field)) && !confirmedAbsent(text, field));
  const confirmedAbsentFields = unique([...required, ...optional].filter(field => confirmedAbsent(text, field)));
  const rememberedAsked = unique([
    ...(profile?.profileCompleteness?.askedFields || []),
    ...(merged?.profileCompleteness?.askedFields || []),
    ...askedFields,
    ...inferredAskedFields(messages),
  ]);
  const evidenceCount = required.filter(field => isKnown(fieldValue(merged, field))).length;
  const usefulEvidenceCount = [
    fieldValue(merged, 'academic'), fieldValue(merged, 'testScore'), merged.workYears,
    merged.currentRole || merged.currentCompany || merged.roles,
    fieldValue(merged, 'leadershipEvidence'), fieldValue(merged, 'careerProgression'),
    fieldValue(merged, 'achievementsImpact'), fieldValue(merged, 'whyMBA'),
    fieldValue(merged, 'postMbaGoal'), merged.research || merged.researchExperience,
    merged.activities || merged.community,
  ].filter(isKnown).length;
  const confidence = required.length ? Math.round((evidenceCount / required.length) * 100) / 100 : 0;
  const unaskedMissing = missingFields.filter(field => !rememberedAsked.includes(field));
  const latestUserText = [...messages].reverse()
    .find(message => message?.role === 'user' || message?.role === 'candidate')?.text || '';
  const userHistoryText = messages
    .filter(message => message?.role === 'user' || message?.role === 'candidate')
    .map(message => message?.text || '')
    .join('\n');
  const schoolListRequested = isSchoolListRequest(latestUserText) || SCHOOL_LIST_INTENT.test(userHistoryText);
  if (schoolListRequested) merged.schoolChoice = 'recommendations';
  const advanceRequested = isAdvanceRequest(latestUserText) || schoolListRequested;
  const sourceCoverage = merged.sourceCoverage || profile?.sourceCoverage || {};
  const sourceTextExists = isKnown(profileSources?.fileText || cvExtraction)
    || isKnown(profileSources?.pastedText)
    || isKnown(profileSources?.additionalText || extraText)
    || sourceCoverage.uploadedFileText === true
    || sourceCoverage.pastedText === true
    || sourceCoverage.additionalText === true;
  const strongProfileBaseline = hasStrongProfileBaseline({ sourceTextExists, usefulEvidenceCount });
  const explicitProgramType = merged.degree || merged.programType || merged.program;
  const isUndergrad = isUndergraduateProfile(merged, merged.selectedCandidateType);
  const programTypeKnown = isUndergrad || (isKnown(explicitProgramType)
    && !/^(?:graduate|master'?s?)$/i.test(String(explicitProgramType).trim()));
  const undergradMaturity = isUndergrad ? undergradBaseline(merged) : null;
  const targetGeographyKnown = isKnown(merged.targetCountries || merged.countries || merged.destination);
  const namedSchoolRequestWithoutNames = merged.schoolChoice === 'specific' && merged.targetSchools.length === 0;
  // Doctoral candidates get research-shaped follow-ups instead of the generic
  // MBA geography/goal pair: anything the CV already evidences (field, thesis,
  // publications) drops out here, so only genuinely missing research KPIs are
  // ever asked — and one at a time (see nextQuestionFields slice below).
  const isDoctoral = merged.selectedCandidateType === 'Postgraduate / Doctoral';
  const criticalMissingFields = isUndergrad ? undergradMaturity.missing : isDoctoral ? [
    !isKnown(fieldValue(merged, 'researchField')) ? 'researchField' : null,
    !isKnown(fieldValue(merged, 'researchDirection')) ? 'researchDirection' : null,
    !isKnown(fieldValue(merged, 'postPhdGoal')) ? 'postPhdGoal' : null,
    !targetGeographyKnown ? 'targetGeography' : null,
    !merged.schoolChoice ? 'schoolChoice' : null,
    namedSchoolRequestWithoutNames ? 'targetSchools' : null,
  ].filter(Boolean) : [
    !targetGeographyKnown ? 'targetGeography' : null,
    !isKnown(fieldValue(merged, 'postMbaGoal')) ? 'postMbaGoal' : null,
    !merged.schoolChoice ? 'schoolChoice' : null,
    namedSchoolRequestWithoutNames ? 'targetSchools' : null,
  ].filter(Boolean);
  const nextQuestionFields = criticalMissingFields.filter(field => !rememberedAsked.includes(field)).slice(0, isDoctoral ? 1 : 3);
  const checklistExhausted = (missingFields.length > 0 && unaskedMissing.length === 0)
    || (criticalMissingFields.length > 0 && nextQuestionFields.length === 0);

  merged.profileCompleteness = {
    missingFields,
    askedFields: rememberedAsked,
    knownFields,
    confirmedAbsentFields,
    criticalMissingFields,
    hasStrongProfileBaseline: strongProfileBaseline,
    evidenceCount,
    usefulEvidenceCount,
    programTypeKnown,
    confidence,
    status: missingFields.length ? 'incomplete' : 'complete',
  };
  // A candidate can explicitly move on with a partial profile. Unknown fields
  // remain incomplete and become tasks/weaknesses; they must not trap the chat.
  merged.advanceRequested = advanceRequested;
  merged.schoolListRequested = schoolListRequested;
  merged.hasStrongProfileBaseline = strongProfileBaseline;
  merged.programTypeKnown = programTypeKnown;
  merged.targetGeographyKnown = targetGeographyKnown;
  const standardReady = missingFields.length === 0 && confidence >= 0.75;
  merged.readyForScoring = isUndergrad
    ? undergradMaturity.ready
    : merged.selectedCandidateType === 'MBA'
    ? (standardReady
      || (strongProfileBaseline && evidenceCount >= 3)
      || (advanceRequested && evidenceCount >= 2)
      || (checklistExhausted && evidenceCount >= 2))
    : standardReady || ((advanceRequested || checklistExhausted) && evidenceCount >= 2);
  const recommendationPathKnown = merged.schoolChoice === 'recommendations'
    || schoolListRequested
    || (targetGeographyKnown && merged.schoolChoice !== 'specific');
  const specificPathReady = merged.schoolChoice === 'specific' && merged.targetSchools.length > 0;
  merged.readyForPrograms = isUndergrad
    ? undergradReadyForExploratoryPrograms(merged)
    : merged.readyForScoring && programTypeKnown && (recommendationPathKnown || specificPathReady);
  merged.needsMatchingFollowUp = strongProfileBaseline
    && nextQuestionFields.length > 0
    && !advanceRequested
    && !schoolListRequested;
  merged.nextMissingFields = unaskedMissing;
  merged.nextQuestionFields = nextQuestionFields;
  return merged;
}

export function buildComplementaryQuestion(candidateFacts) {
  if (candidateFacts?.schoolListRequested || candidateFacts?.advanceRequested) return '';
  const fields = (candidateFacts?.nextQuestionFields || []).slice(0, 3);
  if (!fields.length) return '';
  const prompts = {
    targetGeography: 'Target geography — where do you want to study? You can say USA, UK, Europe, or open globally.',
    postMbaGoal: 'Post-degree goal — what role and sector are you targeting immediately after the program?',
    schoolChoice: 'School path — should I recommend a portfolio, or analyze schools you already have in mind?',
    targetSchools: 'Specific schools — name the schools you want analyzed, or say “recommend my portfolio.”',
    researchField: 'Research field — what field or specialization will your PhD focus on?',
    researchDirection: 'Research interests — what problems or questions do you want to work on?',
    postPhdGoal: 'Post-PhD goal — academia, industry research, or another direction right after the PhD?',
  };
  // Doctoral follow-ups arrive one field per turn — phrase them as a single
  // direct question rather than the consolidated bullet digest.
  if (fields.length === 1 && ['researchField', 'researchDirection', 'postPhdGoal'].includes(fields[0])) {
    return `Your CV covered a lot — just one thing at a time. ${prompts[fields[0]]}`;
  }
  return `I extracted enough to move quickly. Send any of these matching details you know:\n${fields.map(field => `• ${prompts[field] || QUESTION_LABELS[field] || field}`).join('\n')}`;
}

export function candidateFactsPrompt(candidateFacts) {
  const compact = {
    selectedCandidateType: candidateFacts.selectedCandidateType,
    factualBaseline: Object.fromEntries(Object.entries(candidateFacts)
      .filter(([key, value]) => !['scores', 'sources', 'roles', 'nextMissingFields'].includes(key) && isKnown(value))),
    sources: candidateFacts.sources,
    profileCompleteness: candidateFacts.profileCompleteness,
    readyForScoring: candidateFacts.readyForScoring,
    readyForPrograms: candidateFacts.readyForPrograms,
    advanceRequested: candidateFacts.advanceRequested,
    hasStrongProfileBaseline: candidateFacts.hasStrongProfileBaseline,
    needsMatchingFollowUp: candidateFacts.needsMatchingFollowUp,
    nextQuestionFields: candidateFacts.nextQuestionFields,
  };
  return [
    'TRUSTED CANDIDATE FACTS (authoritative):',
    JSON.stringify(compact),
    'Use this same object for advising, scoring, and program generation.',
    'The uploaded file, pasted text, and additional text are one baseline. If any source is not English, translate its full meaning to English before extracting, checking completeness, scoring, or matching.',
    'Never ask for a knownFields item. After a source-backed profile, ask at most one consolidated matching-critical follow-up using nextQuestionFields, with no more than three compact bullets.',
    'Postgraduate / Doctoral candidates instead get ONE research question per turn: nextQuestionFields carries exactly one missing research KPI at a time (field, interests, post-PhD goal, then geography/school path). Ask only that question, never re-ask anything the CV already answered, and stop as soon as nextQuestionFields is empty.',
    'Unknown evidence is incomplete, never weak or zero. Only confirmedAbsentFields may receive a low score.',
    'When readyForScoring is true and needsMatchingFollowUp is false, emit PROFILE, SCORES, STRENGTHS, WEAKNESSES, and TASKS now. Unknown optional evidence becomes a gap/task, never another blocking question.',
    'When readyForPrograms is true and the candidate asks for schools, emit PROGRAMS immediately with at least 10 programs. Missing geography defaults to a global top-fit portfolio and becomes a TASK.',
  ].join('\n');
}

export function stripStructuredBlocks(raw, tags = []) {
  return tags.reduce((value, tag) => value.replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi'), ''), String(raw || '')).trim();
}
