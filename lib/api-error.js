const SENSITIVE_PATTERNS = [
  /anthropic/i,
  /claude/i,
  /\bsdk\b/i,
  /api[_-]?key/i,
  /redis/i,
  /upstash/i,
  /\bENOENT\b/,
  /\bstack\b/i,
  /node_modules/i,
];

const GENERIC_MESSAGE = 'An error occurred. Please try again.';

export function safeError(err, fallback = GENERIC_MESSAGE) {
  const message = err?.message;
  if (!message || typeof message !== 'string') return fallback;
  if (message.length > 200) return fallback;
  if (SENSITIVE_PATTERNS.some((re) => re.test(message))) return fallback;
  return message;
}
