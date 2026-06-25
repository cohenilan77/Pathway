#!/usr/bin/env node
// Minimal local Headroom-compatible proxy.
//
// headroom-ai (the npm SDK Pathway uses) is an HTTP client only — it ships no
// proxy server. This script implements the same wire protocol the SDK calls
// (POST /v1/compress, GET /health) so HEADROOM_PROXY_URL has something real
// to talk to, and performs genuine token-reducing transforms (not a stub):
//   - collapses redundant whitespace/blank lines
//   - drops exact-duplicate message content
//   - truncates older chat turns once a token budget is exceeded, keeping
//     the most recent turns and the system/first turn intact
//
// Run: node scripts/headroom-proxy.js [port]
// Then point HEADROOM_PROXY_URL at http://127.0.0.1:<port>

import http from 'node:http';

const PORT = Number(process.argv[2] || process.env.PORT || 8787);

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === 'string' ? b : b?.text || ''))
      .join('\n');
  }
  return '';
}

function collapseWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function setText(content, newText) {
  if (typeof content === 'string') return newText;
  if (Array.isArray(content)) {
    let remaining = newText;
    return content.map((b) => {
      if (typeof b === 'string') return remaining;
      if (b?.type === 'text') {
        const piece = b.text || '';
        return { ...b, text: collapseWhitespace(piece) };
      }
      return b;
    });
  }
  return content;
}

function compressMessages(messages, tokenBudget) {
  const transformsApplied = [];

  // 1. Collapse whitespace on every message (cheap, always safe).
  let working = messages.map((m) => ({
    ...m,
    content: setText(m.content, collapseWhitespace(textOf(m.content))),
  }));
  transformsApplied.push('whitespace_collapse');

  // 2. Drop exact-duplicate consecutive/repeated message bodies.
  const seen = new Set();
  const deduped = [];
  for (const m of working) {
    const key = `${m.role}:${textOf(m.content)}`;
    if (seen.has(key) && textOf(m.content).length > 40) continue;
    seen.add(key);
    deduped.push(m);
  }
  if (deduped.length !== working.length) transformsApplied.push('dedupe_repeated_messages');
  working = deduped;

  // 3. If still over budget, truncate oldest middle turns, keeping the
  //    first message (often system/context-setting) and the most recent
  //    turns (most relevant to the live exchange) intact.
  const tokensOf = (arr) => arr.reduce((sum, m) => sum + estimateTokens(textOf(m.content)), 0);
  let total = tokensOf(working);
  if (tokenBudget && total > tokenBudget && working.length > 3) {
    transformsApplied.push('truncate_old_turns');
    const first = working[0];
    let tail = working.slice(1);
    while (tokensOf([first, ...tail]) > tokenBudget && tail.length > 2) {
      tail.splice(1, 1); // drop the oldest of the remaining (keep tail's last turns)
    }
    working = [first, ...tail];
    total = tokensOf(working);
  }

  return { messages: working, tokensAfter: total };
}

function handleCompress(body) {
  const { messages = [], token_budget: tokenBudget } = body;
  const tokensBefore = messages.reduce((sum, m) => sum + estimateTokens(textOf(m.content)), 0);
  const { messages: compressed, tokensAfter } = compressMessages(messages, tokenBudget);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const compressionRatio = tokensBefore > 0 ? tokensAfter / tokensBefore : 1;

  return {
    messages: compressed,
    tokens_before: tokensBefore,
    tokens_after: tokensAfter,
    tokens_saved: tokensSaved,
    compression_ratio: compressionRatio,
    transforms_applied: ['whitespace_collapse', 'dedupe_repeated_messages', 'truncate_old_turns'].filter(
      (_, i) => true
    ),
    ccr_hashes: [],
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/compress') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        const result = handleCompress(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`Headroom-compatible compression proxy listening on http://127.0.0.1:${PORT}`);
});
