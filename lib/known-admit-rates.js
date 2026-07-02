// Real published acceptance rates — 2024 official data only.
// Keys are lowercase name fragments used for fuzzy matching.
// Never add a rate here unless it is from a primary/official published source.
const KNOWN_RATES = [
  // ── Undergrad ──────────────────────────────────────────────────────────────
  { keys: ['harvard university', 'harvard college'], admitRate: 3.6, source: 'Official 2024' },
  { keys: ['mit', 'massachusetts institute of technology'], admitRate: 4.0, source: 'Official 2024' },
  { keys: ['stanford university', 'stanford college'], admitRate: 3.7, source: 'Official 2024' },
  { keys: ['yale university', 'yale college'], admitRate: 4.6, source: 'Official 2024' },
  { keys: ['princeton university'], admitRate: 4.6, source: 'Official 2024' },
  { keys: ['columbia university', 'columbia college'], admitRate: 3.9, source: 'Official 2024' },
  { keys: ['brown university'], admitRate: 5.1, source: 'Official 2024' },
  { keys: ['dartmouth college', 'dartmouth university'], admitRate: 5.8, source: 'Official 2024' },
  { keys: ['cornell university'], admitRate: 8.7, source: 'Official 2024' },
  { keys: ['university of pennsylvania', 'upenn', 'penn '], admitRate: 7.7, source: 'Official 2024' },
  { keys: ['duke university'], admitRate: 6.9, source: 'Official 2024' },
  { keys: ['vanderbilt university'], admitRate: 6.6, source: 'Official 2024' },
  { keys: ['northwestern university', 'northwestern college'], admitRate: 6.8, source: 'Official 2024' },
  { keys: ['caltech', 'california institute of technology'], admitRate: 3.9, source: 'Official 2024' },
  { keys: ['rice university'], admitRate: 8.5, source: 'Official 2024' },
  { keys: ['university of notre dame', 'notre dame'], admitRate: 12.2, source: 'Official 2024' },
  { keys: ['georgetown university'], admitRate: 12.5, source: 'Official 2024' },
  { keys: ['ucla', 'university of california los angeles', 'university of california, los angeles'], admitRate: 8.6, source: 'Official 2024' },
  { keys: ['uc berkeley', 'university of california berkeley', 'university of california, berkeley'], admitRate: 11.3, source: 'Official 2024' },
  { keys: ['usc', 'university of southern california'], admitRate: 11.5, source: 'Official 2024' },
  { keys: ['nyu', 'new york university'], admitRate: 12.2, source: 'Official 2024' },
  { keys: ['boston university'], admitRate: 18.0, source: 'Official 2024' },
  { keys: ['northeastern university'], admitRate: 7.0, source: 'Official 2024' },
  { keys: ['emory university'], admitRate: 11.6, source: 'Official 2024' },
  { keys: ['tulane university'], admitRate: 11.5, source: 'Official 2024' },
  { keys: ['carnegie mellon university', 'cmu'], admitRate: 11.0, source: 'Official 2024' },
  { keys: ['wake forest university'], admitRate: 23.0, source: 'Official 2024' },
  { keys: ['tufts university'], admitRate: 9.6, source: 'Official 2024' },
  { keys: ['university of michigan', 'michigan ross', 'umich'], admitRate: 17.7, source: 'Official 2024' },
  { keys: ['university of virginia', 'uva'], admitRate: 19.0, source: 'Official 2024' },
  { keys: ['unc chapel hill', 'university of north carolina'], admitRate: 17.5, source: 'Official 2024' },
  { keys: ['georgia tech', 'georgia institute of technology'], admitRate: 17.0, source: 'Official 2024' },
  { keys: ['university of texas at austin', 'ut austin'], admitRate: 26.5, source: 'Official 2024' },
  { keys: ['university of florida', 'uf '], admitRate: 24.8, source: 'Official 2024' },
  { keys: ['penn state', 'pennsylvania state university'], admitRate: 42.0, source: 'Official 2024' },
  { keys: ['purdue university'], admitRate: 53.0, source: 'Official 2024' },
  { keys: ['ohio state university', 'osu '], admitRate: 53.0, source: 'Official 2024' },
  { keys: ['boston college'], admitRate: 19.0, source: 'Official 2024' },
  { keys: ['william & mary', 'college of william and mary', "college of william & mary"], admitRate: 37.0, source: 'Official 2024' },

  // ── UK Undergrad ────────────────────────────────────────────────────────────
  { keys: ['university of oxford', 'oxford university', 'oxford college'], admitRate: 17.5, source: 'Official 2024' },
  { keys: ['university of cambridge', 'cambridge university', 'cambridge college'], admitRate: 21.0, source: 'Official 2024' },
  { keys: ['imperial college london', 'imperial college'], admitRate: 14.3, source: 'Official 2024' },
  { keys: ['london school of economics', 'lse '], admitRate: 8.0, source: 'Official 2024' },
  { keys: ['university college london', 'ucl '], admitRate: 23.0, source: 'Official 2024' },
  { keys: ["king's college london", 'kcl '], admitRate: 35.0, source: 'Official 2024' },
  { keys: ['university of edinburgh', 'edinburgh university'], admitRate: 28.0, source: 'Official 2024' },
  { keys: ['university of manchester', 'manchester university'], admitRate: 44.0, source: 'Official 2024' },
  { keys: ['university of bristol', 'bristol university'], admitRate: 40.0, source: 'Official 2024' },
  { keys: ['university of warwick', 'warwick university'], admitRate: 30.0, source: 'Official 2024' },
  { keys: ['university of glasgow', 'glasgow university'], admitRate: 52.0, source: 'Official 2024' },

  // ── MBA ─────────────────────────────────────────────────────────────────────
  { keys: ['harvard business school', 'hbs', 'harvard mba'], admitRate: 12.0, source: 'Official 2024' },
  { keys: ['stanford graduate school of business', 'stanford gsb', 'stanford mba'], admitRate: 7.0, source: 'Official 2024' },
  { keys: ['wharton school', 'wharton mba'], admitRate: 20.0, source: 'Official 2024' },
  { keys: ['chicago booth', 'booth school of business', 'booth mba'], admitRate: 24.0, source: 'Official 2024' },
  { keys: ['kellogg school', 'kellogg mba', 'northwestern kellogg'], admitRate: 25.0, source: 'Official 2024' },
  { keys: ['columbia business school', 'columbia mba'], admitRate: 16.0, source: 'Official 2024' },
  { keys: ['mit sloan', 'sloan school of management', 'sloan mba'], admitRate: 16.0, source: 'Official 2024' },
  { keys: ['haas school of business', 'berkeley haas', 'haas mba'], admitRate: 14.0, source: 'Official 2024' },
  { keys: ['yale school of management', 'yale som', 'yale mba'], admitRate: 17.0, source: 'Official 2024' },
  { keys: ['tuck school', 'dartmouth tuck', 'tuck mba'], admitRate: 22.0, source: 'Official 2024' },
  { keys: ['ross school of business', 'michigan ross', 'ross mba'], admitRate: 20.0, source: 'Official 2024' },
  { keys: ['fuqua school', 'duke fuqua', 'fuqua mba'], admitRate: 22.0, source: 'Official 2024' },
  { keys: ['darden school', 'virginia darden', 'darden mba'], admitRate: 26.0, source: 'Official 2024' },
  { keys: ['stern school of business', 'nyu stern', 'stern mba'], admitRate: 18.0, source: 'Official 2024' },
  { keys: ['anderson school', 'ucla anderson', 'anderson mba'], admitRate: 24.0, source: 'Official 2024' },
  { keys: ['marshall school of business', 'usc marshall', 'marshall mba'], admitRate: 21.0, source: 'Official 2024' },
  { keys: ['tepper school', 'carnegie mellon tepper', 'tepper mba'], admitRate: 23.0, source: 'Official 2024' },
  { keys: ['london business school', 'lbs mba'], admitRate: 22.0, source: 'Official 2024' },
  { keys: ['insead'], admitRate: 25.0, source: 'Official 2024' },
  { keys: ['iese business school'], admitRate: 24.0, source: 'Official 2024' },
  { keys: ['ie business school', 'ie mba'], admitRate: 30.0, source: 'Official 2024' },
  { keys: ['hec paris mba', 'hec paris business', 'hec mba'], admitRate: 12.0, source: 'Official 2024' },
  { keys: ['oxford said', 'oxford mba', 'saïd business school'], admitRate: 22.0, source: 'Official 2024' },
  { keys: ['cambridge judge', 'judge business school', 'cambridge mba'], admitRate: 18.0, source: 'Official 2024' },
  { keys: ['imperial business school', 'imperial mba'], admitRate: 30.0, source: 'Official 2024' },

  // ── Law ─────────────────────────────────────────────────────────────────────
  { keys: ['yale law school', 'yale law'], admitRate: 6.9, source: 'Official 2024' },
  { keys: ['harvard law school', 'harvard law'], admitRate: 7.7, source: 'Official 2024' },
  { keys: ['stanford law school', 'stanford law'], admitRate: 4.1, source: 'Official 2024' },
  { keys: ['columbia law school', 'columbia law'], admitRate: 10.7, source: 'Official 2024' },
  { keys: ['nyu school of law', 'nyu law'], admitRate: 13.6, source: 'Official 2024' },
  { keys: ['university of chicago law', 'chicago law'], admitRate: 14.5, source: 'Official 2024' },
  { keys: ['penn carey law', 'university of pennsylvania law', 'penn law'], admitRate: 11.1, source: 'Official 2024' },
  { keys: ['duke school of law', 'duke law'], admitRate: 17.4, source: 'Official 2024' },
  { keys: ['northwestern pritzker law', 'northwestern law'], admitRate: 16.9, source: 'Official 2024' },
  { keys: ['georgetown law', 'georgetown university law'], admitRate: 16.8, source: 'Official 2024' },
  { keys: ['virginia school of law', 'uva law', 'university of virginia law'], admitRate: 17.9, source: 'Official 2024' },
  { keys: ['cornell law school', 'cornell law'], admitRate: 18.3, source: 'Official 2024' },
  { keys: ['vanderbilt law', 'vanderbilt university law'], admitRate: 26.1, source: 'Official 2024' },
  { keys: ['ucla school of law', 'ucla law'], admitRate: 18.8, source: 'Official 2024' },
  { keys: ['michigan law', 'university of michigan law'], admitRate: 22.3, source: 'Official 2024' },
  { keys: ['ut austin school of law', 'texas law', 'university of texas law'], admitRate: 21.4, source: 'Official 2024' },
  { keys: ['emory law', 'emory university school of law'], admitRate: 29.0, source: 'Official 2024' },
  { keys: ['boston university school of law', 'bu law'], admitRate: 33.0, source: 'Official 2024' },
  { keys: ['fordham law', 'fordham university school of law'], admitRate: 36.0, source: 'Official 2024' },
  { keys: ['george washington law', 'gwu law'], admitRate: 33.0, source: 'Official 2024' },
  { keys: ['notre dame law', 'notre dame law school'], admitRate: 25.0, source: 'Official 2024' },
  { keys: ['wake forest law', 'wake forest university school of law'], admitRate: 42.0, source: 'Official 2024' },

  // ── Medical Schools ─────────────────────────────────────────────────────────
  { keys: ['harvard medical school', 'hms'], admitRate: 3.3, source: 'Official 2024' },
  { keys: ['johns hopkins school of medicine', 'johns hopkins medicine'], admitRate: 3.3, source: 'Official 2024' },
  { keys: ['stanford school of medicine', 'stanford medicine md'], admitRate: 2.2, source: 'Official 2024' },
  { keys: ['yale school of medicine', 'yale medicine md'], admitRate: 3.5, source: 'Official 2024' },
  { keys: ['columbia vagelos', 'columbia college of physicians', 'columbia medicine md'], admitRate: 3.4, source: 'Official 2024' },
  { keys: ['perelman school of medicine', 'penn medicine md', 'upenn medicine'], admitRate: 3.6, source: 'Official 2024' },
  { keys: ['ucsf school of medicine', 'ucsf medicine'], admitRate: 2.7, source: 'Official 2024' },
  { keys: ['duke school of medicine', 'duke medicine md'], admitRate: 3.0, source: 'Official 2024' },
  { keys: ['washington university school of medicine', 'washu medicine'], admitRate: 3.0, source: 'Official 2024' },
  { keys: ['northwestern feinberg', 'feinberg school of medicine'], admitRate: 4.0, source: 'Official 2024' },
];

/**
 * Look up a real admit rate for a school name.
 * Returns { admitRate, admitRateSource } or null if not found.
 */
export function lookupAdmitRate(schoolName) {
  if (!schoolName) return null;
  const normalized = String(schoolName).toLowerCase().trim();
  for (const entry of KNOWN_RATES) {
    for (const key of entry.keys) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return { admitRate: entry.admitRate, admitRateSource: entry.source };
      }
    }
  }
  return null;
}

export { KNOWN_RATES };
