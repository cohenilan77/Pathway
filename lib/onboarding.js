export const OPENING_PATH_OPTIONS = ['Undergraduate', 'Graduate', 'PhD', 'Personal Development'];

export function resolveOpeningPathChoice(value) {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase().replace(/[.]/g, '');

  if (/^(undergrad(?:uate)?|bachelor)$/.test(normalized)) {
    return { category: 'Undergraduate', degree: 'Undergraduate' };
  }
  if (/^(phd|doctoral|doctorate|postgraduate(?:\s*\/\s*doctoral)?)$/.test(normalized)) {
    return { category: 'Postgraduate / Doctoral', degree: 'PhD' };
  }
  if (/^personal development$/.test(normalized)) {
    return { category: 'Personal Development', degree: 'Personal Development' };
  }
  if (/^(grad(?:uate)?|mba|masters?|master's)$/.test(normalized)) {
    return { category: 'Graduate', degree: 'Graduate' };
  }
  return null;
}

export function responseAttemptsScoring(response = {}) {
  const raw = String(response.raw || response.message || '');
  const patch = response.statePatch || {};
  return /<(?:SCORES|PROGRAMS)>/i.test(raw)
    || !!patch.scores
    || (Array.isArray(patch.programs) && patch.programs.length > 0);
}
