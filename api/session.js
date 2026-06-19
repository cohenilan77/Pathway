import { getUserIdByToken, getUserData, setUserData, getUserById, publicUser, touchActivity } from '../lib/db.js';
import { toEnglish } from '../lib/translate.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

// Non-chat candidate text fields are always stored in English. Chat messages
// are exempt — they stay in the candidate's language (see App.jsx chat schema).
async function translateNonChatFields(data) {
  if (!data) return data;
  const next = { ...data };

  if (next.cvText) next.cvText = await toEnglish(next.cvText);
  if (next.essayText) next.essayText = await toEnglish(next.essayText);
  if (next.essayQuestion) next.essayQuestion = await toEnglish(next.essayQuestion);

  if (next.essays) {
    const schools = Object.keys(next.essays);
    const translatedEntries = await Promise.all(schools.map(async (school) => {
      const entry = next.essays[school];
      return [school, {
        ...entry,
        question: entry.question ? await toEnglish(entry.question) : entry.question,
        text: entry.text ? await toEnglish(entry.text) : entry.text,
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
    await touchActivity(userId);
    res.status(200).json({ user: publicUser(user), data });
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
    const translated = await translateNonChatFields(data || {});
    await setUserData(userId, translated);
    await touchActivity(userId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
