// Login Greeting API
// Returns personalized AI-generated greeting for candidate

import { getUserIdByToken, getUserById, getUserData } from '../lib/db.js';
import { getLoginGreeting } from '../lib/greeting-generator.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = getToken(req);
  const userId = await getUserIdByToken(token);

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data = await getUserData(userId);
    const greeting = await getLoginGreeting(userId, user, data);

    res.status(200).json(greeting);
  } catch (error) {
    console.error('Error getting greeting:', error);
    res.status(500).json({
      error: 'Failed to generate greeting',
      details: error.message,
    });
  }
}
