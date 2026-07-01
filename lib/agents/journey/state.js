import { getStore } from '../../store.js';

// Redis key: journey:grad:{candidateId}
// TTL: 90 days (journey spans weeks)
const TTL = 86400 * 90;

export const STAGES = [
  'intake',
  'profile',
  'analysis',
  'portfolio',
  'narrative',
  'cv',
  'essays',
  'interview',
];

const DEFAULT_STATE = {
  stage: 'intake',
  category: null,
  name: null,
  collected: {},
  chosenSchools: [],
  portfolio: null,
  narrative: null,
  portfolioShown: false,
};

function key(candidateId) {
  return `journey:grad:${candidateId}`;
}

export async function getJourneyState(candidateId) {
  try {
    const raw = await getStore().get(key(candidateId));
    if (!raw) return { ...DEFAULT_STATE };
    return typeof raw === 'object' ? { ...DEFAULT_STATE, ...raw } : { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function setJourneyState(candidateId, updates) {
  const current = await getJourneyState(candidateId);
  const next = { ...current, ...updates };
  await getStore().set(key(candidateId), JSON.stringify(next), { ex: TTL });
  return next;
}

export async function advanceStage(candidateId, toStage) {
  const current = await getJourneyState(candidateId);
  const currentIdx = STAGES.indexOf(current.stage);
  const targetIdx = STAGES.indexOf(toStage);
  if (targetIdx <= currentIdx) return current;
  return setJourneyState(candidateId, { stage: toStage });
}

export async function clearJourneyState(candidateId) {
  await getStore().del(key(candidateId));
}
