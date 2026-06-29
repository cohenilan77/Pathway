import { getUserById, setCandidateTelegramIdIndex, getCandidateLoginStatus } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/telegram/resolveCandidate.js';
import { sendViaTelegram, registerWebhook } from '../../lib/telegram/outbound.js';
import { handleInbound as handleAiAdvisor } from '../../lib/telegram/advisorService.js';
import { handleHumanChatInbound } from '../../lib/telegram/humanChat.js';

const HUMAN_CHAT_WINDOW_MS = 24 * 60 * 60 * 1000;

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

  // Register webhook on first message (idempotent)
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
      await sendViaTelegram(
        telegramUserId,
        'Sorry, we couldn\'t find your profile. Please contact support.'
      );
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = await getUserById(candidateId);
    const store = getStore();

    // ====== KEY LOGIC: CHECK IF CANDIDATE IS LOGGED INTO WEB APP ======
    const isLoggedIn = await getCandidateLoginStatus(candidateId);

    if (isLoggedIn) {
      // Candidate is in web app - don't process Telegram
      console.log(`[telegram/inbound] Candidate ${candidateId} logged in, ignoring Telegram message`);
      return res.status(200).json({
        status: 'candidate_logged_in',
        message: 'Message ignored - candidate is in web app'
      });
    }

    // ====== CANDIDATE NOT LOGGED IN - PROCESS TELEGRAM MESSAGE ======

    // Handle STOP command
    if (inboundText.toUpperCase() === 'STOP' || inboundText.toUpperCase() === '/STOP') {
      const optedOut = {
        ...candidate,
        telegramUserId: telegramUserId,
        telegramOptOut: true,
        telegramAiAdvisorSessionActive: false,
        telegramAiAdvisorSessionPausedAt: Date.now(),
      };
      await handleAiAdvisor(optedOut, {
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

    // ====== ROUTING LOGIC ======
    // Priority 1: Is AI Advisor active?
    if (indexedCandidate.telegramAiAdvisorSessionActive) {
      console.log(`[telegram/inbound] Routing to AI Advisor for ${candidateId}`);
      const result = await handleAiAdvisor(indexedCandidate, inboundMessage);
      return res.status(200).json({ status: 'ai_advisor_routed', ...result });
    }

    // Priority 2: Is Live Chat active (candidate was active in last 24h)?
    const lastInbound = Number(indexedCandidate.telegramLastInboundAt || 0);
    const isLiveChatActive =
      indexedCandidate.telegramHumanChatActive === true &&
      lastInbound > 0 &&
      Date.now() - lastInbound < HUMAN_CHAT_WINDOW_MS;

    if (isLiveChatActive || indexedCandidate.telegramHumanChatPending === true) {
      console.log(`[telegram/inbound] Routing to Live Chat for ${candidateId}`);
      const result = await handleHumanChatInbound(indexedCandidate, inboundMessage);
      return res.status(200).json({ status: 'live_chat_routed', ...result });
    }

    // Neither active - queue message for 24 hours
    console.log(`[telegram/inbound] Neither AI nor Live Chat active, queuing for ${candidateId}`);
    return res.status(200).json({
      status: 'queued',
      message: 'Neither AI Advisor nor Live Chat is currently active. Message will be delivered when they activate.'
    });

  } catch (error) {
    console.error(`Telegram inbound webhook error: ${error.message}`);
    return res.status(200).json({ ok: true }); // Return 200 to prevent Telegram from retrying
  }
}
