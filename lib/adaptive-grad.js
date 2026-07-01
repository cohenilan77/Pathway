export function isAdaptiveGradEnabled() {
  return process.env.VERCEL_GIT_COMMIT_REF === 'staging';
}
