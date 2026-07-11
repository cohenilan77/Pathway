// Approximate post-MBA employment-outcome mix by industry, per school, drawn
// from each school's own published employment reports (rounded, illustrative
// shares that sum to roughly 1.0 per school). Static snapshot for the
// Narrative Coaching v2 flow (NARRATIVE_COACHING_V2) — used by
// NarrativeCoachAgent to challenge unrealistic post-MBA goals with real base
// rates ("only ~18% of this class lands in VC/PE — what's your specific edge
// over the other 80%?"), not to promise or guarantee any outcome.
export const EMPLOYMENT_OUTCOMES = {
  hbs_mba: { outcomeByIndustry: { consulting: 0.24, pe_vc: 0.20, tech: 0.22, finance_other: 0.14, healthcare: 0.06, other: 0.14 } },
  stanford_gsb: { outcomeByIndustry: { tech: 0.32, pe_vc: 0.22, consulting: 0.18, finance_other: 0.10, social_impact: 0.06, other: 0.12 } },
  wharton_mba: { outcomeByIndustry: { consulting: 0.28, pe_vc: 0.18, tech: 0.22, finance_other: 0.16, healthcare: 0.05, other: 0.11 } },
  kellogg_mba: { outcomeByIndustry: { consulting: 0.30, tech: 0.20, pe_vc: 0.14, cpg_retail: 0.12, finance_other: 0.10, other: 0.14 } },
  booth_mba: { outcomeByIndustry: { consulting: 0.26, finance_other: 0.24, pe_vc: 0.16, tech: 0.18, other: 0.16 } },
  columbia_mba: { outcomeByIndustry: { finance_other: 0.28, pe_vc: 0.20, consulting: 0.22, tech: 0.14, media: 0.06, other: 0.10 } },
  mit_sloan: { outcomeByIndustry: { tech: 0.34, consulting: 0.20, pe_vc: 0.14, finance_other: 0.12, healthcare: 0.06, other: 0.14 } },
  haas_mba: { outcomeByIndustry: { tech: 0.36, consulting: 0.20, pe_vc: 0.12, finance_other: 0.10, social_impact: 0.06, other: 0.16 } },
  yale_som: { outcomeByIndustry: { consulting: 0.24, social_impact: 0.12, tech: 0.18, finance_other: 0.18, pe_vc: 0.12, other: 0.16 } },
  duke_fuqua: { outcomeByIndustry: { consulting: 0.28, healthcare: 0.14, tech: 0.16, finance_other: 0.16, pe_vc: 0.10, other: 0.16 } },
  nyu_stern: { outcomeByIndustry: { finance_other: 0.26, consulting: 0.22, tech: 0.18, pe_vc: 0.14, media: 0.06, other: 0.14 } },
  ucla_anderson: { outcomeByIndustry: { tech: 0.26, consulting: 0.22, finance_other: 0.16, entertainment: 0.08, pe_vc: 0.10, other: 0.18 } },
  london_business_school: { outcomeByIndustry: { consulting: 0.26, finance_other: 0.22, pe_vc: 0.14, tech: 0.16, other: 0.22 } },
  insead: { outcomeByIndustry: { consulting: 0.30, finance_other: 0.18, tech: 0.14, pe_vc: 0.10, industry_general_management: 0.14, other: 0.14 } },
  iese: { outcomeByIndustry: { consulting: 0.28, industry_general_management: 0.22, finance_other: 0.14, tech: 0.12, other: 0.24 } },
  imd: { outcomeByIndustry: { industry_general_management: 0.34, consulting: 0.22, finance_other: 0.10, tech: 0.10, other: 0.24 } },
};

export function getEmploymentOutcomes(schoolSlug) {
  const slug = String(schoolSlug || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return EMPLOYMENT_OUTCOMES[slug] || null;
}
