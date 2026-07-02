import test from 'node:test';
import assert from 'node:assert/strict';
import { agentIdFromName, aggregateAgentMetrics, usageTotals } from '../agent-metrics.js';

test('maps agent class names to admin ids', () => {
  assert.equal(agentIdFromName('MainAgent'), 'main');
  assert.equal(agentIdFromName('AdvisorAgent'), 'advisor');
  assert.equal(agentIdFromName('SettingsAgent'), 'settings-agent');
});

test('counts all Anthropic token categories', () => {
  assert.deepEqual(usageTotals({
    input_tokens: 100,
    output_tokens: 20,
    cache_creation_input_tokens: 30,
    cache_read_input_tokens: 40,
  }), {
    inputTokens: 100,
    outputTokens: 20,
    cacheCreationInputTokens: 30,
    cacheReadInputTokens: 40,
    totalTokens: 190,
  });
});

test('aggregates exact calls, tokens, errors, and average latency per agent', () => {
  const [metric] = aggregateAgentMetrics([
    { agentId: 'main', inputTokens: 100, outputTokens: 20, totalTokens: 120, latencyMs: 1000, error: false, model: 'test-model' },
    { agentId: 'main', inputTokens: 50, outputTokens: 10, totalTokens: 60, latencyMs: 500, error: false, model: 'test-model' },
    { agentId: 'main', totalTokens: 0, latencyMs: 300, error: true, model: 'test-model' },
  ]);
  assert.equal(metric.calls, 3);
  assert.equal(metric.inputTokens, 150);
  assert.equal(metric.outputTokens, 30);
  assert.equal(metric.totalTokens, 180);
  assert.equal(metric.errors, 1);
  assert.equal(metric.avgLatencyMs, 600);
});
