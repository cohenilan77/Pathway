import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function toEnglish(text) {
  if (!text || !text.trim()) return text;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Detect the language of the text below. If it is already English, output it unchanged. Otherwise, translate it to English, preserving structure and meaning as closely as possible. Output only the resulting text, no commentary, no preamble.\n\n---\n\n${text}`,
    }],
  });
  return response.content[0]?.text || text;
}

export async function fieldsToEnglish(fields) {
  const translated = await Promise.all(fields.map((f) => toEnglish(f)));
  return translated;
}
