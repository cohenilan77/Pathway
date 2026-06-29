import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRouteStaffMessage } from '../../chat.js';
import {
  buildHumanChatTemplateVariables,
  buildPendingHumanChatReply,
  isHumanChatStaff,
  shouldHandleHumanChatInbound,
} from '../humanChat.js';
import { candidateMatchesWhatsAppNumber, normalizeWhatsAppNumber } from '../phone.js';
import { isCandidateOnline } from '../postMessage.js';

test('routes both consultant and admin messages to offline delivery', () => {
  assert.equal(shouldRouteStaffMessage('consultant'), true);
  assert.equal(shouldRouteStaffMessage('admin'), true);
  assert.equal(shouldRouteStaffMessage('candidate'), false);
});

test('explicit logout makes the candidate immediately offline', () => {
  const now = Date.now();
  assert.equal(isCandidateOnline({ lastActiveAt: now - 1_000 }, now), true);
  assert.equal(isCandidateOnline({ lastActiveAt: 0 }, now), false);
});

test('normalizes and matches legacy candidate phone numbers', () => {
  assert.equal(normalizeWhatsAppNumber('whatsapp:+972 54-123-4567'), '+972541234567');
  assert.equal(candidateMatchesWhatsAppNumber({ phone: '+972-54-123-4567' }, '+972541234567'), true);
});

test('routes candidate WhatsApp replies into pending/active human Live Chat only', () => {
  const now = Date.now();
  assert.equal(isHumanChatStaff('consultant'), true);
  assert.equal(isHumanChatStaff('admin'), true);
  assert.equal(isHumanChatStaff('ai'), false);
  assert.equal(shouldHandleHumanChatInbound({ whatsappHumanChatPending: true }, now), true);
  assert.equal(shouldHandleHumanChatInbound({
    whatsappHumanChatActive: true,
    whatsappLastInboundAt: now - 1_000,
  }, now), true);
  assert.equal(shouldHandleHumanChatInbound({ whatsappAiAdvisorSessionActive: true }, now), false);
});

test('queues exact human messages behind an approved one-variable notification', () => {
  assert.deepEqual(buildHumanChatTemplateVariables({ name: 'Ari' }), { '1': 'Ari' });
  assert.equal(buildPendingHumanChatReply([
    { text: 'First human message' },
    { text: 'Second human message' },
  ]), 'First human message\n\nSecond human message');
});
