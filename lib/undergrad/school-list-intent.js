const SCHOOL_WORD = /s(?:c?h?o?o?l|hc?o?o?l)s?|universit(?:y|ies)|colleges?|programs?/i;

export function normalizeIntentText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bshcools?\b/g, 'schools')
    .replace(/\bscools?\b/g, 'schools')
    .replace(/\bschols?\b/g, 'schools')
    .replace(/\bsho\s+wnow\b/g, 'show now')
    .replace(/\bshow\s+now\b/g, 'show now')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeUndergradSchoolListRequest(message, conversationHistory = []) {
  const current = normalizeIntentText(message);
  const recent = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-10).map(entry => normalizeIntentText(entry?.text || entry?.content)).join('\n')
    : '';
  const combined = `${recent}\n${current}`;

  if (!current) return false;
  if (/\b(stop asking|just fucking show|just show|show it|show now|show me now|show the list|show me the list|tell me the list|full list|ranked list)\b/i.test(current)
    && /\b(list|schools?|universit(?:y|ies)|colleges?|matches|college options)\b/i.test(combined)) return true;

  return /\b(show|give|generate|make|build|see|view|list|tell)\b[\s\S]{0,70}\b(schools?|universit(?:y|ies)|colleges?|programs?)\b[\s\S]{0,70}\b(list|options|matches?|recommend|now)\b/i.test(current)
    || /\b(show|give|generate|make|build|see|view|tell)\b[\s\S]{0,70}\b(list|options|matches?|recommend)\b[\s\S]{0,70}\b(schools?|universit(?:y|ies)|colleges?|programs?)\b/i.test(current)
    || /\b(schools?|universit(?:y|ies)|colleges?)\s+(?:list|options|matches?)\b/i.test(current)
    || /\b(list|recommend|match)\s+(?:me\s+)?(?:some\s+)?(schools?|universit(?:y|ies)|colleges?)\b/i.test(current)
    || /\bwhat\s+schools?\b|\bwhich\s+schools?\b|\bshow\s+me\s+schools?\b|\bmatch\s+me\b/i.test(current)
    || (SCHOOL_WORD.test(current) && /\bpls|please|now\b/i.test(current) && /\blist|show|tell|give\b/i.test(current));
}

