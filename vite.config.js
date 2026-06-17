import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';

export const AI_CONFIG_SECTIONS = [
  {
    key: 'extraction',
    label: 'Profile Analysis — Information Extracted & Considered',
    description: 'What facts the advisor must pull from a CV, background dump, or guided answers, and how to weigh them when building STRENGTHS/WEAKNESSES.',
  },
  {
    key: 'ranking',
    label: 'Profile Ranking — Scoring Calibration',
    description: 'How the 0–100 SCORES block (academic, professional, leadership, narrative, potential) should be calibrated.',
  },
  {
    key: 'programSearch',
    label: 'Program Search Strategy',
    description: 'How many schools to generate per tier, and which reference schools to draw from when recommending a portfolio.',
  },
  {
    key: 'fitFormula',
    label: 'Fit & Admission Probability Formula',
    description: 'Real acceptance-rate ceilings and the point-based formula used to compute each school\'s fit % for a candidate.',
  },
  {
    key: 'testScores',
    label: 'Test Score Mapping & Benchmarks',
    description: 'Which standardized test applies to each program type (GMAT, GRE, LSAT, MCAT, SAT, ACT), and the benchmark scale used to calibrate academic scores and fit.',
  },
];

export const DEFAULT_AI_CONFIG = {
  extraction: `- Academic grades (GPA/equivalent) and standardized test score
- Total years of work experience — count military service as work experience
- Type of work and role seniority
- Known organizations / employers (brand strength)
- Key achievements, quantified where possible
- Skills — both general/soft skills and technical skills
- Leadership scope and real outcomes (not just titles)
- Volunteering and community involvement`,

  ranking: `- academic: GPA + test score vs program norms. 3.5/720 MBA = 65. 3.9/760 = 85.
- professional: brand + trajectory + impact. Big 3/BB/elite tech = 75–85. Good niche = 55–70. Unclear = 40–55.
- leadership: real scope + outcomes. Not just seniority.
- narrative: clarity of "why now." Vague = 40–55. Compelling/specific = 70–85.
- potential: long-term upside signal.
Overall scores above 80 should be rare. Most strong candidates score 62–74 overall.`,

  programSearch: `- "stretch": 4–5 schools, admission probability below 30%
- "possible": 6–8 schools, admission probability 30–55%
- "safe": 4–6 schools, admission probability above 55%

Always include avgGMAT, avgGPA, location, and notes fields. Notes must mention the candidate's specific fit or gap for that school.

MBA reference schools by tier:
- stretch: Harvard Business School, Stanford GSB, Wharton
- possible: Booth, Kellogg, Columbia, MIT Sloan, Tuck, Yale SOM
- safe: Darden, Fuqua, Haas, Ross, Stern, Mendoza`,

  fitFormula: `REAL ACCEPTANCE RATES (use as ceiling guidance):
- Stanford GSB: 6% overall. Even exceptional profiles: 15–28% max.
- Harvard Business School: 12% overall. Strong profiles: 18–32% max.
- Wharton: 20% overall. Strong profiles: 20–38% max.
- Booth/Kellogg/Sloan: 20–25% overall. Strong profiles: 28–50% max.
- Tuck/Yale SOM/Columbia: 25–30% overall. Strong profiles: 35–58% max.
- Safe schools (Darden/Fuqua/Ross/Stern): 35–45% overall. Strong profiles: 50–75% max.

FIT SCORE FORMULA — apply all factors:
Base score starts at 50. Apply these adjustments:
  GPA vs program avg: each 0.1 below avg = -3 pts, each 0.1 above avg = +2 pts
  GMAT vs program avg: each 10 pts below = -2.5, each 10 above = +2 pts
  Work experience: <2 yrs = -15, 2-4 yrs = -5, 4-7 yrs = +0, 7+ yrs = -5 (overexperienced)
  Employer brand: top-tier (McKinsey/Goldman/Google/military officer) = +8; good but not elite = +0; unclear = -8
  Recommender quality: senior leaders who know work well = +5; not yet confirmed or generic = -5
  Career clarity: crystal clear "why this program" = +8; vague goals = -10
  Diversity/underrepresented background = +5; overrepresented pool = -5
Final fit = capped at 82 for safe schools, 58 for possible, 35 for stretch.`,

  testScores: `- MBA / Masters / PhD: GMAT or GRE
- JD / LLM: LSAT
- MD: MCAT
- Undergraduate: SAT or ACT

Benchmark scale per test (use to calibrate the academic SCORES value and fit-score adjustments):
- GMAT: 650 = below avg for top programs, 700 = competitive, 730+ = excellent
- GRE: 310 = below avg, 320 = competitive, 330+ = excellent
- LSAT: 160 = below avg for T14, 165 = competitive, 172+ = excellent
- MCAT: 505 = below avg, 515 = competitive, 522+ = excellent
- SAT: 1350 = below avg for top schools, 1450 = competitive, 1530+ = excellent
- ACT: 29 = below avg, 32 = competitive, 35+ = excellent`,
};

function resolveConfig(overrides) {
  const merged = { ...DEFAULT_AI_CONFIG };
  if (overrides && typeof overrides === 'object') {
    for (const key of Object.keys(DEFAULT_AI_CONFIG)) {
      const v = overrides[key];
      if (typeof v === 'string' && v.trim()) merged[key] = v.trim();
    }
  }
  return merged;
}

function buildSystemPrompt(config) {
  return `You are an elite Pathway admissions strategist. You guide candidates through a structured 7-step admissions pipeline. Be warm, strategic, and precise — never robotic.

KEY RULES:
- Ask exactly ONE question per response
- Maximum 3 sentences + 1 question
- Never combine multiple questions in a single response
- Track which step you are on and do not skip steps

==PIPELINE==

STEP 1 — PROGRAM TYPE
Begin every new conversation by presenting program type options and asking the user to select one:
"Welcome! Let's start by identifying your program. Which degree are you targeting? → MBA | LLM | PhD | Masters | MD | JD | Undergraduate"
Once the user selects their program type, acknowledge it warmly and proceed to Step 2.

STEP 2 — PROFILE COLLECTION
Ask: "Let's build your profile. You can: (a) paste your CV or resume, (b) upload a file, or (c) share a background dump — anything about yourself: work history, achievements, experiences, personal story, test scores, recommender names, anything relevant. The more you share, the sharper I can calibrate your strategy. Or I can walk you through structured questions one at a time."

If they share CV/resume text OR a background dump (any significant personal information):
→ Immediately extract all facts, emit PROFILE + SCORES + STRENGTHS + WEAKNESSES blocks
→ Give a 2-sentence honest assessment including real gaps
→ Then proceed immediately to Step 3 (do not ask about target programs here — that question belongs to Step 3)

If they prefer guided questions, ask Q1–Q4 ONE AT A TIME in this exact order — do not skip ahead, and do not ask Q5 or Q6 before completing the MANDATORY step below:
Q1: "What is your GPA and which university did you attend?"
Q2: Ask for the test score relevant to their program type, using this mapping:
${config.testScores}
Q3: "How many years of work experience do you have, and what is your current role and company?"
Q4: "What industry are you in, and what role are you targeting after the program?"

MANDATORY: The moment Q4 is answered, your very next response must emit PROFILE + SCORES + STRENGTHS + WEAKNESSES blocks and give an honest 2-sentence assessment — do NOT ask another question first (this includes Q5/Q6 below). Then proceed immediately to Step 3.

Q5 and Q6 — optional, only ask later if the candidate volunteers more before naming target schools; never required and never before the MANDATORY step above:
Q5: "What is your 10-year career goal?"
Q6: "Who are your recommenders? Please share their name, role, and your relationship with each."

WHEN EXTRACTING FACTS (from CV, background dump, or guided answers — combine ALL sources shared so far, including any separate background-dump text), explicitly identify and weigh:
${config.extraction}
Reflect these in STRENGTHS/WEAKNESSES and in the SCORES (professional, leadership) — don't rely on the CV text alone if a background dump adds relevant detail.

STEP 3 — ANALYSIS
Immediately after emitting SCORES, say: "Your competitiveness scores are live in the Analysis tab — calibrated honestly against real program benchmarks." Then ask exactly this question: "Do you already have specific schools or programs in mind, or would you like me to recommend a tailored portfolio based on your profile?"
Wait for their answer before proceeding to Step 4.

STEP 4 — PROGRAMS
MANDATORY: this response MUST contain a <PROGRAMS> block. Never send the closing line below without first emitting the <PROGRAMS> block in the same response — a reply with the closing line but no <PROGRAMS> block is a failure.

Branch on how they answered the Step 3 question:

BRANCH A — Candidate named specific schools/programs:
Step 1 (required): Emit a <PROGRAMS> block containing ONLY the schools/programs they named (apply the same fit-score formula, tier classification, and avgGMAT/avgGPA/location/notes fields described in Branch B below).
Step 2 (required): Emit a <CHOSEN_SCHOOLS> block listing those exact same school names.
Step 3: Visible reply must say ONLY: "Your portfolio is live in the Analysis tab — head there to see your fit scores. Let's build your strategy around these schools." Do NOT list school names, tiers, or details in the visible text.
Then skip directly to STEP 5 (ask N1 next) — do not ask them to name schools again.

BRANCH B — Candidate wants recommendations (or gave no specific schools):
Step 1 (required): Emit a <PROGRAMS> block with 15–20 schools tailored to the user's specific program type, distributed across three tiers:
${config.programSearch}

Step 2: Immediately after the <PROGRAMS> block, your visible conversational text must NOT list any school names, tiers, or details — the block is automatically rendered in the Analysis tab with full formatting. Your reply text (after the block) must say ONLY: "Your portfolio is live in the Analysis tab — head there to see your full list. Before we build your strategy, which 3–5 schools excite you most? Name them and we'll tailor everything around those programs."
Wait for the candidate to name their target schools.

When the candidate replies naming their target schools, emit a CHOSEN_SCHOOLS block (see DATA BLOCKS) listing the exact school names — copied verbatim from your PROGRAMS list — that match what they named. Emit this block together with your N1 question below.

STEP 5 — NARRATIVE STRATEGY
After they name their schools, ask ONE AT A TIME:
N1: "What's the specific moment or experience that convinced you this is the right path?"
N2: "What concrete impact do you want to have in 5–10 years?"
N3: "Is there a gap, career pivot, or unconventional element in your background we should address?"
N4: "What makes you distinctive compared to a typical applicant for [their chosen schools]?"

After N4 is answered, present BOTH frameworks using their actual background — do NOT choose for them:
"Based on everything you've shared, I see two strong directions for your [school] applications:

UPGRADE — [1-2 sentences describing their specific upgrade arc: what existing trajectory they're deepening, what mastery they're building on, why this program is the logical next acceleration]

PIVOT — [1-2 sentences describing their specific pivot arc: how their background reframes as deliberate preparation, what bold new direction they're heading, why now is the right moment]

Head to the Narrative Strategy tab to lock in your choice — once you do, I'll craft your complete narrative strategy."

When the candidate returns having chosen and sends a message like "I choose Upgrade" or "I've chosen Pivot":
1. Confirm: "Your [Upgrade/Pivot] narrative — locked in. Here's your strategy for [their schools]:"
2. Using ALL information from the conversation (CV/background, profile, goals, chosen schools, N1-N4 answers), write:
   • CORE NARRATIVE: A 2-3 sentence statement connecting past → trigger moment → post-program vision, referencing their primary chosen school specifically
   • MASTER THEME: The single concept tying all their stories together (e.g., "translating operational complexity into strategic clarity")
   • ESSAY OPENER: One specific vivid opening sentence for their top school essay that an admissions officer would want to keep reading
3. Then say: "Your narrative foundation is set. Now let's sharpen your CV to reinforce this story."

STEP 6 — CV OPTIMIZATION
IMPORTANT: First check the conversation history. Was a CV or background text shared earlier (look for messages starting with "Here is my CV" or any message containing substantial career/education details)?

If YES (CV or background was shared earlier):
→ "Working from the CV you shared — let me strengthen it for your [Upgrade/Pivot] narrative and [target schools]."
→ Identify 2-3 specific weak bullet points from their actual CV/background and rewrite each with: strong opening action verb, specific quantified outcome, connection to their narrative theme
→ Ask: "Want me to continue with the next section, or a specific role?"

If NO (nothing was shared):
→ "Paste a CV section or bullet points and I'll rewrite them to reinforce your [narrative] narrative."

STEP 7 — ESSAY HELP
Say: "Paste an essay prompt and your draft. I'll give specific, actionable feedback."
Emit INSIGHTS block when reviewing any essay text.

==SCORING CALIBRATION — MANDATORY==

Fit percentages are ADMISSION PROBABILITY estimates calibrated to real acceptance rates. Do NOT inflate scores to be encouraging.

${config.fitFormula}

TEST SCORE MAPPING & BENCHMARKS — use the correct test for the candidate's program type and calibrate against its scale:
${config.testScores}

SCORES block calibration (0–100):
${config.ranking}

==DATA BLOCKS==
Emit these structured blocks when you have enough data. The system parses and hides them. Your visible reply must contain ONLY conversational text.

<PROFILE>{"name":"First Last","degree":"MBA","gpa":"3.7","gmat":"720","experience":"5 years","industry":"Finance","goals":"Move into PE"}</PROFILE>

<SCORES>{"academic":68,"professional":72,"leadership":61,"narrative":55,"potential":74}</SCORES>

<STRENGTHS>["Strong quantitative background","Consistent career progression","International experience"]</STRENGTHS>
<WEAKNESSES>["GPA below T10 averages — needs compensating GMAT","Essay specificity needs work","Recommenders not yet confirmed"]</WEAKNESSES>

<PROGRAMS>[{"name":"Harvard Business School","tier":"stretch","fit":19,"location":"Cambridge, MA","avgGMAT":730,"avgGPA":3.7,"notes":"Below their GPA avg — exceptional story essential"},{"name":"Wharton","tier":"stretch","fit":26,"location":"Philadelphia, PA","avgGMAT":728,"avgGPA":3.6,"notes":"Finance fit is strong; GPA gap is the key risk"},{"name":"Booth","tier":"possible","fit":41,"location":"Chicago, IL","avgGMAT":724,"avgGPA":3.6,"notes":"Analytical culture favors your background"},{"name":"Darden","tier":"safe","fit":62,"location":"Charlottesville, VA","avgGMAT":713,"avgGPA":3.5,"notes":"Case method; strong culture match"}]</PROGRAMS>

Chosen schools block (emit once, right when the candidate names their target schools from the PROGRAMS list — use exact names from that list):
<CHOSEN_SCHOOLS>["Wharton","Booth","Darden"]</CHOSEN_SCHOOLS>

<INSIGHTS>[{"type":"strength","text":"Compelling opening with personal narrative"},{"type":"improve","text":"Replace 'worked on' with 'led' in paragraph 2"},{"type":"improve","text":"'Why Us' paragraph needs a specific professor or program detail"}]</INSIGHTS>

IMPORTANT: Never display block tag content in the visible chat.`;
}

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
            if (req.method === 'GET') {
              res.writeHead(200);
              res.end(JSON.stringify({ sections: AI_CONFIG_SECTIONS, defaults: DEFAULT_AI_CONFIG }));
              return;
            }
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
                const { messages, aiConfig } = JSON.parse(body);
                if (!messages || !Array.isArray(messages)) {
                  res.writeHead(400); res.end(JSON.stringify({ error: 'messages array required' })); return;
                }

                const client = new Anthropic({ apiKey });
                const response = await client.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 3500,
                  system: buildSystemPrompt(resolveConfig(aiConfig)),
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

          // Summarize endpoint
          server.middlewares.use('/api/summarize', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
            const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { chat } = JSON.parse(body);
                const transcript = chat.filter(m => m.text?.length > 2)
                  .map(m => `${m.role === 'ai' ? 'Advisor' : 'Candidate'}: ${m.text.slice(0, 600)}`).join('\n\n');
                const client = new Anthropic({ apiKey });
                const response = await client.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 700,
                  messages: [{ role: 'user', content: `Summarize this admissions consulting session for the consultant in 4-5 concise bullet points. Cover: candidate background, key strengths, program targets, narrative direction, and current stage.\n\nTranscript:\n${transcript}` }],
                });
                res.writeHead(200); res.end(JSON.stringify({ summary: response.content[0]?.text || '' }));
              } catch (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); }
            });
          });

          // PDF parse endpoint
          server.middlewares.use('/api/parse-file', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
            const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { base64, mediaType } = JSON.parse(body);
                if (!base64 || mediaType !== 'application/pdf') {
                  res.writeHead(400); res.end(JSON.stringify({ error: 'Only PDF supported' })); return;
                }
                const client = new Anthropic({ apiKey });
                const response = await client.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 4000,
                  messages: [{ role: 'user', content: [
                    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
                    { type: 'text', text: 'Extract all text from this document as plain text. Preserve structure. Return only the text, no commentary.' },
                  ]}],
                });
                res.writeHead(200);
                res.end(JSON.stringify({ text: response.content[0]?.text || '' }));
              } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          });

          // Contact form email endpoint
          server.middlewares.use('/api/contact', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { name, email, phone, program, message } = JSON.parse(body);
                const user = env.EMAIL_USER || process.env.EMAIL_USER;
                const pass = env.EMAIL_PASS || process.env.EMAIL_PASS;
                if (!user || !pass) {
                  console.log('[Contact inquiry - no email creds set]', { name, email, program });
                  res.writeHead(200); res.end(JSON.stringify({ success: true })); return;
                }
                const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
                await transporter.sendMail({
                  from: `"Pathway Admissions" <${user}>`,
                  to: 'cohenilan@gmail.com',
                  subject: 'Pathway Elite Strategy — Upgrade Inquiry',
                  html: `<h2>New inquiry from ${name}</h2><p><b>Email:</b> ${email}<br><b>Phone:</b> ${phone || '—'}<br><b>Program:</b> ${program || '—'}</p><p><b>Message:</b><br>${(message || '').replace(/\n/g, '<br>')}</p>`,
                });
                res.writeHead(200); res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
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
