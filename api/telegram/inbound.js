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

    if (isAdvisorTrigger(inboundText)) {
      indexedCandidate = {
        ...indexedCandidate,
        telegramHumanChatActive: false,
        telegramHumanChatPending: false,
        telegramAiAdvisorSessionActive: true,
      };
      await store.set(`user:${candidateId}`, indexedCandidate);
      const result = await handleAiAdvisor(indexedCandidate, {
        ...inboundMessage,
        text: advisorTriggerMessage(inboundText),
      });
      console.log('[telegram/inbound] route complete', { candidateId, route: 'ai_advisor_trigger', replied: !!result?.replied });
      return res.status(200).json({ status: 'ai_advisor_routed', ...result });
    }

    if (isLiveChatTrigger(inboundText)) {
      indexedCandidate = {
        ...indexedCandidate,
        telegramHumanChatActive: true,
        telegramHumanChatLastStaffAt: Date.now(),
      };
      await store.set(`user:${candidateId}`, indexedCandidate);
      const liveChatText = liveChatTriggerMessage(inboundText);
      if (!liveChatText) {
        await sendViaTelegram(telegramUserId, 'Send /livechat followed by your message for your consultant.');
        return res.status(200).json({ status: 'live_chat_help' });
      }
      const result = await handleHumanChatInbound(indexedCandidate, { ...inboundMessage, text: liveChatText });
      await sendViaTelegram(telegramUserId, 'Your message was added to Pathway Live Chat.');
      console.log('[telegram/inbound] route complete', { candidateId, route: 'live_chat_trigger' });
      return res.status(200).json({ status: 'live_chat_routed', ...result });
    }

    if (shouldHandleHumanChatInbound(indexedCandidate)) {
      const result = await handleHumanChatInbound(indexedCandidate, inboundMessage);
      console.log('[telegram/inbound] route complete', { candidateId, route: 'live_chat_reply' });
      return res.status(200).json({ status: 'live_chat_routed', ...result });
    }

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
