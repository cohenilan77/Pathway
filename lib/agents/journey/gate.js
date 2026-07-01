import { getJourney, patchJourney } from './state.js';

export const CATEGORY_QUESTION = "Welcome! Let's start with where you are in your journey. Which best describes you? -> Undergraduate | Graduate | Postgraduate / Doctoral | Personal Development";

const CATEGORY_MAP = new Map([
  ['undergraduate', 'Undergraduate'],
  ['graduate', 'Graduate'],
  ['postgraduate / doctoral', 'Postgraduate / Doctoral'],
  ['postgraduate/doctoral', 'Postgraduate / Doctoral'],
  ['doctoral', 'Postgraduate / Doctoral'],
  ['phd', 'Postgraduate / Doctoral'],
  ['personal development', 'Personal Development'],
]);

export function normalizeJourneyCategory(value) {
  return CATEGORY_MAP.get(String(value || '').trim().toLowerCase()) || null;
}

export function isAdaptiveCategory(category) {
  return category === 'Graduate' || category === 'Postgraduate / Doctoral';
}

export async function runJourneyGate(candidateId, message) {
  const journey = await getJourney(candidateId);
  if (journey.category) {
    return { action: isAdaptiveCategory(journey.category) ? 'adaptive' : 'legacy', category: journey.category, journey };
  }

  const category = normalizeJourneyCategory(message);
  if (!category) return { action: 'ask', text: CATEGORY_QUESTION, journey };

  const updated = await patchJourney(candidateId, {
    category,
    flags: { stage: isAdaptiveCategory(category) ? 'profile' : 'intake' },
    history: [...journey.history, { type: 'category', value: category, at: new Date().toISOString() }],
  });
  return { action: isAdaptiveCategory(category) ? 'adaptive' : 'legacy', category, journey: updated };
}

export function narrativeGateCheck(state) {
  if (state?.flags?.programsShown !== true) {
    return { allowed: false, reason: 'The school list must be shown before narrative. Call build_portfolio first.' };
  }
  return { allowed: true, reason: null };
}
