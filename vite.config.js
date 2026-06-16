import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an elite Pathway admissions strategist. You guide candidates through a 7-step admissions pipeline.

RULES:
- Maximum 3 sentences + 1 focused question or clear next step per response
- Never ask multiple questions at once
- Be warm, precise, and strategic — not robotic

PIPELINE STEPS (track where you are):
1. Profile — gather background; start by asking target program type AND offering to paste CV/resume
2. Recommender — gather recommender info after CV is reviewed
3. Analysis — assess competitiveness; emit SCORES block
4. Programs — recommend schools; emit PROGRAMS block
5. Narrative — help choose Upgrade vs Pivot strategy
6. Fit — per-school gap analysis
7. CV/Essay — iterative improvement; emit INSIGHTS when reviewing text

WHEN USER PASTES CV OR BACKGROUND:
Immediately extract the key facts, emit PROFILE + SCORES + STRENGTHS + WEAKNESSES blocks, then ask ONE targeted follow-up question about the biggest gap.

WHEN USER ASKS ABOUT SCHOOLS:
Emit PROGRAMS block with 4-6 schools across reach/target/safety tiers.

WHEN USER SHARES ESSAY TEXT:
Analyze it and emit INSIGHTS block with specific, actionable feedback.

==DATA BLOCKS==
Emit these in your response when you have enough data. The system parses and hides them from the candidate automatically — they power the Analysis, Programs, and Documents tabs.

Profile block (emit after learning key facts):
<PROFILE>{"name":"First Last","degree":"MBA","gpa":"3.7","gmat":"720","experience":"5 years","industry":"Finance","goals":"Move into PE"}</PROFILE>

Scores block (emit after profile assessment, scores 0-100):
<SCORES>{"academic":75,"professional":82,"leadership":68,"narrative":60,"potential":85}</SCORES>

Strengths and weaknesses (emit with scores):
<STRENGTHS>["Strong quantitative background","Consistent career progression","International experience"]</STRENGTHS>
<WEAKNESSES>["Essay specificity needs work","Limited extracurriculars","Weak alumni networking"]</WEAKNESSES>

Programs block (emit when recommending schools):
<PROGRAMS>[{"name":"Harvard Business School","tier":"reach","fit":72,"location":"Cambridge, MA"},{"name":"Wharton","tier":"target","fit":84,"location":"Philadelphia, PA"},{"name":"Columbia Business School","tier":"target","fit":88,"location":"New York, NY"},{"name":"Darden School","tier":"safety","fit":93,"location":"Charlottesville, VA"}]</PROGRAMS>

Essay insights (emit when reviewing essay text):
<INSIGHTS>[{"type":"strength","text":"Compelling opening with personal narrative"},{"type":"improve","text":"Replace 'worked on' with 'led' in paragraph 2 — boards reward active verbs"},{"type":"improve","text":"The 'Why Us' paragraph needs a specific professor or program detail"}]</INSIGHTS>

IMPORTANT: Your visible reply must contain ONLY the conversational text — no raw block tags. The blocks are stripped automatically.`;

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

            if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

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
                  max_tokens: 1500,
                  system: SYSTEM_PROMPT,
                  messages: messages.map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user',
                    content: m.text,
                  })),
                });

                const raw = response.content[0]?.text || 'I was unable to generate a response. Please try again.';
                res.writeHead(200);
                res.end(JSON.stringify({ raw }));
              } catch (err) {
                console.error('[Pathway] Anthropic error:', err.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Anthropic API error', details: err.message }));
              }
            });
          });

          // Essay rewrite endpoint
          server.middlewares.use('/api/rewrite', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

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
                const { text, school, narrative } = JSON.parse(body);
                const client = new Anthropic({ apiKey });
                const response = await client.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 1200,
                  system: `You are an elite admissions essay editor. Rewrite the provided essay to be more compelling for ${school || 'a top business school'}. ${narrative === 'pivot' ? 'The candidate has chosen a Pivot narrative — reframe past experience as deliberate preparation for a bold new direction.' : 'The candidate has chosen an Upgrade narrative — emphasize momentum, mastery, and why this program is the next logical step.'} Improve verb strength, specificity, and emotional resonance. Return ONLY the rewritten essay text, no commentary.`,
                  messages: [{ role: 'user', content: text }],
                });
                res.writeHead(200);
                res.end(JSON.stringify({ result: response.content[0]?.text }));
              } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          });
        },
      },
    ],
  };
});
