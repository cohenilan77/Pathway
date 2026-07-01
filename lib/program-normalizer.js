import { lookupAdmitRate } from './known-admit-rates.js';

export const SELECTIVITY_LABELS = [
  'Ultra Competitive',
  'Competitive',
  'Accessible',
];

const SELECTIVITY_RANK = {
  'Ultra Competitive': 3,
  Competitive: 2,
  Accessible: 1,
};

const M7_MBA = [
  'harvard business school',
  'harvard university',
  'harvard mba',
  'hbs',
  'stanford gsb',
  'stanford graduate school of business',
  'stanford university',
  'stanford mba',
  'wharton',
  'university of pennsylvania',
  'upenn',
  'penn mba',
  'booth',
  'chicago booth',
  'university of chicago',
  'chicago mba',
  'kellogg',
  'northwestern university',
  'northwestern mba',
  'columbia business school',
  'columbia university',
  'columbia mba',
  'mit sloan',
  'massachusetts institute of technology',
  'mit mba',
  'sloan',
];

const ULTRA_UNDERGRAD = [
  'harvard',
  'yale',
  'princeton',
  'columbia',
  'brown',
  'dartmouth',
  'cornell',
  'university of pennsylvania',
  'upenn',
  'stanford',
  'mit',
  'massachusetts institute of technology',
  'caltech',
  'oxford',
  'cambridge',
];

const ELITE_LAW = [
  'yale law',
  'stanford law',
  'harvard law',
  'columbia law',
  'chicago law',
  'nyu law',
  'penn carey law',
  'university of pennsylvania law',
  'duke law',
  'virginia law',
  'uva law',
  'northwestern law',
  'michigan law',
  'berkeley law',
  'cornell law',
  'georgetown law',
  'oxford law',
  'cambridge law',
];

const ELITE_REPUTATION = [
  'harvard',
  'stanford',
  'wharton',
  'mit',
  'sloan',
  'oxford',
  'cambridge',
  'princeton',
  'yale',
  'caltech',
  'columbia',
];

const FAMOUS_PORTFOLIO = [
  'nyu tisch',
  'itp',
  'risd',
  'rhode island school of design',
  'parsons',
  'artcenter',
  'art center',
  'royal college of art',
  'rca',
  'calarts',
  'california institute of the arts',
  'mit media lab',
];

function norm(value) {
  return String(value || '').toLowerCase();
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function validSelectivityLabel(label) {
  return SELECTIVITY_LABELS.includes(label) ? label : null;
}

function normalizeSelectivityLabel(label) {
  if (validSelectivityLabel(label)) return label;
  const text = norm(label).replace(/[-_]+/g, ' ');
  if (!text) return null;
  if (/ultra|most selective|extremely selective|super selective|m7|ivy/.test(text)) return 'Ultra Competitive';
  if (/elite|top tier|very selective|highly selective|highly competitive|competitive high|selective|competitive|moderate/.test(text)) return 'Competitive';
  if (/accessible|safer|safety|open admission|less selective/.test(text)) return 'Accessible';
  return null;
}

function cleanProgramInfo(value) {
  if (typeof value !== 'string') return value;
  const text = value.replace(/\.{3,}/g, '.').replace(/\s+/g, ' ').trim();
  if (!text) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const joined = sentences.slice(0, 4).join(' ').replace(/\s+/g, ' ').trim();
  if (!joined) return text.replace(/[,:;\-]+$/g, '').trim();
  return joined.replace(/[,:;\-]+$/g, '').trim();
}

function selectivityLabelFromScore(score) {
  if (score >= 85) return 'Ultra Competitive';
  if (score >= 40) return 'Competitive';
  return 'Accessible';
}

function weightedAverage(parts) {
  const valid = parts.filter(part => part.value != null && Number.isFinite(part.value) && part.weight > 0);
  const weight = valid.reduce((sum, part) => sum + part.weight, 0);
  if (!weight) return null;
  return valid.reduce((sum, part) => sum + part.value * part.weight, 0) / weight;
}

function acceptanceSelectivityScore(rate, family) {
  if (rate == null) return null;
  const ultra = family === 'health' ? 5 : family === 'phd' ? 8 : family === 'undergraduate' || family === 'portfolio' ? 10 : 15;
  const accessible = family === 'mba' ? 60 : family === 'undergraduate' ? 60 : family === 'law' ? 65 : family === 'health' || family === 'phd' ? 50 : 70;
  if (rate <= ultra) return 96;
  if (rate >= accessible) return 25;
  return Math.max(25, Math.min(96, 96 - ((rate - ultra) / (accessible - ultra)) * 71));
}

function gpaSelectivityScore(gpa) {
  if (gpa == null) return null;
  if (gpa >= 3.85) return 94;
  if (gpa >= 3.65) return 78;
  if (gpa >= 3.35) return 58;
  if (gpa >= 3.0) return 38;
  return 22;
}

function testSelectivityScore(program, family) {
  const avgGMAT = asNumber(program.avgGMAT);
  const avgGRE = asNumber(program.avgGRE);
  const avgSAT = asNumber(program.avgSAT ?? program.sat);
  const avgACT = asNumber(program.avgACT ?? program.act);
  const avgLSAT = asNumber(program.avgLSAT ?? program.lsat);
  const avgMCAT = asNumber(program.avgMCAT ?? program.mcat);
  if (family === 'mba') {
    if (avgGMAT != null) {
      if (avgGMAT >= 725) return 94;
      if (avgGMAT >= 700) return 76;
      if (avgGMAT >= 650) return 52;
      return 28;
    }
    if (avgGRE != null) return avgGRE >= 326 ? 88 : avgGRE >= 318 ? 68 : avgGRE >= 306 ? 46 : 24;
  }
  if (family === 'undergraduate') {
    if (avgSAT != null) return avgSAT >= 1530 ? 94 : avgSAT >= 1450 ? 76 : avgSAT >= 1250 ? 48 : 24;
    if (avgACT != null) return avgACT >= 35 ? 94 : avgACT >= 32 ? 72 : avgACT >= 26 ? 46 : 24;
  }
  if (family === 'law' && avgLSAT != null) return avgLSAT >= 172 ? 94 : avgLSAT >= 165 ? 74 : avgLSAT >= 155 ? 46 : 24;
  if (family === 'health' && avgMCAT != null) return avgMCAT >= 520 ? 94 : avgMCAT >= 512 ? 72 : avgMCAT >= 500 ? 46 : 24;
  if ((family === 'masters' || family === 'phd') && avgGRE != null) return avgGRE >= 326 ? 88 : avgGRE >= 318 ? 68 : avgGRE >= 306 ? 46 : 24;
  return null;
}

function reputationSelectivityScore(text, family, cohortSize) {
  let score = hasAny(text, ELITE_REPUTATION) ? 88 : 50;
  if (family === 'mba' && hasAny(text, M7_MBA)) score = 98;
  if (family === 'undergraduate' && hasAny(text, ULTRA_UNDERGRAD)) score = 96;
  if (family === 'law' && hasAny(text, ELITE_LAW)) score = /yale law|stanford law|harvard law/.test(text) ? 96 : 86;
  if (family === 'portfolio' && hasAny(text, FAMOUS_PORTFOLIO)) score = 90;
  if (cohortSize != null && cohortSize < 50) score = Math.min(96, score + 8);
  return score;
}

function disciplineReputationScore(text, family) {
  if (family === 'portfolio' && hasAny(text, FAMOUS_PORTFOLIO)) return 92;
  if (family === 'mba' && /wharton|sloan|booth|kellogg|columbia|harvard|stanford/.test(text)) return 92;
  if (family === 'law' && hasAny(text, ELITE_LAW)) return 88;
  if (family === 'undergraduate' && hasAny(text, ULTRA_UNDERGRAD)) return 90;
  if (hasAny(text, ELITE_REPUTATION)) return 82;
  return null;
}

function programFamily(program) {
  const text = norm(`${program?.programGroup || ''} ${program?.degree || ''} ${program?.name || ''}`);
  if (/mba|business school|gsb|sloan|wharton|booth|kellogg/.test(text)) return 'mba';
  if (/undergraduate|bachelor|ba\b|bs\b|college/.test(text)) return 'undergraduate';
  if (/\b(jd|llm|law)\b/.test(text)) return 'law';
  if (/\b(md|medicine|medical|health|mcat)\b/.test(text)) return 'health';
  if (/\b(phd|doctoral|doctorate|research master|mphil)\b/.test(text)) return 'phd';
  if (/\b(mfa|mdes|mps|portfolio|design|tisch|itp|interactive|arts|studio)\b/.test(text)) return 'portfolio';
  if (/\b(msc|ma|master|masters|taught)\b/.test(text)) return 'masters';
  return 'general';
}

function programCategory(program) {
  return programFamily(program);
}

function hasProgramSpecificMismatch(program) {
  const evidence = [
    ...(Array.isArray(program?.evidenceGaps) ? program.evidenceGaps : []),
    ...(Array.isArray(program?.riskFlags) ? program.riskFlags : []),
    program?.notes,
  ].join(' ').toLowerCase();
  return /poor .*alignment|weak .*alignment|career-goal mismatch|goal mismatch|weak recruiting|recruiting pipeline|regional-only|regional only|global outcome|format mismatch|part-time|full-time|online|missing prerequisite|prerequisite|research mismatch|supervisor mismatch|lab mismatch|portfolio mismatch|audition mismatch|materially different criteria|different criteria|not aligned/.test(evidence);
}

function strategicFitNote(program) {
  const family = programCategory(program);
  const text = norm(`${program?.notes || ''} ${program?.programGroup || ''} ${program?.name || ''}`);
  if (family === 'mba' && /pe|private equity|deep.?tech|venture|vc/.test(text)) {
    return 'Strong Fit, but weaker strategic fit for top PE/deep-tech recruiting.';
  }
  return 'Strong candidate fit, but lower strategic value for the stated goal.';
}

export function tierFromFit(fit, locked = false) {
  const numericFit = asNumber(fit);
  if (locked) return 'locked';
  if (numericFit == null) return 'stretch';
  if (numericFit > 80) return 'safe';
  if (numericFit >= 50) return 'possible';
  return 'stretch';
}

function hasHardGateMissing(program) {
  const evidence = [
    ...(Array.isArray(program?.evidenceGaps) ? program.evidenceGaps : []),
    ...(Array.isArray(program?.riskFlags) ? program.riskFlags : []),
    ...(Array.isArray(program?.unlockConditions) ? program.unlockConditions : []),
    program?.admissionStatus,
    program?.notes,
  ].join(' ').toLowerCase();
  return /not eligible|prerequisite|required|requirement|eligibility|credential|degree required|coursework|english proof|missing gate|hard gate|retake|raise your gpa|target .*score|portfolio missing|audition missing|writing sample missing/.test(evidence);
}

export function inferSelectivity(program = {}) {
  const providedLabel = normalizeSelectivityLabel(program.selectivityLabel);
  const family = programFamily(program);
  const text = norm(`${program.name || ''} ${program.programGroup || ''}`);
  const acceptanceRate = asNumber(program.acceptanceRate);
  const avgGPA = asNumber(program.avgGPA);
  const cohortSize = asNumber(program.cohortSize);
  const reputationScore = reputationSelectivityScore(text, family, cohortSize);
  const testScore = testSelectivityScore(program, family);
  const disciplineScore = disciplineReputationScore(text, family);
  const providedScore = asNumber(program.selectivityScore)
    ?? (providedLabel ? SELECTIVITY_RANK[providedLabel] * 30 : null);
  const score = weightedAverage([
    { value: reputationScore, weight: 25 },
    { value: acceptanceSelectivityScore(acceptanceRate, family), weight: 25 },
    { value: testScore, weight: 20 },
    { value: gpaSelectivityScore(avgGPA), weight: 15 },
    { value: disciplineScore, weight: 15 },
    { value: providedScore, weight: 10 },
  ]);
  const hasHardSelectivityData = acceptanceRate != null || testScore != null || avgGPA != null;
  const reputationFloor = !hasHardSelectivityData && reputationScore >= 96 ? 90 : null;
  const finalScore = Math.round(Math.max(score ?? providedScore ?? 50, reputationFloor ?? 0));
  let source = 'weighted_selectivity';
  if (!hasHardSelectivityData) {
    source = disciplineScore != null || reputationScore >= 80 ? 'weighted_reputation' : 'inferred_default';
  }
  return {
    selectivityLabel: selectivityLabelFromScore(finalScore),
    selectivitySource: source,
    selectivityScore: finalScore,
  };
}

export function normalizeProgram(program = {}) {
  const fit = asNumber(program.fit);
  const locked = program.tier === 'locked' && hasHardGateMissing(program);
  const tier = tierFromFit(fit, locked);
  const selectivity = inferSelectivity(program);
  // Resolve admit rate: prefer AI-provided value, then look up from known table
  const admitRateRaw = program.admitRate ?? program.acceptanceRate ?? null;
  let admitRate = asNumber(admitRateRaw);
  let admitRateSource = program.admitRateSource || (admitRate !== null ? 'AI estimate' : null);
  if (admitRate === null) {
    const known = lookupAdmitRate(program.name);
    if (known) { admitRate = known.admitRate; admitRateSource = known.admitRateSource; }
  }
  return {
    ...program,
    fit: fit ?? program.fit,
    tier,
    selectivityLabel: selectivity.selectivityLabel,
    selectivitySource: selectivity.selectivitySource,
    selectivityScore: selectivity.selectivityScore,
    fitDrivers: Array.isArray(program.fitDrivers) ? program.fitDrivers : [],
    programInfo: cleanProgramInfo(program.programInfo),
    admitRate: admitRate !== null ? admitRate : null,
    admitRateSource: admitRateSource || 'Not available',
  };
}

function normalizeCrossProgramFit(programs) {
  const strongestByCategory = new Map();
  for (const program of programs) {
    if (program.tier !== 'safe' || program.selectivityScore == null) continue;
    const category = programCategory(program);
    const current = strongestByCategory.get(category);
    if (!current || program.selectivityScore > current.selectivityScore) {
      strongestByCategory.set(category, program);
    }
  }

  return programs.map((program) => {
    if (program.tier === 'locked') return program;
    const category = programCategory(program);
    const strongerSelectiveProgram = strongestByCategory.get(category);
    if (!strongerSelectiveProgram) return program;
    if ((program.selectivityScore ?? 0) >= (strongerSelectiveProgram.selectivityScore ?? 0)) return program;
    if (program.tier === 'safe') return program;
    if (hasProgramSpecificMismatch(program)) return program;

    const nextNotes = String(program.notes || '').trim();
    const fitNote = strategicFitNote(program);
    return {
      ...program,
      fit: Math.max(asNumber(program.fit) ?? 0, 81),
      tier: 'safe',
      admissionStatus: ['Plausible', 'Competitive'].includes(program.admissionStatus) ? 'Strong' : program.admissionStatus,
      notes: nextNotes && !nextNotes.includes(fitNote) ? `${nextNotes} ${fitNote}` : (nextNotes || fitNote),
      fitDrivers: Array.isArray(program.fitDrivers) && program.fitDrivers.length
        ? program.fitDrivers
        : ['Candidate already clears stronger same-category benchmarks'],
    };
  });
}

export function normalizeProgramList(programs) {
  if (!programs) return programs;
  // A single school object (e.g. a stray <PROGRAMS>{...}</PROGRAMS> instead of
  // an array) must still go through full normalization rather than being
  // passed through raw and unnormalized, which is what left the Analysis tab
  // showing "one school, no details".
  const list = Array.isArray(programs) ? programs : (typeof programs === 'object' ? [programs] : null);
  if (!list) return programs;
  const seen = new Set();
  const normalized = [];
  for (const program of list) {
    if (!program || typeof program !== 'object') continue;
    const key = norm(`${program.name || ''}|${program.programGroup || ''}`);
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    normalized.push(normalizeProgram(program));
  }

  const consistencyNormalized = normalizeCrossProgramFit(normalized);
  const tierOrder = { safe: 0, possible: 1, stretch: 2, locked: 3 };
  return consistencyNormalized.sort((a, b) => {
    const tierDiff = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
    if (tierDiff) return tierDiff;
    const fitDiff = (asNumber(b.fit) ?? -1) - (asNumber(a.fit) ?? -1);
    if (fitDiff) return fitDiff;
    return (asNumber(b.selectivityScore) ?? 0) - (asNumber(a.selectivityScore) ?? 0);
  });
}
