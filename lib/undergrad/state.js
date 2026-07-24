// Undergrad Rail v2 — state module.
//
// This is the "fixed grade rail" state model: PHASE from current grade,
// MODE frozen at signup, COVERAGE of what we know, and the SPIKE ladder.
// The Track agent (track-agent.js) is the SOLE author of coverage/spike;
// nothing else writes those fields.
//
// Storage is the shared app store (Upstash Redis in prod, file store in dev)
// via getStore(). loadState/saveState accept an optional store handle so
// callers can inject one in tests; they default to getStore().
import { getStore } from '../store.js';

export const PHASES = ['Y10', 'Y11', 'Y12'];
export const MODES  = ['build', 'compressed', 'salvage'];
export const SPIKE_LADDER = ['unknown', 'candidates', 'named', 'deepening', 'presentable'];
export const COVERAGE_DIMENSIONS = ['subjects', 'grades', 'activities', 'interests', 'goals', 'tasks'];

export const STALENESS_DAYS = {
  grades: 120, activities: 180, subjects: 365,
  interests: 180, goals: 240, tasks: 30,
};

const stateKey = userId => `user:${userId}:undergrad`;
export const ACTIVE_SET_KEY = 'undergrad:active';

export function emptyState(userId, name, entryGrade) {
  return {
    userId, name, candidateType: 'undergrad',

    // (1) PHASE — from CURRENT grade. Exogenous. Never inferred from progress.
    currentGrade: entryGrade,
    phase: gradeToPhase(entryGrade),

    // (2) MODE — from ENTRY grade. Set ONCE at signup. Frozen forever.
    entryGrade,
    mode: entryGradeToMode(entryGrade),

    // (3) COVERAGE — what we actually know
    coverage: Object.fromEntries(COVERAGE_DIMENSIONS.map(d => [d, {
      facts: [],        // [{ value, confidence, provenance, source, at }]
      confidence: 0,
      lastUpdated: null,
    }])),

    // (4) SPIKE — the real forward ladder
    spike: { stage: 'unknown', candidates: [], named: null, evidence: [], lastMovedAt: null },

    openTasks: [],
    flags: [],
    sessions: [],
    lastSessionSummary: null,
    lastActivityAt: null,
    nudges: { lastSentAt: null, lastQuestion: null, unanswered: 0 },
    createdAt: new Date().toISOString(),
  };
}

export function gradeToPhase(grade) {
  const g = Number(String(grade).replace(/\D/g, ''));
  if (g <= 10) return 'Y10';
  if (g === 11) return 'Y11';
  return 'Y12';
}

/**
 * MODE is frozen at signup. This is the field that stops the agent talking to a
 * Y12 joiner as though you'd built a spike together since Y10.
 */
export function entryGradeToMode(entryGrade) {
  const g = Number(String(entryGrade).replace(/\D/g, ''));
  if (g <= 10) return 'build';        // full arc — grow the spike
  if (g === 11) return 'compressed';  // 2 yrs — rapid audit, straight to naming
  return 'salvage';                   // ~6 mo — find & frame what exists
}

export async function loadState(userId, store = getStore()) {
  const raw = await store.get(stateKey(userId));
  if (!raw) return null;
  // Redis.fromEnv() auto-deserializes JSON; the file store returns the stored
  // value as-is. Handle both a parsed object and a raw JSON string.
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function saveState(state, store = getStore()) {
  state.updatedAt = new Date().toISOString();
  await store.set(stateKey(state.userId), JSON.stringify(state));
  await store.sadd(ACTIVE_SET_KEY, state.userId);
  return state;
}

export const daysSince = iso => iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity;
export const isStale = (dim, at) => daysSince(at) > (STALENESS_DAYS[dim] || 180);
