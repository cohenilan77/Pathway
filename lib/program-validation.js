import { normalizeProgramList } from './program-normalizer.js';

export const MIN_GENERATED_PROGRAMS = 8;
export const PROGRAM_GENERATION_FAILURE_REPLY = 'I couldn’t complete your school list. Please retry generation.';

function programName(program) {
  return String(program?.name || '').trim();
}

export function validateProgramList(programs, { minPrograms = MIN_GENERATED_PROGRAMS, calibration = {} } = {}) {
  if (!Array.isArray(programs)) {
    return { valid: false, programs: [], count: 0, reason: 'programs_not_array' };
  }

  const normalized = normalizeProgramList(programs, calibration);
  if (!Array.isArray(normalized) || !normalized.length) {
    return { valid: false, programs: [], count: 0, reason: 'normalized_empty' };
  }

  const seen = new Set();
  const unique = [];
  for (const program of normalized) {
    const name = programName(program);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...program, name });
  }

  if (!unique.length) return { valid: false, programs: [], count: 0, reason: 'no_unique_named_programs' };
  if (unique.length < minPrograms) {
    return { valid: false, programs: unique, count: unique.length, reason: 'too_few_programs' };
  }

  return { valid: true, programs: unique, count: unique.length, reason: '' };
}

export function hasValidProgramList(programs, options = {}) {
  return validateProgramList(programs, options).valid;
}

export function validProgramCount(programs, options = {}) {
  return validateProgramList(programs, options).count;
}
