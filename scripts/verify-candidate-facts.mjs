import assert from 'node:assert/strict';
import { buildCandidateFacts, buildComplementaryQuestion, extractWorkTimeline } from '../lib/candidate-facts.js';
import {
  CANDIDATE_KPI_SCHEMAS,
  calculateCandidateOverall,
  getCandidateKpiDisplayItems,
  getCandidateKpiWeights,
} from '../lib/candidate-kpi-schemas.js';
import { assessScoringConfidence, scoreCandidateKPIs, trackWeights } from '../lib/kpi-engine.js';
import { normalizeProfileFacts } from '../lib/profile-facts.js';
import { normalizeProgram } from '../lib/program-normalizer.js';
import { applyDeterministicKpiToResponse, deterministicKpiEnabled } from '../lib/deterministic-kpi-response.js';
import { longRunningStatus } from '../src/lib/longRunningAdvisorStatus.js';
import { buildProfileSourceBundle } from '../lib/profile-source-bundle.js';
import { mergeCandidateState, shouldRequestProfileUpload } from '../lib/candidate-state.js';
import { specialistPatch } from '../lib/hybrid-coordinator.js';

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

// 3. Optional/non-matching gaps never become blocker questions; the one
// consolidated follow-up is limited to matching-critical direction.
{
  const base = {
    candidateType: 'MBA',
    profileSources: { fileText: 'Manager with five years experience, a promotion, and 12% margin impact.' },
    profile: {
      category: 'Graduate', degree: 'MBA', workYears: 5, careerProgression: 'Promoted once', achievementsImpact: 'Improved margin 12%',
      gpa: 3.6, gmat: 710, whyMBA: 'MBA for a cross-functional transition',
      postMbaGoal: 'Move into product leadership',
    },
  };
  const first = buildCandidateFacts(base);
  assert.ok(first.profileCompleteness.missingFields.includes('leadershipEvidence'));
  assert.ok(!first.profileCompleteness.confirmedAbsentFields.includes('leadershipEvidence'));
  assert.doesNotMatch(buildComplementaryQuestion(first), /leadership|recommender|exception/i);
  assert.match(buildComplementaryQuestion(first), /geography|school path/i);

  const second = buildCandidateFacts({
    ...base,
    profile: {
      ...base.profile,
      profileCompleteness: { askedFields: ['targetGeography', 'schoolChoice'] },
    },
  });
  assert.equal(second.readyForScoring, true);
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

// 12. Every track's calculation weights are exactly the shared schema weights.
{
  for (const [track, schema] of Object.entries(CANDIDATE_KPI_SCHEMAS)) {
    const schemaWeights = Object.fromEntries(schema.kpis.map(([key, , weight]) => [key, weight]));
    assert.deepEqual(trackWeights(track), schemaWeights, `${track} engine weights must match its schema`);
    assert.deepEqual(getCandidateKpiWeights({}, track), schemaWeights, `${track} UI weights must match its schema`);
    assert.equal(Object.values(schemaWeights).reduce((sum, value) => sum + value, 0), 100, `${track} weights must total 100`);
  }
}

// 13. A complete MBA profile calculates and exposes all eleven required KPI scores.
{
  const profile = {
    category: 'Graduate',
    degree: 'MBA',
    gpa: 3.8,
    gmat: 730,
    workYears: 6,
    currentRole: 'Senior Product Manager',
    currentCompany: 'Global Tech',
    employerStrength: 'global',
    achievementsImpact: ['Launched a product used by 50,000 customers'],
    quantifiedImpact: ['Increased revenue by 20%'],
    careerProgression: 'Promoted twice into increasing responsibility',
    managedPeople: true,
    teamSize: 6,
    leadershipImpact: ['Improved team delivery by 25%'],
    internationalExposure: ['Cross-border product launch'],
    countriesWorked: ['Israel', 'United States'],
    languages: ['Hebrew', 'English'],
    whyMBA: 'Build general-management skills for a broader leadership role.',
    whyNow: 'My next promotion requires cross-functional management depth.',
    postMbaGoal: 'Become a product director in fintech within three years.',
    recommenders: ['Direct manager'],
    directEvaluatorConfirmed: true,
    recommenderEvidenceSpecificity: 'specific concrete achievements',
    community: ['Board volunteer for a youth nonprofit'],
    communityYears: 3,
    communityImpact: 'Mentored 40 students',
  };
  const facts = normalizeProfileFacts(profile);
  const result = scoreCandidateKPIs(facts);
  const expectedKeys = CANDIDATE_KPI_SCHEMAS.MBA.kpis.map(([key]) => key);
  assert.deepEqual(Object.keys(result.scores).filter(key => key !== 'overall').sort(), expectedKeys.slice().sort());
  assert.equal(result.overall, calculateCandidateOverall(result.scores, profile));
  const display = getCandidateKpiDisplayItems(result.scores, profile);
  assert.equal(display.length, 11);
  assert.ok(display.every(item => item.status === 'scored'));
  assert.ok(!display.some(item => /school fit/i.test(item.label)));
}

// 14. UI display data keeps every MBA KPI visible and marks missing evidence incomplete.
{
  const display = getCandidateKpiDisplayItems({ professional: 75 }, { category: 'Graduate', degree: 'MBA' });
  assert.equal(display.length, 11);
  assert.equal(display.find(item => item.key === 'professional').status, 'scored');
  assert.equal(display.find(item => item.key === 'achievementsImpact').status, 'incomplete');
  assert.equal(display.find(item => item.key === 'community').status, 'incomplete');
}

// 15. Fresh upload sources and extracted facts override stale session fields without losing track selection.
{
  const requestState = mergeCandidateState({
    storedState: {
      profile: { category: 'Graduate', degree: 'MBA', name: 'Tal', oldFact: 'preserved' },
      profileSources: { fileText: 'old file text' },
    },
    body: {
      profile: { category: 'Graduate', degree: 'MBA — 2-year, full-time' },
      profileSources: { fileText: 'fresh CV with GPA 3.8 and dated roles' },
      messages: [{ role: 'user', text: 'Here is my CV/resume profile source bundle.' }],
    },
  });
  assert.equal(requestState.profile.degree, 'MBA — 2-year, full-time');
  assert.equal(requestState.profile.oldFact, 'preserved');
  assert.equal(requestState.profileSources.fileText, 'fresh CV with GPA 3.8 and dated roles');

  const extractedState = mergeCandidateState({
    storedState: requestState,
    frontendState: { profile: { gpa: 3.8, currentRole: 'Consultant', workYears: 6 } },
  });
  assert.equal(extractedState.profile.category, 'Graduate');
  assert.equal(extractedState.profile.degree, 'MBA — 2-year, full-time');
  assert.equal(extractedState.profile.gpa, 3.8);
  assert.equal(shouldRequestProfileUpload(extractedState), false);
}

// 16. A selected graduate track requests the profile upload before generic baseline questions.
{
  assert.equal(shouldRequestProfileUpload({
    profile: { category: 'Graduate', degree: 'MBA — 2-year, full-time' },
    messages: [{ role: 'user', text: '2 year fulltime' }],
  }), true);
}

// 17. Staging defaults to the authoritative schema KPI engine when no flag is configured.
{
  assert.equal(deterministicKpiEnabled({}), true);
  assert.equal(deterministicKpiEnabled({ DETERMINISTIC_KPI_ENGINE: 'false' }), false);
}

// 17. A successful ProfileAgent tool call is authoritative even if its final
// text is prose rather than strict JSON.
{
  const patch = specialistPatch('profile', {
    text: 'Profile extraction complete.',
    history: [{
      role: 'assistant',
      content: [{
        type: 'tool_use',
        name: 'update_profile',
        input: {
          candidateId: 'candidate_1',
          updates: {
            education: [{ school: 'Tel Aviv University', degree: 'BA Economics' }],
            currentRole: 'Senior Consultant',
            careerGoal: 'Move into product strategy',
          },
        },
      }],
    }],
  });
  assert.equal(patch.profile.currentRole, 'Senior Consultant');
  assert.equal(patch.profile.education[0].degree, 'BA Economics');
}

// 18. Education extracted from a CV satisfies the generic academic baseline
// without inventing a GPA; only genuinely absent goal evidence remains.
{
  const normalized = normalizeProfileFacts({
    category: 'Graduate',
    degree: 'MSc',
    education: [{ school: 'Tel Aviv University', degree: 'BA Economics' }],
  });
  const confidence = assessScoringConfidence(normalized);
  assert.ok(!confidence.missingFields.includes('academic or professional baseline'));
  assert.ok(confidence.missingFields.includes('career or academic goal'));
}

console.log('candidate facts and analysis flow checks passed');
