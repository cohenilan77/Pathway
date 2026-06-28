import { getUserIdByToken, getUserById, sendDirectMessage, getDirectMessages } from '../lib/db.js';

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
      const { conversationId } = req.query;
      if (!conversationId) {
        res.status(400).json({ error: 'Conversation ID is required' });
        return;
      }

      const messages = await getDirectMessages(conversationId, userId);

      res.status(200).json({ messages });
    } else if (req.method === 'POST') {
      const { conversationId, toUserId, text } = req.body;
      if (!conversationId || !toUserId || !text) {
        res.status(400).json({ error: 'Conversation ID, toUserId, and text are required' });
        return;
      }

      const message = await sendDirectMessage(conversationId, userId, toUserId, text);

      res.status(200).json({ message });
    }
  } catch (error) {
    res.status(400).json({ error: error.message || 'Bad request' });
  }
}
