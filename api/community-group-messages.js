import { getUserIdByToken, getUserById, getUserData, createCommunityMessage, getGroupMessages } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

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

    if (req.method === 'GET') {
      const { groupId } = req.query;
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

      const messages = await getGroupMessages(groupId, userId);
      const anonymizedMessages = messages.map(msg => ({
        ...msg,
        userInitials: msg.userInitials, // Will be set by client
      }));

      res.status(200).json({ messages: anonymizedMessages });
    } else if (req.method === 'POST') {
      const { groupId, text } = req.body;
      if (!groupId || !text) {
        res.status(400).json({ error: 'Group ID and text are required' });
        return;
      }

      const data = await getUserData(userId);
      const category = data?.profile?.category;
      if (!category) {
        res.status(400).json({ error: 'User category not set' });
        return;
      }

      const message = await createCommunityMessage(groupId, userId, text, category);

      res.status(200).json({ message });
    }
  } catch (error) {
    res.status(400).json({ error: error.message || 'Bad request' });
  }
}
