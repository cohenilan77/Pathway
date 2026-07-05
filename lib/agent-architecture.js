import { getStore } from './store.js';

const CONFIG_KEY = 'agent:architecture:config';
const AUDIT_KEY = 'agent:architecture:audit';

// Hybrid (multi-agent coordinator) is the default: the coordinator routes to
// specialist agents and every failure path falls back to the legacy advisor,
// so candidates always get a reply. Admins can still force legacy via the
// architecture settings panel.
const DEFAULT_CONFIG = Object.freeze({
  mode: 'hybrid',
  fallbackToLegacy: true,
  version: 1,
  updatedAt: null,
  updatedBy: null,
});

export async function getAgentArchitecture() {
  const stored = await getStore().get(CONFIG_KEY);
  if (!stored || !['legacy', 'hybrid'].includes(stored.mode)) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function setAgentArchitecture({ mode, updatedBy }) {
  if (!['legacy', 'hybrid'].includes(mode)) throw new Error('Architecture mode must be legacy or hybrid.');
  const current = await getAgentArchitecture();
  const next = {
    ...current,
    mode,
    version: Number(current.version || 0) + 1,
    updatedAt: Date.now(),
    updatedBy: updatedBy || 'admin',
  };
  const store = getStore();
  await store.set(CONFIG_KEY, next);
  await store.rpush(AUDIT_KEY, {
    from: current.mode,
    to: next.mode,
    version: next.version,
    updatedAt: next.updatedAt,
    updatedBy: next.updatedBy,
  });
  return next;
}

export async function getAgentArchitectureAudit() {
  return getStore().lrange(AUDIT_KEY, 0, -1);
}
