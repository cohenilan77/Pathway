import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import Anthropic from '@anthropic-ai/sdk';

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
5. Narrative — help the candidate choose Upgrade (deepen existing trajectory) vs Pivot (career/sector change or entrepreneurship)
6. Fit — per-school fit score and gap analysis
7. CV — iterative CV improvement and optimization

Ask one focused question at a time. Keep responses under 150 words. Always move toward the next concrete step in the pipeline.`;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'anthropic-api',
        configureServer(server) {
          server.middlewares.use('/api/chat', (req, res) => {
            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'OPTIONS') {
              res.writeHead(200); res.end(); return;
            }
            if (req.method !== 'POST') {
              res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return;
            }

            const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
            if (!apiKey || apiKey === 'your_api_key_here') {
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Add ANTHROPIC_API_KEY to your .env file' }));
              return;
            }

            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { messages } = JSON.parse(body);
                if (!messages || !Array.isArray(messages)) {
                  res.writeHead(400); res.end(JSON.stringify({ error: 'messages array required' })); return;
                }

                const client = new Anthropic({ apiKey });
                const response = await client.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 600,
                  system: SYSTEM_PROMPT,
                  messages: messages.map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user',
                    content: m.text,
                  })),
                });

                const reply = response.content[0]?.text || 'Unable to generate a response. Please try again.';
                res.writeHead(200);
                res.end(JSON.stringify({ reply }));
              } catch (err) {
                console.error('[Pathway] Anthropic error:', err.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Anthropic API error', details: err.message }));
              }
            });
          });
        },
      },
    ],
  };
});
