import { getStore } from '../../store.js';

const TTL_SECONDS = 86400 * 90;

export const STAGES = ['intake', 'profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'];

export const DEFAULT_JOURNEY = Object.freeze({
  category: null,
  subtype: null,
  name: null,
  collected: {},
  flags: {
    profileConfirmed: false,
    scoresEmitted: false,
    programsShown: false,
    chosenSchools: [],
    narrativeChoice: null,
    stage: 'intake',
  },
  history: [],
  updatedAt: null,
});

const cloneDefault = () => ({
  ...DEFAULT_JOURNEY,
  collected: {},
  flags: { ...DEFAULT_JOURNEY.flags, chosenSchools: [] },
  history: [],
});

const key = (candidateId) => `journey:${candidateId}`;

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const output = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [field, value] of Object.entries(patch)) {
    output[field] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(output[field], value)
      : value;
  }
  return output;
}

function parseStored(raw) {
  if (!raw) return cloneDefault();
  const value = typeof raw === 'object' ? raw : JSON.parse(raw);
  return {
    ...cloneDefault(),
    ...value,
    collected: { ...(value.collected || {}) },
    flags: { ...DEFAULT_JOURNEY.flags, ...(value.flags || {}) },
    history: Array.isArray(value.history) ? value.history : [],
  };
}

export async function getJourney(candidateId) {
  try {
    return parseStored(await getStore().get(key(candidateId)));
  } catch {
    return cloneDefault();
  }
}

export async function patchJourney(candidateId, patch = {}) {
  const current = await getJourney(candidateId);
  const next = {
    ...current,
    ...patch,
    collected: deepMerge(current.collected, patch.collected || {}),
    flags: deepMerge(current.flags, patch.flags || {}),
    history: patch.history === undefined ? current.history : patch.history,
    updatedAt: new Date().toISOString(),
  };
  await getStore().set(key(candidateId), JSON.stringify(next), { ex: TTL_SECONDS });
  return next;
}

export async function advanceJourneyStage(candidateId, targetStage) {
  const current = await getJourney(candidateId);
  const currentIndex = STAGES.indexOf(current.flags.stage);
  const targetIndex = STAGES.indexOf(targetStage);
  if (targetIndex < 0 || targetIndex <= currentIndex) return current;
  return patchJourney(candidateId, { flags: { stage: targetStage } });
}

export async function resetJourney(candidateId) {
  await getStore().del(key(candidateId));
  return cloneDefault();
}

// Compatibility exports for callers that predate the final journey shape.
export const getJourneyState = getJourney;
export const setJourneyState = patchJourney;
export const advanceStage = advanceJourneyStage;
export const clearJourneyState = resetJourney;
