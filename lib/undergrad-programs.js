import { undergradInterestCluster, undergradProfileStage as deriveProfileStage } from './undergrad-profile.js';

const USA_CS = [
  ['MIT', 'Cambridge, MA', 'stretch', 'Ultra Competitive', 98],
  ['Stanford University', 'Stanford, CA', 'stretch', 'Ultra Competitive', 98],
  ['Carnegie Mellon University', 'Pittsburgh, PA', 'stretch', 'Ultra Competitive', 95],
  ['UC Berkeley', 'Berkeley, CA', 'stretch', 'Ultra Competitive', 95],
  ['Georgia Tech', 'Atlanta, GA', 'possible', 'Competitive', 86],
  ['University of Illinois Urbana Champaign', 'Champaign, IL', 'possible', 'Competitive', 85],
  ['University of Michigan', 'Ann Arbor, MI', 'possible', 'Competitive', 84],
  ['UT Austin', 'Austin, TX', 'possible', 'Competitive', 84],
  ['University of Washington', 'Seattle, WA', 'possible', 'Competitive', 83],
  ['Purdue University', 'West Lafayette, IN', 'safe', 'Accessible', 72],
  ['UC San Diego', 'La Jolla, CA', 'safe', 'Accessible', 74],
  ['University of Wisconsin Madison', 'Madison, WI', 'safe', 'Accessible', 70],
];

const GLOBAL = [
  ...USA_CS.slice(0, 6),
  ['University of Toronto', 'Toronto, Canada', 'possible', 'Competitive', 82],
  ['University of Waterloo', 'Waterloo, Canada', 'possible', 'Competitive', 84],
  ['Imperial College London', 'London, UK', 'stretch', 'Ultra Competitive', 94],
  ['University College London', 'London, UK', 'possible', 'Competitive', 86],
  ['University of Edinburgh', 'Edinburgh, UK', 'safe', 'Accessible', 74],
  ['TU Delft', 'Delft, Netherlands', 'safe', 'Accessible', 72],
];

function known(value) {
  if (value === 0 || value === false) return true;
  if (Array.isArray(value)) return value.some(known);
  if (value && typeof value === 'object') return Object.values(value).some(known);
  return value != null && !/^\s*(?:|unknown|n\/a|not sure|tbd)\s*$/i.test(String(value));
}

export function inferUndergradInterestCluster(profile = {}) {
  return undergradInterestCluster(profile);
}

export const undergradProfileStage = deriveProfileStage;

export function hasUndergradBaseline(profile = {}) {
  const category = String(profile.category || profile.selectedCandidateType || '').toLowerCase();
  return category === 'undergraduate'
    && known(profile.grade || profile.currentGrade)
    && known(profile.curriculum)
    && known(profile.gpa || profile.academic || profile.grades || profile.transcript)
    && known(profile.subjects || profile.interests || profile.interestCluster)
    && known(profile.countries || profile.targetCountries || profile.destination)
    && known(profile.activities || profile.strongestActivity || profile.extracurriculars);
}

function fitFor(tier, index, profile) {
  const gpa = Number(String(profile.gpa || profile.academic || '').match(/\d(?:\.\d+)?/)?.[0]);
  const academicLift = Number.isFinite(gpa) ? Math.round((gpa - 3.3) * 8) : 0;
  const leadershipLift = /president|captain|founder|head|leader/i.test(String(profile.leadership || profile.leadershipEvidence || '')) ? 4 : 0;
  const base = tier === 'stretch' ? 42 : tier === 'possible' ? 62 : 76;
  return Math.max(30, Math.min(88, base + academicLift + leadershipLift + (index % 4)));
}

export function buildUndergradPreliminaryPrograms(profile = {}, scores = {}) {
  if (!hasUndergradBaseline(profile)) return [];
  const geography = String(profile.countries || profile.targetCountries || profile.destination || '').toLowerCase();
  const catalog = /usa|united states|u\.s\./i.test(geography) ? USA_CS : GLOBAL;
  const stage = deriveProfileStage(profile);
  const clusters = inferUndergradInterestCluster(profile);
  const focus = clusters.length ? clusters.join(', ') : 'broad academic exploration';
  return catalog.map(([name, location, tier, selectivityLabel, selectivityScore], index) => {
    const band = tier === 'stretch' ? 'Reach' : tier === 'possible' ? 'Target' : 'Likely';
    const fit = fitFor(tier, index, profile);
    return {
      name, tier, fit, location,
      notes: `Preliminary ${band.toLowerCase()} based on current academics, ${focus}, activities, and growth potential.`,
      programGroup: 'Exploratory undergraduate path',
      admissionStatus: `Preliminary ${band}`,
      evidenceGaps: ['Future course rigor and grade trend', 'Sustained activity impact', 'Testing evidence when age appropriate'],
      riskFlags: selectivityLabel === 'Ultra Competitive' ? ['Highly selective institution'] : [],
      missingActions: ['Update the profile monthly', 'Deepen one academic or activity spike'],
      fitExplanation: `${name} is an exploratory directional match, not a final application recommendation.`,
      selectivityLabel,
      selectivitySource: 'Known benchmark',
      selectivityScore,
      fitDrivers: [`Interest alignment: ${focus}`, 'Current academic foundation', 'Leadership and initiative potential'],
      programInfo: `${name} offers a strong platform for students exploring ${focus}. This preliminary match should evolve as grades, projects, testing, and preferences become clearer.`,
      admitRate: null,
      admitRateSource: 'Not available',
      profileStage: stage === 'discovery' ? 'discovery' : stage === 'application' ? 'application' : 'exploratory',
      readinessAtGeneration: Number.isFinite(Number(scores.overall)) ? Math.round(Number(scores.overall)) : null,
    };
  });
}

export const UNDERGRAD_PROGRAM_FIELDS = ['name', 'tier', 'fit', 'location', 'notes', 'programGroup', 'admissionStatus', 'evidenceGaps', 'riskFlags', 'missingActions', 'fitExplanation', 'selectivityLabel', 'selectivitySource', 'selectivityScore', 'fitDrivers', 'programInfo', 'admitRate', 'admitRateSource', 'profileStage'];
