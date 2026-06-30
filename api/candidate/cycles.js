// Candidate Cycles API
// Access weekly check-ins and monthly reviews

import { getUserIdByToken, getUserById } from '../../lib/db.js';
import { getWeeklyCheckInHistory, getMonthlyReviewHistory, getLatestCycleReview } from '../../lib/cycle-processor.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  const token = getToken(req);
  const userId = await getUserIdByToken(token);

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { type, limit = 10 } = req.query;

      let data;
      if (type === 'weekly') {
        data = await getWeeklyCheckInHistory(userId, parseInt(limit));
      } else if (type === 'monthly') {
        data = await getMonthlyReviewHistory(userId, parseInt(limit));
      } else {
        // Get latest of both
        data = await getLatestCycleReview(userId);
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      res.status(500).json({ error: 'Failed to fetch cycles' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
