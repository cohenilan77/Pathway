// Curated pivot-risk lookup for the Narrative Coaching v2 flow
// (NARRATIVE_COACHING_V2). Scores a candidate's stated source industry ->
// target post-MBA function on a 1 (credible, adcom sees this constantly) to
// 10 (red-flag, needs a very strong bridge story) scale. This is a static,
// hand-curated table — not derived from any live data source — and is meant
// to give NarrativeCoachAgent a consistent starting point for how hard to
// push on a given pivot, not a scientific prediction.
//
// Bands: 1-4 credible, 5-7 moderate, 8-10 risky.
export const PIVOT_RISK_TABLE = {
  consulting: {
    private_equity: 3,
    tech_operator: 4,
    social_impact: 5,
    startup_founder: 5,
    venture_capital: 4,
    product_management: 5,
    pilot: 10,
  },
  investment_banking: {
    private_equity: 2,
    tech_finance: 3,
    startup_founder: 5,
    venture_capital: 4,
    hedge_fund: 3,
    corporate_strategy: 4,
    social_impact: 7,
  },
  chef_hospitality: {
    hospitality_investing: 3,
    food_tech: 4,
    consulting: 6,
    startup_founder: 5,
    operations_leadership: 5,
    pilot: 10,
  },
  military: {
    consulting: 3,
    operations_leadership: 3,
    private_equity: 5,
    venture_capital: 6,
    startup_founder: 4,
    government: 2,
  },
  engineering: {
    product_management: 3,
    tech_operator: 3,
    consulting: 4,
    venture_capital: 5,
    startup_founder: 3,
    private_equity: 6,
  },
  medicine: {
    healthcare_investing: 3,
    consulting: 5,
    startup_founder: 5,
    venture_capital: 5,
    biotech_operator: 3,
    government: 4,
  },
  education: {
    edtech: 3,
    social_impact: 3,
    consulting: 5,
    nonprofit_leadership: 3,
    startup_founder: 5,
    private_equity: 8,
  },
  nonprofit: {
    social_impact: 2,
    consulting: 5,
    government: 3,
    startup_founder: 5,
    private_equity: 8,
    venture_capital: 7,
  },
  product_management: {
    startup_founder: 3,
    venture_capital: 4,
    consulting: 4,
    private_equity: 5,
    tech_operator: 2,
  },
  marketing: {
    brand_leadership: 2,
    consulting: 5,
    startup_founder: 5,
    venture_capital: 6,
    tech_operator: 4,
    private_equity: 7,
  },
  sales: {
    tech_operator: 3,
    startup_founder: 4,
    consulting: 6,
    venture_capital: 6,
    private_equity: 7,
  },
  law: {
    private_equity: 4,
    corporate_strategy: 3,
    consulting: 5,
    startup_founder: 6,
    venture_capital: 5,
    government: 2,
  },
  academia: {
    consulting: 6,
    social_impact: 3,
    edtech: 4,
    startup_founder: 6,
    private_equity: 8,
    government: 3,
  },
  government: {
    consulting: 4,
    social_impact: 2,
    corporate_strategy: 5,
    private_equity: 7,
    startup_founder: 6,
    venture_capital: 6,
  },
};

export function scorePivot(sourceIndustry, targetFunction) {
  const source = String(sourceIndustry || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const target = String(targetFunction || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const row = PIVOT_RISK_TABLE[source];
  const score = row?.[target];
  if (!Number.isFinite(score)) {
    return {
      score: 6,
      band: 'moderate',
      reasoning: `No curated data point for ${sourceIndustry || 'this background'} -> ${targetFunction || 'this goal'}; treat as an unproven pivot until the candidate's story closes the gap.`,
    };
  }
  const band = score <= 4 ? 'credible' : score <= 7 ? 'moderate' : 'risky';
  const reasoning = band === 'credible'
    ? `${sourceIndustry} -> ${targetFunction} is a well-worn path adcom sees constantly; the bar is fluency and specificity, not justification.`
    : band === 'moderate'
      ? `${sourceIndustry} -> ${targetFunction} is plausible but not obvious; the candidate needs a concrete bridge (skills, exposure, or proof points) or it reads as aspirational.`
      : `${sourceIndustry} -> ${targetFunction} is a steep pivot with little natural bridge; without a hard proof point (a real project, certification, or track record) this reads as unrealistic.`;
  return { score, band, reasoning };
}
