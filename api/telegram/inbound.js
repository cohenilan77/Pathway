import { getUserById, setCandidateTelegramIdIndex, getCandidateLoginStatus } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/telegram/resolveCandidate.js';
import { sendViaTelegram, registerWebhook } from '../../lib/telegram/outbound.js';
import { start as startAiAdvisor, handleInbound as handleAiAdvisor } from '../../lib/telegram/advisorService.js';
import { handleHumanChatInbound } from '../../lib/telegram/humanChat.js';

const HUMAN_CHAT_WINDOW_MS = 24 * 60 * 60 * 1000;
const AI_ADVISOR_TRIGGERS = ['!advisor', '/advisor', '!ai', '/start', 'advisor', 'ai'];

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

    // ====== CHECK IF CANDIDATE IS LOGGED INTO WEB APP ======
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

    // ====== CHECK FOR AI ADVISOR TRIGGER WORDS ======
    const lowerText = inboundText.toLowerCase();
    const hasAiTrigger = AI_ADVISOR_TRIGGERS.some(trigger => lowerText === trigger || lowerText.includes(trigger));

    if (hasAiTrigger && !indexedCandidate.telegramAiAdvisorSessionActive) {
      console.log(`[telegram/inbound] Trigger word detected, starting AI Advisor for ${candidateId}`);
      try {
        // Start AI Advisor session
        const startResult = await startAiAdvisor(candidateId, { id: candidateId, role: 'candidate' });
        await sendViaTelegram(
          telegramUserId,
          '🤖 AI Advisor is now active! Ask me anything about your application, programs, or strategy.'
        );
        return res.status(200).json({ status: 'ai_advisor_started', message: 'AI Advisor session started' });
      } catch (err) {
        console.error(`Failed to start AI Advisor: ${err.message}`);
        await sendViaTelegram(telegramUserId, `Sorry, couldn't start AI Advisor: ${err.message}`);
        return res.status(200).json({ status: 'ai_advisor_start_failed', error: err.message });
      }
    }

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

    // Neither active - suggest AI Advisor
    console.log(`[telegram/inbound] Neither AI nor Live Chat active, suggesting AI Advisor for ${candidateId}`);
    await sendViaTelegram(
      telegramUserId,
      'Neither AI Advisor nor Live Chat is currently active.\n\nReply with /advisor to start a conversation with your AI Advisor!'
    );
    return res.status(200).json({
      status: 'queued',
      message: 'Neither AI Advisor nor Live Chat is currently active. User was prompted to use /advisor.'
    });

  } catch (error) {
    console.error(`Telegram inbound webhook error: ${error.message}`);
    return res.status(200).json({ ok: true }); // Return 200 to prevent Telegram from retrying
  }
}
