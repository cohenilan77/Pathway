import { getUserById, setCandidateTelegramIdIndex, getCandidateLoginStatus } from '../../lib/db.js';
import { getStore } from '../../lib/store.js';
import { resolveCandidate } from '../../lib/telegram/resolveCandidate.js';
import { sendViaTelegram } from '../../lib/telegram/outbound.js';
import { handleInbound as handleAiAdvisor } from '../../lib/telegram/advisorService.js';
import { handleHumanChatInbound, shouldHandleHumanChatInbound } from '../../lib/telegram/humanChat.js';
import {
  advisorTriggerMessage,
  isAdvisorTrigger,
  isLiveChatTrigger,
  liveChatTriggerMessage,
  isHelpTrigger,
  TELEGRAM_HELP_TEXT,
} from '../../lib/telegram/routing.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const update = req.body || {};
  const message = update.message || {};
  const telegramUserId = message.from?.id;
  const inboundText = String(message.text || '').trim();
  console.log('[telegram/inbound] update received', {
    updateId: update.update_id || null,
    telegramUserId: telegramUserId || null,
    hasText: !!inboundText,
  });

  if (!telegramUserId || !inboundText) return res.status(200).json({ status: 'ignored' });

  try {
    let candidateId;
    try {
      candidateId = await resolveCandidate(telegramUserId);
    } catch (error) {
      console.error('[telegram/inbound] candidate not matched', { telegramUserId, error: error.message });
      await sendViaTelegram(telegramUserId, 'Sorry, we could not find your Pathway profile. Link this Telegram ID in Pathway Settings first.');
      return res.status(200).json({ status: 'candidate_not_found' });
    }

    const candidate = await getUserById(candidateId);
    const store = getStore();
    console.log('[telegram/inbound] candidate matched', { candidateId, telegramUserId });

    if (inboundText.toUpperCase() === 'STOP' || inboundText.toUpperCase() === '/STOP') {
      await store.set(`user:${candidateId}`, {
        ...candidate,
        telegramUserId,
        telegramOptOut: true,
        telegramAiAdvisorSessionActive: false,
        telegramAiAdvisorSessionPausedAt: Date.now(),
        telegramHumanChatActive: false,
        telegramHumanChatPending: false,
        telegramHumanChatLastStaffAt: null,
      });
      await sendViaTelegram(telegramUserId, 'You have been unsubscribed from Pathway messages.');
      return res.status(200).json({ status: 'opted_out' });
    }

    if (candidate.telegramOptIn !== true || candidate.telegramOptOut === true) {
      return res.status(200).json({ status: 'disabled' });
    }

    // Simple rule: If candidate is logged in, skip Telegram entirely
    // They should use the web app. Only enable Telegram when they log out.
    if (await getCandidateLoginStatus(candidateId)) {
      console.log('[telegram/inbound] route skipped', { candidateId, route: 'candidate_online' });
      return res.status(200).json({ status: 'candidate_online' });
    }

    let indexedCandidate = candidate;
    if (!indexedCandidate.telegramUserId) {
      await setCandidateTelegramIdIndex(candidateId, telegramUserId);
      indexedCandidate = { ...indexedCandidate, telegramUserId };
      await store.set(`user:${candidateId}`, indexedCandidate);
    }

    const inboundMessage = {
      text: inboundText,
      sourceMessageId: message.message_id || null,
      from: telegramUserId,
    };

    // Magic text: /help or ? → Show help
    if (isHelpTrigger(inboundText)) {
      await sendViaTelegram(telegramUserId, TELEGRAM_HELP_TEXT);
      return res.status(200).json({ status: 'help_sent' });
    }

    // Magic text: /advisor or !advisor → Switch to AI Advisor
    if (isAdvisorTrigger(inboundText)) {
      indexedCandidate = {
        ...indexedCandidate,
        telegramHumanChatActive: false,
        telegramHumanChatPending: false,
        telegramHumanChatLastStaffAt: null,
        telegramAiAdvisorSessionActive: true,
      };
      await store.set(`user:${candidateId}`, indexedCandidate);
      const advisorText = advisorTriggerMessage(inboundText);
      await sendViaTelegram(telegramUserId, '✓ Switched to AI Advisor. Type your question now!');
      const result = await handleAiAdvisor(indexedCandidate, {
        ...inboundMessage,
        text: advisorText,
      });
      console.log('[telegram/inbound] route complete', { candidateId, route: 'ai_advisor_trigger', replied: !!result?.replied });
      return res.status(200).json({ status: 'ai_advisor_routed', ...result });
    }

    // Magic text: /livechat → Switch to Live Chat with Consultant/Admin
    if (isLiveChatTrigger(inboundText)) {
      indexedCandidate = {
        ...indexedCandidate,
        telegramHumanChatActive: true,
        telegramHumanChatPending: false,
        telegramHumanChatLastStaffAt: Date.now(),
        telegramAiAdvisorSessionActive: false,
      };
      await store.set(`user:${candidateId}`, indexedCandidate);
      const liveChatText = liveChatTriggerMessage(inboundText);
      if (!liveChatText) {
        const helpText = '📱 **Live Chat Mode**: Send /livechat followed by your message.\n\nExample: /livechat Can you review my essay?\n\n💡 Or use /advisor to talk to AI instead.';
        await sendViaTelegram(telegramUserId, helpText);
        return res.status(200).json({ status: 'live_chat_help' });
      }
      const result = await handleHumanChatInbound(indexedCandidate, { ...inboundMessage, text: liveChatText });
      await sendViaTelegram(telegramUserId, '✓ Message sent to your consultant via Live Chat.');
      console.log('[telegram/inbound] route complete', { candidateId, route: 'live_chat_trigger' });
      return res.status(200).json({ status: 'live_chat_routed', ...result });
    }

    // Continue live chat if recently active
    if (shouldHandleHumanChatInbound(indexedCandidate)) {
      const result = await handleHumanChatInbound(indexedCandidate, inboundMessage);
      console.log('[telegram/inbound] route complete', { candidateId, route: 'live_chat_reply' });
      return res.status(200).json({ status: 'live_chat_routed', ...result });
    }

    // Default to AI Advisor if no active session
    if (!indexedCandidate.telegramAiAdvisorSessionActive) {
      indexedCandidate = { ...indexedCandidate, telegramAiAdvisorSessionActive: true };
      await store.set(`user:${candidateId}`, indexedCandidate);
    }
    const result = await handleAiAdvisor(indexedCandidate, inboundMessage);
    console.log('[telegram/inbound] route complete', { candidateId, route: 'ai_advisor_default', replied: !!result?.replied });
    return res.status(200).json({ status: 'ai_advisor_routed', ...result });
  } catch (error) {
    console.error('[telegram/inbound] route failed', { error: error.message, stack: error.stack });
    return res.status(200).json({ status: 'error' });
  }
}
