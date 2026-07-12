// 2026-07-09 emergency hotfix: deterministic handler for undergrad
// school-list requests ("show me schools", "which schools should I look
// at", etc.). Bypasses the LLM entirely for the core matching — see
// lib/hybrid-coordinator.js's looksLikeUndergradSchoolListRequest check,
// which routes matching turns here instead of the grad-shaped AdvisorAgent
// <PROGRAMS> flow that previously looped on fabricated dead chips.
import { matchUndergradSchools, UNDERGRAD_SCHOOLS } from './known-schools.js';
import { formatOptionsAsArrowPipe } from '../agents/tools/respond-with-options.js';
import { pushTopic } from './stage-tracker.js';
import { updateCandidateProfile } from '../agents/tools/update.js';
import { getCachedScholarships } from '../scholarships/scholarship-cache.js';

const HOTFIX_SOURCE_TAG = 'hotfix_school_list';

// Cheap regex extraction — not an LLM call — so a kid who mentions their
// grade/SAT/GPA/major in the SAME message (or a handful of turns) as their
// school-list request doesn't get asked for it again next turn, closing the
// "40 turns, nothing saved" gap this specific flow used to have.
const SAT_RE = /SAT\s*(?:score\s*)?(?:around\s*|of\s*|is\s*)?(1[0-6]\d{2})/i;
const ACT_RE = /ACT\s*(?:score\s*)?(?:around\s*|of\s*|is\s*)?(\d{1,2})\b/i;
const GPA_RE = /GPA\s*(?:around\s*|of\s*|is\s*)?(\d(?:\.\d{1,2})?)/i;
const GRADE_RE = /\b(9|10|11|12)(?:th|st|nd|rd)?\s*grade\b/i;
const TARGET_TERM_RE = /Fall\s*20(2[6-9]|3\d)/i;
const CS_INTEREST_RE = /coding|programming|computer science|software/i;
const LIFE_SCIENCES_INTEREST_RE = /biology|life sciences?|pre-?med|medicine|health|neuroscience|biomedical|environmental science|sustainability/i;
const ENGINEERING_INTEREST_RE = /engineering|building things|robotics/i;
const BUSINESS_INTEREST_RE = /business|finance|economics|entrepreneur/i;
const HUMANITIES_INTEREST_RE = /humanities|english|writing|history|political science|social science/i;
const LARGE_RESEARCH_RE = /large research universit|big research universit|research universit/i;
const US_ANYWHERE_RE = /anywhere in (?:the )?(?:us|u\.s\.|usa|united states)|open anywhere in (?:the )?(?:us|u\.s\.|usa|united states)/i;
const AID_RE = /affordability|financial aid|need aid|scholarship|merit aid|don't want debt|do not want debt/i;

function academicInterestFromValue(value) {
  const text = Array.isArray(value) ? value.join(' ') : String(value || '');
  if (CS_INTEREST_RE.test(text)) return 'Computer Science';
  if (LIFE_SCIENCES_INTEREST_RE.test(text)) return 'Life Sciences';
  if (ENGINEERING_INTEREST_RE.test(text)) return 'Engineering';
  if (BUSINESS_INTEREST_RE.test(text)) return 'Business';
  if (HUMANITIES_INTEREST_RE.test(text)) return 'Humanities';
  return '';
}

function extractProfileHints(texts) {
  const hints = {};
  for (const text of texts) {
    const t = String(text || '');
    const sat = t.match(SAT_RE);
    if (sat) hints.satScore = Number(sat[1]);
    const act = t.match(ACT_RE);
    if (act && Number(act[1]) >= 1 && Number(act[1]) <= 36) hints.actScore = Number(act[1]);
    const gpa = t.match(GPA_RE);
    if (gpa) hints.gpa = Number(gpa[1]);
    const grade = t.match(GRADE_RE);
    if (grade) hints.grade = grade[1];
    const term = t.match(TARGET_TERM_RE);
    if (term) hints.targetTerm = `Fall 20${term[1]}`;
    if (CS_INTEREST_RE.test(t)) hints.intendedMajorHint = 'Computer Science';
    if (LIFE_SCIENCES_INTEREST_RE.test(t)) hints.intendedMajorHint = 'Life Sciences';
    if (ENGINEERING_INTEREST_RE.test(t)) hints.intendedMajorHint = 'Engineering';
    if (BUSINESS_INTEREST_RE.test(t)) hints.intendedMajorHint = 'Business';
    if (HUMANITIES_INTEREST_RE.test(t)) hints.intendedMajorHint = 'Humanities';
    if (LARGE_RESEARCH_RE.test(t)) hints.universityStyle = 'Large research university';
    if (US_ANYWHERE_RE.test(t)) hints.countries = ['USA'];
    if (AID_RE.test(t)) hints.affordabilityPreference = 'Affordability / financial aid';
  }
  return hints;
}

// Only fills fields the profile doesn't already have — idempotent, never
// overwrites a real saved value with a regex guess.
function missingFieldPatch(profile, hints) {
  const patch = {};
  if (hints.grade && profile.grade == null) patch.grade = hints.grade;
  if (hints.gpa != null && profile.gpa == null) patch.gpa = hints.gpa;
  if (hints.satScore != null && profile.satScore == null) patch.satScore = hints.satScore;
  if (hints.actScore != null && profile.actScore == null) patch.actScore = hints.actScore;
  if (hints.targetTerm && profile.targetTerm == null) patch.targetTerm = hints.targetTerm;
  const existingInterest = academicInterestFromValue(profile.intendedMajor || profile.subjects || profile.interests || profile.pathwayType);
  if ((hints.intendedMajorHint || existingInterest) && profile.intendedMajor == null) {
    patch.intendedMajor = hints.intendedMajorHint || existingInterest;
  }
  if (hints.universityStyle && profile.universityStyle == null) patch.universityStyle = hints.universityStyle;
  if (hints.countries && profile.countries == null) patch.countries = hints.countries;
  if (hints.affordabilityPreference && profile.affordabilityPreference == null) patch.affordabilityPreference = hints.affordabilityPreference;
  return patch;
}

function turn({ message, options = [], statePatch = {}, metadata = {} }) {
  return {
    agent: 'UndergradSchoolList',
    message: formatOptionsAsArrowPipe({ message, options }),
    statePatch,
    metadata: { source: HOTFIX_SOURCE_TAG, ...metadata },
  };
}

function withTopic(profile, topic) {
  const lastTopics = Array.isArray(profile.undergradStageTracker?.lastTopics) ? profile.undergradStageTracker.lastTopics : [];
  return { ...profile, undergradStageTracker: { lastTopics: pushTopic(lastTopics, topic) } };
}

function logSchoolListTurn(candidateId, details = {}) {
  console.info('[undergrad-school-list]', {
    candidateId,
    intent: 'school_list',
    toolsAttempted: ['deterministic_school_matcher'],
    factsSaved: details.factsSaved || [],
    programsSavedCount: details.programsSavedCount || 0,
    finalResponse: details.finalResponse || 'question',
    reason: details.reason || '',
  });
}

export async function handleUndergradSchoolListRequest(candidateId, message, candidateState = {}, conversationHistory = []) {
  const rawProfile = candidateState.profile || {};

  // Scan the current message plus a handful of recent turns (oldest first,
  // current message last so it wins on conflicting mentions) for cheap
  // regex-extractable facts, and merge in only what the profile doesn't
  // already have. Persisted via the same updateCandidateProfile the rest of
  // the app uses; the canonical read path (candidateState.profile) is kept
  // in sync through the statePatch this function returns below.
  const recentTexts = [...conversationHistory.slice(-8).map(h => h?.text), message];
  const hints = extractProfileHints(recentTexts);
  const profilePatch = missingFieldPatch(rawProfile, hints);
  if (Object.keys(profilePatch).length) {
    await updateCandidateProfile(candidateId, profilePatch).catch(() => {});
  }
  const profile = { ...rawProfile, ...profilePatch };
  const factsSaved = Object.keys(profilePatch);

  if (!profile.grade) {
    logSchoolListTurn(candidateId, { factsSaved, reason: 'missing_grade', finalResponse: 'question' });
    return turn({
      message: 'Quick question first — what grade are you in? That shapes the whole list.',
      options: ['9th', '10th', '11th', '12th'],
      statePatch: { profile: withTopic(profile, `${HOTFIX_SOURCE_TAG}:missing_grade`) },
      metadata: { reason: 'missing_grade' },
    });
  }
  if (!profile.intendedMajor) {
    logSchoolListTurn(candidateId, { factsSaved, reason: 'missing_major', finalResponse: 'question' });
    return turn({
      message: 'What area are you most interested in? That helps me pick the right schools.',
      options: ['CS / Software', 'Engineering', 'Life Sciences', 'Humanities', 'Business', 'Not sure yet'],
      statePatch: { profile: withTopic(profile, `${HOTFIX_SOURCE_TAG}:missing_major`) },
      metadata: { reason: 'missing_major' },
    });
  }

  const existingPrograms = Array.isArray(candidateState.programs) ? candidateState.programs : [];
  if (existingPrograms.some(p => p.sourceTag === HOTFIX_SOURCE_TAG)) {
    logSchoolListTurn(candidateId, { factsSaved, programsSavedCount: 0, reason: 'already_has_list', finalResponse: 'action' });
    return turn({
      message: 'You already have a school list — want me to filter it (region, size, track team), or explain any of the schools on it?',
      options: ['Filter by region', 'Add track team priority', 'Explain a school', 'Looks good for now'],
      statePatch: Object.keys(profilePatch).length ? { profile } : {},
      metadata: { reason: 'already_has_list' },
    });
  }

  // Cache-only lookup (no live web_search here — that would make school-list
  // generation slow/expensive on every request). Real scholarship data for
  // a school only appears once someone has actually searched for it via
  // lookup_scholarships/cache_scholarship_results (chat, either track) — see
  // lib/scholarships/scholarship-cache.js. Nothing here ever fabricates.
  const scholarshipEntries = await Promise.all(
    UNDERGRAD_SCHOOLS.map(async school => {
      const { found, scholarships } = await getCachedScholarships({ schoolName: school.name });
      return [school.name, found ? scholarships[0] : null];
    }),
  );
  const scholarshipCache = Object.fromEntries(scholarshipEntries.filter(([, entry]) => entry));

  const matches = matchUndergradSchools({
    grade: profile.grade,
    intendedMajor: profile.intendedMajor,
    gpa: profile.gpa,
    satScore: profile.satScore,
    actScore: profile.actScore,
    targetRegions: profile.targetRegions || profile.countries,
    activities: profile.activities,
    hasNCAATrackInterest: /track|cross.?country|running/i.test(String(profile.activities || '')),
    sizeTier: profile.sizeTier,
    setting: profile.setting,
    affordabilityPreference: profile.affordabilityPreference,
  }, { scholarshipCache });

  const byTier = { reach: [], target: [], likely: [] };
  for (const school of matches) byTier[school.tier]?.push(school.name);

  const gradeNumber = Number(String(profile.grade || '').replace(/\D/g, ''));
  const listLabel = gradeNumber && gradeNumber <= 10 ? 'an early exploratory starting list' : 'a starting list';
  const intro = `Based on grade ${profile.grade}${profile.intendedMajor ? `, ${profile.intendedMajor} focus` : ''}${profile.gpa ? `, GPA ${profile.gpa}` : ''}${profile.satScore ? `, SAT ${profile.satScore}` : ''}, here's ${listLabel}:`;
  const scholarshipCallouts = matches.filter(school => school.scholarshipNote).map(school => `${school.name}: ${school.scholarshipNote}`);
  const lines = [
    intro,
    byTier.reach.length ? `Reach: ${byTier.reach.join(', ')}` : null,
    byTier.target.length ? `Target: ${byTier.target.join(', ')}` : null,
    byTier.likely.length ? `Likely: ${byTier.likely.join(', ')}` : null,
    scholarshipCallouts.length ? `💰 ${scholarshipCallouts.join(' ')}` : null,
    'Full list with details is on your Schools tab. Want me to explain any of these, or add filters (region, size, track team)?',
  ].filter(Boolean);

  const programs = matches.map(school => ({
    name: school.name,
    location: school.location,
    tier: school.tier,
    fit: school.fit,
    admissionStatus: school.admissionStatus,
    notes: school.reasonWhy,
    selectivitySource: school.selectivitySource,
    admitRate: school.admitRate,
    admitRateSource: school.admitRateSource,
    scholarshipNote: school.scholarshipNote || null,
    programGroup: 'Undergraduate',
    sourceTag: HOTFIX_SOURCE_TAG,
  }));

  logSchoolListTurn(candidateId, { factsSaved, programsSavedCount: programs.length, finalResponse: 'action' });
  return turn({
    message: lines.join(' '),
    options: [`Tell me about ${matches[0]?.name || 'a school'}`, 'Filter by region', 'Add track team priority', 'Looks good for now'],
    statePatch: {
      profile: withTopic(profile, HOTFIX_SOURCE_TAG),
      programs,
    },
    metadata: {
      schoolCount: matches.length,
      tierMix: { reach: byTier.reach.length, target: byTier.target.length, likely: byTier.likely.length },
    },
  });
}

export { HOTFIX_SOURCE_TAG };
