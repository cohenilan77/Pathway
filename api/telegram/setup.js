import { registerWebhook } from '../../lib/telegram/outbound.js';

export default async function handler(req, res) {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set in Vercel env vars' });
  if (!webhookUrl) return res.status(500).json({ error: 'TELEGRAM_WEBHOOK_URL not set in Vercel env vars' });

  const result = await registerWebhook(webhookUrl);
  return res.status(result.success ? 200 : 500).json({ ...result, webhookUrl });
}
