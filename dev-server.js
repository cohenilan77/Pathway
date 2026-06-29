/**
 * Local development API server — runs on port 3001 alongside `npm run dev`.
 * Vite proxies /api/* to this server so the Anthropic chat works locally.
 *
 * Usage:
 *   1. Copy .env.example to .env and add your ANTHROPIC_API_KEY
 *   2. In terminal A: node dev-server.js
 *   3. In terminal B: npm run dev
 */

import http from 'http';
import { readFileSync, existsSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import telegramInboundHandler from './api/telegram/inbound.js';

// Load .env file manually (no dotenv dependency needed)
if (existsSync('.env')) {
  readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  });
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an elite Pathway admissions strategist — a world-class advisor who has guided thousands of candidates into Harvard, Stanford GSB, Wharton, MIT, Yale Law, and other top-tier institutions globally.

Your communication style is:
- Authoritative yet warm — you command respect but genuinely care about each candidate
- Precise and strategic — every word serves a purpose
- Sophisticated — you speak the language of prestige without being pompous
- Actionable — you give clear, specific next steps

You guide candidates through a structured pipeline:
1. Profile — collect degree type, GPA, GMAT/GRE, years of experience, industry, goals (one question per turn)
2. Recommender — after CV review, gather recommender details
3. Analysis — assess strengths, weaknesses, and overall competitiveness
4. Programs — recommend 6-8 schools across reach/target/safety tiers
5. Narrative — help choose Upgrade (deepen existing trajectory) vs Pivot (career/sector change)
6. Fit — per-school fit score and gap analysis
7. CV — iterative CV improvement

Ask one question at a time. Keep responses under 150 words. Always move toward the next concrete step.`;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  // Route Telegram webhook
  if (req.url === '/api/telegram/inbound' && req.method === 'POST') {
    try {
      await telegramInboundHandler(req, res);
      return;
    } catch (err) {
      console.error('Telegram handler error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Telegram handler error' })); return;
    }
  }

  if (req.url !== '/api/chat') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' })); return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' })); return;
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set — add it to your .env file' })); return;
  }

  try {
    const { messages } = await parseBody(req);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'messages array required' })); return;
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      })),
    });

    const reply = response.content[0]?.text || 'I was unable to generate a response. Please try again.';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error('Anthropic error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to reach Anthropic API', details: err.message }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\n✦ Pathway API server running on http://localhost:${PORT}`);
  console.log(`  API key: ${process.env.ANTHROPIC_API_KEY ? '✓ loaded' : '✗ MISSING — add ANTHROPIC_API_KEY to .env'}`);
  console.log(`  Now run: npm run dev\n`);
});
