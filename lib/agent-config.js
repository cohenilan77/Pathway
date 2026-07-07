import { getStore } from './store.js';

export const AGENT_IDS = [
  'main', 'advisor', 'profile', 'matching', 'search', 'chat', 'essay', 'interview', 'simulation',
  'document', 'calendar', 'nagger', 'community', 'settings-agent',
  // Undergraduate named agents (Undergraduate-only conversation path, see
  // lib/agents/UndergradMasterAgent.js). Matches agentIdFromName(className)
  // for each of the 13 classes under lib/agents/sub/undergrad/.
  'profileintake', 'longtermtracker', 'activityupgrade', 'opportunityfinder',
  'roadmap', 'testing', 'academicstrength', 'majordirection', 'universitymatching',
  'portfolioevidence', 'essaynarrative', 'applicationexecution', 'parentprogressreport',
];
const INDEX_KEY = 'agent:config:index';

const DEFAULTS = {
  model: 'claude-haiku-4-5-20251001', systemPrompt: '', maxTokens: 8192,
  retryLimit: 3, timeoutMs: 30000, tools: [], fallbackAgent: 'advisor', outputSchemaVersion: 1,
};

const key = (id) => `agent:config:${id}`;
const versionsKey = (id) => `agent:config:${id}:versions`;
const auditKey = (id) => `agent:config:${id}:audit`;

function validateId(id) {
  if (!AGENT_IDS.includes(id)) throw new Error('Unknown agent.');
}

function normalizeConfig(value = {}) {
  return {
    ...DEFAULTS,
    ...value,
    maxTokens: Math.max(256, Math.min(32000, Number(value.maxTokens ?? DEFAULTS.maxTokens))),
    retryLimit: Math.max(0, Math.min(5, Number(value.retryLimit ?? DEFAULTS.retryLimit))),
    timeoutMs: Math.max(1000, Math.min(120000, Number(value.timeoutMs ?? DEFAULTS.timeoutMs))),
    tools: Array.isArray(value.tools) ? value.tools.filter(v => typeof v === 'string') : [],
  };
}

export async function getAgentConfig(id) {
  validateId(id);
  const stored = await getStore().get(key(id));
  return stored || {
    agentId: id, status: 'active', draftVersion: 1, publishedVersion: 1,
    draftConfig: normalizeConfig(), publishedConfig: normalizeConfig(), updatedAt: null, updatedBy: null,
  };
}

export async function listAgentConfigs() {
  return Promise.all(AGENT_IDS.map(getAgentConfig));
}

async function save(record) {
  const store = getStore();
  await store.set(key(record.agentId), record);
  await store.sadd(INDEX_KEY, record.agentId);
  return record;
}

export async function saveAgentDraft(id, config, actor) {
  const current = await getAgentConfig(id);
  const next = { ...current, draftVersion: current.draftVersion + 1, draftConfig: normalizeConfig({ ...current.draftConfig, ...config }), updatedAt: Date.now(), updatedBy: actor };
  await getStore().rpush(auditKey(id), { action: 'save_draft', version: next.draftVersion, actor, at: next.updatedAt });
  return save(next);
}

export async function publishAgentDraft(id, actor) {
  const current = await getAgentConfig(id);
  const version = current.publishedVersion + 1;
  const snapshot = { version, config: normalizeConfig(current.draftConfig), actor, at: Date.now() };
  await getStore().rpush(versionsKey(id), snapshot);
  await getStore().rpush(auditKey(id), { action: 'publish', version, actor, at: snapshot.at });
  return save({ ...current, publishedVersion: version, publishedConfig: snapshot.config, updatedAt: snapshot.at, updatedBy: actor });
}

export async function rollbackAgent(id, version, actor) {
  validateId(id);
  const versions = await getStore().lrange(versionsKey(id), 0, -1);
  const snapshot = [...(versions || [])].reverse().find(v => Number(v.version) === Number(version))
    || (Number(version) === 1 ? { version: 1, config: normalizeConfig(), actor: 'system', at: 0 } : null);
  if (!snapshot) throw new Error('Configuration version not found.');
  const current = await getAgentConfig(id);
  const at = Date.now();
  await getStore().rpush(auditKey(id), { action: 'rollback', version: snapshot.version, actor, at });
  return save({ ...current, publishedVersion: snapshot.version, publishedConfig: normalizeConfig(snapshot.config), draftConfig: normalizeConfig(snapshot.config), updatedAt: at, updatedBy: actor });
}

export async function setAgentStatus(id, status, actor) {
  if (!['active', 'disabled'].includes(status)) throw new Error('Status must be active or disabled.');
  const current = await getAgentConfig(id);
  const at = Date.now();
  await getStore().rpush(auditKey(id), { action: status, actor, at });
  return save({ ...current, status, updatedAt: at, updatedBy: actor });
}

export async function agentConfigHistory(id) {
  validateId(id);
  const [versions, audit] = await Promise.all([getStore().lrange(versionsKey(id), 0, -1), getStore().lrange(auditKey(id), 0, -1)]);
  return { versions: (versions || []).slice().reverse(), audit: (audit || []).slice().reverse() };
}
