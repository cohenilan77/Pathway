import { getCandidateKpiSchema, resolveCandidateSchemaKey } from './candidate-kpi-schemas.js';

const EMPTY = new Set(['', 'unknown', 'n/a', 'na', 'not sure', 'tbd', 'null', 'undefined']);
const QUESTION_LABELS = {
  grade: 'current grade', curriculum: 'curriculum', academic: 'GPA or academic record',
  activities: 'activities', intendedMajor: 'intended major', workYears: 'work experience dates',
  leadershipEvidence: 'leadership example and outcome', careerProgression: 'career progression',
  achievementsImpact: 'achievements or measurable impact', testScore: 'test score or testing plan',
  whyMBA: 'why MBA and why now', postMbaGoal: 'post-MBA goal', degree: 'target degree',
  goalClarity: 'target role or academic goal', narrative: 'motivation and narrative',
  research: 'research experience', researchDirection: 'research direction',
  recommenders: 'recommenders', currentRole: 'current role',
};

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
  const gpa = text.match(/\bGPA\s*(?:of|:|=)?\s*(\d(?:\.\d{1,2})?)(?:\s*\/\s*([45](?:\.0)?))?/i);
  const gmat = text.match(/\bGMAT\s*(?:score\s*)?(?:of|:|=)?\s*(\d{3})\b/i);
  const gre = text.match(/\bGRE\s*(?:score\s*)?(?:of|:|=)?\s*(\d{3})\b/i);
  const sat = text.match(/\bSAT\s*(?:score\s*)?(?:of|:|=)?\s*(\d{3,4})\b/i);
  const act = text.match(/\bACT\s*(?:score\s*)?(?:of|:|=)?\s*(\d{1,2})\b/i);
  if (gpa) { out.gpa = Number(gpa[1]); out.academic = `GPA ${gpa[1]}${gpa[2] ? `/${gpa[2]}` : ''}`; }
  if (gmat) { out.gmat = Number(gmat[1]); out.testScore = `GMAT ${gmat[1]}`; }
  else if (gre) { out.gre = Number(gre[1]); out.testScore = `GRE ${gre[1]}`; }
  else if (sat) { out.sat = Number(sat[1]); out.testScore = `SAT ${sat[1]}`; }
  else if (act) { out.act = Number(act[1]); out.testScore = `ACT ${act[1]}`; }
  return out;
}

function parseNarrativeFacts(text) {
  const out = {};
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const why = sentences.find(s => /(?:why\s+(?:an?\s+)?mba|mba\s+(?:because|to|will|would)|pursu(?:e|ing)\s+an?\s+mba|business school\s+(?:because|to))/i.test(s));
  const goal = sentences.find(s => /(?:post[- ]mba|after\s+(?:the\s+)?mba|short[- ]term goal|long[- ]term goal|career goal|target role|want to (?:become|move|transition|work|lead|build))/i.test(s));
  if (why) { out.whyMBA = why; out.narrative = why; }
  if (goal) { out.postMbaGoal = goal; out.goalClarity = goal; }
  return out;
}

function parseTargetFacts(text) {
  const out = {};
  const recommendationIntent = /(?:recommend|suggest|build|generate).{0,30}(?:schools|programs|portfolio)|want recommendations|recommend a portfolio/i.test(text);
  const namedIntent = /(?:target schools?|schools? (?:are|include)|applying to|specific schools?)/i.test(text);
  if (recommendationIntent) out.schoolChoice = 'recommendations';
  if (namedIntent) out.schoolChoice = 'specific';
  return out;
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
  const leadershipEvidence = unique(lines.filter(line => /\b(led|managed|supervised|founded|captain|headed|mentored|directed|owned|leadership|team of \d+)/i.test(line))).slice(0, 8);
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
  };
  return Object.entries(patterns).filter(([, pattern]) => pattern.test(assistantText)).map(([field]) => field);
}

function fieldValue(facts, field) {
  const aliases = {
    academic: facts.academic || facts.gpa || facts.grades,
    testScore: facts.testScore || facts.gmat || facts.gre || facts.sat || facts.act || facts.tests,
    activities: facts.activities || facts.extracurriculars,
    achievementsImpact: facts.achievementsImpact || facts.achievements || facts.awards,
    leadershipEvidence: facts.leadershipEvidence || facts.leadership,
    careerProgression: facts.careerProgression,
    whyMBA: facts.whyMBA || facts.whyMba || facts.narrative,
    postMbaGoal: facts.postMbaGoal || facts.goals || facts.goalClarity,
    goalClarity: facts.goalClarity || facts.goals || facts.postMbaGoal,
    researchDirection: facts.researchDirection || facts.goals,
    currentRole: facts.currentRole || facts.role,
  };
  return aliases[field] ?? facts[field];
}

export function buildCandidateFacts(input = {}) {
  const {
    cvExtraction = {}, extraText = '', messages = [], profile = {}, scores = {},
    candidateType, targetSchools = [], askedFields = [], now = new Date(),
  } = input;
  const text = allText(messages, extraText, cvExtraction);
  const blocks = profileBlocks(messages);
  const extractedObject = cvExtraction && typeof cvExtraction === 'object' ? cvExtraction : {};
  const merged = Object.assign({}, extractedObject, ...blocks, profile?.candidateFacts || {}, profile);
  Object.assign(merged, parseScoreFacts(text), parseNarrativeFacts(text), parseTargetFacts(text));
  const timeline = extractWorkTimeline(text, now);
  if (timeline.datesResolved) Object.assign(merged, timeline);
  const evidence = extractEvidence(text);
  for (const [key, value] of Object.entries(evidence)) {
    if (value.length) merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] : [merged[key]]), ...value]);
  }
  merged.targetSchools = unique([...(Array.isArray(merged.targetSchools) ? merged.targetSchools : []), ...targetSchools]);
  if (merged.targetSchools.length) merged.schoolChoice = 'specific';
  merged.selectedCandidateType = resolveCandidateSchemaKey(merged, candidateType);
  merged.scores = scores && typeof scores === 'object' ? { ...scores } : {};
  merged.sources = {
    cvExtraction: isKnown(cvExtraction), extraText: isKnown(extraText),
    chatHistory: messages.length > 0, profileState: isKnown(profile),
    scores: isKnown(scores), selectedCandidateType: true, targetSchools: merged.targetSchools.length > 0,
  };

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
  const confidence = required.length ? Math.round((evidenceCount / required.length) * 100) / 100 : 0;
  const unaskedMissing = missingFields.filter(field => !rememberedAsked.includes(field));

  merged.profileCompleteness = {
    missingFields,
    askedFields: rememberedAsked,
    knownFields,
    confirmedAbsentFields,
    confidence,
    status: missingFields.length ? 'incomplete' : 'complete',
  };
  merged.readyForScoring = missingFields.length === 0 && confidence >= 0.75;
  merged.readyForPrograms = merged.readyForScoring && ['specific', 'recommendations'].includes(merged.schoolChoice);
  merged.nextMissingFields = unaskedMissing;
  return merged;
}

export function buildComplementaryQuestion(candidateFacts) {
  const fields = candidateFacts?.nextMissingFields || [];
  if (!fields.length) return '';
  const items = fields.map(field => QUESTION_LABELS[field] || field).join('; ');
  return `Before I finalize your score, please fill in only these missing items: ${items}.`;
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
  };
  return [
    'TRUSTED CANDIDATE FACTS (authoritative):',
    JSON.stringify(compact),
    'Use this same object for advising, scoring, and program generation.',
    'Never ask for a knownFields item. Ask nextMissingFields once as one complementary checklist.',
    'Unknown evidence is incomplete, never weak or zero. Only confirmedAbsentFields may receive a low score.',
    'Do not emit SCORES until readyForScoring is true. Do not emit PROGRAMS until readyForPrograms is true.',
    'Before programs, ask exactly: “Do you already have specific schools, or do you want recommendations?” unless schoolChoice is already known.',
  ].join('\n');
}

export function stripStructuredBlocks(raw, tags = []) {
  return tags.reduce((value, tag) => value.replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi'), ''), String(raw || '')).trim();
}
