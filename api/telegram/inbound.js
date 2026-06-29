import { getUserById, setCandidateTelegramIdIndex } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/telegram/resolveCandidate.js';
import { sendViaTelegram, registerWebhook } from '../../lib/telegram/outbound.js';
import { handleInbound } from '../../lib/telegram/advisorService.js';
import {
  handleHumanChatInbound,
  shouldHandleHumanChatInbound,
} from '../../lib/telegram/humanChat.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const update = req.body || {};
  const message = update.message || {};
  const fromUser = message.from || {};
  const telegramUserId = fromUser.id;
  const inboundText = String(message.text || '').trim();

  // Ignore non-text messages
  if (!telegramUserId || !inboundText) {
    return res.status(200).json({ ok: true });
  }

  // Register webhook on first inbound message (idempotent)
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (webhookUrl && !process.env.TELEGRAM_WEBHOOK_REGISTERED) {
    await registerWebhook(webhookUrl);
    process.env.TELEGRAM_WEBHOOK_REGISTERED = 'true';
  }

  try {
    let candidateId;
    try {
      candidateId = await resolveCandidate(telegramUserId);
    } catch (error) {
      console.error(`Candidate resolution failed: ${error.message}`);
      // Send helpful message to user
      await sendViaTelegram(
        telegramUserId,
        'Sorry, we couldn\'t find your profile. Please contact support.'
      );
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = await getUserById(candidateId);
    const store = getStore();

    // Handle STOP command
    if (inboundText.toUpperCase() === 'STOP' || inboundText.toUpperCase() === '/STOP') {
      const optedOut = {
        ...candidate,
        telegramUserId: telegramUserId,
        telegramOptOut: true,
        telegramAiAdvisorSessionActive: false,
        telegramAiAdvisorSessionPausedAt: Date.now(),
      };
      await handleInbound(optedOut, {
        text: inboundText,
        sourceMessageId: message.message_id || null,
        from: telegramUserId,
      });
      await sendViaTelegram(telegramUserId, 'You have been unsubscribed from Pathway messages.');
      return res.status(200).json({ status: 'opted_out' });
    }

    // Index candidate by Telegram ID
    let indexedCandidate = candidate;
    if (telegramUserId && !indexedCandidate.telegramUserId) {
      await setCandidateTelegramIdIndex(candidateId, telegramUserId);
      indexedCandidate = { ...indexedCandidate, telegramUserId };
    }
    if (indexedCandidate !== candidate) {
      await store.set(`user:${candidateId}`, indexedCandidate);
    }

    // Prepare inbound message
    const inboundMessage = {
      text: inboundText,
      sourceMessageId: message.message_id || null,
      from: telegramUserId,
    };

    // Route message to appropriate handler
    const result = shouldHandleHumanChatInbound(indexedCandidate)
      ? await handleHumanChatInbound(indexedCandidate, inboundMessage)
      : await handleInbound(indexedCandidate, inboundMessage);

    return res.status(200).json({
      status: result.duplicate ? 'duplicate' : result.replied ? 'replied' : 'saved',
      reply: result.reply || null,
    });
  } catch (error) {
    console.error(`Telegram inbound webhook error: ${error.message}`);
    return res.status(200).json({ ok: true }); // Return 200 to prevent Telegram from retrying
  }
}
