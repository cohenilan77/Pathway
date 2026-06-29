import { getUserById, getUserIdByToken, setCandidateTelegramIdIndex } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userId = await getUserIdByToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { telegramUserId, telegramOptIn } = req.body;

    // Validate Telegram ID if provided
    if (telegramUserId && !/^\d+$/.test(String(telegramUserId).trim())) {
      return res.status(400).json({
        error: 'Invalid Telegram User ID format',
        message: 'Telegram User ID must be a number (e.g., 987654321). Get it from @userinfobot',
      });
    }

    // Update user details
    const store = getStore();
    const updated = {
      ...user,
      telegramUserId: telegramUserId || '',
      telegramOptIn: !!telegramOptIn,
      telegramOptInTimestamp: telegramOptIn ? Date.now() : null,
    };
    await store.set(`user:${userId}`, updated);

    // Update index
    if (telegramUserId) {
      await setCandidateTelegramIdIndex(userId, String(telegramUserId).trim());
    }

    return res.status(200).json({
      success: true,
      message: 'Telegram settings saved',
      data: {
        telegramUserId: updated.telegramUserId,
        telegramOptIn: updated.telegramOptIn,
        telegramOptInTimestamp: updated.telegramOptInTimestamp,
      },
    });
  } catch (err) {
    console.error('Telegram settings error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
