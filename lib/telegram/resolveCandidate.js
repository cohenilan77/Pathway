import { getUserByTelegramId } from '../db.js';

export async function resolveCandidate(identifier) {
  if (!identifier) throw new Error('Telegram user ID is required');

  const telegramUserId = String(identifier || '').trim();
  if (!/^\d+$/.test(telegramUserId)) {
    throw new Error('Invalid Telegram user ID format');
  }

  const candidate = await getUserByTelegramId(telegramUserId);
  if (!candidate) {
    throw new Error(`No candidate found for Telegram user ID: ${telegramUserId}`);
  }

  return candidate.id;
}
