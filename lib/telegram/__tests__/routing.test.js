import assert from 'node:assert/strict';
import test from 'node:test';

import { isCandidateOnline } from '../../chat.js';
import { shouldHandleHumanChatInbound } from '../humanChat.js';
import {
  advisorTriggerMessage,
  isAdvisorTrigger,
  isLiveChatTrigger,
  liveChatTriggerMessage,
} from '../routing.js';

test('offline routing uses recent activity rather than a stale login flag', () => {
  const now = Date.now();
  assert.equal(isCandidateOnline({ lastActiveAt: now - 1_000, isCurrentlyLoggedIn: true }, now), true);
  assert.equal(isCandidateOnline({ lastActiveAt: now - 180_000, isCurrentlyLoggedIn: true }, now), false);
  assert.equal(isCandidateOnline({ lastActiveAt: 0, isCurrentlyLoggedIn: true }, now), false);
});

test('Telegram human Live Chat requires opt-in and a recent staff-started conversation', () => {
  const now = Date.now();
  const active = {
    telegramOptIn: true,
    telegramHumanChatActive: true,
    telegramHumanChatLastStaffAt: now - 1_000,
  };

  assert.equal(shouldHandleHumanChatInbound(active, now), true);
  assert.equal(shouldHandleHumanChatInbound({ ...active, telegramOptIn: false }, now), false);
  assert.equal(shouldHandleHumanChatInbound({ ...active, telegramOptOut: true }, now), false);
  assert.equal(shouldHandleHumanChatInbound({ ...active, telegramHumanChatLastStaffAt: now - 25 * 60 * 60 * 1000 }, now), false);
});

test('Telegram advisor and human trigger words route deterministically', () => {
  for (const trigger of ['/advisor Help with my essay', '!advisor Help with my essay', '!ai Help with my essay', '/start Help with my essay']) {
    assert.equal(isAdvisorTrigger(trigger), true);
    assert.equal(advisorTriggerMessage(trigger), 'Help with my essay');
  }
  assert.equal(advisorTriggerMessage('/advisor'), 'Hello');
  assert.equal(isLiveChatTrigger('/livechat Please call me'), true);
  assert.equal(liveChatTriggerMessage('/livechat Please call me'), 'Please call me');
  assert.equal(isAdvisorTrigger('normal question'), false);
});
