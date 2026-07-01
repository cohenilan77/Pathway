// Fetch real GPA and test medians for a school/program.
// Priority: (1) program:* Redis keys, (2) web_search via Anthropic tool, (3) null.
// Never returns a made-up number. Marks confidence explicitly.

import { getStore } from '../../../store.js';
import { createAnthropicClient } from '../../../anthropic-client.js';

const client = createAnthropicClient();
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };

// Search the program:* Redis keys (loaded by the admin KPI import).
async function searchKpiStore(schoolName, programType) {
  try {
    const store = getStore();
    const allKeys = await store.keys('program:*');
    const items = await Promise.all(allKeys.map((k) => store.get(k)));
    const name = schoolName.toLowerCase();
    const type = (programType || '').toLowerCase();
    for (const p of items) {
      if (!p) continue;
      const pName = (p.name || p.school || '').toLowerCase();
      const pDeg = (p.degree || '').toLowerCase();
      if (!pName.includes(name) && !name.includes(pName.split(' ')[0])) continue;
      if (type && pDeg && !pDeg.includes(type)) continue;
      if (p.avgGpa || p.avgGmat || p.avgGre || p.avgLsat || p.avgMcat) {
        return {
          medianGPA: p.avgGpa ? Number(p.avgGpa) : null,
          medianTest: p.avgGmat || p.avgGre || p.avgLsat || p.avgMcat
            ? Number(p.avgGmat || p.avgGre || p.avgLsat || p.avgMcat)
            : null,
          testName: p.avgGmat ? 'GMAT' : p.avgGre ? 'GRE' : p.avgLsat ? 'LSAT' : p.avgMcat ? 'MCAT' : null,
          source: 'database',
          verified: true,
          confidenceNote: null,
        };
      }
    }
  } catch { /* store miss is fine */ }
  return null;
}

// Check the Redis admit-rate cache for GPA/test data cached by SearchAgent.cacheAdmitRate.
async function searchRateCache(schoolName) {
  try {
    const store = getStore();
    const cached = await store.get(`admitrate:${schoolName.toLowerCase().trim()}`);
    if (cached) {
      const obj = typeof cached === 'object' ? cached : JSON.parse(cached);
      if (obj.medianGPA || obj.medianTest) return { ...obj, source: 'cache', verified: true, confidenceNote: null };
    }
  } catch { /* cache miss */ }
  return null;
}

// Web search fallback via Anthropic's built-in web_search tool.
async function searchWeb(schoolName, programType) {
  const query = `${schoolName} ${programType || ''} average GPA GMAT GRE median admitted class profile`;
  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      tools: [WEB_SEARCH_TOOL],
      messages: [{
        role: 'user',
        content: `Find the median/average admitted GPA and standardized test score (GMAT/GRE/LSAT/MCAT) for ${schoolName} ${programType || ''}. Reply with ONLY a JSON object: { medianGPA, medianTest, testName, source }. If you cannot find a real published number, set the field to null. Do not guess.`,
      }],
    });
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      const hasData = obj.medianGPA != null || obj.medianTest != null;
      return hasData
        ? { medianGPA: obj.medianGPA, medianTest: obj.medianTest, testName: obj.testName || null, source: obj.source || 'web_search', verified: true, confidenceNote: null }
        : null;
    }
  } catch { /* web search failure is non-fatal */ }
  return null;
}

export async function fetchBenchmark(schoolName, programType) {
  if (!schoolName) return { medianGPA: null, medianTest: null, testName: null, source: null, verified: false, confidenceNote: 'School name missing' };

  const fromKpi = await searchKpiStore(schoolName, programType);
  if (fromKpi) return fromKpi;

  const fromCache = await searchRateCache(schoolName);
  if (fromCache) return fromCache;

  const fromWeb = await searchWeb(schoolName, programType);
  if (fromWeb) return fromWeb;

  return {
    medianGPA: null,
    medianTest: null,
    testName: null,
    source: null,
    verified: false,
    confidenceNote: `Median GPA/test for ${schoolName} could not be verified. Fit score marked low confidence.`,
  };
}
