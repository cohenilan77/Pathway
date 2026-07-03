import { getActor } from '../lib/admin.js';
import { ROLES } from '../lib/db.js';
import { agentConfigHistory, getAgentConfig, listAgentConfigs, publishAgentDraft, rollbackAgent, saveAgentDraft, setAgentStatus } from '../lib/agent-config.js';
import { createAnthropicClient } from '../lib/anthropic-client.js';

export default async function handler(req, res) {
  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (actor.role !== ROLES.admin) return res.status(403).json({ error: 'Forbidden.' });
  const actorId = actor.email || actor.id;
  try {
    if (req.method === 'GET') {
      const id = req.query?.agentId;
      if (!id) return res.status(200).json({ agents: await listAgentConfigs() });
      return res.status(200).json({ agent: await getAgentConfig(id), history: await agentConfigHistory(id) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { action, agentId, config, version, status } = req.body || {};
    let agent;
    if (action === 'save_draft') agent = await saveAgentDraft(agentId, config, actorId);
    else if (action === 'publish') agent = await publishAgentDraft(agentId, actorId);
    else if (action === 'rollback') agent = await rollbackAgent(agentId, version, actorId);
    else if (action === 'status') agent = await setAgentStatus(agentId, status, actorId);
    else if (action === 'test') {
      agent = await getAgentConfig(agentId);
      const config = agent.draftConfig;
      const startedAt = Date.now();
      const response = await createAnthropicClient().messages.create({
        model: config.model,
        max_tokens: Math.min(config.maxTokens || 512, 512),
        system: config.systemPrompt || `You are the Pathway ${agentId} agent.`,
        messages: [{ role: 'user', content: req.body?.testMessage || 'Reply with a short confirmation that this agent configuration is working.' }],
      });
      const text = (response.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n');
      return res.status(200).json({ ok: true, agent, test: { ok: true, configVersion: agent.draftVersion, message: text, latencyMs: Date.now() - startedAt, usage: response.usage } });
    }
    else return res.status(400).json({ error: 'Unknown action.' });
    return res.status(200).json({ ok: true, agent });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
