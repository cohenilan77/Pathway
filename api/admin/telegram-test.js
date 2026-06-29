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

    if (!botToken) {
      return res.status(400).json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN not configured in environment',
      });
    }

    console.log(`[telegram-test] Testing bot token...`);

    // Get bot info to verify token is valid
    const getMeResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
    });

    const getMeData = await getMeResponse.json();

    if (!getMeData.ok) {
      console.error(`[telegram-test] Telegram API error:`, getMeData);
      return res.status(400).json({
        ok: false,
        error: getMeData.description || 'Invalid bot token',
        telegramError: getMeData,
      });
    }

    const botInfo = getMeData.result;
    console.log(`[telegram-test] Bot verified:`, botInfo);

    // Get webhook info
    const getWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      { method: 'GET' }
    );

    const getWebhookData = await getWebhookResponse.json();
    const webhookInfo = getWebhookData.ok ? getWebhookData.result : null;

    return res.status(200).json({
      ok: true,
      message: 'Telegram bot is working',
      botInfo: {
        id: botInfo.id,
        isBot: botInfo.is_bot,
        firstName: botInfo.first_name,
        username: botInfo.username,
        canJoinGroups: botInfo.can_join_groups,
        canReadAllGroupMessages: botInfo.can_read_all_group_messages,
        supportsInlineQueries: botInfo.supports_inline_queries,
      },
      webhookInfo: webhookInfo ? {
        url: webhookInfo.url,
        hasCustomCertificate: webhookInfo.has_custom_certificate,
        pendingUpdateCount: webhookInfo.pending_update_count,
        lastErrorDate: webhookInfo.last_error_date,
        lastErrorMessage: webhookInfo.last_error_message,
        maxConnections: webhookInfo.max_connections,
        allowedUpdates: webhookInfo.allowed_updates,
      } : null,
    });
  } catch (error) {
    console.error(`[telegram-test] Error:`, error.message);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
