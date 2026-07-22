function firstName(user, profile) {
  return String(profile?.name || user?.name || '').trim().split(/\s+/)[0] || 'there';
}

function hasList(value) {
  return Array.isArray(value) && value.length > 0;
}

export function buildReturningCandidateMessage({ user, profile, scores, programs, chosenSchools, narrative, cvText, essays, interviews, chat, undergrad } = {}) {
  const name = firstName(user, profile);
  const category = profile?.category;

  // Undergraduate: when the student has a saved session summary, open with a
  // real "welcome back" — recap of last session + today's focus — instead of
  // the generic grad-pipeline prompts. (No summary yet → fall through to the
  // existing next-step logic below.)
  if (category === 'Undergraduate') {
    const recap = undergrad?.lastSessionSummary?.text;
    if (recap) {
      const focus = String(undergrad?.nextStep || '').trim();
      const focusLine = focus
        ? `Today, let's ${focus.charAt(0).toLowerCase()}${focus.slice(1)}.`
        : `Want to pick up where we left off?`;
      return `Welcome back, ${name}! 👋 Last time: ${recap} ${focusLine} → Let's do it | Catch me up | Something changed`;
    }
  }

  const returning = !!profile && ((chat?.length || 0) > 2 || !!scores || hasList(programs));
  if (!returning) return null;

  const welcome = `Welcome back, ${name}.`;

  if (!scores) {
    return `${welcome} Your next step is completing your profile analysis. → Continue my profile | Upload my CV | Review what is missing`;
  }

  if (category === 'Personal Development') {
    if (!narrative) return `${welcome} Your next step is clarifying your development strategy. → Continue my strategy | Review my goals`;
    if (!cvText) return `${welcome} Your strategy is set; the next step is strengthening your CV. → Work on my CV | Review my strategy`;
    return `${welcome} Let’s continue with the highest priority action in your plan. → Show my next task | Review my progress`;
  }

  if (!hasList(programs)) {
    const label = category === 'Undergraduate' ? 'university list' : 'program portfolio';
    return `${welcome} Your next step is generating your ${label}. → Generate my school list | Review my profile`;
  }
  if (!hasList(chosenSchools)) {
    return `${welcome} Your list is ready; the next step is choosing your target schools. → Review my list | Choose target schools`;
  }
  if (!narrative) {
    return `${welcome} Your target schools are saved; next we’ll shape your Narrative and Strategy. → Continue my narrative | Review my targets`;
  }
  if (!cvText) {
    return `${welcome} Your strategy is underway; the next step is CV optimization. → Work on my CV | Review my strategy`;
  }
  if (!essays || Object.keys(essays).length === 0) {
    return `${welcome} Your CV stage is ready; the next step is essays. → Start my essays | Review my CV`;
  }
  if (!interviews || Object.keys(interviews).length === 0) {
    return `${welcome} Your essays are underway; the next step is interview preparation. → Practice an interview | Review my essays`;
  }
  return `${welcome} Let’s continue with your highest priority open action. → Show my next task | Review my progress`;
}
