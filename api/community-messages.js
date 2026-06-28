import { getAllUserIds, getUserById } from '../lib/db.js';
import { redis } from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { groupId, userId, text, userName } = req.body;
      if (!groupId || !userId || !text) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      const message = {
        id: Date.now(),
        groupId,
        userId,
        userName: userName || 'Member',
        text,
        createdAt: Date.now(),
      };

      const key = `messages:${groupId}`;
      await redis.lpush(key, JSON.stringify(message));
      await redis.expire(key, 7 * 24 * 60 * 60); // 7 days

      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const { groupId } = req.query;
      if (!groupId) {
        return res.status(400).json({ error: 'Missing groupId' });
      }

      const key = `messages:${groupId}`;
      const rawMessages = await redis.lrange(key, 0, -1);
      const messages = rawMessages.map(m => JSON.parse(m)).reverse();

      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
