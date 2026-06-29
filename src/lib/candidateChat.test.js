import assert from 'node:assert/strict';
import test from 'node:test';

import { visibleCandidateChat } from './candidateChat.js';

test('candidate Advisor hides internal audit messages', () => {
  const visible = visibleCandidateChat([
    { role: 'system', channel: 'system', text: 'Consultant started AI Advisor on WhatsApp.' },
    { role: 'user', channel: 'web', text: 'Hello' },
    { role: 'ai', channel: 'web', text: 'Hi' },
  ]);

  assert.deepEqual(visible.map((message) => message.text), ['Hello', 'Hi']);
});

test('candidate Advisor only shows WhatsApp history after explicit opt-in', () => {
  const messages = [
    { role: 'user', channel: 'whatsapp', text: 'From WhatsApp' },
    { role: 'ai', channel: 'web', text: 'From web' },
  ];

  assert.deepEqual(visibleCandidateChat(messages, false).map((message) => message.text), ['From web']);
  assert.deepEqual(visibleCandidateChat(messages, true).map((message) => message.text), ['From WhatsApp', 'From web']);
});
