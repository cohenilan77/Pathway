export function advisorTaskCopy(message) {
  const text = String(message || '').toLowerCase();
  if (/cv|resume|résumé|transcript|upload|document/.test(text)) {
    return ['Reading your document…', 'Extracting education, experience, scores, achievements, and gaps…', 'Preparing your next steps…'];
  }
  if (/program|school|portfolio|match|university/.test(text)) {
    return ['Searching programs…', 'Comparing fit and requirements…', 'Building your school portfolio…'];
  }
  if (/essay|statement of purpose|sop|personal statement/.test(text)) {
    return ['Reviewing essay structure…', 'Checking strengths and weak points…', 'Writing feedback…'];
  }
  if (/interview|mock/.test(text)) {
    return ['Preparing interview questions…', 'Checking school fit and likely themes…', 'Building your mock interview flow…'];
  }
  return ['Thinking through your next step…'];
}

export function longRunningStatus(elapsedSeconds, message) {
  const steps = advisorTaskCopy(message);
  if (elapsedSeconds < 10) return null;
  const stepIndex = Math.min(steps.length - 1, Math.floor((elapsedSeconds - 10) / 12));
  const isFileScan = /\b(cv|resume|résumé|file|document|transcript)\b/i.test(String(message || ''));
  if (elapsedSeconds >= 60) return { title: 'Deep analysis in progress…', detail: steps[stepIndex] };
  if (elapsedSeconds >= 30) return { title: isFileScan ? 'Still scanning your file…' : 'Still working on your request…', detail: steps[stepIndex] };
  return { title: isFileScan ? 'Reviewing extracted details…' : 'Working through the details…', detail: steps[stepIndex] };
}
