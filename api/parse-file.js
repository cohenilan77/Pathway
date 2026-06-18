import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, mediaType } = req.body;
  if (!base64 || (mediaType !== 'application/pdf' && mediaType !== DOCX_MEDIA_TYPE)) {
    return res.status(400).json({ error: 'Only PDF and Word (.docx) files are supported' });
  }

  try {
    if (mediaType === DOCX_MEDIA_TYPE) {
      const { value: text } = await mammoth.extractRawText({ buffer: Buffer.from(base64, 'base64') });
      return res.status(200).json({ text });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extract all text from this document as plain text. Preserve structure and formatting as closely as possible. Return only the extracted text, no commentary.' },
        ],
      }],
    });
    return res.status(200).json({ text: response.content[0]?.text || '' });
  } catch (err) {
    console.error('parse-file error:', err.message);
    return res.status(500).json({ error: 'Failed to extract text', details: err.message });
  }
}
