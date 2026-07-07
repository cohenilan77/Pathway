import test from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreUndergradProfile,
  shouldRunUniversityMatching,
  undergradUniversityListMode,
} from '../profile-temperature.js';
import { scoreCandidateKPIs } from '../../kpi-engine.js';
import { normalizeProfileFacts } from '../../profile-facts.js';

const grade9Profile = {
  category: 'Undergraduate', grade: 9, gpa: 3.6,
  activities: ['Robotics club', 'Debate'], strongestActivity: 'Robotics club',
  subjects: ['Math', 'Computer Science'],
};

const grade10Profile = {
  category: 'Undergraduate', grade: 10, gpa: 3.7,
  activities: ['Robotics club', 'Student government'], strongestActivity: 'Robotics club',
  leadership: 'Club officer',
};

const grade11Profile = {
  category: 'Undergraduate', grade: 11, gpa: 3.8,
  activities: ['Robotics club', 'Debate', 'Volunteering'], strongestActivity: 'Robotics club',
  leadershipEvidence: 'Team captain', intendedMajor: 'Computer Science',
};

const grade12Profile = {
  category: 'Undergraduate', grade: 12, gpa: 3.85,
  activities: ['Robotics club', 'Debate', 'Volunteering'], strongestActivity: 'Robotics club',
  leadershipEvidence: 'Team captain', intendedMajor: 'Computer Science',
  chosenSchools: ['MIT', 'UCLA', 'State U'], testScore: 1480, testType: 'SAT',
};

test('Grade 9 returns label "Profile Temperature" and university list "Schools to Explore"', () => {
  const result = scoreUndergradProfile(grade9Profile, {});
  assert.equal(result.label, 'Profile Temperature');
  assert.equal(result.universityListTitle, 'Schools to Explore');
});

test('Grade 9 does not use Reach/Target/Likely mode', () => {
  const result = scoreUndergradProfile(grade9Profile, {});
  const matching = shouldRunUniversityMatching(grade9Profile, result);
  assert.equal(matching.mode, 'explore');
  assert.notEqual(matching.mode, 'preliminary');
  assert.notEqual(matching.mode, 'application');
});

test('Grade 10 returns university list title "Early Fit List"', () => {
  const result = scoreUndergradProfile(grade10Profile, {});
  assert.equal(result.universityListTitle, 'Early Fit List');
});

test('Grade 10 missing SAT does not heavily punish score', () => {
  const result = scoreUndergradProfile(grade10Profile, {});
  assert.ok(result.scoreDetails.testingAwareness.score >= 50, 'testing awareness score should stay neutral without a test score');
  assert.ok(result.overall >= 50, 'overall score should not collapse from a missing test score at grade 10');
});

test('Grade 11 returns label "Preliminary Readiness" and uses Preliminary Shortlist', () => {
  const result = scoreUndergradProfile(grade11Profile, {});
  assert.equal(result.label, 'Preliminary Readiness');
  assert.equal(result.universityListTitle, 'Preliminary Shortlist');
});

test('Grade 12 returns label "Application Readiness" and uses Application Portfolio', () => {
  const result = scoreUndergradProfile(grade12Profile, {});
  assert.equal(result.label, 'Application Readiness');
  assert.equal(result.universityListTitle, 'Application Portfolio');
});

test('undergradUniversityListMode reflects grade config', () => {
  assert.equal(undergradUniversityListMode(grade9Profile), 'explore');
  assert.equal(undergradUniversityListMode(grade10Profile), 'early-fit');
  assert.equal(undergradUniversityListMode(grade11Profile), 'preliminary');
  assert.equal(undergradUniversityListMode(grade12Profile), 'application');
});

test('scoreUndergradProfile never surfaces admission-probability language', () => {
  for (const profile of [grade9Profile, grade10Profile, grade11Profile, grade12Profile]) {
    const result = scoreUndergradProfile(profile, {});
    const text = JSON.stringify(result).toLowerCase();
    assert.ok(!/chance of admission/.test(text));
    assert.ok(!/admission probability/.test(text));
  }
});

test('Undergraduate no longer uses generic Graduate KPI weights via kpi-engine', () => {
  const facts = normalizeProfileFacts(grade11Profile, {});
  const result = scoreCandidateKPIs(facts, grade11Profile);
  assert.equal(result.track, 'Undergraduate');
  assert.equal(result.label, 'Preliminary Readiness');
  assert.ok('academicStrength' in result.scores, 'uses grade-aware admissions dimensions, not generic Graduate weights');
  assert.ok(!('research' in result.scores), 'does not fall back to Graduate/PhD research weighting');
});

test('Non-undergrad tracks still use existing generic KPI behavior', () => {
  const gradProfile = { category: 'Graduate', gpa: 3.8, degree: 'MS Computer Science', careerGoal: 'Software engineer at a tech company' };
  const facts = normalizeProfileFacts(gradProfile, {});
  const result = scoreCandidateKPIs(facts, gradProfile);
  assert.equal(result.track, 'Graduate');
  assert.ok('academic' in result.scores, 'Graduate track keeps its existing generic KPI key shape');
});
