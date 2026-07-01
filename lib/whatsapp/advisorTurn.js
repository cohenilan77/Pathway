import { getUserById, getUserData } from '../db.js';
import { createAnthropicClient } from '../anthropic-client.js';

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

function buildMessagingSystemPrompt(candidate, data, channel) {
  return `You are Pathway's AI admissions advisor. Continue the candidate's existing website Advisor conversation on ${channel}, using the same admissions strategy and saved state.

Candidate:
- Name: ${candidate.name || ''}
- Residency: ${candidate.residency || ''}
- Language: ${candidate.language || 'English'}
- Profile: ${JSON.stringify(data.profile || {})}
- Pipeline step: ${data.stepIdx || 0}
- Scores: ${JSON.stringify(data.scores || {})}
- Strengths: ${JSON.stringify(data.strengths || [])}
- Weaknesses: ${JSON.stringify(data.weaknesses || [])}
- Programs: ${JSON.stringify(data.programs || [])}
- Chosen schools: ${JSON.stringify(data.chosenSchools || [])}
- Narrative: ${data.narrative || ''}

Advisor behavior:
- Continue naturally from the saved conversation; never restart intake unless information is missing.
- Give accurate, specific admissions guidance and one concrete next action.
- Ask at most one question per reply.
- Reply in the candidate's language.
- Keep the reply under 900 characters whenever possible.
- Use short, simple plain text suitable for ${channel}.
- Do not use tables, headings, markdown, or structured data blocks.
- Convert long website-style analysis into a brief summary and one next step.`;
}

export async function advisorTurn(candidateId, userMessage, { channel = 'WhatsApp' } = {}) {
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

  // Construct the SDK client only for a real Advisor turn. This keeps Vite/Railway
  // startup independent from Anthropic credentials and avoids loading the full web API.
  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: buildMessagingSystemPrompt(candidate, data, channel),
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
