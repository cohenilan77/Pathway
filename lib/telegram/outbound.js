let cachedBotToken;

function getBotToken() {
  if (!cachedBotToken) {
    cachedBotToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  }
  return cachedBotToken;
}

function getConfigurationError() {
  if (!getBotToken()) return 'TELEGRAM_BOT_TOKEN is not configured';
  return '';
}

function getTelegramApiUrl(method) {
  const token = getBotToken();
  return `https://api.telegram.org/bot${token}/${method}`;
}

function describeTelegramError(error, response) {
  const code = response?.error_code ? `Telegram ${response.error_code}` : 'Telegram error';
  const message = response?.description || error?.message || 'Unknown messaging error';
  return `${code}: ${message}`;
}

function logTelegramError(label, error, metadata = {}) {
  console.error(label, {
    ...metadata,
    error: error?.message || null,
  });
}

export async function sendViaTelegram(telegramUserId, text) {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[sendViaTelegram] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }

  const url = getTelegramApiUrl('sendMessage');
  const userId = String(telegramUserId || '').trim();
  if (!userId) {
    return { success: false, error: 'Invalid Telegram user ID' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: String(text || '').trim(),
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      const error = describeTelegramError(new Error(), data);
      console.error('[sendViaTelegram] TELEGRAM ERROR', { chatId: userId, response: data });
      return { success: false, error, code: data.error_code };
    }

    console.log(`[sendViaTelegram] SUCCESS: ${userId} message_id=${data.result?.message_id}`);
    return { messageId: data.result?.message_id, success: true };
  } catch (error) {
    logTelegramError('[sendViaTelegram] FETCH ERROR', error, { chatId: userId });
    return { success: false, error: error.message };
  }
}

export async function registerWebhook(webhookUrl) {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[registerWebhook] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }

  const url = getTelegramApiUrl('setWebhook');
  const cleanUrl = String(webhookUrl || '').trim();

  if (!cleanUrl) {
    return { success: false, error: 'Webhook URL is required' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl }),
    });

    const data = await response.json();
    if (!data.ok) {
      const error = describeTelegramError(new Error(), data);
      console.error('[registerWebhook] TELEGRAM ERROR', { webhookUrl: cleanUrl, response: data });
      return { success: false, error, code: data.error_code };
    }

    console.log(`[registerWebhook] SUCCESS: Webhook registered at ${cleanUrl}`);
    return { success: true };
  } catch (error) {
    logTelegramError('[registerWebhook] FETCH ERROR', error, { webhookUrl: cleanUrl });
    return { success: false, error: error.message };
  }
}

export async function getWebhookInfo() {
  const configurationError = getConfigurationError();
  if (configurationError) return { success: false, error: configurationError };
  try {
    const response = await fetch(getTelegramApiUrl('getWebhookInfo'));
    const data = await response.json();
    if (!data.ok) {
      const error = describeTelegramError(new Error(), data);
      console.error('[getWebhookInfo] TELEGRAM ERROR', { response: data });
      return { success: false, error, code: data.error_code };
    }
    return { success: true, info: data.result };
  } catch (error) {
    logTelegramError('[getWebhookInfo] FETCH ERROR', error);
    return { success: false, error: error.message };
  }
}

export async function deleteWebhook() {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.error(`[deleteWebhook] ERROR: ${configurationError}`);
    return { success: false, error: configurationError };
  }

  const url = getTelegramApiUrl('deleteWebhook');

  try {
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (!data.ok) {
      const error = describeTelegramError(new Error(), data);
      console.error('[deleteWebhook] TELEGRAM ERROR', error);
      return { success: false, error, code: data.error_code };
    }

    console.log('[deleteWebhook] SUCCESS: Webhook deleted');
    return { success: true };
  } catch (error) {
    logTelegramError('[deleteWebhook] FETCH ERROR', error);
    return { success: false, error: error.message };
  }
}
