import { getUserById, getUserData } from '../db.js';
import { createAnthropicClient } from '../anthropic-client.js';

const client = createAnthropicClient();

export async function advisorTurn(candidateId, userMessage) {
  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  const data = (await getUserData(candidateId)) || {};
  const history = Array.isArray(data.chat) ? data.chat.slice(-21) : [];
  const contextMessages = history.at(-1)?.role === 'user'
    && history.at(-1)?.text === userMessage
    ? history.slice(0, -1)
    : history;

  const conversationContext = contextMessages
    .filter((message) => message?.text && message.role !== 'system')
    .map((message) => `${message.role === 'ai' ? 'AI Advisor' : 'Candidate'} [${message.channel || 'web'}]: ${message.text}`)
    .join('\n');

  const systemPrompt = `You are an AI admissions advisor for Pathway.
Your role is to help candidates navigate their graduate admissions journey.

Candidate Profile:
- Name: ${candidate.name}
- Email: ${candidate.email}
- Residency: ${candidate.residency}
- Language Preference: ${candidate.language || 'English'}

${conversationContext ? `Recent Conversation:\n${conversationContext}\n` : ''}

Continue the same advisor conversation across web and WhatsApp.
Provide concise, supportive advice suitable for WhatsApp.
Focus on actionable next steps.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return {
    reply: reply || 'I was unable to generate a response. Please try again.',
    language: candidate.language || 'English',
  };
}
