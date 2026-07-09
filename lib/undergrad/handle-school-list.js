// 2026-07-09 emergency hotfix: deterministic handler for undergrad
// school-list requests ("show me schools", "which schools should I look
// at", etc.). Bypasses the LLM entirely for the core matching — see
// lib/hybrid-coordinator.js's looksLikeUndergradSchoolListRequest check,
// which routes matching turns here instead of the grad-shaped AdvisorAgent
// <PROGRAMS> flow that previously looped on fabricated dead chips.
import { matchUndergradSchools } from './known-schools.js';
import { formatOptionsAsArrowPipe } from '../agents/tools/respond-with-options.js';
import { pushTopic } from './stage-tracker.js';

const HOTFIX_SOURCE_TAG = 'hotfix_school_list';

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

export async function handleUndergradSchoolListRequest(candidateId, message, candidateState = {}) {
  const profile = candidateState.profile || {};

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
