// One-off seed for the 'undergradmaster' agent's admin-published runtime
// config (lib/agent-config.js), so UNDERGRAD_SMART_AGENT=true has a real
// published prompt/model/tools instead of the empty defaults the moment the
// flag is flipped on. Idempotent: skips if a systemPrompt is already
// published, so re-running it after an admin has edited the config in the
// UI is a no-op rather than a silent overwrite.
//
// Run: node scripts/seed-undergrad-agent-config.js
import { getAgentConfig, saveAgentDraft, publishAgentDraft } from '../lib/agent-config.js';
import { DEFAULT_UNDERGRAD_PROMPT } from '../lib/agents/UndergradAgent.js';
import { UNDERGRAD_TOOLS } from '../lib/agents/tools/undergrad-tools.js';

const AGENT_ID = 'undergradmaster';
const TOOL_NAMES = [...UNDERGRAD_TOOLS.map(tool => tool.name), 'web_search'];

async function main() {
  const current = await getAgentConfig(AGENT_ID);
  if (String(current.publishedConfig?.systemPrompt || '').trim()) {
    console.log(`[seed-undergrad-agent-config] '${AGENT_ID}' already has a published systemPrompt (v${current.publishedVersion}); skipping.`);
    return;
  }

  await saveAgentDraft(AGENT_ID, {
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    systemPrompt: DEFAULT_UNDERGRAD_PROMPT,
    tools: TOOL_NAMES,
  }, 'seed-script');
  const published = await publishAgentDraft(AGENT_ID, 'seed-script');
  console.log(`[seed-undergrad-agent-config] published '${AGENT_ID}' v${published.publishedVersion} with ${TOOL_NAMES.length} tools.`);
}

main().catch((err) => {
  console.error('[seed-undergrad-agent-config] failed:', err);
  process.exitCode = 1;
});
