import assert from 'node:assert/strict';
import { buildCandidateFacts, buildComplementaryQuestion, extractWorkTimeline } from '../lib/candidate-facts.js';
import { CANDIDATE_KPI_SCHEMAS } from '../lib/candidate-kpi-schemas.js';
import { normalizeProgram } from '../lib/program-normalizer.js';

const fixedNow = new Date('2026-01-01T00:00:00Z');

// 1. Military and civilian dates are unioned independently, with no overlap double-counting.
{
  const timeline = extractWorkTimeline('IDF officer 2014-2017\nConsulting associate 2018-2024', fixedNow);
  assert.equal(timeline.militaryYears, 3);
  assert.equal(timeline.civilianWorkYears, 6);
  assert.equal(timeline.workYears, 9);

  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    cvExtraction: 'IDF officer 2014-2017\nConsulting associate 2018-2024',
    profile: {
      gpa: 3.7, gmat: 720, leadershipEvidence: 'Led a six-person team',
      careerProgression: 'Promoted twice', achievementsImpact: 'Raised revenue 20%',
      whyMBA: 'I need an MBA now to move into strategy leadership.',
      postMbaGoal: 'After the MBA I want to become a strategy director.',
    },
    targetSchools: ['INSEAD'],
    now: fixedNow,
  });
  assert.equal(facts.workYears, 9);
  assert.ok(!facts.profileCompleteness.missingFields.includes('workYears'));
}

// 2. Chat facts already supplied by the candidate are never requested again.
{
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    messages: [{
      role: 'user',
      text: 'My GPA is 3.8 and GMAT 730. My target schools are INSEAD and LBS. I want an MBA because I need general-management depth now. After the MBA I want to lead product strategy.',
    }],
    profile: {
      workYears: 6, leadershipEvidence: 'Led a product team',
      careerProgression: 'Promoted to manager', achievementsImpact: 'Launched a product used by 10,000 customers',
    },
    targetSchools: ['INSEAD', 'LBS'],
  });
  for (const field of ['academic', 'testScore', 'whyMBA', 'postMbaGoal']) {
    assert.ok(facts.profileCompleteness.knownFields.includes(field), `${field} should be known`);
    assert.ok(!facts.profileCompleteness.missingFields.includes(field), `${field} should not be missing`);
  }
  assert.equal(facts.schoolChoice, 'specific');
}

// 3. Missing leadership is incomplete, asked once, and never inferred as a low score.
{
  const base = {
    candidateType: 'MBA',
    profile: {
      workYears: 5, careerProgression: 'Promoted once', achievementsImpact: 'Improved margin 12%',
      gpa: 3.6, gmat: 710, whyMBA: 'MBA for a cross-functional transition',
      postMbaGoal: 'Move into product leadership',
    },
  };
  const first = buildCandidateFacts(base);
  assert.ok(first.profileCompleteness.missingFields.includes('leadershipEvidence'));
  assert.ok(!first.profileCompleteness.confirmedAbsentFields.includes('leadershipEvidence'));
  assert.match(buildComplementaryQuestion(first), /leadership/i);

  const second = buildCandidateFacts({
    ...base,
    messages: [{ role: 'ai', text: 'Please share one leadership example and outcome.' }],
  });
  assert.ok(second.profileCompleteness.askedFields.includes('leadershipEvidence'));
  assert.ok(!second.nextMissingFields.includes('leadershipEvidence'));
  assert.equal(buildComplementaryQuestion(second), '');
}

// 4. MBA KPI cards are candidate-level only and match the required model.
{
  const names = CANDIDATE_KPI_SCHEMAS.MBA.kpis.map(([, label]) => label);
  assert.deepEqual(names, [
    'Professional Experience', 'Leadership', 'Career Progression', 'Achievements / Impact',
    'Testing', 'Academic', 'Narrative / Why MBA', 'Post-MBA Goal Clarity',
    'Recommenders', 'International Exposure', 'Community / Extracurricular',
  ]);
  assert.ok(!names.some(name => /school fit/i.test(name)));
}

// 5-6. Every normalized school owns its fit metadata and exact tier color.
{
  const expected = {
    locked: 'grey', stretch: 'red', possible: 'yellow', safe: 'green',
  };
  for (const [tier, tierColor] of Object.entries(expected)) {
    const fit = { locked: 0, stretch: 40, possible: 65, safe: 85 }[tier];
    const program = normalizeProgram({
      name: `Test ${tier}`, tier, fit,
      admissionStatus: tier === 'locked' ? 'Not Eligible' : 'Competitive',
      evidenceGaps: tier === 'locked' ? ['Required prerequisite missing'] : ['Essay evidence'],
      riskFlags: ['Selective'],
      fitDrivers: ['Career alignment'],
      notes: 'A candidate-specific fit explanation.',
    });
    assert.equal(program.tierColor, tierColor);
    assert.equal(program.fitIndex, fit);
    assert.ok(Array.isArray(program.missingActions));
    assert.ok(program.fitExplanation);
  }
}

console.log('candidate facts and analysis flow checks passed');
