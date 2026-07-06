import { hasUndergradBaseline, inferUndergradInterestCluster, undergradProfileStage } from './undergrad-programs.js';

function text(profile) { return JSON.stringify(profile || {}).toLowerCase(); }
function gpa(profile) { const value = Number(String(profile.gpa || profile.academic || profile.grades || '').match(/\d(?:\.\d+)?/)?.[0]); return Number.isFinite(value) ? value : null; }
function clamp(value, min = 20, max = 92) { return Math.max(min, Math.min(max, Math.round(value))); }

export function buildUndergradPreliminaryScores(profile = {}, existingScores = {}) {
  const hasAnyProfile = Object.keys(profile || {}).length > 0;
  if (!hasAnyProfile) return { overall: null };
  const corpus = text(profile);
  const academic = gpa(profile) == null ? 45 : clamp(45 + (gpa(profile) / 4) * 35);
  const subjectDirection = inferUndergradInterestCluster(profile).length ? (/explor/.test(corpus) ? 62 : 72) : 38;
  const activities = /coding|club|research|sport|music|volunteer|competition|work/i.test(corpus) ? 68 : 42;
  const leadership = /president|captain|founder|head|leader|student body/i.test(corpus) ? 80 : /none/i.test(String(profile.leadership || '')) ? 35 : 48;
  const testing = /sat\s*\d{3,4}|act\s*\d{1,2}/i.test(corpus) ? 72 : /none yet|not taken|no sat|no act/i.test(corpus) ? 35 : 45;
  const initiative = /hackathon|project|award|competition|built|founded|president/i.test(corpus) ? 74 : 48;
  const potential = clamp((academic + activities + leadership + initiative) / 4 + 5);
  const goalClarity = subjectDirection;
  const overall = hasUndergradBaseline(profile)
    ? clamp(academic * .28 + subjectDirection * .14 + activities * .18 + leadership * .14 + testing * .06 + initiative * .12 + potential * .08, 45, 80)
    : clamp(25 + Object.keys(profile || {}).length * 2, 20, 44);
  const calculated = { overall, academic, subjectDirection, goalClarity, activities, leadership, testing, testScore: testing, initiative, awards: initiative, consistency: null, potential };
  for (const [key, value] of Object.entries(existingScores || {})) if (value != null && Number(value) > 0) calculated[key] = value;
  calculated.overall = overall;
  return calculated;
}

export function calculateUndergradReadiness(profile = {}, programs = [], snapshots = []) {
  const scores = buildUndergradPreliminaryScores(profile);
  const momentum = snapshots.length > 1 ? Math.min(8, snapshots.length * 2) : 0;
  const listLift = programs.length >= 10 ? 2 : 0;
  return { ...scores, overall: scores.overall == null ? null : clamp(scores.overall + momentum + listLift, 20, 88) };
}

export function buildUndergradStrengths(profile = {}) {
  const corpus = text(profile), strengths = [];
  if ((gpa(profile) || 0) >= 3.5) strengths.push('Strong current academic foundation');
  if (/math|science|computer|coding|engineering/i.test(corpus)) strengths.push('Clear quantitative and technical interest signal');
  if (/president|captain|founder|head|leader/i.test(corpus)) strengths.push('Meaningful early leadership evidence');
  if (/hackathon|project|award|competition|built/i.test(corpus)) strengths.push('Initiative through projects or competitions');
  if (strengths.length < 3) strengths.push('Profile has room to grow through consistent monthly progress', 'Early stage allows time to build depth');
  return [...new Set(strengths)].slice(0, 5);
}

export function buildUndergradWeaknesses(profile = {}) {
  const corpus = text(profile), items = [];
  if (/none yet|not taken|no sat|no act/i.test(corpus)) items.push('Testing evidence is not available yet; this is age appropriate and should be revisited later');
  if (/explor|still figuring|not sure/i.test(corpus) || !profile.intendedMajor) items.push('Academic direction is still exploratory');
  if (!/award|winner|finalist|competition/i.test(corpus)) items.push('External recognition and competition evidence can grow');
  if (!/impact|raised|increased|built|organized|led/i.test(corpus)) items.push('Activity impact needs clearer outcomes and evidence');
  while (items.length < 3) items.push('Sustained depth should be demonstrated over time');
  return [...new Set(items)].slice(0, 5);
}

export function buildUndergradTasks(profile = {}) {
  const cluster = inferUndergradInterestCluster(profile).slice(0, 2).join(' and ') || 'your strongest interests';
  return [
    `Document the outcomes and responsibilities from your strongest activity`,
    `Deepen one project in ${cluster}`,
    'Record one academic or activity update each month',
    'Build measurable impact in one leadership role',
    'Review this preliminary university list after the next major profile update',
  ];
}

export function undergradReadinessLabel(profile = {}) {
  const stage = undergradProfileStage(profile);
  return stage === 'application' ? 'Application Readiness' : stage === 'preliminary' ? 'College Readiness' : 'Preliminary Readiness';
}
