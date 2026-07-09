// 2026-07-09 emergency hotfix: deterministic handler for undergrad
// school-list requests ("show me schools", "which schools should I look
// at", etc.). Bypasses the LLM entirely for the core matching — see
// lib/hybrid-coordinator.js's looksLikeUndergradSchoolListRequest check,
// which routes matching turns here instead of the grad-shaped AdvisorAgent
// <PROGRAMS> flow that previously looped on fabricated dead chips.
import { matchUndergradSchools } from './known-schools.js';
import { formatOptionsAsArrowPipe } from '../agents/tools/respond-with-options.js';
import { pushTopic } from './stage-tracker.js';
import { updateCandidateProfile } from '../agents/tools/update.js';

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
  if (hints.intendedMajorHint && profile.intendedMajor == null) patch.intendedMajor = hints.intendedMajorHint;
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

  if (!profile.grade) {
    return turn({
      message: 'Quick question first — what grade are you in? That shapes the whole list.',
      options: ['9th', '10th', '11th', '12th'],
      statePatch: { profile: withTopic(profile, `${HOTFIX_SOURCE_TAG}:missing_grade`) },
      metadata: { reason: 'missing_grade' },
    });
  }
  if (!profile.intendedMajor) {
    return turn({
      message: 'What area are you most interested in? That helps me pick the right schools.',
      options: ['CS / Software', 'Engineering', 'Life Sciences', 'Humanities', 'Business', 'Not sure yet'],
      statePatch: { profile: withTopic(profile, `${HOTFIX_SOURCE_TAG}:missing_major`) },
      metadata: { reason: 'missing_major' },
    });
  }

  const existingPrograms = Array.isArray(candidateState.programs) ? candidateState.programs : [];
  if (existingPrograms.some(p => p.sourceTag === HOTFIX_SOURCE_TAG)) {
    return turn({
      message: 'You already have a school list — want me to filter it (region, size, track team), or explain any of the schools on it?',
      options: ['Filter by region', 'Add track team priority', 'Explain a school', 'Looks good for now'],
      statePatch: Object.keys(profilePatch).length ? { profile } : {},
      metadata: { reason: 'already_has_list' },
    });
  }

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
  });

  const byTier = { reach: [], target: [], likely: [] };
  for (const school of matches) byTier[school.tier]?.push(school.name);

  const intro = `Based on grade ${profile.grade}${profile.intendedMajor ? `, ${profile.intendedMajor} focus` : ''}${profile.gpa ? `, GPA ${profile.gpa}` : ''}${profile.satScore ? `, SAT ${profile.satScore}` : ''}, here's a starting list:`;
  const lines = [
    intro,
    byTier.reach.length ? `Reach: ${byTier.reach.join(', ')}` : null,
    byTier.target.length ? `Target: ${byTier.target.join(', ')}` : null,
    byTier.likely.length ? `Likely: ${byTier.likely.join(', ')}` : null,
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
    programGroup: 'Undergraduate',
    sourceTag: HOTFIX_SOURCE_TAG,
  }));

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
