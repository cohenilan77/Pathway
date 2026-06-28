import { getUserIdByToken, getUserById, getUserData, joinCommunityGroup } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
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

    const { groupId } = req.body;
    if (!groupId) {
      res.status(400).json({ error: 'Group ID is required' });
      return;
    }

    const data = await getUserData(userId);
    const category = data?.profile?.category;

    if (!category) {
      res.status(400).json({ error: 'User category not set' });
      return;
    }

    await joinCommunityGroup(userId, groupId, category);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Bad request' });
  }
}
