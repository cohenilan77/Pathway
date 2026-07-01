import { getActor } from '../lib/admin.js';
import { getUserById, ROLES } from '../lib/db.js';
import {
  getAllUsageRecords,
  getAllAlerts,
  getUsageSettings,
  estimateCompressionForRecord,
  repriceUsageRecord,
  PRICING,
} from '../lib/usage.js';

const FEATURE_LABELS = [
  { feature: 'narrative_strategy', label: 'Narrative Strategy' },
  { feature: 'profile_analysis', label: 'Profile Analysis' },
  { feature: 'program_matching', label: 'Program Matching' },
  { feature: 'cv_optimization', label: 'CV Optimization' },
  { feature: 'essay_workshop', label: 'Essay Workshop' },
  { feature: 'mock_interview', label: 'Mock Interview' },
  { feature: 'general_chat', label: 'General Chat' },
  { feature: 'session_summary', label: 'Session Summary' },
  { feature: 'help_guide', label: 'Help Guide' },
  { feature: 'document_parsing', label: 'Document Parsing' },
  { feature: 'translation', label: 'Translation' },
  { feature: 'test_simulation', label: 'Test Simulation' },
];

function dateKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function periodBounds(period, now = new Date()) {
  const end = now.getTime() + 1;
  if (period === 'today') {
    return { start: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()), end, label: 'Today (UTC)' };
  }
  if (period === 'all') return { start: null, end, label: 'All time' };
  return { start: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1), end, label: 'This month (UTC)' };
}

function isRealSessionId(value) {
  return typeof value === 'string' && value.startsWith('session_');
}

function addCost(bucket, record) {
  bucket.cost += record.totalCost || 0;
  bucket.storedCost += record.storedTotalCost || 0;
  bucket.tokens += record.totalTokens || 0;
  bucket.inputTokens += record.inputTokens || 0;
  bucket.outputTokens += record.outputTokens || 0;
  bucket.cacheCreationInputTokens += record.cacheCreationInputTokens || 0;
  bucket.cacheReadInputTokens += record.cacheReadInputTokens || 0;
  bucket.webSearchRequests += record.webSearchRequests || 0;
  bucket.webSearchCost += record.webSearchCost || 0;
  bucket.count += 1;
}

function emptyBucket() {
  return {
    cost: 0,
    storedCost: 0,
    tokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    webSearchRequests: 0,
    webSearchCost: 0,
    count: 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const actor = await getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized.' });
  if (actor.role !== ROLES.admin) return res.status(403).json({ error: 'Forbidden.' });

  const settings = await getUsageSettings();
  const rawRecords = await getAllUsageRecords();
  const alerts = await getAllAlerts();
  const now = new Date();
  const requestedPeriod = req.query?.period || new URL(req.url || '/', 'http://localhost').searchParams.get('period');
  const period = ['today', 'month', 'all'].includes(requestedPeriod) ? requestedPeriod : 'month';
  const bounds = periodBounds(period, now);
  const allRepricedRecords = rawRecords.map(repriceUsageRecord);
  const records = allRepricedRecords.filter((record) => {
    const createdAt = Number(record.createdAt) || 0;
    return (bounds.start == null || createdAt >= bounds.start) && createdAt < bounds.end;
  });
  const monthBounds = periodBounds('month', now);
  const monthRecords = allRepricedRecords.filter((r) => r.createdAt >= monthBounds.start && r.createdAt < monthBounds.end);

  const totals = emptyBucket();
  const byFeature = new Map(FEATURE_LABELS.map((f) => [f.feature, emptyBucket()]));
  const byUser = new Map();
  const byDate = new Map();
  const byEndpoint = new Map();
  const byConversation = new Map();
  const byWebSearch = { enabled: emptyBucket(), disabled: emptyBucket() };
  const byHeadroom = { enabled: emptyBucket(), disabled: emptyBucket() };
  let compressionPercentSum = 0;
  let compressionPercentCount = 0;
  let unknownPricingRecords = 0;
  let legacySearchTelemetryRecords = 0;

  for (const record of records) {
    addCost(totals, record);
    if (!record.pricingKnown) unknownPricingRecords += 1;
    if (record.useWebSearch === true && record.webSearchRequests == null) legacySearchTelemetryRecords += 1;

    const featureBucket = byFeature.get(record.feature) || byFeature.get('general_chat');
    if (featureBucket) addCost(featureBucket, record);

    if (!byUser.has(record.userId)) {
      byUser.set(record.userId, {
        ...emptyBucket(),
        trackedConversationIds: new Set(),
        legacyIdentifiers: new Set(),
        trackedCost: 0,
        legacyCost: 0,
      });
    }
    const userBucket = byUser.get(record.userId);
    addCost(userBucket, record);
    if (isRealSessionId(record.conversationId)) {
      userBucket.trackedConversationIds.add(record.conversationId);
      userBucket.trackedCost += record.totalCost || 0;
    } else {
      userBucket.legacyIdentifiers.add(record.conversationId || 'legacy');
      userBucket.legacyCost += record.totalCost || 0;
    }

    const day = dateKey(record.createdAt);
    if (!byDate.has(day)) byDate.set(day, emptyBucket());
    addCost(byDate.get(day), record);

    const endpoint = record.endpoint || 'unknown';
    if (!byEndpoint.has(endpoint)) byEndpoint.set(endpoint, emptyBucket());
    addCost(byEndpoint.get(endpoint), record);

    addCost(record.useWebSearch ? byWebSearch.enabled : byWebSearch.disabled, record);
    addCost(record.headroomEnabled ? byHeadroom.enabled : byHeadroom.disabled, record);

    const conversationKey = `${record.userId || 'anonymous'}:${record.conversationId || 'legacy'}`;
    if (!byConversation.has(conversationKey)) {
      byConversation.set(conversationKey, {
        ...emptyBucket(),
        conversationId: record.conversationId || 'legacy',
        userId: record.userId || 'anonymous',
        featureCounts: new Map(),
        createdAt: Number(record.createdAt) || 0,
        legacy: !isRealSessionId(record.conversationId),
      });
    }
    const conversationBucket = byConversation.get(conversationKey);
    addCost(conversationBucket, record);
    conversationBucket.createdAt = Math.max(conversationBucket.createdAt, Number(record.createdAt) || 0);
    conversationBucket.featureCounts.set(record.feature, (conversationBucket.featureCounts.get(record.feature) || 0) + 1);

    if (typeof record.estimatedCompressionPercent === 'number') {
      compressionPercentSum += record.estimatedCompressionPercent;
      compressionPercentCount += 1;
    }
  }

  const userNames = new Map();
  await Promise.all([...byUser.keys()].map(async (userId) => {
    if (userId === 'anonymous') return userNames.set(userId, 'Anonymous');
    try {
      const user = await getUserById(userId);
      userNames.set(userId, user?.name || userId);
    } catch {
      userNames.set(userId, userId);
    }
  }));

  const todayBounds = periodBounds('today', now);
  const todayCostByUser = new Map();
  for (const record of allRepricedRecords) {
    if (record.createdAt < todayBounds.start || record.createdAt >= todayBounds.end) continue;
    todayCostByUser.set(record.userId, (todayCostByUser.get(record.userId) || 0) + (record.totalCost || 0));
  }

  const topUsersByCost = [...byUser.entries()].map(([userId, bucket]) => {
    const sessions = bucket.trackedConversationIds.size;
    const avgPerSession = sessions > 0 ? bucket.trackedCost / sessions : null;
    const todayCost = todayCostByUser.get(userId) || 0;
    const status = settings.maxCostPerUser > 0
      ? (todayCost >= settings.maxCostPerUser ? 'high' : todayCost >= settings.maxCostPerUser * 0.8 ? 'warning' : 'normal')
      : 'normal';
    return {
      userId,
      name: userNames.get(userId) || userId,
      sessions,
      legacyIdentifiers: bucket.legacyIdentifiers.size,
      legacyCost: bucket.legacyCost,
      tokens: bucket.tokens,
      cost: bucket.cost,
      storedCost: bucket.storedCost,
      correction: bucket.cost - bucket.storedCost,
      todayCost,
      avgPerSession,
      status,
    };
  }).sort((a, b) => b.cost - a.cost);

  const recentHighCostConversations = [...byConversation.values()]
    .map((bucket) => ({
      conversationId: bucket.conversationId,
      userId: bucket.userId,
      userName: userNames.get(bucket.userId) || bucket.userId,
      cost: bucket.cost,
      storedCost: bucket.storedCost,
      tokens: bucket.tokens,
      attempts: bucket.count,
      webSearchRequests: bucket.webSearchRequests,
      feature: [...bucket.featureCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'general_chat',
      createdAt: bucket.createdAt,
      legacy: bucket.legacy,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  const costByFeature = FEATURE_LABELS.map(({ feature, label }) => ({ feature, label, ...(byFeature.get(feature) || emptyBucket()) }));
  const costByEndpoint = [...byEndpoint.entries()].map(([endpoint, bucket]) => ({ endpoint, ...bucket })).sort((a, b) => b.cost - a.cost);
  const costOverTime = [...byDate.entries()].map(([date, bucket]) => ({ date, ...bucket })).sort((a, b) => a.date.localeCompare(b.date));
  const contextCompression = [...records]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 30)
    .map((record) => {
      const compression = estimateCompressionForRecord(record);
      return {
        conversationId: record.conversationId,
        userId: record.userId,
        feature: record.feature,
        inputTokens: record.inputTokens || 0,
        ...compression,
        createdAt: record.createdAt,
      };
    });
  const totalCompressionSaved = contextCompression.reduce((sum, item) => sum + item.costSaved, 0);
  const totalTrackedSessions = [...byUser.values()].reduce((sum, bucket) => sum + bucket.trackedConversationIds.size, 0);
  const totalTrackedSessionCost = [...byUser.values()].reduce((sum, bucket) => sum + bucket.trackedCost, 0);
  const monthlyCost = monthRecords.reduce((sum, record) => sum + (record.totalCost || 0), 0);
  const monthlyStoredCost = monthRecords.reduce((sum, record) => sum + (record.storedTotalCost || 0), 0);
  const budgetPercent = settings.monthlyBudget > 0 ? (monthlyCost / settings.monthlyBudget) * 100 : 0;

  res.status(200).json({
    period,
    periodLabel: bounds.label,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    pricing: PRICING,
    pricingSource: 'Anthropic public list pricing; estimated locally from real API usage counters',
    monthlyCost,
    monthlyStoredCost,
    monthlyBudget: settings.monthlyBudget,
    budgetPercent,
    selectedCost: totals.cost,
    selectedStoredCost: totals.storedCost,
    correctionDelta: totals.cost - totals.storedCost,
    totalTokens: totals.tokens,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    cacheCreationInputTokens: totals.cacheCreationInputTokens,
    cacheReadInputTokens: totals.cacheReadInputTokens,
    webSearchRequests: totals.webSearchRequests,
    webSearchCost: totals.webSearchCost,
    inputCost: records.reduce((sum, r) => sum + (r.inputCost || 0), 0),
    cacheCreationCost: records.reduce((sum, r) => sum + (r.cacheCreationCost || 0), 0),
    cacheReadCost: records.reduce((sum, r) => sum + (r.cacheReadCost || 0), 0),
    totalInputCost: records.reduce((sum, r) => sum + (r.inputCost || 0) + (r.cacheCreationCost || 0) + (r.cacheReadCost || 0), 0),
    totalOutputCost: records.reduce((sum, r) => sum + (r.outputCost || 0), 0),
    totalUsers: byUser.size,
    totalSessions: totalTrackedSessions,
    legacySessionIdentifiers: [...byUser.values()].reduce((sum, bucket) => sum + bucket.legacyIdentifiers.size, 0),
    avgCostPerUser: byUser.size > 0 ? totals.cost / byUser.size : 0,
    avgCostPerSession: totalTrackedSessions > 0 ? totalTrackedSessionCost / totalTrackedSessions : null,
    unknownPricingRecords,
    legacySearchTelemetryRecords,
    costByFeature,
    costByEndpoint,
    costByWebSearch: byWebSearch,
    costByHeadroom: byHeadroom,
    averageEstimatedCompressionPercent: compressionPercentCount > 0 ? compressionPercentSum / compressionPercentCount : 0,
    avgCompressionPercentReal: contextCompression.length > 0
      ? contextCompression.reduce((sum, item) => sum + item.compressionPct, 0) / contextCompression.length
      : 0,
    totalTokensSavedViaHeadroom: contextCompression.reduce((sum, item) => sum + item.tokensSaved, 0),
    compressionDataSource: contextCompression.some((item) => item.real) ? 'real' : (contextCompression.length ? 'estimated' : 'none'),
    costOverTime,
    topUsersByCost,
    recentHighCostConversations,
    contextCompression,
    totalCompressionSaved,
    alerts,
    settings,
  });
}
