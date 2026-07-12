import { getUserIdByToken, getUserData, setUserData, getUserById, publicUser, touchActivity } from '../lib/db.js';
import { toEnglish } from '../lib/translate.js';
import { normalizeProgramList } from '../lib/program-normalizer.js';
import { getCandidateClock } from '../lib/candidate-clock.js';
import { getUserAssignments } from '../lib/assignments.js';
import { isUndergradProfile, scoresAreStale, recomputeUndergradScores } from '../lib/undergrad/recompute-scores.js';

// PRODUCTION HOTFIX (see commit message): self-heals any Undergraduate
// candidate who was already stuck with stale/empty scores before the
// api/advisor.js and api/agents/orchestrate.js fixes shipped — those only
// cover new turns going forward. A profile with real facts (grade known) but
// no real score gets recomputed and persisted once, here, on the next
// load, with no migration script needed.
async function backfillUndergradScoresIfStale(userId, data) {
  if (!data || !isUndergradProfile(data.profile) || !data.profile?.grade) return data;
  if (!scoresAreStale(data.scores)) return data;
  const kpi = recomputeUndergradScores(data.profile, data.chosenSchools || []);
  const next = { ...data, ...kpi };
  await setUserData(userId, next).catch(() => {});
  return next;
}

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

// Non-chat candidate text fields are always stored in English. Chat messages
// are exempt — they stay in the candidate's language (see App.jsx chat schema).
async function translateNonChatFields(data, userId) {
  if (!data) return data;
  const next = { ...data };
  const conversationId = next.sessionId || 'legacy_session';

  if (next.cvText) next.cvText = await toEnglish(next.cvText, userId, conversationId);
  if (next.essayText) next.essayText = await toEnglish(next.essayText, userId, conversationId);
  if (next.essayQuestion) next.essayQuestion = await toEnglish(next.essayQuestion, userId, conversationId);

  if (next.essays) {
    const schools = Object.keys(next.essays);
    const translatedEntries = await Promise.all(schools.map(async (school) => {
      const entry = next.essays[school];
      return [school, {
        ...entry,
        question: entry.question ? await toEnglish(entry.question, userId, conversationId) : entry.question,
        text: entry.text ? await toEnglish(entry.text, userId, conversationId) : entry.text,
      }];
    }));
    next.essays = Object.fromEntries(translatedEntries);
  }

  return next;
}

export default async function handler(req, res) {
  const token = getToken(req);
  const userId = await getUserIdByToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  if (req.method === 'GET') {
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'This account has been suspended.' });
      return;
    }
    let data = await getUserData(userId);
    if (data?.programs) data.programs = normalizeProgramList(data.programs);
    data = await backfillUndergradScoresIfStale(userId, data);

    // Load journey information
    const clock = await getCandidateClock(userId);
    let journey = null;
    let assignments = [];

    if (clock) {
      assignments = await getUserAssignments(userId);
      journey = {
        type: clock.journeyType,
        stage: clock.stage,
        stageNumber: clock.stageNumber,
        currentStageStartedAt: clock.currentStageStartedAt,
        daysInStage: Math.floor((Date.now() - clock.currentStageStartedAt) / (24 * 60 * 60 * 1000)),
        nextBestAction: clock.currentNextBestAction,
        lastWeeklyCheckInAt: clock.lastWeeklyCheckInAt,
        lastMonthlyReviewAt: clock.lastMonthlyReviewAt,
      };
    }

    await touchActivity(userId);
    res.status(200).json({
      user: publicUser(user),
      data,
      journey,
      assignmentStats: {
        total: assignments.length,
        overdue: assignments.filter(a => a.status === 'overdue').length,
        inProgress: assignments.filter(a => a.status === 'in-progress').length,
        completed: assignments.filter(a => a.status === 'completed').length,
      },
    });
    return;
  }

  if (req.method === 'POST') {
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'This account has been suspended.' });
      return;
    }
    const { data } = req.body || {};
    const translated = await translateNonChatFields(data || {}, userId);
    if (translated?.programs) translated.programs = normalizeProgramList(translated.programs);

    // A web tab saves the whole session. Preserve WhatsApp/system turns that may have
    // arrived after that tab loaded so one channel cannot erase the other.
    const current = (await getUserData(userId)) || {};
    const incomingChat = Array.isArray(translated.chat) ? translated.chat : [];
    const signature = (message) => message?.sourceMessageId
      || [message?.role, message?.channel, message?.timestamp, message?.text].join('|');
    const incomingSignatures = new Set(incomingChat.map(signature));
    const remoteOnly = (Array.isArray(current.chat) ? current.chat : [])
      .filter((message) => ['whatsapp', 'system'].includes(message?.channel))
      .filter((message) => !incomingSignatures.has(signature(message)));
    await setUserData(userId, {
      ...translated,
      chat: [...incomingChat, ...remoteOnly],
    });
    await touchActivity(userId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
