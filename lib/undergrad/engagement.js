// Engagement view-model — candidate ↔ consultant relationship health for the
// admin Engagement tab. Pure aggregation over REAL user records returned by
// /api/admin-users (no meetings/leaderboard/activity mock data). Signals that
// are not yet instrumented are surfaced honestly as "Not tracked yet".

import { DAY_MS } from './constants.js';

const NOT_TRACKED = 'Not tracked yet';

// Health thresholds (days) for the candidate–consultant relationship.
const HEALTH = {
  needsAttentionDays: 7,
  atRiskDays: 14,
};

function lastActivity(candidate) {
  const values = [candidate.lastActiveAt, candidate.lastLoginAt]
    .map(v => (v ? new Date(v).getTime() : 0))
    .filter(v => v > 0);
  return values.length ? Math.max(...values) : null;
}

function daysSince(ts, now) {
  if (!ts) return null;
  return Math.floor((now - ts) / DAY_MS);
}

// One relationship row following the documented view model.
export function relationshipHealth(candidate, consultantsById, now = Date.now()) {
  const consultant = candidate.consultantId ? consultantsById.get(candidate.consultantId) : null;
  const lastAt = lastActivity(candidate);
  const inactiveDays = daysSince(lastAt, now);
  const unread = candidate.unreadMessages || 0;
  const chatLength = candidate.chatLength || 0;

  let healthStatus = 'Healthy';
  let riskLevel = 'low';
  let nextAction = 'On track — routine check-in.';

  if (!candidate.consultantId) {
    healthStatus = 'At risk';
    riskLevel = 'high';
    nextAction = 'Assign a consultant to this candidate.';
  } else if (inactiveDays != null && inactiveDays >= HEALTH.atRiskDays) {
    healthStatus = 'At risk';
    riskLevel = 'high';
    nextAction = `Re-engage — quiet for ${inactiveDays} days.`;
  } else if (unread > 0) {
    healthStatus = 'Needs attention';
    riskLevel = 'medium';
    nextAction = `Reply — ${unread} unread message${unread === 1 ? '' : 's'} waiting.`;
  } else if (inactiveDays != null && inactiveDays >= HEALTH.needsAttentionDays) {
    healthStatus = 'Needs attention';
    riskLevel = 'medium';
    nextAction = `Check in — last active ${inactiveDays} days ago.`;
  } else if (chatLength <= 1) {
    healthStatus = 'Needs attention';
    riskLevel = 'medium';
    nextAction = 'Kick off the first working session.';
  }

  return {
    relationshipId: `${candidate.consultantId || 'unassigned'}:${candidate.id}`,
    candidateId: candidate.id,
    candidateName: candidate.name || candidate.email || 'Candidate',
    consultantId: candidate.consultantId || null,
    consultantName: consultant?.name || consultant?.email || (candidate.consultantId ? 'Consultant' : 'Unassigned'),
    lastActivityAt: lastAt,
    inactiveDays,
    // Real, tracked signals:
    chatActivity: chatLength,
    unreadMessages: unread,
    // TODO(instrumentation): no meeting log or per-message response timestamps
    // are recorded yet, so these stay honest rather than fabricated.
    meetingsStatus: NOT_TRACKED,
    responseSpeed: NOT_TRACKED,
    openFollowUps: NOT_TRACKED,
    overdueFollowUps: NOT_TRACKED,
    riskLevel,
    healthStatus,
    nextAction,
  };
}

// Full engagement model: filtered relationships + real roll-up KPIs.
export function buildEngagement(candidateUsers = [], consultantUsers = [], {
  now = Date.now(),
  candidateId = null,
  consultantId = null,
} = {}) {
  const consultantsById = new Map((consultantUsers || []).map(c => [c.id, c]));

  let relationships = (candidateUsers || []).map(c => relationshipHealth(c, consultantsById, now));
  if (candidateId) relationships = relationships.filter(r => r.candidateId === candidateId);
  if (consultantId) {
    relationships = consultantId === 'unassigned'
      ? relationships.filter(r => !r.consultantId)
      : relationships.filter(r => r.consultantId === consultantId);
  }

  const rank = { high: 0, medium: 1, low: 2 };
  relationships.sort((a, b) => (rank[a.riskLevel] - rank[b.riskLevel]) || ((b.unreadMessages || 0) - (a.unreadMessages || 0)));

  const kpis = {
    tracked: relationships.length,
    healthy: relationships.filter(r => r.healthStatus === 'Healthy').length,
    needsAttention: relationships.filter(r => r.healthStatus === 'Needs attention').length,
    atRisk: relationships.filter(r => r.healthStatus === 'At risk').length,
    unassigned: relationships.filter(r => !r.consultantId).length,
    unreadWaiting: relationships.reduce((sum, r) => sum + (r.unreadMessages || 0), 0),
  };

  return { generatedAt: now, relationships, kpis };
}

export const ENGAGEMENT_NOT_TRACKED = NOT_TRACKED;
