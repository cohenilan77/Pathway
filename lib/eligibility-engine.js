import { parseNumber } from './profile-facts.js';

function programTestMedian(program, testType) {
  const type = String(testType || '').toUpperCase();
  return parseNumber(program.medianTest)
    ?? parseNumber(program[`median${type}`])
    ?? parseNumber(program[`avg${type}`])
    ?? (type === 'GMAT' ? parseNumber(program.avgGMAT ?? program.avgGmat) : null);
}

function required(program, name) {
  const requirements = Array.isArray(program.requirements) ? program.requirements.join(' ') : String(program.requirements || '');
  if (name === 'test') return program.requiresTest === true || /required (?:gmat|gre|sat|act|lsat|mcat)|(?:gmat|gre|sat|act|lsat|mcat) required/i.test(requirements);
  if (name === 'portfolio') return program.requiresPortfolio === true || /portfolio required|requires? (?:a )?portfolio/i.test(requirements);
  if (name === 'prerequisites') return program.requiresPrerequisites === true || /prerequisite|coursework required/i.test(requirements);
  return false;
}

export function checkEligibility(facts, program = {}) {
  const hardGates = [];
  const missingGates = [];
  const confirmedBlockingGates = [];
  if (required(program, 'test')) {
    hardGates.push('Standardized test');
    if (facts.testing.testScore == null) missingGates.push('Required standardized test score is not yet confirmed');
  }
  const portfolioEvidence = facts.activities.activities.length || facts.experience.achievements.length || facts.research.researchExperience.length;
  if (required(program, 'portfolio')) {
    hardGates.push('Portfolio');
    if (!portfolioEvidence) missingGates.push('Required portfolio or project evidence is not yet confirmed');
  }
  if (required(program, 'prerequisites')) {
    hardGates.push('Prerequisite coursework');
    if (facts.academics.missingPrerequisites.length || facts.academics.prerequisitesMet === false) {
      confirmedBlockingGates.push('Required prerequisites are confirmed missing');
    }
  }
  if (confirmedBlockingGates.length) {
    return { eligible: false, status: 'Not Eligible', hardGates, missingGates: confirmedBlockingGates, notes: confirmedBlockingGates.join('; ') };
  }

  const below = [];
  const medianGPA = parseNumber(program.medianGPA ?? program.avgGPA ?? program.avgGpa);
  if (facts.academics.gpa != null && medianGPA != null && facts.academics.gpa < medianGPA - 0.5) below.push(`GPA is more than 0.5 below the program median (${medianGPA})`);
  const medianTest = programTestMedian(program, facts.testing.testType);
  const usesTest = !facts.testing.testOptional && facts.testing.testScore != null && medianTest != null;
  if (usesTest && facts.testing.testScore < medianTest - 50) below.push(`${facts.testing.testType || 'Test'} score is more than 50 points below the program median (${medianTest})`);
  return {
    eligible: true,
    status: below.length ? 'Below Baseline' : 'Eligible',
    hardGates,
    missingGates: [...missingGates, ...below],
    notes: [...missingGates, ...below].join('; '),
  };
}
