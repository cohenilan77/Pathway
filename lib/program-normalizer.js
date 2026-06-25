export const SELECTIVITY_LABELS = [
  'Ultra-selective',
  'Elite',
  'Highly competitive',
  'Competitive',
  'Accessible',
  'Unknown selectivity',
];

const SELECTIVITY_RANK = {
  'Ultra-selective': 5,
  Elite: 4,
  'Highly competitive': 3,
  Competitive: 2,
  Accessible: 1,
  'Unknown selectivity': 0,
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
  if (/ultra|most selective|extremely selective|super selective|m7|ivy/.test(text)) return 'Ultra-selective';
  if (/elite|top tier|very selective|highly selective/.test(text)) return 'Elite';
  if (/highly competitive|competitive high|selective/.test(text)) return 'Highly competitive';
  if (/competitive|moderate/.test(text)) return 'Competitive';
  if (/accessible|safer|safety|open admission|less selective/.test(text)) return 'Accessible';
  if (/unknown|missing|unclear/.test(text)) return 'Unknown selectivity';
  return null;
}

function byAcceptanceRate(rate, thresholds, source) {
  if (rate == null) return null;
  if (rate < thresholds.ultra) return { selectivityLabel: 'Ultra-selective', selectivitySource: source, selectivityScore: 95 };
  if (rate < thresholds.elite) return { selectivityLabel: 'Elite', selectivitySource: source, selectivityScore: 82 };
  if (rate < thresholds.highly) return { selectivityLabel: 'Highly competitive', selectivitySource: source, selectivityScore: 68 };
  if (rate <= thresholds.competitive) return { selectivityLabel: 'Competitive', selectivitySource: source, selectivityScore: 48 };
  return { selectivityLabel: 'Accessible', selectivitySource: source, selectivityScore: 24 };
}

function byScore(score, rules, source) {
  if (score == null) return null;
  for (const rule of rules) {
    if (score >= rule.min) {
      return { selectivityLabel: rule.label, selectivitySource: source, selectivityScore: rule.score };
    }
  }
  return { selectivityLabel: 'Accessible', selectivitySource: source, selectivityScore: 24 };
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

export function tierFromFit(fit, locked = false) {
  const numericFit = asNumber(fit);
  if (locked) return 'locked';
  if (numericFit == null) return 'stretch';
  if (numericFit >= 80) return 'safe';
  if (numericFit >= 70) return 'possible';
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
  const providedSelectivity = providedLabel ? {
    selectivityLabel: providedLabel,
    selectivitySource: program.selectivitySource || 'provided',
    selectivityScore: asNumber(program.selectivityScore) ?? SELECTIVITY_RANK[providedLabel] * 20,
  } : null;
  const family = programFamily(program);
  const text = norm(`${program.name || ''} ${program.programGroup || ''}`);
  const acceptanceRate = asNumber(program.acceptanceRate);
  const avgGMAT = asNumber(program.avgGMAT);
  const avgSAT = asNumber(program.avgSAT ?? program.sat);
  const avgACT = asNumber(program.avgACT ?? program.act);
  const avgLSAT = asNumber(program.avgLSAT ?? program.lsat);
  const avgMCAT = asNumber(program.avgMCAT ?? program.mcat);
  const cohortSize = asNumber(program.cohortSize);

  if (family === 'mba' && hasAny(text, M7_MBA)) {
    return { selectivityLabel: 'Ultra-selective', selectivitySource: 'm7_rule', selectivityScore: 98 };
  }
  if (family === 'undergraduate' && hasAny(text, ULTRA_UNDERGRAD)) {
    return { selectivityLabel: 'Ultra-selective', selectivitySource: 'elite_undergrad_rule', selectivityScore: 96 };
  }
  if (family === 'law' && hasAny(text, ELITE_LAW)) {
    return { selectivityLabel: text.includes('yale law') || text.includes('stanford law') || text.includes('harvard law') ? 'Ultra-selective' : 'Elite', selectivitySource: 'elite_law_rule', selectivityScore: 90 };
  }
  if (family === 'portfolio' && (hasAny(text, FAMOUS_PORTFOLIO) || (cohortSize != null && cohortSize < 50 && hasAny(text, ELITE_REPUTATION)))) {
    return { selectivityLabel: 'Ultra-selective', selectivitySource: 'portfolio_reputation_rule', selectivityScore: 92 };
  }

  if (family === 'mba') {
    return byAcceptanceRate(acceptanceRate, { ultra: 15, elite: 25, highly: 40, competitive: 60 }, 'acceptance_rate')
      || byScore(avgGMAT, [
        { min: 725, label: 'Ultra-selective', score: 94 },
        { min: 710, label: 'Elite', score: 82 },
        { min: 690, label: 'Highly competitive', score: 68 },
        { min: 650, label: 'Competitive', score: 48 },
      ], 'avg_gmat')
      || (hasAny(text, ELITE_REPUTATION) ? { selectivityLabel: 'Elite', selectivitySource: 'inferred_reputation', selectivityScore: 82 } : null)
      || providedSelectivity
      || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
  }

  if (family === 'undergraduate') {
    return byAcceptanceRate(acceptanceRate, { ultra: 10, elite: 20, highly: 35, competitive: 60 }, 'acceptance_rate')
      || byScore(avgSAT, [
        { min: 1530, label: 'Ultra-selective', score: 94 },
        { min: 1480, label: 'Elite', score: 82 },
        { min: 1400, label: 'Highly competitive', score: 68 },
        { min: 1250, label: 'Competitive', score: 48 },
      ], 'avg_sat')
      || byScore(avgACT, [
        { min: 35, label: 'Ultra-selective', score: 94 },
        { min: 33, label: 'Elite', score: 82 },
        { min: 30, label: 'Highly competitive', score: 68 },
        { min: 26, label: 'Competitive', score: 48 },
      ], 'avg_act')
      || providedSelectivity
      || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
  }

  if (family === 'law') {
    return byAcceptanceRate(acceptanceRate, { ultra: 15, elite: 30, highly: 45, competitive: 65 }, 'acceptance_rate')
      || byScore(avgLSAT, [
        { min: 172, label: 'Ultra-selective', score: 94 },
        { min: 168, label: 'Elite', score: 82 },
        { min: 163, label: 'Highly competitive', score: 68 },
        { min: 155, label: 'Competitive', score: 48 },
      ], 'avg_lsat')
      || providedSelectivity
      || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
  }

  if (family === 'health') {
    return byAcceptanceRate(acceptanceRate, { ultra: 5, elite: 10, highly: 25, competitive: 50 }, 'acceptance_rate')
      || byScore(avgMCAT, [
        { min: 520, label: 'Ultra-selective', score: 94 },
        { min: 516, label: 'Elite', score: 82 },
        { min: 510, label: 'Highly competitive', score: 68 },
        { min: 500, label: 'Competitive', score: 48 },
      ], 'avg_mcat')
      || providedSelectivity
      || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
  }

  if (family === 'phd') {
    return byAcceptanceRate(acceptanceRate, { ultra: 8, elite: 15, highly: 30, competitive: 50 }, 'acceptance_rate')
      || (hasAny(text, ELITE_REPUTATION) ? { selectivityLabel: 'Elite', selectivitySource: 'inferred_reputation', selectivityScore: 82 } : null)
      || providedSelectivity
      || { selectivityLabel: 'Competitive', selectivitySource: 'inferred_default', selectivityScore: 48 };
  }

  if (family === 'portfolio') {
    return byAcceptanceRate(acceptanceRate, { ultra: 10, elite: 25, highly: 40, competitive: 65 }, 'acceptance_rate')
      || providedSelectivity
      || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
  }

  if (family === 'masters') {
    return byAcceptanceRate(acceptanceRate, { ultra: 15, elite: 30, highly: 50, competitive: 70 }, 'acceptance_rate')
      || (hasAny(text, ELITE_REPUTATION) ? { selectivityLabel: 'Elite', selectivitySource: 'inferred_reputation', selectivityScore: 82 } : null)
      || providedSelectivity
      || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
  }

  return byAcceptanceRate(acceptanceRate, { ultra: 15, elite: 30, highly: 50, competitive: 70 }, 'acceptance_rate')
    || providedSelectivity
    || { selectivityLabel: 'Unknown selectivity', selectivitySource: 'missing_data', selectivityScore: 0 };
}

export function normalizeProgram(program = {}) {
  const fit = asNumber(program.fit);
  const locked = program.tier === 'locked' && hasHardGateMissing(program);
  const tier = tierFromFit(fit, locked);
  const selectivity = inferSelectivity(program);
  return {
    ...program,
    fit: fit ?? program.fit,
    tier,
    selectivityLabel: selectivity.selectivityLabel,
    selectivitySource: selectivity.selectivitySource,
    selectivityScore: selectivity.selectivityScore,
    fitDrivers: Array.isArray(program.fitDrivers) ? program.fitDrivers : [],
  };
}

export function normalizeProgramList(programs) {
  if (!Array.isArray(programs)) return programs;
  const seen = new Set();
  const normalized = [];
  for (const program of programs) {
    if (!program || typeof program !== 'object') continue;
    const key = norm(`${program.name || ''}|${program.programGroup || ''}`);
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    normalized.push(normalizeProgram(program));
  }

  const tierOrder = { locked: 0, stretch: 1, possible: 2, safe: 3 };
  return normalized.sort((a, b) => {
    const tierDiff = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
    if (tierDiff) return tierDiff;
    const fitDiff = (asNumber(b.fit) ?? -1) - (asNumber(a.fit) ?? -1);
    if (fitDiff) return fitDiff;
    return (asNumber(b.selectivityScore) ?? 0) - (asNumber(a.selectivityScore) ?? 0);
  });
}
