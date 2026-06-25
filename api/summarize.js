import Anthropic from '@anthropic-ai/sdk';
import { getUserIdByToken } from '../lib/db.js';
import { recordUsage } from '../lib/usage.js';
import { isHeadroomEnabled, compressText, estimateCompressionPercent, HeadroomFlags } from '../lib/headroom.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

async function resolveUserId(req) {
  try {
    const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
    if (!match) return 'anonymous';
    return (await getUserIdByToken(match[1])) || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chat } = req.body;
  if (!chat || !Array.isArray(chat)) return res.status(400).json({ error: 'chat array required' });

  let transcript = chat
    .filter(m => m.text && m.text.length > 2)
    .map(m => `${m.role === 'ai' ? 'Advisor' : 'Candidate'}: ${m.text.slice(0, 600)}`)
    .join('\n\n');

  const headroomStats = {
    enabled: isHeadroomEnabled(),
    mode: process.env.HEADROOM_MODE || 'off',
    error: null,
    originalInputChars: transcript.length,
    optimizedInputChars: transcript.length,
  };
  if (headroomStats.enabled && HeadroomFlags.compressChat) {
    const result = await compressText(transcript, { label: 'session_summary_transcript' });
    headroomStats.error = result.error;
    transcript = result.text;
    headroomStats.optimizedInputChars = transcript.length;
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `Summarize this admissions consulting session for the consultant in 4-5 concise bullet points. Cover: candidate background/credentials, key strengths, program interest and school targets, narrative direction if discussed, and current stage in the process. Be specific and use the actual data from the conversation.\n\nTranscript:\n${transcript}`,
      }],
    });
    const userId = await resolveUserId(req);
    recordUsage({
      userId,
      conversationId: 'session',
      feature: 'session_summary',
      model: MODEL,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      endpoint: 'summarize',
      headroomEnabled: headroomStats.enabled,
      headroomMode: headroomStats.mode,
      headroomError: headroomStats.error,
      originalInputChars: headroomStats.originalInputChars,
      optimizedInputChars: headroomStats.optimizedInputChars,
      estimatedCompressionPercent: estimateCompressionPercent(headroomStats.originalInputChars, headroomStats.optimizedInputChars),
    }).catch((e) => console.error('Failed to record usage:', e));
    return res.status(200).json({ summary: response.content[0]?.text || '' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
