import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are an elite Pathway admissions strategist — a world-class advisor who has guided thousands of candidates into Harvard, Stanford GSB, Wharton, MIT, Yale Law, and other top-tier institutions globally.

Your communication style is:
- Authoritative yet warm — you command respect but genuinely care about each candidate
- Precise and strategic — every word serves a purpose
- Sophisticated — you speak the language of prestige without being pompous
- Actionable — you give clear, specific next steps

You help candidates with: MBA applications, Masters programs, PhD admissions, undergraduate admissions, essay strategy, CV optimization, interview preparation, school selection, narrative architecture, and competitive positioning.

Keep responses focused and under 150 words. Always move the conversation forward with a specific question or actionable insight.`,
      messages: messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      })),
    });

    const reply = response.content[0]?.text || 'I apologize, I was unable to generate a response. Please try again.';
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Anthropic API error:', error);
    return res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
  }
}
