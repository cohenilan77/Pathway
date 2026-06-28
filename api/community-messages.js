import { getStore } from '../lib/store.js';

export default async function handler(req, res) {
  const store = getStore();

  try {
    if (req.method === 'POST') {
      const { groupId, userId, userName, text } = req.body;
      if (!groupId || !userId || !text) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      const key = `messages:${groupId}`;
      const existing = await store.get(key);
      const messages = existing ? JSON.parse(existing) : [];

      const message = {
        id: Date.now(),
        groupId,
        userId,
        userName: userName || 'User',
        text,
        createdAt: Date.now(),
      };

      messages.push(message);
      await store.set(key, JSON.stringify(messages));

      return res.json(message);
    }

    if (req.method === 'GET') {
      const { groupId } = req.query;
      if (!groupId) {
        return res.status(400).json({ error: 'Missing groupId' });
      }

      const key = `messages:${groupId}`;
      const existing = await store.get(key);
      const messages = existing ? JSON.parse(existing) : [];

      return res.json({ messages });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Message API error:', error);
    res.status(500).json({ error: error.message });
  }
}
