import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateFacts } from '../candidate-facts.js';
import { normalizeUndergradPrograms, undergradInterestCluster, undergradProfileStage } from '../undergrad-profile.js';

function facts(profile, message = 'Generate my school list') {
  return buildCandidateFacts({ profile, candidateType: profile.category, messages: [{ role: 'user', text: message }] });
}

const grade10 = {
  category: 'Undergraduate', grade: 'Grade 10', curriculum: 'AP / US High School', gpa: 3.6,
  subjects: ['Math'], pathwayType: 'exploring', countries: ['USA'], activities: ['Research'],
  strongestActivity: 'hackathon', leadership: 'Club Leader', tests: 'None yet', universityStyle: 'Top ranked',
};

test('Grade 10 exploring profile can score and generate programs without intended major or test score', () => {
  const result = facts(grade10);
  assert.equal(result.profileStage, 'exploratory');
  assert.deepEqual(result.interestCluster, ['Math']);
  assert.equal(result.programTypeKnown, true);
  assert.equal(result.readyForScoring, true);
  assert.equal(result.readyForPrograms, true);
  assert.ok(!result.profileCompleteness.missingFields.includes('intendedMajor'));
});

test('interest clusters are inferred from subjects and activities', () => {
  assert.deepEqual(undergradInterestCluster({ subjects: ['Math'], activities: ['Coding club'] }), ['Math', 'Computer Science and Data']);
});

test('Grade 11 uses preliminary maturity and stronger baseline', () => {
  const result = facts({ ...grade10, grade: 11, pathwayType: 'focused', intendedMajor: 'Economics', tests: 'SAT planned' });
  assert.equal(result.profileStage, 'preliminary');
  assert.equal(result.readyForPrograms, true);
  const [program] = normalizeUndergradPrograms([{ name: 'Example', tier: 'possible' }], result);
  assert.equal(program.admissionStatus, 'Preliminary Target');
});

test('Grade 12 programs use final application labels', () => {
  assert.equal(undergradProfileStage({ grade: 12 }), 'application');
  const [program] = normalizeUndergradPrograms([{ name: 'Example', tier: 'safe' }], { grade: 12 });
  assert.equal(program.admissionStatus, 'Likely');
});

test('Graduate and MBA readiness do not receive the undergrad shortcut', () => {
  const graduate = facts({ category: 'Graduate', degree: "Master's", academic: 'GPA 3.6' });
  assert.equal(graduate.programTypeKnown, false);
  assert.equal(graduate.readyForPrograms, false);
  const mba = buildCandidateFacts({ profile: { category: 'Graduate', degree: 'MBA' }, candidateType: 'MBA', messages: [{ role: 'user', text: 'Generate my school list' }] });
  assert.equal(mba.selectedCandidateType, 'MBA');
  assert.equal(mba.readyForPrograms, false);
});
