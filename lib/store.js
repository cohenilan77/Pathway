import { Redis } from '@upstash/redis';
import { fileStore } from './file-store.js';

let cached;

export function getStore() {
  if (cached) return cached;
  const hasRedis = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  cached = hasRedis ? Redis.fromEnv() : fileStore;
  return cached;
}
