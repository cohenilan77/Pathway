import { registerWebhook } from '../../lib/telegram/outbound.js';
import { getUserIdByToken } from '../../lib/db.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Require a valid admin session
  const sessionToken = getToken(req);
  if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserIdByToken(sessionToken);
  if (!userId) return res.status(401).json({ error: 'Invalid session' });

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'TELEGRAM_WEBHOOK_URL env var is not set' });
  }

  const result = await registerWebhook(webhookUrl);
  return res.status(result.success ? 200 : 500).json(result);
}
