import { getActor } from '../../lib/admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Require admin authentication
    const actor = await getActor(req);
    if (!actor) {
      return res.status(401).json({ error: 'Not authenticated. Use X-Admin-Secret or Bearer token.' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    if (!botToken) {
      return res.status(400).json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN not configured in environment',
      });
    }

    if (!webhookUrl) {
      return res.status(400).json({
        ok: false,
        error: 'TELEGRAM_WEBHOOK_URL not configured in environment',
      });
    }

    console.log(`[telegram-setup] Registering webhook: ${webhookUrl}`);

    // Call Telegram API to set webhook
    const setWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );

    const setWebhookData = await setWebhookResponse.json();

    if (!setWebhookData.ok) {
      console.error(`[telegram-setup] Telegram API error:`, setWebhookData);
      return res.status(400).json({
        ok: false,
        error: setWebhookData.description || 'Failed to register webhook',
        telegramError: setWebhookData,
      });
    }

    console.log(`[telegram-setup] Webhook registered successfully`);

    // Verify webhook was set
    const getWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      { method: 'GET' }
    );

    const getWebhookData = await getWebhookResponse.json();

    if (!getWebhookData.ok) {
      console.error(`[telegram-setup] Failed to verify webhook:`, getWebhookData);
      return res.status(400).json({
        ok: false,
        error: 'Webhook set but verification failed',
        telegramError: getWebhookData,
      });
    }

    const webhookInfo = getWebhookData.result;
    console.log(`[telegram-setup] Webhook verified:`, webhookInfo);

    return res.status(200).json({
      ok: true,
      message: 'Telegram webhook registered successfully',
      webhookUrl,
      webhookInfo: {
        url: webhookInfo.url,
        hasCustomCertificate: webhookInfo.has_custom_certificate,
        pendingUpdateCount: webhookInfo.pending_update_count,
        lastErrorDate: webhookInfo.last_error_date,
        lastErrorMessage: webhookInfo.last_error_message,
        maxConnections: webhookInfo.max_connections,
        allowedUpdates: webhookInfo.allowed_updates,
      },
    });
  } catch (error) {
    console.error(`[telegram-setup] Error:`, error.message);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
