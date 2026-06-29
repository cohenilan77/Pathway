export async function sendViaTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[sendViaTelegram] TELEGRAM_BOT_TOKEN not configured');
    return { success: false, error: 'Telegram bot token not configured' };
  }

  if (!chatId || !String(text || '').trim()) {
    return { success: false, error: 'Chat ID and text are required' };
  }

  try {
    console.log(`[sendViaTelegram] Sending to chat ${chatId}`);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId).trim(),
        text: String(text).trim(),
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`[sendViaTelegram] Telegram API error:`, data);
      return { success: false, error: data.description || 'Failed to send message' };
    }

    console.log(`[sendViaTelegram] Message sent successfully to ${chatId}`);
    return { success: true, messageId: data.result.message_id };
  } catch (err) {
    console.error(`[sendViaTelegram] Error:`, err.message);
    return { success: false, error: err.message };
  }
}
