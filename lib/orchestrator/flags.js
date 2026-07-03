// Single source of truth for the multi-agent orchestrator feature flag.
// When OFF, api/chat.js must behave exactly as it did before this system existed.
export function isOrchestratorEnabled() {
  return process.env.MULTI_AGENT_ORCHESTRATOR === '1';
}
