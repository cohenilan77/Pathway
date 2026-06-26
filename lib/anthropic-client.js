import Anthropic from '@anthropic-ai/sdk';

export function createAnthropicClient(options = {}) {
  const headroomBaseUrl = process.env.HEADROOM_BASE_URL?.trim();
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...(headroomBaseUrl ? { baseURL: headroomBaseUrl } : {}),
    ...options,
  });
}
