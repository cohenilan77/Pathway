import { getUserById, getUserData } from '../db.js';
import { createAnthropicClient } from '../anthropic-client.js';
import { buildSystemPrompt, DEFAULT_AI_CONFIG } from '../../api/chat.js';

const client = createAnthropicClient();
const WHATSAPP_MAX_CHARS = 1200;
const DATA_BLOCKS = /<(PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT|TASKS)>[\s\S]*?<\/\1>/gi;

export function toWhatsAppText(raw) {
  const plain = String(raw || '')
    .replace(DATA_BLOCKS, '')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '$1: $2')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\s*→\s*/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!plain) return 'I could not prepare a reply. Please send your message again.';
  if (plain.length <= WHATSAPP_MAX_CHARS) return plain;
  const shortened = plain.slice(0, WHATSAPP_MAX_CHARS - 1);
  const boundary = Math.max(shortened.lastIndexOf('. '), shortened.lastIndexOf('? '), shortened.lastIndexOf('\n'));
  return `${shortened.slice(0, boundary > 700 ? boundary + 1 : shortened.length).trim()}…`;
}

export async function advisorTurn(candidateId, userMessage) {
  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  const data = (await getUserData(candidateId)) || {};
  const history = Array.isArray(data.chat) ? data.chat.slice(-30) : [];
  const contextMessages = history.at(-1)?.role === 'user'
    && history.at(-1)?.text === userMessage
    ? history.slice(0, -1)
    : history;

  const messages = contextMessages
    .filter((message) => message?.text && message.role !== 'system')
    .map((message) => ({
      role: message.role === 'ai' ? 'assistant' : 'user',
      content: message.text,
    }));
  messages.push({ role: 'user', content: userMessage });

  const stageContext = `Candidate profile: ${JSON.stringify(data.profile || {})}
Current pipeline step: ${data.stepIdx || 0}
Current scores: ${JSON.stringify(data.scores || {})}
Chosen schools: ${JSON.stringify(data.chosenSchools || [])}

WHATSAPP CHANNEL RULES:
- Continue the exact same Pathway AI Advisor conversation and strategy used on the website.
- Reply in short, simple plain text suitable for WhatsApp.
- Keep the visible reply under 900 characters whenever possible.
- Ask at most one clear question per reply.
- Do not use tables, headings, markdown formatting, or structured data blocks.
- Convert long website-style analysis into a brief summary and one next action.`;

  const system = buildSystemPrompt(
    DEFAULT_AI_CONFIG,
    candidate.language || 'English',
    '',
    '',
    stageContext
  );

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system,
    messages,
  });

  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return {
    reply: toWhatsAppText(raw),
    language: candidate.language || 'English',
  };
}
