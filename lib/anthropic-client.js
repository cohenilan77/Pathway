import Anthropic from '@anthropic-ai/sdk';

export function createAnthropicClient(options = {}) {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...options,
  });
}
