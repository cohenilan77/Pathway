import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { text, school, narrative } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: `You are an elite admissions essay editor. Rewrite the provided essay to be more compelling for ${school || 'a top business school'}. ${
        narrative === 'pivot'
          ? 'The candidate has chosen a Pivot narrative — reframe past experience as deliberate preparation for a bold new direction.'
          : 'The candidate has chosen an Upgrade narrative — emphasize momentum, mastery, and why this program is the next logical step.'
      } Improve verb strength, specificity, and emotional resonance. Return ONLY the rewritten essay text, no commentary.`,
      messages: [{ role: 'user', content: text }],
    });

    return res.status(200).json({ result: response.content[0]?.text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
