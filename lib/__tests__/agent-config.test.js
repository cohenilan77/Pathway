import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgentConfig, publishAgentDraft, rollbackAgent, saveAgentDraft, setAgentStatus } from '../agent-config.js';

test('agent configuration supports draft, publish, disable, and rollback', async () => {
  const before = await getAgentConfig('main');
  const draft = await saveAgentDraft('main', { maxTokens: 1024, retryLimit: 2 }, 'test');
  assert.equal(draft.draftConfig.maxTokens, 1024);
  assert.equal(draft.publishedVersion, before.publishedVersion);

  const published = await publishAgentDraft('main', 'test');
  assert.equal(published.publishedConfig.maxTokens, 1024);
  const disabled = await setAgentStatus('main', 'disabled', 'test');
  assert.equal(disabled.status, 'disabled');
  const active = await setAgentStatus('main', 'active', 'test');
  assert.equal(active.status, 'active');

  const rolledBack = await rollbackAgent('main', published.publishedVersion, 'test');
  assert.equal(rolledBack.publishedVersion, published.publishedVersion);
});
