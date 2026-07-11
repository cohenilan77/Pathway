// Curated, per-cycle snapshot of what each school's admissions committee is
// currently over/under-indexed on, for the Narrative Coaching v2 flow
// (NARRATIVE_COACHING_V2). This is a static editorial judgment call — refresh
// updatedCycle each admissions cycle — not a live feed. NarrativeCoachAgent
// uses it to push candidates toward whichever angle of their own story is
// most differentiated for the specific school they're targeting, never to
// fabricate a background they don't have.
export const SCHOOL_PORTFOLIO_NEEDS = {
  hbs_mba: {
    overIndexed: ['consulting_to_pe', 'banking_to_pe'],
    underIndexed: ['operator_to_vc', 'nonprofit_leadership', 'military_to_general_management'],
    portfolioNote: 'HBS class skews finance/consulting heavy; adcom rewards operating depth and general management readiness over another finance-to-finance story.',
    updatedCycle: '2026-2027',
  },
  stanford_gsb: {
    overIndexed: ['consulting_to_startup_founder', 'banking_to_vc'],
    underIndexed: ['nonprofit_leadership', 'international_public_sector', 'deep_tech_operator'],
    portfolioNote: 'Stanford GSB actively seeks mission-driven and technical-founder profiles; a generic "change the world" pivot without specificity blends in.',
    updatedCycle: '2026-2027',
  },
  wharton_mba: {
    overIndexed: ['consulting_to_pe', 'banking_to_pe'],
    underIndexed: ['operator_to_vc', 'nonprofit_leadership', 'international_public_sector'],
    portfolioNote: 'Wharton class currently heavy in finance-to-finance; adcom actively seeking differentiated profiles with real operating or public-sector depth.',
    updatedCycle: '2026-2027',
  },
  kellogg_mba: {
    overIndexed: ['marketing_to_brand_leadership', 'consulting_to_pe'],
    underIndexed: ['engineering_to_product', 'nonprofit_leadership'],
    portfolioNote: 'Kellogg rewards collaborative leadership stories; candidates need a concrete team-impact anecdote, not just a stated pivot.',
    updatedCycle: '2026-2027',
  },
  booth_mba: {
    overIndexed: ['consulting_to_pe', 'banking_to_hedge_fund'],
    underIndexed: ['operator_to_vc', 'academic_to_industry'],
    portfolioNote: 'Booth values analytical rigor across any pivot; vague "I like data" narratives underperform specific, testable reasoning.',
    updatedCycle: '2026-2027',
  },
  columbia_mba: {
    overIndexed: ['banking_to_pe', 'consulting_to_corporate_strategy'],
    underIndexed: ['media_entertainment', 'international_public_sector'],
    portfolioNote: 'Columbia leans on NYC finance/media proximity; underrepresented geographies or sectors stand out more than another finance path.',
    updatedCycle: '2026-2027',
  },
  mit_sloan: {
    overIndexed: ['engineering_to_product', 'consulting_to_startup_founder'],
    underIndexed: ['nonprofit_leadership', 'healthcare_operator'],
    portfolioNote: 'Sloan rewards demonstrated technical depth; a pivot narrative without a concrete technical proof point reads thin.',
    updatedCycle: '2026-2027',
  },
  haas_mba: {
    overIndexed: ['tech_operator_to_product', 'consulting_to_startup_founder'],
    underIndexed: ['social_impact', 'international_public_sector'],
    portfolioNote: 'Haas prizes "Beyond Yourself" — narratives need genuine community/impact evidence, not just a career-advancement framing.',
    updatedCycle: '2026-2027',
  },
  yale_som: {
    overIndexed: ['consulting_to_social_impact', 'nonprofit_to_social_impact'],
    underIndexed: ['finance_operator', 'engineering_to_product'],
    portfolioNote: 'SOM already skews mission-driven; a differentiated commercial/operating story now stands out more than another impact narrative.',
    updatedCycle: '2026-2027',
  },
  duke_fuqua: {
    overIndexed: ['consulting_to_corporate_strategy', 'healthcare_operator'],
    underIndexed: ['international_public_sector', 'deep_tech_operator'],
    portfolioNote: 'Fuqua rewards "Team Fuqua" collaborative evidence; narratives light on teamwork specifics underperform.',
    updatedCycle: '2026-2027',
  },
  nyu_stern: {
    overIndexed: ['banking_to_pe', 'consulting_to_corporate_strategy'],
    underIndexed: ['media_entertainment', 'social_impact'],
    portfolioNote: 'Stern leans NYC finance-heavy; media/entertainment and mission-driven pivots differentiate more than another finance track.',
    updatedCycle: '2026-2027',
  },
  ucla_anderson: {
    overIndexed: ['consulting_to_pe', 'entertainment_finance'],
    underIndexed: ['deep_tech_operator', 'nonprofit_leadership'],
    portfolioNote: 'Anderson rewards concrete LA-market fit; generic pivots without a regional or industry hook underperform.',
    updatedCycle: '2026-2027',
  },
  london_business_school: {
    overIndexed: ['banking_to_pe', 'consulting_to_corporate_strategy'],
    underIndexed: ['operator_to_vc', 'emerging_markets_leadership'],
    portfolioNote: 'LBS prizes global/cross-border narratives; a pivot framed around a single home market underperforms.',
    updatedCycle: '2026-2027',
  },
  insead: {
    overIndexed: ['consulting_to_pe', 'banking_to_corporate_strategy'],
    underIndexed: ['operator_to_vc', 'emerging_markets_leadership', 'family_business_transition'],
    portfolioNote: 'INSEAD explicitly rewards multi-country, multi-lingual narratives; a single-market pivot story underperforms regardless of function.',
    updatedCycle: '2026-2027',
  },
  iese: {
    overIndexed: ['consulting_to_corporate_strategy', 'family_business_transition'],
    underIndexed: ['deep_tech_operator', 'social_impact'],
    portfolioNote: 'IESE values purpose-driven leadership framing; narratives need an explicit values/impact thread, not just a functional pivot.',
    updatedCycle: '2026-2027',
  },
  imd: {
    overIndexed: ['consulting_to_general_management', 'engineering_to_general_management'],
    underIndexed: ['startup_founder', 'social_impact'],
    portfolioNote: 'IMD\'s small, experienced cohort rewards demonstrated general-management readiness over an early-career pivot story.',
    updatedCycle: '2026-2027',
  },
};

// Common display-name variants (e.g. what a candidate's chosenSchools entry
// or programs list actually stores) mapped to the slugs used as keys above.
// Shared by lib/narrative/employment-outcomes.js via resolveSchoolSlug so
// both curated tables stay keyed the same way.
const SCHOOL_NAME_ALIASES = {
  harvard: 'hbs_mba', 'harvard business school': 'hbs_mba', hbs: 'hbs_mba',
  stanford: 'stanford_gsb', 'stanford gsb': 'stanford_gsb', gsb: 'stanford_gsb',
  wharton: 'wharton_mba', 'university of pennsylvania': 'wharton_mba', upenn: 'wharton_mba',
  kellogg: 'kellogg_mba', northwestern: 'kellogg_mba',
  booth: 'booth_mba', 'university of chicago': 'booth_mba', chicago: 'booth_mba',
  columbia: 'columbia_mba', 'columbia business school': 'columbia_mba',
  mit: 'mit_sloan', sloan: 'mit_sloan', 'mit sloan': 'mit_sloan',
  haas: 'haas_mba', berkeley: 'haas_mba', 'uc berkeley': 'haas_mba',
  yale: 'yale_som', som: 'yale_som', 'yale som': 'yale_som',
  duke: 'duke_fuqua', fuqua: 'duke_fuqua',
  nyu: 'nyu_stern', stern: 'nyu_stern', 'nyu stern': 'nyu_stern',
  ucla: 'ucla_anderson', anderson: 'ucla_anderson',
  lbs: 'london_business_school', 'london business school': 'london_business_school',
  insead: 'insead',
  iese: 'iese',
  imd: 'imd',
};

export function resolveSchoolSlug(schoolName) {
  const clean = String(schoolName || '').trim().toLowerCase();
  if (!clean) return null;
  if (SCHOOL_NAME_ALIASES[clean]) return SCHOOL_NAME_ALIASES[clean];
  const slugified = clean.replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  return SCHOOL_NAME_ALIASES[slugified] || slugified || null;
}

export function getSchoolNeeds(schoolSlug) {
  const slug = String(schoolSlug || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return SCHOOL_PORTFOLIO_NEEDS[slug] || null;
}
