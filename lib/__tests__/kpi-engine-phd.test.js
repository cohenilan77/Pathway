import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfileFacts } from '../profile-facts.js';
import { scoreCandidateKPIs } from '../kpi-engine.js';

// Regression test for the "Tal" PhD-in-finance bug: chat had already extracted
// researchDirection (research interests/field) and postPhdGoal (tenure track
// academia), but 6 of 8 Analysis tab KPIs stayed "Incomplete" because
// normalizeProfileFacts() only recognized MBA-shaped field names.
const talProfile = {
  category: 'Postgraduate / Doctoral',
  degree: 'PhD',
  gpa: 3.9,
  researchDirection: 'Asset pricing and behavioral finance, particularly market anomalies',
  postPhdGoal: 'Tenure track academia',
};

test('PhD profile with researchDirection and postPhdGoal scores research, facultyFit, narrative, and goalClarity', () => {
  const facts = normalizeProfileFacts(talProfile);
  assert.equal(facts.track, 'Postgraduate / Doctoral');
  const { scores } = scoreCandidateKPIs(facts, talProfile);

  // Previously null/incomplete for a research-interests-only profile with no
  // formal "experience" entry, named faculty, or explicit "why" field.
  assert.ok(Number.isFinite(scores.research), 'research should score from researchDirection');
  assert.ok(Number.isFinite(scores.facultyFit), 'facultyFit should score (medium tier) from researchDirection');
  assert.ok(Number.isFinite(scores.narrative), 'narrative should score from researchDirection as the "why" signal');
  assert.ok(Number.isFinite(scores.goalClarity), 'goalClarity should score from postPhdGoal');

  // facultyFit must NOT jump to the high/named-supervisor tier from bare
  // research interests alone — only the medium "direction exists, alignment
  // broad" tier is warranted.
  assert.equal(scores.facultyFit, 60);
});

test('goalClarity recognizes academic-track career language, not just professional roles', () => {
  const facts = normalizeProfileFacts({ category: 'Postgraduate / Doctoral', degree: 'PhD', postPhdGoal: 'Tenure track academia' });
  const { scores } = scoreCandidateKPIs(facts, {});
  assert.ok(scores.goalClarity >= 70, `expected a specific-goal score, got ${scores.goalClarity}`);
});

test('a PhD profile with zero research evidence still shows research/facultyFit/narrative/goalClarity as incomplete', () => {
  const facts = normalizeProfileFacts({ category: 'Postgraduate / Doctoral', degree: 'PhD', gpa: 3.5 });
  const { scores } = scoreCandidateKPIs(facts, {});
  assert.equal(scores.research, undefined);
  assert.equal(scores.facultyFit, undefined);
  assert.equal(scores.narrative, undefined);
  assert.equal(scores.goalClarity, undefined);
});
