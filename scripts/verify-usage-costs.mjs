import assert from 'node:assert/strict';
import { calculateUsageCost, repriceUsageRecord } from '../lib/usage.js';

const model = 'claude-haiku-4-5-20251001';
const priced = calculateUsageCost({
  model,
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheCreationInputTokens: 1_000_000,
  cacheReadInputTokens: 1_000_000,
  webSearchRequests: 2,
});

assert.equal(priced.inputCost, 1);
assert.equal(priced.outputCost, 5);
assert.equal(priced.cacheCreationCost, 1.25);
assert.equal(priced.cacheReadCost, 0.1);
assert.equal(priced.webSearchCost, 0.02);
assert.ok(Math.abs(priced.totalCost - 7.37) < 1e-12);
assert.equal(priced.pricingVersion, 'anthropic-2026-06-27');

const repriced = repriceUsageRecord({
  model,
  inputTokens: 500_000,
  outputTokens: 100_000,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 900_000,
  totalCost: 3.27,
});

assert.equal(repriced.storedTotalCost, 3.27);
assert.ok(Math.abs(repriced.totalCost - 1.09) < 1e-12);

const unknown = calculateUsageCost({ model: 'unknown-model', inputTokens: 1_000_000 });
assert.equal(unknown.pricingKnown, false);
assert.equal(unknown.totalCost, 0);

console.log('Usage cost verification passed.');
