// Optional Headroom context-compression integration. Default OFF — every export here
// is a no-op pass-through unless HEADROOM_ENABLED=1. Any failure (proxy down, SDK
// missing, timeout) must fall back to returning the original, uncompressed input —
// callers in api/chat.js, api/summarize.js, api/parse-file.js must never break because
// of Headroom.
import { sanitizeText, sanitizeMessages } from './payload-safety.js';

// Headroom was hosted as a compression proxy on Railway
// (headroom-service-production.up.railway.app). That service is being
// decommissioned, so Headroom is now hard-disabled in code: no request ever
// leaves for the proxy, and every export below is a pure pass-through. This
// guard intentionally ignores the HEADROOM_* env vars so a stale
// HEADROOM_ENABLED=1 left over in Vercel can't cause the app to wait on (and
// time out against) the dead Railway endpoint. To revive Headroom later,
// stand a proxy back up, point HEADROOM_PROXY_URL at it, and set
// HEADROOM_DECOMMISSIONED = false.
const HEADROOM_DECOMMISSIONED = true;

export function isHeadroomEnabled() {
  if (HEADROOM_DECOMMISSIONED) return false;
  return process.env.HEADROOM_ENABLED === '1' && process.env.HEADROOM_MODE !== 'off';
}

function envFlag(name, defaultValue = true) {
  const v = process.env[name];
  if (v == null || v === '') return defaultValue;
  return v === '1' || v.toLowerCase() === 'true';
}

export const HeadroomFlags = {
  get compressSystem() { return envFlag('HEADROOM_COMPRESS_SYSTEM', true); },
  get compressChat() { return envFlag('HEADROOM_COMPRESS_CHAT', true); },
  get compressStructuredState() { return envFlag('HEADROOM_COMPRESS_STRUCTURED_STATE', true); },
  get compressFiles() { return envFlag('HEADROOM_COMPRESS_FILES', true); },
};

function getTimeoutMs() {
  const v = Number(process.env.HEADROOM_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 3000;
}

function getProxyUrl() {
  return process.env.HEADROOM_PROXY_URL || 'http://127.0.0.1:8787';
}

let cachedClientLoader = null;
async function loadHeadroomClient() {
  if (cachedClientLoader) return cachedClientLoader;
  cachedClientLoader = (async () => {
    try {
      const mod = await import('headroom-ai');
      return mod;
    } catch (err) {
      console.error('Headroom SDK not available, falling back to uncompressed flow:', err.message);
      return null;
    }
  })();
  return cachedClientLoader;
}

async function withTimeout(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Headroom request timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Compresses a single block of free text (system prompt, KPI context, structured-state
// JSON serialized to text, file/document text). Returns { text, compressed, error,
// originalChars, compressedChars }. Never throws.
export async function compressText(text, { label = 'text' } = {}) {
  const originalChars = typeof text === 'string' ? text.length : 0;
  const result = { text, compressed: false, error: null, originalChars, compressedChars: originalChars, mode: 'off' };
  if (!isHeadroomEnabled()) return result;
  if (typeof text !== 'string' || !text.trim()) return result;

  const safeText = sanitizeText(text);

  try {
    const mod = await loadHeadroomClient();
    if (!mod) {
      result.error = 'sdk_unavailable';
      return result;
    }
    const { compress } = mod;
    const timeoutMs = getTimeoutMs();
    const compressResult = await withTimeout(
      compress([{ role: 'user', content: safeText }], {
        baseUrl: getProxyUrl(),
        timeout: timeoutMs,
        fallback: true,
      }),
      timeoutMs
    );
    const compressedMessages = compressResult?.messages;
    const compressedText = Array.isArray(compressedMessages) && compressedMessages.length
      ? compressedMessages[compressedMessages.length - 1]?.content
      : null;
    if (typeof compressedText === 'string' && compressedText.trim()) {
      result.text = compressedText;
      result.compressed = true;
      result.compressedChars = compressedText.length;
      result.mode = process.env.HEADROOM_MODE || 'optimize';
    } else {
      result.error = 'empty_compression_result';
    }
  } catch (err) {
    console.error(`Headroom compression failed for ${label}, falling back to original:`, err.message);
    result.error = err.message || 'compression_failed';
  }
  return result;
}

// Compresses an array of Anthropic-style chat messages ({ role, content }).
// Returns { messages, compressed, error, originalChars, compressedChars }.
export async function compressMessages(messages, { label = 'messages' } = {}) {
  const originalChars = JSON.stringify(messages || []).length;
  const result = { messages, compressed: false, error: null, originalChars, compressedChars: originalChars, mode: 'off' };
  if (!isHeadroomEnabled()) return result;
  if (!Array.isArray(messages) || !messages.length) return result;

  const safeMessages = sanitizeMessages(messages);

  try {
    const mod = await loadHeadroomClient();
    if (!mod) {
      result.error = 'sdk_unavailable';
      return result;
    }
    const { compress } = mod;
    const timeoutMs = getTimeoutMs();
    const compressResult = await withTimeout(
      compress(safeMessages, {
        baseUrl: getProxyUrl(),
        timeout: timeoutMs,
        fallback: true,
      }),
      timeoutMs
    );
    if (Array.isArray(compressResult?.messages) && compressResult.messages.length) {
      result.messages = compressResult.messages;
      result.compressed = true;
      result.compressedChars = JSON.stringify(compressResult.messages).length;
      result.mode = process.env.HEADROOM_MODE || 'optimize';
    } else {
      result.error = 'empty_compression_result';
    }
  } catch (err) {
    console.error(`Headroom compression failed for ${label}, falling back to original:`, err.message);
    result.error = err.message || 'compression_failed';
  }
  return result;
}

export function estimateCompressionPercent(originalChars, optimizedChars) {
  if (!originalChars || originalChars <= 0) return 0;
  const pct = (1 - optimizedChars / originalChars) * 100;
  return Math.max(0, Math.round(pct * 10) / 10);
}
