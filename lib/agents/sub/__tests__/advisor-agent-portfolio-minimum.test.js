// Regression coverage for commit 4: a Branch B (recommended, not
// candidate-named) portfolio response with fewer than 10 schools must be
// retried, and if still short after exhausting every retry, the real
// (short) portfolio ships rather than being silently discarded — logged
// loudly so a persistently-short portfolio shows up in logs, not just a
// candidate complaint. Branch A (candidate named specific schools) has no
// fixed minimum and must never trigger a retry.
import test from 'node:test';
import assert from 'node:assert/strict';

import { AdvisorAgent } from '../AdvisorAgent.js';

// Spreads fit scores across safe/possible/stretch bands (tier is recomputed
// from fit by normalizeProgram — an explicit tier label alone is not
// preserved). needsPortfolioMixRetry — a separate, pre-existing check —
// would otherwise also retry a same-tier list, which isn't what these tests
// are exercising.
const FITS = [92, 65, 30];
function programsBlock(count, prefix = 'School') {
  const programs = Array.from({ length: count }, (_, i) => ({ name: `${prefix} ${i + 1}`, fit: FITS[i % FITS.length] }));
  return `<PROGRAMS>${JSON.stringify(programs)}</PROGRAMS>Here is your list.`;
}

function response(text) {
  return { content: [{ type: 'text', text }], usage: {}, stop_reason: 'end_turn' };
}

test('a Branch B portfolio response with only 3 schools triggers a retry (Branch B = "recommend my portfolio")', async () => {
  const agent = new AdvisorAgent();
  let calls = 0;
  agent.createCompletion = async () => {
    calls += 1;
    // Always short — forces the loop to exhaust every retry attempt.
    return response(programsBlock(3));
  };

  const raw = await agent.chat(
    [{ role: 'user', content: 'Please recommend my portfolio.' }],
    { systemPrompt: 'system' },
  );

  assert.equal(calls, 4, 'should retry up to the full attempt budget when still short');
  assert.match(raw, /<PROGRAMS>/, 'should ship the real (short) portfolio rather than discard it');
  const parsed = JSON.parse(raw.match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/)[1]);
  assert.equal(parsed.length, 3);
});

test('exhausting retries on a short Branch B portfolio logs a warning instead of failing silently', async () => {
  const agent = new AdvisorAgent();
  agent.createCompletion = async () => response(programsBlock(3));

  const originalWarn = console.warn;
  const warnCalls = [];
  console.warn = (...args) => { warnCalls.push(args); };
  try {
    await agent.chat([{ role: 'user', content: 'Please recommend my portfolio.' }], { systemPrompt: 'system' });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnCalls.length, 1);
  assert.match(warnCalls[0][0], /Shipping a short portfolio \(3\/10 minimum\)/);
});

test('a Branch B portfolio response with 10+ schools passes through unchanged, no retry', async () => {
  const agent = new AdvisorAgent();
  let calls = 0;
  agent.createCompletion = async () => {
    calls += 1;
    return response(programsBlock(12));
  };

  const raw = await agent.chat(
    [{ role: 'user', content: 'Please recommend my portfolio.' }],
    { systemPrompt: 'system' },
  );

  assert.equal(calls, 1, 'a valid 10+ response should not trigger any retry');
  const parsed = JSON.parse(raw.match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/)[1]);
  assert.equal(parsed.length, 12);
});

test('a Branch A response (candidate named specific schools) with only 3 schools never triggers a retry', async () => {
  const agent = new AdvisorAgent();
  let calls = 0;
  agent.createCompletion = async () => {
    calls += 1;
    return response(programsBlock(3, 'Named School'));
  };

  const raw = await agent.chat(
    [{ role: 'user', content: 'Here are my target schools: Harvard, Wharton, Booth. What do you think?' }],
    { systemPrompt: 'system' },
  );

  assert.equal(calls, 1, 'Branch A (named schools) has no fixed minimum and must not retry');
  const parsed = JSON.parse(raw.match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/)[1]);
  assert.equal(parsed.length, 3);
});
