import assert from 'node:assert/strict';
import { buildCandidateFacts, buildComplementaryQuestion, extractWorkTimeline } from '../lib/candidate-facts.js';
import { CANDIDATE_KPI_SCHEMAS } from '../lib/candidate-kpi-schemas.js';
import { normalizeProgram } from '../lib/program-normalizer.js';
import { applyDeterministicKpiToResponse } from '../lib/deterministic-kpi-response.js';
import { longRunningStatus } from '../src/lib/longRunningAdvisorStatus.js';
import { buildProfileSourceBundle } from '../lib/profile-source-bundle.js';

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

// 7. CV education is a valid academic baseline even when no GPA is printed.
{
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    cvExtraction: 'Tel Aviv University — Bachelor of Arts in Economics, 2013\nConsultant 2018-2024',
    profile: {
      leadershipEvidence: 'Led the diligence workstream',
      careerProgression: 'Promoted to senior consultant',
      achievementsImpact: 'Reduced client costs by 15%',
      gmat: 720,
      whyMBA: 'I need an MBA now to move into general management.',
      postMbaGoal: 'After the MBA I want to lead corporate strategy.',
    },
  });
  assert.ok(facts.profileCompleteness.knownFields.includes('academic'));
  assert.ok(!facts.profileCompleteness.missingFields.includes('academic'));
}

// 8. The old deterministic fallback never replaces CV analysis with a generic prompt.
{
  const previous = process.env.DETERMINISTIC_KPI_ENGINE;
  process.env.DETERMINISTIC_KPI_ENGINE = 'true';
  const response = applyDeterministicKpiToResponse({
    raw: 'I extracted your CV details.<SCORES>{"overall":40}</SCORES><PROGRAMS>[]</PROGRAMS>',
    message: 'I extracted your CV details.',
    statePatch: { profile: { category: 'MBA', education: ['Bachelor of Arts'] } },
  }, {
    candidateState: { message: 'Here is my CV', profile: { category: 'MBA' } },
  });
  assert.ok(!response.raw.includes('I have the initial profile facts'));
  assert.ok(!response.raw.includes('To finish the score'));
  assert.ok(!response.raw.includes('<SCORES>'));
  assert.ok(!response.raw.includes('<PROGRAMS>'));
  if (previous == null) delete process.env.DETERMINISTIC_KPI_ENGINE;
  else process.env.DETERMINISTIC_KPI_ENGINE = previous;
}

// 9. Timed loading copy stays compact enough for the ellipsis row.
{
  const status = longRunningStatus(30, 'Here is my CV');
  assert.equal(status.title, 'Still scanning your file…');
  assert.ok(status.title.length < 40);
}

// 10. File text, pasted text, and additional text are all preserved and normalized as one English-target bundle.
{
  const bundle = buildProfileSourceBundle({
    fileText: 'ניסיון מקצועי: ייעוץ 2018-2024',
    pastedText: 'Educación: Universidad de Barcelona',
    additionalText: 'Objectif: devenir responsable produit',
  });
  assert.equal(bundle.hasFileText, true);
  assert.equal(bundle.hasPastedText, true);
  assert.equal(bundle.hasAdditionalText, true);
  assert.equal(bundle.targetLanguage, 'English');
  assert.equal(bundle.normalizeToEnglish, true);
  assert.match(bundle.advisorMessage, /UPLOADED FILE TEXT/);
  assert.match(bundle.advisorMessage, /PASTED CV \/ FIRST TEXT BOX/);
  assert.match(bundle.advisorMessage, /ADDITIONAL TEXT \/ SECOND TEXT BOX/);
  assert.ok(bundle.combinedOriginal.includes('ייעוץ'));
  assert.ok(bundle.combinedOriginal.includes('Universidad'));
  assert.ok(bundle.combinedOriginal.includes('Objectif'));
}

// 11. Candidate facts records all three sources and the English normalization contract.
{
  const facts = buildCandidateFacts({
    candidateType: 'MBA',
    profileSources: {
      fileText: 'Consultant 2018-2024',
      pastedText: 'Bachelor of Arts, Tel Aviv University',
      additionalText: 'GMAT 720',
      normalizeToEnglish: true,
      targetLanguage: 'English',
    },
    profile: {
      leadershipEvidence: 'Led a team',
      careerProgression: 'Promoted',
      achievementsImpact: 'Improved revenue 15%',
      whyMBA: 'MBA for general management',
      postMbaGoal: 'Lead product strategy',
      normalizationLanguage: 'English',
      sourceLanguages: ['Hebrew', 'Spanish', 'French'],
    },
  });
  assert.equal(facts.sources.uploadedFileText, true);
  assert.equal(facts.sources.pastedText, true);
  assert.equal(facts.sources.additionalText, true);
  assert.equal(facts.sources.normalizationLanguage, 'English');
  assert.deepEqual(facts.sourceLanguages, ['Hebrew', 'Spanish', 'French']);
}

console.log('candidate facts and analysis flow checks passed');
