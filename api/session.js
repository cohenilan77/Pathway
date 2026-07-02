import { getUserIdByToken, getUserData, setUserData, getUserById, publicUser, touchActivity } from '../lib/db.js';
import { toEnglish } from '../lib/translate.js';
import { normalizeProgramList } from '../lib/program-normalizer.js';
import { getCandidateClock } from '../lib/candidate-clock.js';
import { getUserAssignments } from '../lib/assignments.js';
import { clearMessages } from '../lib/chat.js';
import { resetJourney } from '../lib/agents/journey/state.js';
import { getStore } from '../lib/store.js';

// Best-effort removal of uploaded originals (CV + document files) from blob storage.
// Failures are logged but never block the reset — the session data itself is the
// source of truth and is wiped regardless.
async function deleteSessionFiles(data) {
  const files = [
    data?.cvFile,
    ...(Array.isArray(data?.documents) ? data.documents.map((doc) => doc?.file) : []),
  ].filter((file) => file && (file.url || file.pathname));
  if (!files.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { del } = await import('@vercel/blob');
    await Promise.allSettled(files.map((file) => del(file.url || file.pathname)));
  } catch (err) {
    console.error('session reset: blob delete failed:', err.message);
  }
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
    const data = await getUserData(userId);
    if (data?.programs) data.programs = normalizeProgramList(data.programs);

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

    // Stale-write guard: after a session reset (DELETE below) stores a fresh
    // sessionId, an in-flight autosave from before the reset — or a second tab
    // still holding the old session — must not resurrect the deleted data.
    // Any write carrying substantive data under a different sessionId than the
    // one on record is stale. Blank writes (sessionId only, no chat/profile/docs)
    // are always allowed: they are wipes, not resurrections, and serve as the
    // reset fallback when the DELETE request itself fails.
    const incomingChatCount = Array.isArray(translated?.chat) ? translated.chat.length : 0;
    const isBlankReset = !translated?.profile && incomingChatCount <= 1
      && !(Array.isArray(translated?.documents) && translated.documents.length);
    if (!isBlankReset && current.sessionId && translated?.sessionId && translated.sessionId !== current.sessionId) {
      res.status(200).json({ ok: false, staleSession: true, sessionId: current.sessionId });
      return;
    }
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

  // Full session reset: wipe chat, profile, analysis, documents, AND the uploaded
  // files associated with them. Triggered only after the candidate confirms
  // "Are you sure?" on the New session / refresh button.
  if (req.method === 'DELETE') {
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    const current = (await getUserData(userId)) || {};
    await deleteSessionFiles(current);
    const nextSessionId = typeof req.body?.sessionId === 'string' && req.body.sessionId
      ? req.body.sessionId
      : `session_${Date.now()}`;
    await setUserData(userId, { sessionId: nextSessionId });
    // Wipe every other per-candidate memory tied to the session: the live chat
    // log, the adaptive agent's journey memory (collected facts, stage, chosen
    // schools, history), and the candidate clock (stage/next-best-action). The
    // clock is re-initialized when a new journey starts; all readers null-check.
    // Same key format as lib/greeting-generator.js getDateKey() (server-local time)
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await Promise.allSettled([
      clearMessages(userId),
      resetJourney(userId),
      getStore().del(`candidate:clock:${userId}`),
      getStore().del(`greeting:${userId}:${dateKey}`),
    ]);
    await touchActivity(userId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
