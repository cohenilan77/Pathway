import { getActor } from '../lib/admin.js';
import { getUserById, ROLES } from '../lib/db.js';
import { getAllUsageRecords, getAllAlerts, getUsageSettings, estimateCompressionForRecord } from '../lib/usage.js';
import { getAllTokenUsageLogs } from '../lib/token-usage-logger.js';

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
];

function dateKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const actor = await getActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  if (actor.role !== ROLES.admin) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const settings = await getUsageSettings();
  const records = await getAllUsageRecords();
  const alerts = await getAllAlerts();

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  let monthlyCost = 0;
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  const byFeature = new Map(FEATURE_LABELS.map((f) => [f.feature, { cost: 0, tokens: 0 }]));
  const byUser = new Map(); // userId -> { cost, tokens, conversationIds: Set }
  const byDate = new Map(); // YYYY-MM-DD -> cost
  const byEndpoint = new Map(); // endpoint -> { cost, inputTokens, outputTokens, inputCost, outputCost, count }
  const byWebSearch = { enabled: { cost: 0, count: 0 }, disabled: { cost: 0, count: 0 } };
  const byHeadroom = { enabled: { cost: 0, count: 0 }, disabled: { cost: 0, count: 0 } };
  let totalInputCost = 0;
  let totalOutputCost = 0;
  let compressionPercentSum = 0;
  let compressionPercentCount = 0;

  for (const r of records) {
    const d = new Date(r.createdAt);
    if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) monthlyCost += r.totalCost || 0;
    totalTokens += r.totalTokens || 0;
    inputTokens += r.inputTokens || 0;
    outputTokens += r.outputTokens || 0;
    totalInputCost += r.inputCost || 0;
    totalOutputCost += r.outputCost || 0;

    const featureBucket = byFeature.get(r.feature) || byFeature.get('general_chat');
    if (featureBucket) {
      featureBucket.cost += r.totalCost || 0;
      featureBucket.tokens += r.totalTokens || 0;
    }

    if (!byUser.has(r.userId)) {
      byUser.set(r.userId, { cost: 0, tokens: 0, conversationIds: new Set() });
    }
    const userBucket = byUser.get(r.userId);
    userBucket.cost += r.totalCost || 0;
    userBucket.tokens += r.totalTokens || 0;
    userBucket.conversationIds.add(r.conversationId);

    const key = dateKey(r.createdAt);
    byDate.set(key, (byDate.get(key) || 0) + (r.totalCost || 0));

    const endpointKey = r.endpoint || 'unknown';
    if (!byEndpoint.has(endpointKey)) {
      byEndpoint.set(endpointKey, { cost: 0, inputTokens: 0, outputTokens: 0, inputCost: 0, outputCost: 0, count: 0 });
    }
    const endpointBucket = byEndpoint.get(endpointKey);
    endpointBucket.cost += r.totalCost || 0;
    endpointBucket.inputTokens += r.inputTokens || 0;
    endpointBucket.outputTokens += r.outputTokens || 0;
    endpointBucket.inputCost += r.inputCost || 0;
    endpointBucket.outputCost += r.outputCost || 0;
    endpointBucket.count += 1;

    const webSearchBucket = r.useWebSearch ? byWebSearch.enabled : byWebSearch.disabled;
    webSearchBucket.cost += r.totalCost || 0;
    webSearchBucket.count += 1;

    const headroomBucket = r.headroomEnabled ? byHeadroom.enabled : byHeadroom.disabled;
    headroomBucket.cost += r.totalCost || 0;
    headroomBucket.count += 1;

    if (typeof r.estimatedCompressionPercent === 'number') {
      compressionPercentSum += r.estimatedCompressionPercent;
      compressionPercentCount += 1;
    }
  }

  const costByEndpoint = [...byEndpoint.entries()].map(([endpoint, bucket]) => ({ endpoint, ...bucket }));
  const averageEstimatedCompressionPercent = compressionPercentCount > 0
    ? compressionPercentSum / compressionPercentCount
    : 0;

  const budgetPercent = settings.monthlyBudget > 0 ? (monthlyCost / settings.monthlyBudget) * 100 : 0;
  const totalUsers = byUser.size;
  const avgCostPerUser = totalUsers > 0 ? monthlyCost / totalUsers : 0;
  const totalSessions = [...byUser.values()].reduce((sum, u) => sum + u.conversationIds.size, 0);
  const avgCostPerSession = totalSessions > 0
    ? records.reduce((sum, r) => sum + (r.totalCost || 0), 0) / totalSessions
    : 0;

  const costByFeature = FEATURE_LABELS.map(({ feature, label }) => {
    const bucket = byFeature.get(feature) || { cost: 0, tokens: 0 };
    return { feature, label, cost: bucket.cost, tokens: bucket.tokens };
  });

  // Roughly the last 30 days, oldest first.
  const costOverTime = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKey(d.getTime());
    costOverTime.push({ date: key, cost: byDate.get(key) || 0 });
  }

  const topUsersByCostRaw = await Promise.all(
    [...byUser.entries()].map(async ([userId, bucket]) => {
      let name = userId;
      if (userId !== 'anonymous') {
        try {
          const user = await getUserById(userId);
          if (user?.name) name = user.name;
        } catch {
          // fall back to userId
        }
      } else {
        name = 'Anonymous';
      }
      const sessions = bucket.conversationIds.size;
      const avgPerSession = sessions > 0 ? bucket.cost / sessions : 0;
      const status = settings.maxCostPerUser > 0
        ? (bucket.cost >= settings.maxCostPerUser ? 'high' : bucket.cost >= settings.maxCostPerUser * 0.8 ? 'warning' : 'normal')
        : 'normal';
      return { userId, name, sessions, tokens: bucket.tokens, cost: bucket.cost, avgPerSession, status };
    })
  );
  const topUsersByCost = topUsersByCostRaw.sort((a, b) => b.cost - a.cost);

  const recentHighCostConversations = [...records]
    .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
    .slice(0, 10)
    .map((r) => ({
      conversationId: r.conversationId,
      userId: r.userId,
      cost: r.totalCost || 0,
      feature: r.feature,
      endpoint: r.endpoint || null,
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0,
      useWebSearch: r.useWebSearch ?? null,
      headroomEnabled: r.headroomEnabled ?? null,
      estimatedCompressionPercent: r.estimatedCompressionPercent ?? null,
      createdAt: r.createdAt,
    }));

  // Use real token usage logs (from Anthropic API responses) for compression metrics.
  const tokenUsageLogs = await getAllTokenUsageLogs();
  const contextCompression = tokenUsageLogs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30)
    .map((log) => ({
      conversationId: log.conversationId,
      userId: log.userId,
      feature: log.feature,
      inputTokens: log.inputTokens || 0,
      compressionPct: log.compressionPct,
      tokensSaved: log.tokensSaved,
      costSaved: log.costSaved,
      real: log.source === 'REAL',
      createdAt: log.timestamp,
    }));
  const totalCompressionSaved = contextCompression.reduce((sum, c) => sum + c.costSaved, 0);
  const avgCompressionPercent = contextCompression.length > 0
    ? contextCompression.reduce((sum, c) => sum + c.compressionPct, 0) / contextCompression.length
    : 0;

  res.status(200).json({
    monthlyCost,
    monthlyBudget: settings.monthlyBudget,
    budgetPercent,
    totalTokens,
    inputTokens,
    outputTokens,
    totalInputCost,
    totalOutputCost,
    totalUsers,
    avgCostPerUser,
    avgCostPerSession,
    costByFeature,
    costByEndpoint,
    costByWebSearch: byWebSearch,
    costByHeadroom: byHeadroom,
    averageEstimatedCompressionPercent,
    avgCompressionPercentReal: avgCompressionPercent, // Real compression from Anthropic cache data
    compressionDataSource: tokenUsageLogs.length > 0 ? 'real' : 'none',
    costOverTime,
    topUsersByCost,
    recentHighCostConversations,
    contextCompression,
    totalCompressionSaved,
    alerts,
    settings,
  });
}
