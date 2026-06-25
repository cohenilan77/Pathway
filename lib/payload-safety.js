// Strips secrets/credentials from text before it is sent to the (local/self-hosted)
// Headroom proxy. Normal candidate admissions data (CV text, essays, recommender
// names, emails, phone numbers, grades, addresses) is intentionally NOT stripped.

const SECRET_PATTERNS = [
  // Common API key formats (OpenAI, Anthropic, Stripe, generic prefixed keys, etc.)
  /\bsk-[a-zA-Z0-9_-]{16,}\b/g,
  /\bsk-ant-[a-zA-Z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  // Bearer / Authorization tokens
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi,
  // Generic "api_key=...", "token=...", "secret=..." assignments
  /\b(api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|password)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{6,}["']?/gi,
  // JWTs
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // Cookie / Set-Cookie headers
  /\b(Cookie|Set-Cookie)\s*:\s*[^\n]+/gi,
  // Signed/temporary blob URLs (query-string tokens/signatures)
  /https?:\/\/[^\s"']+[?&](?:sig|signature|token|x-amz-signature|x-amz-credential)=[^\s"']+/gi,
  // Large base64 blobs (>= ~200 chars of base64 body, e.g. embedded file payloads)
  /\b[A-Za-z0-9+/]{200,}={0,2}\b/g,
  // data: URIs (binary payloads)
  /data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/gi,
];

const REDACTED = '[REDACTED]';

export function stripSecrets(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

// Returns true if the value looks like raw binary/base64 payload data rather than text
// (e.g. an embedded file), which should never be forwarded to Headroom at all.
export function looksBinary(value) {
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:') && value.includes(';base64,')) return true;
  if (value.length > 500) {
    const sample = value.slice(0, 500);
    const base64Like = /^[A-Za-z0-9+/=\s]+$/.test(sample);
    if (base64Like && !/[.,;:!?'"\s]{2,}/.test(sample)) return true;
  }
  return false;
}

// Sanitizes a single string value: drops it entirely if it's binary/base64 payload,
// otherwise strips known secret patterns.
export function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  if (looksBinary(value)) return '[BINARY CONTENT REMOVED]';
  return stripSecrets(value);
}

// Recursively sanitizes strings within plain objects/arrays (used for structured
// blocks like PROFILE/SCORES/PROGRAMS before they're sent to Headroom).
export function sanitizeDeep(value) {
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDeep(v);
    return out;
  }
  return value;
}

// Sanitizes an array of Anthropic-style chat messages ({ role, content }) before
// they are handed to Headroom for compression.
export function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return messages;
  return messages.map((m) => {
    if (typeof m?.content === 'string') {
      return { ...m, content: sanitizeText(m.content) };
    }
    if (Array.isArray(m?.content)) {
      return { ...m, content: m.content.map((block) => (typeof block === 'string' ? sanitizeText(block) : sanitizeDeep(block))) };
    }
    return m;
  });
}
