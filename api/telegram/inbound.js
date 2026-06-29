import { getUserById, updateUserData, getTelegramChatId } from '../../lib/db.js';
import { appendMessage } from '../../lib/chat.js';
import { sendViaTelegram } from '../../lib/telegram/outbound.js';
import { handleTelegramAiAdvisor } from '../../lib/telegramAiAdvisor/service.js';

// Telegram sends messages from candidates identified by their Telegram chat_id
// We need to match chat_id to a candidate via getTelegramChatId()
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;
  if (!update) {
    return res.status(400).json({ error: 'No update received' });
  }

  console.log('[telegram/inbound] Received update:', JSON.stringify(update, null, 2));

  // Only handle text messages
  if (!update.message || !update.message.text) {
    console.log('[telegram/inbound] Ignoring non-text update');
    return res.status(200).json({ ok: true });
  }

  const chatId = update.message.chat.id;
  const messageText = update.message.text.trim();
  const telegramUserId = update.message.from.id;
  const telegramUsername = update.message.from.username || 'unknown';

  try {
    // 1. Find candidate by Telegram chat_id
    const candidateId = await getTelegramChatId(chatId);
    if (!candidateId) {
      console.log(`[telegram/inbound] No candidate found for chat_id=${chatId}`);
      // Send a help message
      await sendViaTelegram(
        chatId,
        '👋 Hello! I did not recognize your account. Please make sure you have linked your Telegram account in the Pathway app.'
      );
      return res.status(200).json({ ok: true });
    }

    const candidate = await getUserById(candidateId);
    if (!candidate) {
      console.log(`[telegram/inbound] Candidate ${candidateId} not found`);
      return res.status(200).json({ ok: true });
    }

    console.log(`[telegram/inbound] Matched candidate: ${candidate.name} (${candidateId})`);

    // 2. Check if this is an AI Advisor trigger
    // Trigger words: "/advisor", "advisor", "/ai", "ai chat", "assistant"
    const aiAdvisorTriggers = ['/advisor', 'advisor', '/ai', 'ai chat', 'assistant', '/start'];
    const isAiTrigger = aiAdvisorTriggers.some(
      (trigger) => messageText.toLowerCase() === trigger || messageText.toLowerCase().startsWith(trigger + ' ')
    );

    if (isAiTrigger) {
      console.log(`[telegram/inbound] AI Advisor trigger detected: "${messageText}"`);
      // Process as AI Advisor turn
      try {
        const aiResponse = await handleTelegramAiAdvisor(candidate, messageText);
        await sendViaTelegram(chatId, aiResponse);
      } catch (err) {
        console.error(`[telegram/inbound] AI Advisor error:`, err.message);
        await sendViaTelegram(chatId, `Sorry, I encountered an error: ${err.message}`);
      }
      return res.status(200).json({ ok: true });
    }

    // 3. Check if AI Advisor session is active
    if (candidate.telegramAiAdvisorSessionActive) {
      console.log(`[telegram/inbound] AI Advisor session active for ${candidateId}, processing as advisor turn`);
      try {
        const aiResponse = await handleTelegramAiAdvisor(candidate, messageText);
        await sendViaTelegram(chatId, aiResponse);
      } catch (err) {
        console.error(`[telegram/inbound] AI Advisor error:`, err.message);
        await sendViaTelegram(chatId, `Sorry, I encountered an error: ${err.message}`);
      }
      return res.status(200).json({ ok: true });
    }

    // 4. Otherwise, route to live chat
    console.log(`[telegram/inbound] Routing to live chat for ${candidateId}`);
    await appendMessage(candidateId, {
      senderId: candidateId,
      senderRole: 'candidate',
      text: messageText,
      channel: 'telegram',
    });

    console.log(`[telegram/inbound] Message saved to live chat for ${candidateId}`);
    // Send acknowledgment to candidate
    await sendViaTelegram(chatId, '✓ Your message was delivered to your consultant.');

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[telegram/inbound] Error:`, err.message, err.stack);
    try {
      await sendViaTelegram(
        chatId,
        '❌ Sorry, there was an error processing your message. Please try again.'
      );
    } catch (sendErr) {
      console.error(`[telegram/inbound] Failed to send error message:`, sendErr.message);
    }
    return res.status(500).json({ error: err.message });
  }
}
