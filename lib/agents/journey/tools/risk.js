// Risk analysis per school. Returns risks (descriptions) and tasks (action items).
// Never invents risks — only flags concrete evidence issues.

import { isLocked, isThinProfile, unlockConditions } from './gates.js';
import { createAnthropicClient } from '../../../anthropic-client.js';

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 1 };

// Names that are commonly cited but rarely have a direct evaluative relationship.
const DISTANT_FIGURE_SIGNALS = [
  'senator', 'minister', 'president', 'prime minister', 'governor',
  'ceo of', 'founder of', 'chairman',
  'nobel', 'olympic',
];

function isHighProfileDistant(recommenderDescription) {
  if (!recommenderDescription) return false;
  const lower = recommenderDescription.toLowerCase();
  return DISTANT_FIGURE_SIGNALS.some((s) => lower.includes(s));
}

export function checkRisk(candidate, school, benchmark) {
  const risks = [];
  const tasks = [];

  const gpa = candidate?.gpa ?? null;
  const testScore = candidate?.testScore ?? null;
  const medianGPA = benchmark?.medianGPA ?? null;
  const medianTest = benchmark?.medianTest ?? null;

  // 1. Hard gate
  if (medianGPA && gpa !== null && isLocked(gpa, testScore, medianGPA, medianTest)) {
    const gaps = unlockConditions(gpa - medianGPA, testScore != null && medianTest != null ? testScore - medianTest : 0);
    risks.push({ type: 'locked_gate', description: `GPA or test score is more than 0.5/50 points below ${school} median.`, severity: 'high' });
    gaps.forEach((g) => tasks.push(g));
  }

  // 2. Unverified benchmark
  if (!benchmark?.verified) {
    risks.push({ type: 'unverified_benchmark', description: `Median GPA/test for ${school} could not be confirmed from a published source. Fit score is low confidence.`, severity: 'medium' });
    tasks.push(`Verify the official median GPA and ${benchmark?.testName || 'test'} score for ${school} on the program website.`);
  }

  // 3. Thin evidence
  const programType = candidate?.programType || candidate?.track;
  if (isThinProfile(candidate?.collected, programType)) {
    risks.push({ type: 'thin_evidence', description: `Key evidence for a ${programType || 'graduate'} application is missing or sparse.`, severity: 'medium' });
    tasks.push(`Complete the ${programType || 'program'}-specific evidence checklist: work experience, test scores, and a clear career goal are all needed before applying to ${school}.`);
  }

  // 4. Recommender quality
  const recommenders = candidate?.recommenders || candidate?.collected?.recommenders || [];
  if (Array.isArray(recommenders)) {
    recommenders.forEach((rec) => {
      const desc = typeof rec === 'string' ? rec : (rec?.description || rec?.role || '');
      const hasDirectLink = typeof rec === 'object' && rec?.directLink === true;
      if (isHighProfileDistant(desc) && !hasDirectLink) {
        risks.push({
          type: 'weak_recommender',
          description: `Recommender "${rec?.name || desc}" appears high-profile but has no confirmed direct evaluative relationship with the candidate. A big name without a real link is a risk, not a strength.`,
          severity: 'high',
        });
        tasks.push(`Confirm that "${rec?.name || desc}" directly supervised, taught, or evaluated you and can cite concrete achievements. If not, secure a closer recommender for ${school}.`);
      }
    });
  }

  // 5. Career gap
  if (candidate?.careerGapFlagged) {
    risks.push({ type: 'unexplained_gap', description: 'An unexplained career gap was flagged. Admissions committees will ask about it.', severity: 'medium' });
    tasks.push('Write a one-paragraph explanation of your career gap to include in the additional information section of applications.');
  }

  return { risks, tasks };
}

export async function assess_risk(candidateId, school, { candidate = {}, benchmark = {} } = {}) {
  const result = checkRisk(candidate, school, benchmark);
  const namedClaims = [
    ...(candidate?.recommenders || []).filter((item) => typeof item === 'object' && item?.name && item?.directLink !== true).map((item) => `recommender relationship with ${item.name}`),
    ...(candidate?.collected?.awards || []).map((item) => `award ${typeof item === 'string' ? item : item?.name}`).filter((item) => !item.endsWith('undefined')),
  ];
  for (const claim of namedClaims.slice(0, 2)) {
    try {
      const client = createAnthropicClient();
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        tools: [WEB_SEARCH_TOOL],
        messages: [{ role: 'user', content: `Verify whether public evidence supports this candidate claim: ${claim}. Reply only VERIFIED or UNVERIFIED. Do not infer a personal relationship from the person's fame.` }],
      });
      const verdict = (response.content || []).filter((block) => block.type === 'text').map((block) => block.text).join(' ').toUpperCase();
      if (!verdict.includes('VERIFIED') || verdict.includes('UNVERIFIED')) {
        result.risks.push({ type: 'claim_verification', description: `The claim "${claim}" could not be verified.`, severity: 'high' });
        result.tasks.push(`Collect direct evidence for ${claim}, or remove the claim from the ${school} application.`);
      }
    } catch {
      result.risks.push({ type: 'claim_verification', description: `The claim "${claim}" could not be verified.`, severity: 'medium' });
      result.tasks.push(`Collect direct evidence for ${claim} before using it in the ${school} application.`);
    }
  }
  const risks = result.risks.slice(0, 3);
  return {
    candidateId,
    school,
    risks,
    tasks: [...new Set(result.tasks)],
    riskFlags: [...new Set(risks.map((risk) => risk.type))],
  };
}

export const assessRisk = assess_risk;
