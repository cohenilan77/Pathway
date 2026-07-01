import {
  getUserIdByToken, getUserById, getUserData,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriend, blockUser, isBlocked
} from '../lib/db.js';

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

    const { action, otherUserId } = req.body;
    if (!action || !otherUserId) {
      res.status(400).json({ error: 'Action and otherUserId are required' });
      return;
    }

    const data = await getUserData(userId);
    const category = data?.profile?.category;
    if (!category) {
      res.status(400).json({ error: 'User category not set' });
      return;
    }

    let result;

    switch (action) {
      case 'send':
        result = await sendFriendRequest(userId, otherUserId);
        break;
      case 'accept':
        result = await acceptFriendRequest(userId, otherUserId);
        break;
      case 'decline':
        await declineFriendRequest(userId, otherUserId);
        result = { success: true };
        break;
      case 'remove':
        await removeFriend(userId, otherUserId);
        result = { success: true };
        break;
      case 'block':
        await blockUser(userId, otherUserId);
        result = { success: true };
        break;
      case 'isBlocked':
        const blocked = await isBlocked(userId, otherUserId);
        result = { blocked };
        break;
      default:
        res.status(400).json({ error: 'Invalid action' });
        return;
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Bad request' });
  }
}
