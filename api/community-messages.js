import { getStore } from '../lib/store.js';

export default async function handler(req, res) {
  console.log('[MSG API]', req.method, req.query, req.body ? 'has-body' : 'no-body');

  const store = getStore();

  try {
    if (req.method === 'POST') {
      const { groupId, userId, userName, text } = req.body;
      console.log('[MSG POST]', { groupId, userId, userName, textLen: text?.length });

      if (!groupId || !userId || !text) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      const key = `messages:${groupId}`;
      let messages = [];

      try {
        const existing = await store.get(key);
        console.log('[MSG GET EXISTING]', key, existing ? 'found' : 'not found');
        if (existing) {
          messages = JSON.parse(existing);
        }
      } catch (e) {
        console.log('[MSG PARSE ERROR]', e.message);
        messages = [];
      }

      const message = {
        id: Date.now(),
        groupId,
        userId,
        userName: userName || 'User',
        text,
        createdAt: Date.now(),
      };

      messages.push(message);
      console.log('[MSG SAVING]', key, 'count:', messages.length);

      await store.set(key, JSON.stringify(messages));
      console.log('[MSG SAVED]', key);

      return res.json(message);
    }

    if (req.method === 'GET') {
      const { groupId } = req.query;
      console.log('[MSG GET]', groupId);

      if (!groupId) {
        return res.status(400).json({ error: 'Missing groupId' });
      }

      const key = `messages:${groupId}`;
      let messages = [];

      try {
        const existing = await store.get(key);
        console.log('[MSG FETCH]', key, existing ? `found ${existing.length} chars` : 'empty');
        if (existing) {
          messages = JSON.parse(existing);
        }
      } catch (e) {
        console.log('[MSG FETCH ERROR]', e.message);
        messages = [];
      }

      console.log('[MSG RETURN]', messages.length, 'messages');
      return res.json({ messages });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[MSG ERROR]', error);
    res.status(500).json({ error: error.message });
  }
}
