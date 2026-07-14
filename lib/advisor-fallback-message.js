export function isCvSubmissionMessage(text = '') {
  return String(text || '').trim().startsWith('Here is my CV');
}

export function buildAdvisorFallbackMessage({
  errorName = '',
  isSchoolListPhase = false,
  isCvSubmission = false,
  requestedProgramList = false,
} = {}) {
  const isTimeout = errorName === 'AbortError';

  if (isCvSubmission) {
    return isTimeout
      ? 'CV saved. I’ll keep going from your profile — next, tell me your target country or school style so I can build the right school list.'
      : 'CV saved. Your next step is to choose one academic or school-list priority, and I’ll continue from there.';
  }

  if (isTimeout && isSchoolListPhase) {
    return 'The school list is taking longer than expected. I saved your profile — tap “Generate my program list now” and I’ll try again without losing your work.';
  }

  if (requestedProgramList) {
    return 'I saved your profile. Your next step is to generate the school list from the latest profile details.';
  }

  if (isTimeout) {
    return 'I saved your update. Let’s continue from here — what target country, school style, or next priority should we use?';
  }

  return 'I saved your update. Your next step is to choose one academic, profile, or school-list priority.';
}
