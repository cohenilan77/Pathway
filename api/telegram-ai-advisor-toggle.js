import { getUserById } from '../lib/db.js';
import { authorizeAdminChat } from '../lib/chat-auth.js';
import { startTelegramAiAdvisor, stopTelegramAiAdvisor } from '../lib/telegramAiAdvisor/service.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { candidateId } = req.body || {};
  if (!candidateId) {
    return res.status(400).json({ error: 'candidateId is required' });
  }

  try {
    // Authorize admin access
    const context = await authorizeAdminChat(req, candidateId);
    if (!context.actor) {
      return res.status(context.status).json({ error: context.error });
    }

    const candidate = await getUserById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const isCurrentlyActive = !!candidate.telegramAiAdvisorSessionActive;
    const nextActive = !isCurrentlyActive;

    if (nextActive) {
      // Starting the advisor
      await startTelegramAiAdvisor(candidateId);
      return res.status(200).json({
        ok: true,
        candidate: { ...candidate, telegramAiAdvisorSessionActive: true },
        message: 'Telegram AI Advisor started',
      });
    } else {
      // Stopping the advisor
      await stopTelegramAiAdvisor(candidateId);
      return res.status(200).json({
        ok: true,
        candidate: { ...candidate, telegramAiAdvisorSessionActive: false },
        message: 'Telegram AI Advisor stopped',
      });
    }
  } catch (error) {
    console.error('[telegram-ai-advisor-toggle] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
