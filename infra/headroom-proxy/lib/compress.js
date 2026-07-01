// Shared compression logic for the Headroom-compatible proxy endpoints.
// Mirrors Pathway's scripts/headroom-proxy.js so behavior is identical
// whether the proxy is run locally or deployed here.

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((b) => (typeof b === 'string' ? b : b?.text || '')).join('\n');
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
    return content.map((b) => {
      if (typeof b === 'string') return newText;
      if (b?.type === 'text') return { ...b, text: collapseWhitespace(b.text || '') };
      return b;
    });
  }
  return content;
}

function compressMessages(messages, tokenBudget) {
  let working = messages.map((m) => ({
    ...m,
    content: setText(m.content, collapseWhitespace(textOf(m.content))),
  }));

  const seen = new Set();
  const deduped = [];
  for (const m of working) {
    const key = `${m.role}:${textOf(m.content)}`;
    if (seen.has(key) && textOf(m.content).length > 40) continue;
    seen.add(key);
    deduped.push(m);
  }
  working = deduped;

  const tokensOf = (arr) => arr.reduce((sum, m) => sum + estimateTokens(textOf(m.content)), 0);
  let total = tokensOf(working);
  if (tokenBudget && total > tokenBudget && working.length > 3) {
    const first = working[0];
    let tail = working.slice(1);
    while (tokensOf([first, ...tail]) > tokenBudget && tail.length > 2) {
      tail.splice(1, 1);
    }
    working = [first, ...tail];
    total = tokensOf(working);
  }

  return { messages: working, tokensAfter: total };
}

export function handleCompress(body) {
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
    transforms_applied: ['whitespace_collapse', 'dedupe_repeated_messages', 'truncate_old_turns'],
    ccr_hashes: [],
  };
}
