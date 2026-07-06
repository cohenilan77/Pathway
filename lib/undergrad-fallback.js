import { buildUndergradPreliminaryPrograms, hasUndergradBaseline, inferUndergradInterestCluster, undergradProfileStage } from './undergrad-programs.js';
import { buildUndergradPreliminaryScores, buildUndergradStrengths, buildUndergradWeaknesses, buildUndergradTasks, undergradReadinessLabel } from './undergrad-scoring.js';

function programsCount(raw) {
  const match = String(raw || '').match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/i);
  if (!match) return 0;
  try { const value = JSON.parse(match[1].trim()); return Array.isArray(value) ? value.length : 0; } catch { return 0; }
}

export function ensureUndergradFallbackRaw({ raw = '', profile = {}, candidateFacts = {}, scores = {}, programs = [], now = Date.now() } = {}) {
  const source = { ...profile, ...candidateFacts };
  const category = String(source.category || source.selectedCandidateType || '').toLowerCase();
  if (category && category !== 'undergraduate') return raw;
  const merged = { ...source, category: 'Undergraduate' };
  if (!hasUndergradBaseline(merged) || programsCount(raw) >= 10 || (Array.isArray(programs) && programs.length >= 10)) return raw;
  const fallbackScores = buildUndergradPreliminaryScores(merged, scores);
  const fallbackPrograms = buildUndergradPreliminaryPrograms(merged, fallbackScores);
  const updatedProfile = {
    ...merged,
    category: 'Undergraduate',
    degree: 'Undergraduate',
    profileStage: undergradProfileStage(merged),
    readinessLabel: undergradReadinessLabel(merged),
    interestCluster: inferUndergradInterestCluster(merged),
    monthlySnapshots: Array.isArray(profile.monthlySnapshots) ? profile.monthlySnapshots : [],
    kpiHistory: [...(Array.isArray(profile.kpiHistory) ? profile.kpiHistory : []), { at: now, scores: fallbackScores }].slice(-24),
    lastProfileUpdateAt: now,
  };
  return `<PROFILE>${JSON.stringify(updatedProfile)}</PROFILE>`
    + `<SCORES>${JSON.stringify(fallbackScores)}</SCORES>`
    + `<STRENGTHS>${JSON.stringify(buildUndergradStrengths(merged))}</STRENGTHS>`
    + `<WEAKNESSES>${JSON.stringify(buildUndergradWeaknesses(merged))}</WEAKNESSES>`
    + `<TASKS>${JSON.stringify(buildUndergradTasks(merged))}</TASKS>`
    + `<PROGRAMS>${JSON.stringify(fallbackPrograms)}</PROGRAMS>`
    + 'Done. Your preliminary undergrad profile, KPI snapshot, roadmap, and university list are saved. → View University List | View Roadmap | Update Profile | Regenerate List';
}

export { programsCount as undergradProgramsCount };
