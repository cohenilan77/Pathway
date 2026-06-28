import { getUserById, getCandidateWhatsAppMessages } from '../db.js';
import { createAnthropicClient } from '../anthropic-client.js';

const client = createAnthropicClient();

export async function advisorTurn(candidateId, userMessage) {
  const candidate = await getUserById(candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  // Load conversation history (last 20 messages)
  const history = await getCandidateWhatsAppMessages(candidateId, 20);

  // Build conversation context
  const conversationContext = history
    .map(msg => `${msg.sender}: ${msg.text}`)
    .join('\n');

  const systemPrompt = `You are an AI admissions advisor for Pathway.
Your role is to help candidates navigate their graduate admissions journey.

Candidate Profile:
- Name: ${candidate.name}
- Email: ${candidate.email}
- Residency: ${candidate.residency}
- Language Preference: ${candidate.language || 'English'}

${conversationContext ? `Recent Conversation:\n${conversationContext}\n` : ''}

Provide concise, supportive advice. Keep messages brief for WhatsApp (under 160 characters if possible, or split into logical sentences).
Focus on actionable next steps.`;

  const messages = [
    {
      role: 'user',
      content: userMessage,
    },
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    return {
      reply: reply || 'I was unable to generate a response. Please try again.',
      language: candidate.language || 'English',
    };
  } catch (err) {
    console.error('Error in advisorTurn:', err.message);
    throw err;
  }
}
