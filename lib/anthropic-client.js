import Anthropic from '@anthropic-ai/sdk';

// Headroom (https://headroom.so) is a context-compaction proxy: it sits in front of
// the Anthropic API, compresses/summarizes older conversation turns before they're
// resent as input context, and forwards the real cache/token usage back unchanged.
// HEADROOM_BASE_URL was previously malformed (missing a URL scheme), which threw
// "Invalid URL" on every Anthropic call. Normalize it defensively instead of trusting
// the env var verbatim, and never let a bad value break chat — fall back to calling
// Anthropic directly.
function normalizeBaseUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    console.error(`HEADROOM_BASE_URL is malformed ("${value}") — calling Anthropic directly instead.`);
    return null;
  }
}

export function createAnthropicClient(options = {}) {
  const headroomBaseUrl = normalizeBaseUrl(process.env.HEADROOM_BASE_URL);
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...(headroomBaseUrl ? { baseURL: headroomBaseUrl } : {}),
    ...options,
  });
}
