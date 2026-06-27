import { getStore } from './store.js';
import { newId } from './auth.js';
import { PRICING } from './usage.js';

function pricingFor(model) {
  return PRICING[model] || PRICING['claude-haiku-4-5-20251001'];
}

export async function logTokenUsage({
  userId,
  conversationId,
  feature,
  model,
  usage, // { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }
  endpoint,
  attempt,
  useWebSearch,
  stopReason,
  headroomEnabled,
  headroomMode,
  headroomError,
  originalInputChars,
  optimizedInputChars,
}) {
  if (!usage) return null;

  const store = getStore();
  const pricing = pricingFor(model);

  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreationInputTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadInputTokens = usage.cache_read_input_tokens || 0;

  // Headroom compression: measure savings from text compression before API call
  // Estimate: ~1 token per 4 characters for English text
  let compressionPct = 0;
  let tokensSaved = 0;
  if (originalInputChars > 0 && optimizedInputChars > 0 && optimizedInputChars < originalInputChars) {
    const charsSaved = originalInputChars - optimizedInputChars;
    compressionPct = (charsSaved / originalInputChars) * 100;
    // Conservative estimate: 1 token ≈ 4 characters
    tokensSaved = Math.round(charsSaved / 4);
  }

  // Cost calculation with Anthropic pricing
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const cacheCreationCost = (cacheCreationInputTokens / 1_000_000) * pricing.inputPerMillion * pricing.cacheWriteMultiplier;
  const cacheReadCost = (cacheReadInputTokens / 1_000_000) * pricing.inputPerMillion * pricing.cacheReadMultiplier;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCost = inputCost + cacheCreationCost + cacheReadCost + outputCost;

  // Savings: tokens reduced by headroom compression (what we would have paid at full input rate)
  const costSaved = (tokensSaved / 1_000_000) * pricing.inputPerMillion;

  // Validation: cost_saved should never exceed total_cost
  if (costSaved > totalCost) {
    console.error('USAGE LOG VALIDATION FAILED: costSaved > totalCost', {
      costSaved,
      totalCost,
      cacheReadInputTokens,
      inputTokens,
      model,
    });
    return null;
  }

  const id = newId();
  const log = {
    id,
    userId: userId || 'anonymous',
    conversationId: conversationId || 'session',
    feature: feature || 'general_chat',
    model,
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    totalTokens: inputTokens + outputTokens + cacheCreationInputTokens + cacheReadInputTokens,
    inputCost,
    cacheCreationCost,
    cacheReadCost,
    outputCost,
    totalCost,
    compressionPct,
    tokensSaved,
    costSaved,
    source: 'REAL', // Mark as real Anthropic data, not estimate
    timestamp: Date.now(),
    endpoint: endpoint || null,
    attempt: typeof attempt === 'number' ? attempt : null,
    useWebSearch: typeof useWebSearch === 'boolean' ? useWebSearch : null,
    stopReason: stopReason || null,
    headroomEnabled: typeof headroomEnabled === 'boolean' ? headroomEnabled : null,
    headroomMode: headroomMode || null,
    headroomError: headroomError || null,
  };

  try {
    // Store the log
    await store.set(`token_usage_log:${id}`, log);
    await store.sadd('token_usage_logs:all', id);
    await store.sadd(`token_usage_logs:byUser:${log.userId}`, id);
    await store.sadd(`token_usage_logs:byConversation:${log.conversationId}`, id);
    
    const dayKey = new Date(log.timestamp).toISOString().slice(0, 10);
    await store.sadd(`token_usage_logs:byDay:${dayKey}`, id);
  } catch (err) {
    console.error('Failed to log token usage:', err);
  }

  return log;
}

export async function getAllTokenUsageLogs() {
  const store = getStore();
  const ids = await store.smembers('token_usage_logs:all');
  if (!ids || !ids.length) return [];
  const logs = await Promise.all(ids.map((id) => store.get(`token_usage_log:${id}`)));
  return logs.filter(Boolean);
}

export async function getTokenUsageLogsForConversation(conversationId) {
  const store = getStore();
  const ids = await store.smembers(`token_usage_logs:byConversation:${conversationId}`);
  if (!ids || !ids.length) return [];
  const logs = await Promise.all(ids.map((id) => store.get(`token_usage_log:${id}`)));
  return logs.filter(Boolean);
}

export async function getTokenUsageLogsForUser(userId) {
  const store = getStore();
  const ids = await store.smembers(`token_usage_logs:byUser:${userId}`);
  if (!ids || !ids.length) return [];
  const logs = await Promise.all(ids.map((id) => store.get(`token_usage_log:${id}`)));
  return logs.filter(Boolean);
}
