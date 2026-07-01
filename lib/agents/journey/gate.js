// Single rule: narrative tools must not run until the school list has been shown.
export function narrativeGateCheck(state) {
  if (!state?.portfolioShown) {
    return {
      allowed: false,
      reason: 'The school list must be built and reviewed before choosing a narrative. Please build the portfolio first.',
    };
  }
  return { allowed: true, reason: null };
}
