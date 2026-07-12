// Hand-curated undergraduate school database for the 2026-07-09 school-list
// hotfix (see lib/undergrad/handle-school-list.js). Deliberately NOT the same
// data as lib/known-admit-rates.js (that file's admitRate is a flat percent
// number used for AI-generated program lookups across every candidate type;
// this file adds the extra fields — medians, region, size, setting, NCAA
// track — a deterministic undergrad matcher needs). Figures are approximate,
// compiled from each school's public Common Data Set / IPEDS-style reporting
// around the most recently published admissions cycle; treat them as
// directionally correct for matching, not as a guaranteed-exact quote.
export const UNDERGRAD_SCHOOLS = [
  { name: 'MIT', city: 'Cambridge', state: 'MA', region: 'Northeast', strongIn: ['cs', 'engineering', 'math'], admitRate: 0.04, medianSAT: 1540, medianACT: 35, sizeTier: 'small', setting: 'urban', hasNCAATrack: true, notes: 'World leader in CS/engineering research; rewards builders over resume-padders.' },
  { name: 'Stanford', city: 'Stanford', state: 'CA', region: 'West', strongIn: ['cs', 'engineering', 'business'], admitRate: 0.037, medianSAT: 1505, medianACT: 34, sizeTier: 'medium', setting: 'suburban', hasNCAATrack: true, notes: 'Elite CS/engineering with Silicon Valley proximity and startup culture.' },
  { name: 'Carnegie Mellon University', city: 'Pittsburgh', state: 'PA', region: 'Northeast', strongIn: ['cs', 'engineering'], admitRate: 0.11, medianSAT: 1520, medianACT: 34, sizeTier: 'medium', setting: 'urban', hasNCAATrack: false, notes: 'Consistently ranked among the top 3 CS programs in the US.' },
  { name: 'Caltech', city: 'Pasadena', state: 'CA', region: 'West', strongIn: ['cs', 'engineering', 'math'], admitRate: 0.039, medianSAT: 1545, medianACT: 35, sizeTier: 'small', setting: 'suburban', hasNCAATrack: false, notes: 'Tiny, intensely technical, research-first from freshman year.' },
  { name: 'Georgia Tech', city: 'Atlanta', state: 'GA', region: 'South', strongIn: ['cs', 'engineering'], admitRate: 0.17, medianSAT: 1425, medianACT: 33, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Huge engineering school with a well-known co-op program.' },
  { name: 'University of Illinois Urbana-Champaign', city: 'Urbana-Champaign', state: 'IL', region: 'Midwest', strongIn: ['cs', 'engineering'], admitRate: 0.45, medianSAT: 1440, medianACT: 32, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Top public CS program; the CS major itself is far more selective than the overall admit rate.' },
  { name: 'University of Michigan', city: 'Ann Arbor', state: 'MI', region: 'Midwest', strongIn: ['cs', 'engineering', 'business'], admitRate: 0.177, medianSAT: 1435, medianACT: 33, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Strong across engineering, CS, and business with big-school energy.' },
  { name: 'University of Texas at Austin', city: 'Austin', state: 'TX', region: 'South', strongIn: ['cs', 'engineering', 'business'], admitRate: 0.265, medianSAT: 1355, medianACT: 30, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Excellent CS/engineering, big Texas flagship energy.' },
  { name: 'University of Washington', city: 'Seattle', state: 'WA', region: 'West', strongIn: ['cs', 'engineering'], admitRate: 0.48, medianSAT: 1360, medianACT: 29, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Top-tier CS program adjacent to the Seattle big-tech corridor.' },
  { name: 'UCLA', city: 'Los Angeles', state: 'CA', region: 'West', strongIn: ['cs', 'engineering', 'business', 'life_sciences'], admitRate: 0.086, medianSAT: 1405, medianACT: 32, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Elite public university, strong across nearly every major.' },
  { name: 'UC San Diego', city: 'San Diego', state: 'CA', region: 'West', strongIn: ['cs', 'engineering', 'life_sciences'], admitRate: 0.24, medianSAT: 1350, medianACT: 30, sizeTier: 'large', setting: 'suburban', hasNCAATrack: true, notes: 'Excellent CS and bioengineering programs.' },
  { name: 'UC Santa Barbara', city: 'Santa Barbara', state: 'CA', region: 'West', strongIn: ['cs', 'engineering', 'life_sciences'], admitRate: 0.262, medianSAT: 1330, medianACT: 29, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Strong CS/engineering with a small-college-town feel.' },
  { name: 'UC Berkeley', city: 'Berkeley', state: 'CA', region: 'West', strongIn: ['cs', 'engineering', 'business', 'math'], admitRate: 0.113, medianSAT: 1415, medianACT: 32, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Among the top public CS/engineering programs in the world.' },
  { name: 'Cornell University', city: 'Ithaca', state: 'NY', region: 'Northeast', strongIn: ['cs', 'engineering', 'life_sciences', 'business'], admitRate: 0.087, medianSAT: 1500, medianACT: 34, sizeTier: 'medium', setting: 'college_town', hasNCAATrack: true, notes: 'Ivy League with deep CS/engineering strength across colleges.' },
  { name: 'Princeton University', city: 'Princeton', state: 'NJ', region: 'Northeast', strongIn: ['cs', 'engineering', 'math', 'humanities'], admitRate: 0.046, medianSAT: 1505, medianACT: 34, sizeTier: 'small', setting: 'suburban', hasNCAATrack: true, notes: 'Small Ivy with a strong CS/engineering theory bent.' },
  { name: 'Harvard University', city: 'Cambridge', state: 'MA', region: 'Northeast', strongIn: ['humanities', 'business', 'cs'], admitRate: 0.036, medianSAT: 1520, medianACT: 35, sizeTier: 'medium', setting: 'urban', hasNCAATrack: true, notes: 'Broad excellence across every field, with a fast-growing CS program.' },
  { name: 'Yale University', city: 'New Haven', state: 'CT', region: 'Northeast', strongIn: ['humanities', 'cs', 'life_sciences'], admitRate: 0.046, medianSAT: 1515, medianACT: 34, sizeTier: 'medium', setting: 'urban', hasNCAATrack: true, notes: 'Elite humanities strength alongside a growing CS program.' },
  { name: 'Columbia University', city: 'New York City', state: 'NY', region: 'Northeast', strongIn: ['cs', 'engineering', 'humanities'], admitRate: 0.039, medianSAT: 1505, medianACT: 34, sizeTier: 'medium', setting: 'urban', hasNCAATrack: true, notes: 'NYC location with strong engineering and humanities.' },
  { name: 'University of Pennsylvania', city: 'Philadelphia', state: 'PA', region: 'Northeast', strongIn: ['business', 'cs', 'engineering'], admitRate: 0.077, medianSAT: 1500, medianACT: 34, sizeTier: 'medium', setting: 'urban', hasNCAATrack: true, notes: 'Wharton business plus strong CS/engineering.' },
  { name: 'Brown University', city: 'Providence', state: 'RI', region: 'Northeast', strongIn: ['humanities', 'cs', 'life_sciences'], admitRate: 0.051, medianSAT: 1495, medianACT: 34, sizeTier: 'small', setting: 'urban', hasNCAATrack: true, notes: 'Open curriculum with a growing, well-regarded CS department.' },
  { name: 'Duke University', city: 'Durham', state: 'NC', region: 'South', strongIn: ['cs', 'engineering', 'life_sciences'], admitRate: 0.069, medianSAT: 1505, medianACT: 34, sizeTier: 'medium', setting: 'suburban', hasNCAATrack: true, notes: 'Strong pre-med/CS combination and a big sports culture.' },
  { name: 'Northwestern University', city: 'Evanston', state: 'IL', region: 'Midwest', strongIn: ['cs', 'engineering', 'business', 'humanities'], admitRate: 0.068, medianSAT: 1500, medianACT: 34, sizeTier: 'medium', setting: 'suburban', hasNCAATrack: true, notes: 'Strong journalism, engineering, and business alongside CS.' },
  { name: 'Vanderbilt University', city: 'Nashville', state: 'TN', region: 'South', strongIn: ['cs', 'engineering', 'business'], admitRate: 0.066, medianSAT: 1500, medianACT: 34, sizeTier: 'medium', setting: 'suburban', hasNCAATrack: true, notes: 'Strong across the board with a lively Nashville campus culture.' },
  { name: 'Rice University', city: 'Houston', state: 'TX', region: 'South', strongIn: ['cs', 'engineering', 'life_sciences'], admitRate: 0.085, medianSAT: 1520, medianACT: 34, sizeTier: 'small', setting: 'urban', hasNCAATrack: true, notes: 'Small, elite engineering school with a residential college system.' },
  { name: 'Johns Hopkins University', city: 'Baltimore', state: 'MD', region: 'Northeast', strongIn: ['life_sciences', 'engineering', 'cs'], admitRate: 0.07, medianSAT: 1500, medianACT: 34, sizeTier: 'medium', setting: 'urban', hasNCAATrack: false, notes: 'Pre-med/biomedical engineering powerhouse.' },
  { name: 'USC', city: 'Los Angeles', state: 'CA', region: 'West', strongIn: ['cs', 'business', 'humanities'], admitRate: 0.115, medianSAT: 1450, medianACT: 33, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Strong CS, film, and business with a huge alumni network.' },
  { name: 'NYU', city: 'New York City', state: 'NY', region: 'Northeast', strongIn: ['cs', 'business', 'humanities'], admitRate: 0.122, medianSAT: 1470, medianACT: 33, sizeTier: 'large', setting: 'urban', hasNCAATrack: false, notes: 'NYC location with strength across many fields.' },
  { name: 'Northeastern University', city: 'Boston', state: 'MA', region: 'Northeast', strongIn: ['cs', 'engineering', 'business'], admitRate: 0.07, medianSAT: 1470, medianACT: 33, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Co-op program with strong CS job placement.' },
  { name: 'Boston University', city: 'Boston', state: 'MA', region: 'Northeast', strongIn: ['cs', 'business', 'life_sciences'], admitRate: 0.18, medianSAT: 1440, medianACT: 32, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Broad, strong programs in a major city.' },
  { name: 'Purdue University', city: 'West Lafayette', state: 'IN', region: 'Midwest', strongIn: ['engineering', 'cs'], admitRate: 0.53, medianSAT: 1330, medianACT: 30, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Massive engineering school with a strong CS program.' },
  { name: 'University of Wisconsin-Madison', city: 'Madison', state: 'WI', region: 'Midwest', strongIn: ['cs', 'engineering', 'life_sciences'], admitRate: 0.43, medianSAT: 1400, medianACT: 31, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Strong CS/engineering at a big Big Ten school.' },
  { name: 'UMass Amherst', city: 'Amherst', state: 'MA', region: 'Northeast', strongIn: ['cs', 'engineering'], admitRate: 0.64, medianSAT: 1310, medianACT: 29, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Surprisingly strong CS program and good value.' },
  { name: 'Ohio State University', city: 'Columbus', state: 'OH', region: 'Midwest', strongIn: ['engineering', 'cs', 'business'], admitRate: 0.53, medianSAT: 1300, medianACT: 29, sizeTier: 'large', setting: 'urban', hasNCAATrack: true, notes: 'Huge school with solid engineering/CS and a big sports culture.' },
  { name: 'Penn State University', city: 'State College', state: 'PA', region: 'Northeast', strongIn: ['engineering', 'cs', 'business'], admitRate: 0.42, medianSAT: 1310, medianACT: 29, sizeTier: 'large', setting: 'college_town', hasNCAATrack: true, notes: 'Large engineering school with a strong alumni network.' },
  { name: 'RIT', city: 'Rochester', state: 'NY', region: 'Northeast', strongIn: ['cs', 'engineering'], admitRate: 0.71, medianSAT: 1310, medianACT: 29, sizeTier: 'medium', setting: 'suburban', hasNCAATrack: false, notes: 'Co-op-heavy, strong CS and game design programs.' },
  { name: 'Rensselaer Polytechnic Institute', city: 'Troy', state: 'NY', region: 'Northeast', strongIn: ['cs', 'engineering'], admitRate: 0.55, medianSAT: 1400, medianACT: 31, sizeTier: 'small', setting: 'college_town', hasNCAATrack: false, notes: 'The oldest technological research university in the US.' },
  { name: 'Worcester Polytechnic Institute', city: 'Worcester', state: 'MA', region: 'Northeast', strongIn: ['cs', 'engineering'], admitRate: 0.55, medianSAT: 1370, medianACT: 31, sizeTier: 'small', setting: 'urban', hasNCAATrack: false, notes: 'Project-based engineering curriculum from year one.' },
  { name: 'Case Western Reserve University', city: 'Cleveland', state: 'OH', region: 'Midwest', strongIn: ['cs', 'engineering', 'life_sciences'], admitRate: 0.30, medianSAT: 1420, medianACT: 32, sizeTier: 'small', setting: 'urban', hasNCAATrack: false, notes: 'Strong pre-med/engineering combination programs.' },
  { name: 'Lehigh University', city: 'Bethlehem', state: 'PA', region: 'Northeast', strongIn: ['engineering', 'business', 'cs'], admitRate: 0.35, medianSAT: 1370, medianACT: 31, sizeTier: 'small', setting: 'suburban', hasNCAATrack: true, notes: 'Strong integrated engineering + business degree programs.' },
  { name: 'Colorado School of Mines', city: 'Golden', state: 'CO', region: 'West', strongIn: ['engineering', 'cs'], admitRate: 0.55, medianSAT: 1330, medianACT: 29, sizeTier: 'small', setting: 'college_town', hasNCAATrack: false, notes: 'Elite engineering focus on mining, energy, and materials science.' },
];

const MAJOR_KEYWORDS = [
  ['cs', /computer science|coding|programming|software|\bcs\b|data science|artificial intelligence|\bai\b/i],
  ['engineering', /engineer/i],
  ['math', /\bmath(?:ematics)?\b/i],
  ['life_sciences', /biology|chemistry|pre-?med|medicine|life science|health|neuroscience/i],
  ['business', /business|finance|econ(?:omics)?|management|entrepreneur/i],
  ['humanities', /humanit|english|history|art\b|writing|philosophy|social science|political science/i],
];

export function majorToCategory(intendedMajor) {
  const text = String(intendedMajor || '');
  for (const [category, pattern] of MAJOR_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return 'cs';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Reach if the candidate's SAT is more than 50 points below the school's
// median, likely if more than 50 above, target in between — matching the
// hotfix spec's explicit "reach if < median-100 / target within +-50 /
// likely if > median+50" rule (the -100..-50 gap folds into reach, since
// it's still below the target band).
function academicTier(profile, school) {
  const sat = Number(profile.satScore);
  if (Number.isFinite(sat)) {
    const diff = sat - school.medianSAT;
    return diff > 50 ? 'likely' : diff < -50 ? 'reach' : 'target';
  }
  const act = Number(profile.actScore);
  if (Number.isFinite(act)) {
    const diff = act - school.medianACT;
    return diff > 3 ? 'likely' : diff < -3 ? 'reach' : 'target';
  }
  // No test score yet: fall back to the school's own admit rate as a proxy.
  if (school.admitRate <= 0.1) return 'reach';
  if (school.admitRate >= 0.3) return 'likely';
  return 'target';
}

// fit is anchored to the tier band (reach <50, target 50-80, likely >80) so
// that downstream normalizeProgramList's tierFromFit() and the Schools tab's
// own fit-based fallback bucketing both agree with the tier assigned here,
// with small same-band nudges from region/activity/size/setting match.
function scoreFit(profile, school, tier, hasScholarshipMatch = false) {
  const base = { reach: 32, target: 62, likely: 88 }[tier];
  const [min, max] = { reach: [20, 48], target: [51, 79], likely: [81, 98] }[tier];
  let score = base;
  const regions = Array.isArray(profile.targetRegions) ? profile.targetRegions
    : String(profile.targetRegions || '').split(/[,;]/).map(r => r.trim()).filter(Boolean);
  if (regions.length && regions.some(r => r.toLowerCase() === school.region.toLowerCase())) score += 6;
  if (profile.hasNCAATrackInterest && school.hasNCAATrack) score += 4;
  if (profile.sizeTier && profile.sizeTier === school.sizeTier) score += 3;
  if (profile.setting && profile.setting === school.setting) score += 3;
  // A candidate who's signaled affordability matters gets schools with a
  // real cached scholarship match nudged up within their tier — never
  // filtered out, just re-ranked. hasScholarshipMatch is pre-fetched by the
  // (async) caller — this matcher stays synchronous/deterministic.
  if (profile.affordabilityPreference && hasScholarshipMatch) score += 5;
  return clamp(Math.round(score), min, max);
}

function reasonWhy(profile, school, tier) {
  const tierPhrase = { reach: 'a stretch academically, but a real swing worth taking', target: 'a solid academic match for where they are today', likely: 'well within reach academically' }[tier];
  return `${tierPhrase}; strong in ${school.strongIn.join('/')} — ${school.notes}`;
}

// Deterministic matcher: no LLM call. Input profile fields: grade,
// intendedMajor, gpa, satScore, actScore, targetRegions, activities,
// hasNCAATrackInterest, sizeTier, setting. `scholarshipCache` is an OPTIONAL
// pre-fetched map of { [schoolName]: scholarshipEntry } the (async) caller
// supplies — see lib/undergrad/handle-school-list.js — so this matcher
// itself never does I/O and stays a pure, testable function.
export function matchUndergradSchools(profile = {}, { scholarshipCache = {} } = {}) {
  const category = majorToCategory(profile.intendedMajor);
  const candidates = UNDERGRAD_SCHOOLS.filter(school => school.strongIn.includes(category));
  const pool = candidates.length ? candidates : UNDERGRAD_SCHOOLS;

  const scored = pool.map(school => {
    const tier = academicTier(profile, school);
    const scholarshipEntry = scholarshipCache[school.name] || null;
    return {
      name: school.name,
      location: `${school.city}, ${school.state}`,
      tier,
      fit: scoreFit(profile, school, tier, !!scholarshipEntry),
      admissionStatus: { reach: 'Reach', target: 'Competitive', likely: 'Strong' }[tier],
      reasonWhy: reasonWhy(profile, school, tier),
      selectivitySource: 'db',
      admitRate: Math.round(school.admitRate * 1000) / 10,
      admitRateSource: 'Curated undergrad database (hotfix)',
      scholarshipNote: scholarshipEntry
        ? `${scholarshipEntry.name} — ${scholarshipEntry.amountUSD ? `$${scholarshipEntry.amountUSD.toLocaleString()}` : (scholarshipEntry.amountType || 'award')}.`
        : null,
    };
  });

  const byTier = { reach: [], target: [], likely: [] };
  for (const school of scored) byTier[school.tier].push(school);
  for (const tier of Object.keys(byTier)) byTier[tier].sort((a, b) => b.fit - a.fit);

  const TARGET_COUNTS = { reach: 4, target: 5, likely: 3 };
  const picked = [];
  const pickedNames = new Set();
  for (const tier of ['reach', 'target', 'likely']) {
    for (const school of byTier[tier].slice(0, TARGET_COUNTS[tier])) {
      picked.push(school);
      pickedNames.add(school.name);
    }
  }
  if (picked.length < 12) {
    const leftovers = scored.filter(s => !pickedNames.has(s.name)).sort((a, b) => b.fit - a.fit);
    for (const school of leftovers) {
      if (picked.length >= 12) break;
      picked.push(school);
      pickedNames.add(school.name);
    }
  }
  return picked.slice(0, 12);
}
