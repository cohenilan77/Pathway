// Undergrad Rail v2 — read-only projections of state for the three audiences.
// Pure functions; no I/O. The student sees forward motion only; the consultant
// sees provenance and gaps; the back office sees the cohort.
import { daysSince } from '../lib/undergrad/state.js';

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

export const studentView = s => ({
  phase: s.phase,
  spikeStage: s.spike.stage,
  spikeNamed: s.spike.named,
  nextActions: (s.openTasks || []).slice(0, 3),
  lastSession: s.lastSessionSummary,
  // no flags, no confidence scores, no decay warnings
});

export const consultantView = s => ({
  student: { name: s.name, currentGrade: s.currentGrade, phase: s.phase },
  mode: s.mode,                 // read this FIRST — build vs compressed vs salvage
  entryGrade: s.entryGrade,
  spike: s.spike,
  coverageGaps: Object.entries(s.coverage)
    .filter(([, c]) => !c.facts.length || c.confidence < 0.5)
    .map(([d, c]) => ({ dimension: d, confidence: c.confidence, lastUpdated: c.lastUpdated })),
  engagement: { lastSession: s.sessions.at(-1)?.endedAt, unansweredNudges: s.nudges.unanswered },
  flags: s.flags,
  facts: s.coverage,            // provenance visible — verified vs inferred
});

export const backOfficeView = all => ({
  total: all.length,
  byMode:  countBy(all, s => s.mode),
  byPhase: countBy(all, s => s.phase),
  bySpike: countBy(all, s => s.spike.stage),
  stalled: all.filter(s => daysSince(s.spike.lastMovedAt) > 120).length,
  disengaged: all.filter(s => s.nudges.unanswered >= 3).length,
});
