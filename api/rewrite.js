import { EssayAgent } from '../lib/agents/sub/EssayAgent.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, school, narrative, narrativeText } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const agent = new EssayAgent();
    const narrativeNote = narrative === 'pivot'
      ? 'The candidate chose a Pivot narrative — reframe past experience as preparation for a bold new direction.'
      : 'The candidate chose an Upgrade narrative — emphasize momentum and why this program is the next logical step.';
    const feedback = `Rewrite for ${school || 'a top business school'}. ${narrativeNote} Improve verb strength, specificity, and emotional resonance. Return ONLY the rewritten essay text, no commentary.`;
    const result = await agent.improve(text, feedback, narrativeText);
    return res.status(200).json({ result: result.text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
