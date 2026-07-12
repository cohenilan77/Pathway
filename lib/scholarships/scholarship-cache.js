// Scholarship data is NOT a separately curated list — it's discovered live,
// grounded in a real web_search the agent itself performs (per school
// already in our existing schools/programs database, or by field/
// background for outside scholarships), and cached here so the same
// school/query isn't re-searched on every turn. Nothing in this module
// ever invents a scholarship; every cached entry must carry the url the
// agent found it at.
import { getStore } from '../store.js';

const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function schoolCacheKey(schoolName) {
  return `scholarship_cache:school:${slugify(schoolName)}`;
}

function queryCacheKey(query) {
  return `scholarship_cache:query:${slugify(query)}`;
}

export function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function isFresh(entry, now = Date.now()) {
  return !!entry && Number.isFinite(entry.cachedAt) && (now - entry.cachedAt) < CACHE_TTL_MS;
}

// Returns { found, scholarships, cached, stale } — never throws, never
// invents. found:false + cached:false tells the caller (the agent's own
// prompt logic) to run a real web_search next and then call
// cacheScholarshipResults with what it verifies there.
export async function getCachedScholarships({ schoolName, query } = {}, now = Date.now()) {
  const key = schoolName ? schoolCacheKey(schoolName) : query ? queryCacheKey(query) : null;
  if (!key) return { found: false, scholarships: [], cached: false };
  const entry = await getStore().get(key);
  if (!entry) return { found: false, scholarships: [], cached: false };
  const fresh = isFresh(entry, now);
  return {
    found: Array.isArray(entry.scholarships) && entry.scholarships.length > 0,
    scholarships: entry.scholarships || [],
    cached: true,
    stale: !fresh,
  };
}

// Validates+persists scholarships the agent found via a real web_search this
// turn. Hard grounding: every entry MUST carry a name and a url, or it's
// dropped rather than cached — this is what makes fabrication structurally
// impossible to persist, even if the model tries.
export function sanitizeScholarshipEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(e => e && typeof e === 'object' && e.name && e.url)
    .map(e => ({
      name: String(e.name).slice(0, 200),
      url: String(e.url).slice(0, 500),
      amountUSD: Number.isFinite(Number(e.amountUSD)) ? Number(e.amountUSD) : null,
      amountType: e.amountType || null,
      eligibility: typeof e.eligibility === 'string' ? e.eligibility.slice(0, 500) : '',
      deadline: e.deadline || null,
      source: 'web',
    }))
    .slice(0, 15);
}

export async function cacheScholarshipResults({ schoolName, query, scholarships } = {}, now = Date.now()) {
  const key = schoolName ? schoolCacheKey(schoolName) : query ? queryCacheKey(query) : null;
  if (!key) return { error: 'missing_school_or_query' };
  const clean = sanitizeScholarshipEntries(scholarships);
  if (!clean.length) return { error: 'no_valid_entries' };
  await getStore().set(key, { scholarships: clean, cachedAt: now });
  return { status: 'cached', count: clean.length };
}

// School-list integration: a one-line callout when a real cached match
// exists for this school. Never triggers a live search itself (that would
// make school-list generation slow/expensive) — only surfaces what's
// already cached from a prior search. Synchronous-friendly callers should
// use scholarshipNoteForSchoolSync with a pre-fetched cache map instead.
export async function scholarshipNoteForSchool(schoolName) {
  const { found, scholarships } = await getCachedScholarships({ schoolName });
  if (!found) return null;
  const top = scholarships[0];
  const amount = top.amountUSD ? `$${top.amountUSD.toLocaleString()}` : (top.amountType || 'award');
  return `${top.name} — ${amount}.`;
}
