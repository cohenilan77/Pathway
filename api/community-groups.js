import { getUserIdByToken, getUserById, getUserData, getCommunityGroups } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
    if (!match) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = await getUserIdByToken(match[1]);
    if (!userId) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const data = await getUserData(userId);
    const category = data?.profile?.category;

    if (!category || !['Undergraduate', 'Graduate', 'Postgraduate / Doctoral', 'Personal Development'].includes(category)) {
      res.status(400).json({ error: 'User category not set' });
      return;
    }

    const selectedSchools = req.query.schools ? (typeof req.query.schools === 'string' ? [req.query.schools] : req.query.schools) : [];
    const selectedPrograms = req.query.programs ? (typeof req.query.programs === 'string' ? [req.query.programs] : req.query.programs) : [];

    const groups = await getCommunityGroups(userId, category, selectedSchools, selectedPrograms);

    res.status(200).json({ groups });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Bad request' });
  }
}
