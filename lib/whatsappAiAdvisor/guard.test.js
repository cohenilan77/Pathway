import assert from 'node:assert/strict';
import test from 'node:test';

import { canContinueWhatsAppAiAdvisor } from './guard.js';

test('a stale active flag cannot override candidate WhatsApp settings', () => {
  const now = Date.now();
  const activeSession = {
    whatsappAiAdvisorSessionActive: true,
    whatsappNumber: '+15551234567',
    whatsappLastInboundAt: now - 1_000,
  };

  assert.equal(canContinueWhatsAppAiAdvisor(activeSession, now), false);
  assert.equal(canContinueWhatsAppAiAdvisor({ ...activeSession, whatsappOptIn: true }, now), true);
  assert.equal(canContinueWhatsAppAiAdvisor({ ...activeSession, whatsappOptIn: true, whatsappOptOut: true }, now), false);
});
