import { createAnthropicClient } from './anthropic-client.js';
import { recordUsage } from './usage.js';

const client = createAnthropicClient();
const MODEL = 'claude-haiku-4-5-20251001';

export async function toEnglish(text, userId = 'anonymous') {
  if (!text || !text.trim()) return text;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Detect the language of the text below. If it is already English, output it unchanged. Otherwise, translate it to English, preserving structure and meaning as closely as possible. Output only the resulting text, no commentary, no preamble.\n\n---\n\n${text}`,
    }],
  });
  recordUsage({
    userId,
    conversationId: 'session',
    feature: 'translation',
    model: MODEL,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  }).catch((e) => console.error('Failed to record usage:', e));
  return response.content[0]?.text || text;
}

export async function fieldsToEnglish(fields, userId = 'anonymous') {
  const translated = await Promise.all(fields.map((f) => toEnglish(f, userId)));
  return translated;
}
