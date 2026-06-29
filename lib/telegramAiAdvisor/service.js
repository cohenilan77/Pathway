import { getUserById, updateUserData } from '../db.js';
import { sendViaTelegram } from '../telegram/outbound.js';

const TELEGRAM_24H_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function handleTelegramAiAdvisor(candidate, messageText) {
  const candidateId = candidate.id;
  console.log(`[TelegramAiAdvisor] Processing for ${candidateId}: "${messageText}"`);

  // Import AI advisor turn logic
  try {
    const { advisorTurn } = await import('../whatsapp/advisorTurn.js');
    const result = await advisorTurn(candidateId, messageText);

    // Convert rich response to plain text for Telegram (remove HTML if present)
    let reply = String(result.reply || '').trim();
    reply = reply.replace(/<[^>]+>/g, ''); // Strip HTML tags

    // Cap at Telegram's 4096 char limit
    if (reply.length > 4000) {
      reply = reply.substring(0, 3997) + '...';
    }

    // Update last interaction timestamp
    await updateUserData(candidateId, {
      telegramAiAdvisorLastTurnAt: Date.now(),
    });

    console.log(`[TelegramAiAdvisor] Response generated for ${candidateId}`);
    return reply;
  } catch (err) {
    console.error(`[TelegramAiAdvisor] Error:`, err.message);
    throw err;
  }
}

export async function startTelegramAiAdvisor(candidateId) {
  console.log(`[TelegramAiAdvisor] Starting advisor for ${candidateId}`);

  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found');

  if (!candidate.telegramChatId) {
    throw new Error('Candidate has no Telegram chat ID');
  }

  // Verify opt-in and window
  if (candidate.telegramOptIn !== true) {
    throw new Error('Candidate has not opted in to Telegram');
  }
  if (candidate.telegramOptOut === true) {
    throw new Error('Candidate opted out of Telegram');
  }

  const now = Date.now();
  await updateUserData(candidateId, {
    telegramAiAdvisorSessionActive: true,
    telegramAiAdvisorSessionStartedAt: now,
    telegramAiAdvisorSessionStartedBy: 'admin',
  });

  // Send kickoff message to candidate
  const kickoffMessage = `
🤖 *AI Advisor Activated*

Hello! I'm your admissions advisor. I can help you with:
• Application strategy
• Essay feedback
• School fit analysis
• Interview prep
• General guidance

Type your question or message anytime. Type /stop to exit.
  `.trim();

  await sendViaTelegram(candidate.telegramChatId, kickoffMessage);

  console.log(`[TelegramAiAdvisor] Advisor started for ${candidateId}`);
  return { ok: true };
}

export async function stopTelegramAiAdvisor(candidateId) {
  console.log(`[TelegramAiAdvisor] Stopping advisor for ${candidateId}`);

  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found');

  await updateUserData(candidateId, {
    telegramAiAdvisorSessionActive: false,
    telegramAiAdvisorSessionPausedAt: Date.now(),
  });

  if (candidate.telegramChatId) {
    await sendViaTelegram(
      candidate.telegramChatId,
      '👋 AI Advisor has been paused. Type /advisor to start again.'
    );
  }

  console.log(`[TelegramAiAdvisor] Advisor stopped for ${candidateId}`);
  return { ok: true };
}
