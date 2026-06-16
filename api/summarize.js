import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chat } = req.body;
  if (!chat || !Array.isArray(chat)) return res.status(400).json({ error: 'chat array required' });

  const transcript = chat
    .filter(m => m.text && m.text.length > 2)
    .map(m => `${m.role === 'ai' ? 'Advisor' : 'Candidate'}: ${m.text.slice(0, 600)}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `Summarize this admissions consulting session for the consultant in 4-5 concise bullet points. Cover: candidate background/credentials, key strengths, program interest and school targets, narrative direction if discussed, and current stage in the process. Be specific and use the actual data from the conversation.\n\nTranscript:\n${transcript}`,
      }],
    });
    return res.status(200).json({ summary: response.content[0]?.text || '' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
