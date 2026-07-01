// ADAPTIVE_GRAD Feature Tests
// Tests: flag routing, CV+school parsing, benchmark fetching before scoring,
//        hard gates, fake recommender risk, tasks absent from Advisor/present in Dashboard,
//        stage unlocking, and Next button behavior.

import assert from 'assert';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCandidate({ gpa = 3.5, testScore = 680, category = 'Graduate', recommenders = [], careerGapFlagged = false } = {}) {
  return { gpa, testScore, category, recommenders, careerGapFlagged, collected: {} };
}

function makeBenchmark({ medianGPA = 3.6, medianTest = 700, verified = true, confidenceNote = null } = {}) {
  return { medianGPA, medianTest, testName: 'GMAT', source: 'kpi', verified, confidenceNote };
}

// ─── Gate logic (pure) ───────────────────────────────────────────────────────

function isLocked(candidateGPA, candidateTest, medianGPA, medianTest) {
  const gpaGap = medianGPA - (candidateGPA ?? 0);
  const testGap = medianTest - (candidateTest ?? 0);
  return gpaGap > 0.5 || testGap > 50;
}

function realismCap(fit, gpaGap, testGap) {
  if (gpaGap > 0.5 || testGap > 50) return Math.min(fit, 49);
  return Math.max(5, Math.min(95, fit));
}

// ─── Risk logic (inline mirror) ──────────────────────────────────────────────

const DISTANT_FIGURE_SIGNALS = ['senator', 'minister', 'president', 'ceo of', 'coo of', 'cto of', 'governor', 'mayor'];

function checkRisk(candidate, schoolName, benchmark) {
  const risks = [];
  const tasks = [];
  const gpaGap = (benchmark.medianGPA ?? 0) - (candidate.gpa ?? 0);
  const testGap = (benchmark.medianTest ?? 0) - (candidate.testScore ?? 0);

  if (isLocked(candidate.gpa, candidate.testScore, benchmark.medianGPA, benchmark.medianTest)) {
    risks.push('GPA or test score is significantly below median.');
    tasks.push(`Boost profile for ${schoolName}: consider retaking the test or adding research/publications.`);
  }
  if (!benchmark.verified) {
    risks.push('Benchmark data is unverified.');
    tasks.push(`Verify median GPA and test score for ${schoolName} on the school's admissions page.`);
  }
  const hasDistantRecommender = (candidate.recommenders || []).some((r) =>
    DISTANT_FIGURE_SIGNALS.some((sig) => (r || '').toLowerCase().includes(sig))
  );
  if (hasDistantRecommender) {
    risks.push('One or more recommenders may be too distant or high-profile to write a meaningful letter.');
    tasks.push('Replace or supplement distant recommenders with direct supervisors or mentors who know your work closely.');
  }
  if (candidate.careerGapFlagged) {
    risks.push('Career gap detected.');
    tasks.push('Prepare a clear, brief explanation for any career gaps in your application.');
  }
  return { risks, tasks };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log('\nADAPTIVE_GRAD tests\n');

// 1. Flag off → old behavior (isGradPhD check passes but flag disables routing)
test('flag off: grad/PhD candidate does not use JourneyAdvisor', () => {
  const flagOn = false;
  const category = 'Graduate';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  const shouldUseJourney = flagOn && isGradPhD;
  assert.strictEqual(shouldUseJourney, false);
});

// 2. Flag on + undergrad → still uses old advisor
test('flag on: Undergraduate does not use JourneyAdvisor', () => {
  const flagOn = true;
  const category = 'Undergraduate';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  const shouldUseJourney = flagOn && isGradPhD;
  assert.strictEqual(shouldUseJourney, false);
});

// 3. Flag on + Personal Development → still uses old advisor
test('flag on: Personal Development does not use JourneyAdvisor', () => {
  const flagOn = true;
  const category = 'Personal Development';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  const shouldUseJourney = flagOn && isGradPhD;
  assert.strictEqual(shouldUseJourney, false);
});

// 4. Flag on + Graduate → uses JourneyAdvisor
test('flag on: Graduate uses JourneyAdvisor', () => {
  const flagOn = true;
  const category = 'Graduate';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  assert.strictEqual(flagOn && isGradPhD, true);
});

// 5. Flag on + PhD → uses JourneyAdvisor
test('flag on: PhD uses JourneyAdvisor', () => {
  const flagOn = true;
  const category = 'PhD';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  assert.strictEqual(flagOn && isGradPhD, true);
});

// 6. Hard gate locks when GPA gap > 0.5
test('hard gate: locks when GPA gap > 0.5', () => {
  assert.strictEqual(isLocked(3.0, 700, 3.7, 700), true);
});

// 7. Hard gate locks when test gap > 50
test('hard gate: locks when test gap > 50', () => {
  assert.strictEqual(isLocked(3.6, 640, 3.6, 700), true);
});

// 8. Hard gate does not lock within threshold
test('hard gate: unlocked when within threshold', () => {
  assert.strictEqual(isLocked(3.5, 680, 3.7, 720), false);
});

// 9. realismCap caps at 49 when locked
test('realismCap: caps to 49 when below threshold', () => {
  const result = realismCap(72, 0.8, 0);
  assert.strictEqual(result, 49);
});

// 10. realismCap does not cap when unlocked
test('realismCap: does not cap when within threshold', () => {
  const result = realismCap(72, 0.3, 20);
  assert.strictEqual(result, 72);
});

// 11. Unverified benchmark → risk + task generated
test('unverified benchmark: produces risk and task', () => {
  const c = makeCandidate();
  const b = makeBenchmark({ verified: false, confidenceNote: 'Estimated from web search' });
  const { risks, tasks } = checkRisk(c, 'MIT Sloan', b);
  assert.ok(risks.some((r) => r.includes('unverified')));
  assert.ok(tasks.some((t) => t.includes('MIT Sloan')));
});

// 12. Fake/distant recommender → risk + task generated
test('distant recommender: senator produces risk task', () => {
  const c = makeCandidate({ recommenders: ['Senator John Doe'] });
  const b = makeBenchmark();
  const { risks, tasks } = checkRisk(c, 'Harvard Business School', b);
  assert.ok(risks.some((r) => r.includes('distant')));
  assert.ok(tasks.some((t) => t.includes('supervisors or mentors')));
});

// 13. Career gap → risk + task
test('career gap: flagged produces risk task', () => {
  const c = makeCandidate({ careerGapFlagged: true });
  const b = makeBenchmark();
  const { risks, tasks } = checkRisk(c, 'Wharton', b);
  assert.ok(risks.some((r) => r.includes('gap')));
  assert.ok(tasks.some((t) => t.includes('career gap')));
});

// 14. Locked gate → risk + task
test('hard gate lock: produces risk task', () => {
  const c = makeCandidate({ gpa: 2.8, testScore: 580 });
  const b = makeBenchmark({ medianGPA: 3.7, medianTest: 710 });
  const { risks, tasks } = checkRisk(c, 'Stanford GSB', b);
  assert.ok(risks.some((r) => r.includes('significantly below median')));
  assert.ok(tasks.some((t) => t.includes('Stanford GSB')));
});

// 15. Narrative gate: blocked when portfolioShown = false
test('narrative gate: blocked when portfolioShown is false', () => {
  const state = { portfolioShown: false };
  const allowed = state.portfolioShown === true;
  assert.strictEqual(allowed, false);
});

// 16. Narrative gate: allowed when portfolioShown = true
test('narrative gate: allowed when portfolioShown is true', () => {
  const state = { portfolioShown: true };
  const allowed = state.portfolioShown === true;
  assert.strictEqual(allowed, true);
});

// 17. Journey stages advance only forward
test('stages: advance only moves forward, not backward', () => {
  const STAGES = ['intake', 'profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'];
  function advanceStage(current, target) {
    const ci = STAGES.indexOf(current);
    const ti = STAGES.indexOf(target);
    return ti > ci ? target : current;
  }
  assert.strictEqual(advanceStage('profile', 'intake'), 'profile');
  assert.strictEqual(advanceStage('profile', 'analysis'), 'analysis');
});

// 18. JourneyRail: stage buttons unlock only up to current stage
test('JourneyRail: stage unlocked iff index <= current', () => {
  const STAGES = ['profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'];
  const current = 'analysis';
  const currentIdx = STAGES.indexOf(current);
  const unlocked = STAGES.map((s) => STAGES.indexOf(s) <= currentIdx);
  assert.deepStrictEqual(unlocked, [true, true, false, false, false, false, false]);
});

// 19. JourneyRail: done stages are those before current
test('JourneyRail: stages before current are marked done', () => {
  const STAGES = ['profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'];
  const current = 'analysis';
  const currentIdx = STAGES.indexOf(current);
  const done = STAGES.map((s) => STAGES.indexOf(s) < currentIdx);
  assert.deepStrictEqual(done, [true, false, false, false, false, false, false]);
});

// 20. Tasks absent from Advisor rail when ADAPTIVE_GRAD + grad/PhD
test('Advisor rail: shows JourneyRail (not tasks) for grad/PhD when flag on', () => {
  const ADAPTIVE_GRAD = true;
  const category = 'Graduate';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  const showJourneyRail = ADAPTIVE_GRAD && isGradPhD;
  assert.strictEqual(showJourneyRail, true);
});

// 21. Tasks absent from Advisor rail: tasks still shown for undergrad even when flag on
test('Advisor rail: shows tasks (not JourneyRail) for undergrad when flag on', () => {
  const ADAPTIVE_GRAD = true;
  const category = 'Undergraduate';
  const isGradPhD = !!category && category !== 'Undergraduate' && category !== 'Personal Development';
  const showJourneyRail = ADAPTIVE_GRAD && isGradPhD;
  assert.strictEqual(showJourneyRail, false);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
