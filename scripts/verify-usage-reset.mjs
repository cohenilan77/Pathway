import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const originalCwd = process.cwd();
const isolatedDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathway-usage-reset-'));
process.chdir(isolatedDataDir);

try {
  const { getStore } = await import('../lib/store.js');
  const { getAllUsageRecords, getUsageRecordsForUser, recordUsage } = await import('../lib/usage.js');

  await recordUsage({
    userId: 'reset-test-user',
    conversationId: 'session_before_reset',
    feature: 'general_chat',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: 1000,
    outputTokens: 100,
  });
  assert.equal((await getAllUsageRecords()).length, 1);

  await new Promise((resolve) => setTimeout(resolve, 2));
  await getStore().set('usage:resetAt', Date.now());
  assert.equal((await getAllUsageRecords()).length, 0);
  assert.equal((await getUsageRecordsForUser('reset-test-user')).length, 0);

  await new Promise((resolve) => setTimeout(resolve, 2));
  await recordUsage({
    userId: 'reset-test-user',
    conversationId: 'session_after_reset',
    feature: 'general_chat',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: 2000,
    outputTokens: 200,
  });
  const afterReset = await getAllUsageRecords();
  assert.equal(afterReset.length, 1);
  assert.equal(afterReset[0].conversationId, 'session_after_reset');

  console.log('Usage reset verification passed.');
} finally {
  process.chdir(originalCwd);
  fs.rmSync(isolatedDataDir, { recursive: true, force: true });
}
