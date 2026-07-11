// One-off seed for the 'narrativecoach' agent's admin-published runtime
// config (lib/agent-config.js), so NARRATIVE_COACHING_V2=true has a real
// published prompt/model/tools instead of the empty defaults the moment the
// flag is flipped on. Idempotent: skips if a systemPrompt is already
// published, so re-running it after an admin has edited the config in the
// UI is a no-op rather than a silent overwrite.
//
// Run: node scripts/seed-narrativecoach-agent-config.js
import { getAgentConfig, saveAgentDraft, publishAgentDraft } from '../lib/agent-config.js';
import { DEFAULT_NARRATIVE_COACH_PROMPT } from '../lib/agents/NarrativeCoachAgent.js';
import { NARRATIVE_COACH_TOOLS } from '../lib/agents/tools/narrative-coach-tools.js';

const AGENT_ID = 'narrativecoach';
const TOOL_NAMES = NARRATIVE_COACH_TOOLS.map(tool => tool.name);

async function main() {
  const current = await getAgentConfig(AGENT_ID);
  if (String(current.publishedConfig?.systemPrompt || '').trim()) {
    console.log(`[seed-narrativecoach-agent-config] '${AGENT_ID}' already has a published systemPrompt (v${current.publishedVersion}); skipping.`);
    return;
  }

  await saveAgentDraft(AGENT_ID, {
    model: 'claude-sonnet-4-6',
    maxTokens: 2048,
    systemPrompt: DEFAULT_NARRATIVE_COACH_PROMPT,
    tools: TOOL_NAMES,
  }, 'seed-script');
  const published = await publishAgentDraft(AGENT_ID, 'seed-script');
  console.log(`[seed-narrativecoach-agent-config] published '${AGENT_ID}' v${published.publishedVersion} with ${TOOL_NAMES.length} tools.`);
}

main().catch((err) => {
  console.error('[seed-narrativecoach-agent-config] failed:', err);
  process.exitCode = 1;
});
