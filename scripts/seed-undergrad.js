// node scripts/seed-undergrad.js
// Creates 3 test students. All IDs prefixed __test__ so they're trivially
// purgeable (see purge-undergrad-tests.js). Run against whatever store getStore()
// resolves to (Upstash Redis if KV_REST_API_* is set, else the local file store).
import { getStore } from '../lib/store.js';
import { emptyState, saveState } from '../lib/undergrad/state.js';

const store = getStore();

const SEEDS = [
  { userId: '__test__y10', name: 'Maya', entryGrade: 10 },  // → mode: build
  { userId: '__test__y11', name: 'Omer', entryGrade: 11 },  // → mode: compressed
  { userId: '__test__y12', name: 'Noa',  entryGrade: 12 },  // → mode: salvage
];

// A partially-populated Y11 so you can test resume + spike gating without
// chatting first.
function withHistory(state) {
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 200 * 86400000).toISOString();  // 200 days → STALE
  state.coverage.subjects   = { facts: [{ value: 'Physics, CS, Maths', confidence: 0.9, provenance: 'stated', at: now }], confidence: 0.9, lastUpdated: now };
  state.coverage.grades     = { facts: [{ value: 'mostly A/B', confidence: 0.8, provenance: 'stated', at: old }], confidence: 0.8, lastUpdated: old }; // stale on purpose
  state.coverage.activities = { facts: [{ value: 'robotics club', confidence: 0.9, provenance: 'stated', at: now }, { value: 'debate', confidence: 0.6, provenance: 'inferred', at: now }], confidence: 0.8, lastUpdated: now };
  state.spike = { stage: 'candidates', candidates: ['robotics', 'debate'], named: null, evidence: [], lastMovedAt: now };
  state.openTasks = [{ task: 'enter the regional robotics comp', assignedAt: old, followUpAfterDays: 14 }]; // overdue on purpose
  state.lastSessionSummary = 'Narrowed to robotics vs debate. Asked him to look up the regional comp deadline.';
  return state;
}

for (const s of SEEDS) {
  let state = emptyState(s.userId, s.name, s.entryGrade);
  if (s.entryGrade === 11) state = withHistory(state);
  await saveState(state, store);
  console.log(`seeded ${s.userId} → phase ${state.phase} · mode ${state.mode} · spike ${state.spike.stage}`);
}
