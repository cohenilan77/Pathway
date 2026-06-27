import mammoth from 'mammoth';
import { put } from '@vercel/blob';
import { getUserIdByToken } from '../lib/db.js';
import { recordUsage } from '../lib/usage.js';
import { isHeadroomEnabled, compressText, estimateCompressionPercent, HeadroomFlags } from '../lib/headroom.js';
import { createAnthropicClient } from '../lib/anthropic-client.js';

const client = createAnthropicClient();
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

const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_FILE_BYTES = 3 * 1024 * 1024;

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

function safeFileName(name, mediaType) {
  const fallback = mediaType === DOCX_MEDIA_TYPE ? 'resume.docx' : 'resume.pdf';
  return String(name || fallback)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || fallback;
}

async function saveOriginalFile(buffer, { fileName, mediaType }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const safeName = safeFileName(fileName, mediaType);
    const blob = await put(`candidate-uploads/${Date.now()}-${safeName}`, buffer, {
      access: 'private',
      contentType: mediaType,
      addRandomSuffix: true,
    });

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      name: safeName,
      mimeType: mediaType,
      size: buffer.length,
      uploadedAt: Date.now(),
    };
  } catch (err) {
    console.error('blob upload error:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, mediaType, fileName } = req.body;
  if (!base64 || (mediaType !== 'application/pdf' && mediaType !== DOCX_MEDIA_TYPE)) {
    return res.status(400).json({ error: 'Only PDF and Word (.docx) files are supported' });
  }

  try {
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_FILE_BYTES) {
      return res.status(413).json({ error: 'File is too large. Please upload a PDF or Word file under 3 MB.' });
    }

    const file = await saveOriginalFile(buffer, { fileName, mediaType });

    // Headroom never receives the raw base64/binary file — only plain text extracted
    // below (by mammoth for .docx, by Anthropic's document extraction for PDF), and
    // only if HEADROOM_COMPRESS_FILES is enabled.
    async function maybeCompressExtractedText(text) {
      const stats = {
        enabled: isHeadroomEnabled(),
        mode: process.env.HEADROOM_MODE || 'off',
        error: null,
        originalInputChars: text.length,
        optimizedInputChars: text.length,
      };
      let outText = text;
      console.log(`[Headroom-File] enabled=${stats.enabled}, compressFiles=${HeadroomFlags.compressFiles}, textSize=${text.length}`);
      if (stats.enabled && HeadroomFlags.compressFiles) {
        const result = await compressText(text, { label: 'parsed_file_text' });
        console.log(`[Headroom-File] Extracted text: ${text.length} → ${result.text.length} chars, compressed=${result.compressed}, error=${result.error}`);
        stats.error = result.error;
        outText = result.text;
        stats.optimizedInputChars = outText.length;
      }
      return { text: outText, stats };
    }

    if (mediaType === DOCX_MEDIA_TYPE) {
      const { value: extractedText } = await mammoth.extractRawText({ buffer });
      const { text } = await maybeCompressExtractedText(extractedText);
      return res.status(200).json({ text, file });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extract all text from this document as plain text. Preserve structure and formatting as closely as possible. Return only the extracted text, no commentary.' },
        ],
      }],
    });
    const userId = await resolveUserId(req);
    const extractedText = response.content[0]?.text || '';
    const { text, stats: headroomStats } = await maybeCompressExtractedText(extractedText);
    recordUsage({
      userId,
      conversationId: 'session',
      feature: 'document_parsing',
      model: MODEL,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      endpoint: 'parse-file',
      headroomEnabled: headroomStats.enabled,
      headroomMode: headroomStats.mode,
      headroomError: headroomStats.error,
      originalInputChars: headroomStats.originalInputChars,
      optimizedInputChars: headroomStats.optimizedInputChars,
      estimatedCompressionPercent: estimateCompressionPercent(headroomStats.originalInputChars, headroomStats.optimizedInputChars),
    }).catch((e) => console.error('Failed to record usage:', e));
    return res.status(200).json({ text, file });
  } catch (err) {
    console.error('parse-file error:', err.message);
    return res.status(500).json({ error: 'Failed to extract text', details: err.message });
  }
}
