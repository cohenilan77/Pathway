import assert from 'node:assert/strict';
import test from 'node:test';

import { candidateMatchesWhatsAppNumber, normalizeWhatsAppNumber } from '../phone.js';
import { isCandidateOnline } from '../postMessage.js';
import { shouldRouteStaffMessage } from '../../chat.js';

test('normalizes Twilio and human-formatted WhatsApp numbers to one index key', () => {
  assert.equal(normalizeWhatsAppNumber('whatsapp:+972 54-123-4567'), '+972541234567');
  assert.equal(normalizeWhatsAppNumber('+972541234567'), '+972541234567');
});

test('matches inbound numbers against both WhatsApp and legacy candidate phone fields', () => {
  assert.equal(candidateMatchesWhatsAppNumber({ whatsappNumber: '+44 7700 900123' }, 'whatsapp:+447700900123'), true);
  assert.equal(candidateMatchesWhatsAppNumber({ phone: '+1 (415) 555-0123' }, '+14155550123'), true);
});

test('explicit logout marker makes the candidate immediately offline', () => {
  const now = Date.now();
  assert.equal(isCandidateOnline({ lastActiveAt: now - 1_000 }, now), true);
  assert.equal(isCandidateOnline({ lastActiveAt: 0 }, now), false);
  assert.equal(isCandidateOnline({ lastActiveAt: now - 121_000 }, now), false);
});

test('routes consultant, admin, and system messages but never candidate messages', () => {
  assert.equal(shouldRouteStaffMessage('consultant'), true);
  assert.equal(shouldRouteStaffMessage('admin'), true);
  assert.equal(shouldRouteStaffMessage('system'), true);
  assert.equal(shouldRouteStaffMessage('candidate'), false);
});
