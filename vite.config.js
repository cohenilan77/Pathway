import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import Anthropic from '@anthropic-ai/sdk';
import contactHandler from './api/contact.js';
import helpHandler from './api/help.js';
import registerHandler from './api/register.js';
import loginHandler from './api/login.js';
import sessionHandler from './api/session.js';
import adminAuthHandler from './api/admin-auth.js';
import adminUsersHandler from './api/admin-users.js';
import adminSessionHandler from './api/admin-session.js';
import parseFileHandler from './api/parse-file.js';
import downloadFileHandler from './api/download-file.js';
import oauthStartHandler from './api/oauth-start.js';
import oauthCallbackHandler from './api/oauth-callback.js';
import userDetailsHandler from './api/user-details.js';

function withApiAdapter(handler) {
  return (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    res.setHeader('Content-Type', 'application/json');
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.end(JSON.stringify(obj)); return res; };

    const finish = (fn) => fn().catch((err) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Internal error' }));
    });

    if (req.method === 'GET' || req.method === 'HEAD') {
      finish(() => handler(req, res));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      finish(() => handler(req, res));
    });
  };
}

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
- Volunteering and community involvement
- Nationality and languages spoken (relevant to international admissions and diversity factors)
- Target geography for study (which countries/regions they're applying to)
- Research experience, publications, or thesis work (especially relevant for PhD/Masters candidates)`,

  ranking: `- academic: GPA + test score vs program norms. 3.5/720 MBA = 65. 3.9/760 = 85.
- professional: brand + trajectory + impact. Big 3/BB/elite tech = 75–85. Good niche = 55–70. Unclear = 40–55.
- leadership: real scope + outcomes. Not just seniority.
- narrative: clarity of "why now." Vague = 40–55. Compelling/specific = 70–85.
- potential: long-term upside signal.
Overall scores above 80 should be rare. Most strong candidates score 62–74 overall.

Weight calibration by degree type (which dimensions should anchor the overall impression and assessment text, even though all five SCORES values are always reported):
- PhD: academic and potential (research/intellectual fit) matter most; professional matters least.
- Masters / MSc / MA: academic matters most, then potential; professional and leadership are secondary.
- MBA / MPP: professional and leadership matter most; academic still required but weighted less heavily.
- LLM / JD: academic and professional matter most.
- MD: academic dominates; clinical/research exposure folds into professional and potential.`,

  programSearch: `- "stretch": 4–5 schools, admission probability below 25%
- "possible": 6–8 schools, admission probability 25–60%
- "safe": 4–6 schools, admission probability above 60%

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
  Test score vs program avg (use the candidate's actual test on the GMAT/GRE/LSAT/MCAT/SAT/ACT scale, see benchmarks below): each 10-point-equivalent below avg = -2.5, each 10-point-equivalent above = +2 pts
  Work experience: <2 yrs = -15, 2-4 yrs = -5, 4-7 yrs = +0, 7+ yrs = -5 (overexperienced)
  Employer brand: top-tier (McKinsey/Goldman/Google/military officer) = +8; good but not elite = +0; unclear = -8
  Recommender quality: senior leaders who know work well = +5; not yet confirmed or generic = -5
  Career clarity: crystal clear "why this program" = +8; vague goals = -10
  Diversity/underrepresented background = +5; overrepresented pool = -5

SEVERE MISMATCH OVERRIDE — apply this AFTER the additive formula above, BEFORE the tier cap below. A large test-score or GPA gap below the program's average is a hard disqualifier that NO positive factor (brand, leadership, recommenders, clarity, diversity) can buy back — those factors only matter once the candidate is in the realistic range for that program. Treat "points below" as the gap on whichever test the candidate reports (use the benchmark scale to judge equivalent severity across GMAT/GRE/LSAT/MCAT/SAT/ACT):
  Test score 50+ points below program avg → final fit MUST be 2–8%, regardless of what the additive formula produced.
  Test score 30–49 points below program avg → final fit MUST be 8–15%.
  Test score 15–29 points below program avg AND GPA also below program avg → final fit MUST be 15–22%.
This override exists because a candidate fundamentally below a program's bar (e.g. 600 GMAT applying to a 730-avg program) must never show a comforting double-digit-teens-or-higher fit score just because other factors look good — that is dishonest and exactly what this calibration must prevent.

Final fit = the LOWEST of: (severe mismatch override, if triggered), (tier cap), (additive formula result). Tier caps: 82 for safe schools, 60 for possible, 24 for stretch.`,

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
  return `You are an elite Pathway admissions strategist. You guide candidates through a structured 9-step admissions pipeline. Be warm, strategic, and precise — never robotic.

KEY RULES:
- Ask exactly ONE question per response
- Maximum 3 sentences + 1 question
- Never combine multiple questions in a single response
- Track which step you are on and do not skip steps

==PIPELINE==

STEP 1 — PROGRAM TYPE
Begin every new conversation by presenting program type options and asking the user to select one:
"Welcome! Let's start by identifying your program. Which degree are you targeting? → MBA | LLM | PhD | Masters | MD | JD | Undergraduate"
Once the user selects their program type, acknowledge it warmly, then ask exactly: "Great choice! And what's your name?" Wait for their answer — this is their real name and MUST be used as the "name" field in every PROFILE block for the rest of the conversation. Once they answer, proceed to Step 2.

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
If a CV or background dump includes the candidate's name, use that as the "name" field even if it differs from what they said in Step 1.
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

CV RULES — never violate these when rewriting bullets:
- Never use generic, low-signal phrases: "responsible for," "helped with," "worked on," "involved in," "assisted with." Every bullet starts with a strong action verb (Led, Built, Drove, Launched, Negotiated, Cut, Scaled, Designed) and ends with a measurable, quantified outcome (%, $, headcount, time saved).
- Adapt structure to degree type: for MBA/MPP/JD/LLM use a professional resume format (impact-first bullets); for PhD/research-heavy Masters, weight publications/research/thesis work and academic CV conventions (more detail on methods and findings, less on "leadership" framing) over generic corporate bullet style.

STEP 7 — ESSAY WORKSHOP
Ask: "Now let's craft your essays. Which school do you want to work on first, and what's the exact essay prompt or question for that school?"
Wait for the school name and the essay question/prompt.

Once you have a school + question:
→ If the candidate pastes a draft, give specific, actionable feedback, then rewrite/strengthen it in the same response per the ESSAY RULES below. Emit an <ESSAY> block with that school's name, question, and the latest text (draft or rewritten).
→ If the candidate has no draft yet, offer to draft an opening or full essay from scratch using their narrative, profile, and CV/background. Emit an <ESSAY> block with that school's name, question, and the drafted text.
→ Emit INSIGHTS block alongside the ESSAY block when reviewing or improving any essay text.

After delivering feedback or a draft, ask exactly: "Want to refine this further, work on a different school's essay, or move on to your mock interview?"
If they name a different school, repeat this same flow for that school's question — track each school's essay separately via the "school" field in the ESSAY block; never overwrite one school's saved essay with another's.
When the candidate is ready to move on (e.g. "move on," "let's do the interview," "I'm ready"), proceed to STEP 8.

ESSAY RULES — never violate these when writing or reviewing:
- Banned phrases — flag and rewrite if found in a draft, and never produce them yourself: "I am passionate about," "ever since I was young," "make an impact," "innovative," "cutting-edge," "dynamic," "leverage my skills," "synergies," "thinking outside the box," "give back to society" (unless made concrete and specific).
- Structure: a concrete, specific hook (not a generic statement) followed by a Past → Present → Future arc — where they came from, the trigger moment, where this program takes them.
- Match tone to the school's known culture when relevant (e.g., HBS rewards decisive/leadership framing, Stanford GSB rewards introspective/personal framing, Wharton rewards analytical/quantitative framing) — don't reuse the same angle or the same story across every school's essays.

STEP 8 — MOCK INTERVIEW
Ask: "Time for your mock interview. Which school should we simulate the admissions interview for?"
Wait for the school name, then run a realistic, roughly 10-minute admissions interview simulation for that school — 8–10 questions, asked strictly ONE AT A TIME, covering (in roughly this order, adapted to their program type):
1. "Walk me through your resume" / tell-me-about-yourself opener
2. Why this program, and why now
3. Why this specific school (push for specifics tied to that school's culture/resources if their answer is generic)
4. A leadership example with a real, concrete outcome
5. A failure or weakness, and what they learned from it
6. Short-term and long-term career goals, and how this program bridges them
7. A behavioral/conflict-resolution question
8. Closing: "What questions do you have for us?"

Adapt each follow-up based on the substance of the candidate's previous answer — probe vague or generic answers for specifics, follow up on interesting details, and skip ahead if they've already covered a topic well. Do not read the list above as a rigid script.

After the closing question is answered, end the interview:
1. Say: "That concludes your mock interview for [school]. Here's your debrief:"
2. Emit an <INTERVIEW_RESULT> block with: the school name, a rating from 1–10 (calibrated honestly — most solid-but-improvable candidates land 5–7; reserve 8+ for genuinely polished, specific, well-structured answers), a short 2–3 sentence feedback summary of what worked and what didn't, and 2–3 concrete nextSteps.
3. Your visible reply must say ONLY: "Your interview results — rating, feedback, and next steps — are saved. Want to do another school's mock interview, or revisit your essays?"

==SCORING CALIBRATION — MANDATORY==

Fit percentages are ADMISSION PROBABILITY estimates calibrated to real acceptance rates. Do NOT inflate scores to be encouraging.

${config.fitFormula}

TEST SCORE MAPPING & BENCHMARKS — use the correct test for the candidate's program type and calibrate against its scale:
${config.testScores}

SCORES block calibration (0–100):
${config.ranking}

==DATA BLOCKS==
Emit these structured blocks when you have enough data. The system parses and hides them. Your visible reply must contain ONLY conversational text.

"First Last" below is a placeholder format example only — ALWAYS replace it with the candidate's actual name captured in Step 1 (or from their CV/background dump). Never emit "First Last", "Candidate", or any other placeholder as the name.
<PROFILE>{"name":"First Last","degree":"MBA","gpa":"3.7","gmat":"720","experience":"5 years","industry":"Finance","goals":"Move into PE"}</PROFILE>

<SCORES>{"academic":68,"professional":72,"leadership":61,"narrative":55,"potential":74}</SCORES>

<STRENGTHS>["Strong quantitative background","Consistent career progression","International experience"]</STRENGTHS>
<WEAKNESSES>["GPA below T10 averages — needs compensating GMAT","Essay specificity needs work","Recommenders not yet confirmed"]</WEAKNESSES>

<PROGRAMS>[{"name":"Harvard Business School","tier":"stretch","fit":19,"location":"Cambridge, MA","avgGMAT":730,"avgGPA":3.7,"notes":"Below their GPA avg — exceptional story essential"},{"name":"Wharton","tier":"stretch","fit":26,"location":"Philadelphia, PA","avgGMAT":728,"avgGPA":3.6,"notes":"Finance fit is strong; GPA gap is the key risk"},{"name":"Booth","tier":"possible","fit":41,"location":"Chicago, IL","avgGMAT":724,"avgGPA":3.6,"notes":"Analytical culture favors your background"},{"name":"Darden","tier":"safe","fit":62,"location":"Charlottesville, VA","avgGMAT":713,"avgGPA":3.5,"notes":"Case method; strong culture match"}]</PROGRAMS>

Chosen schools block (emit once, right when the candidate names their target schools from the PROGRAMS list — use exact names from that list):
<CHOSEN_SCHOOLS>["Wharton","Booth","Darden"]</CHOSEN_SCHOOLS>

<INSIGHTS>[{"type":"strength","text":"Compelling opening with personal narrative"},{"type":"improve","text":"Replace 'worked on' with 'led' in paragraph 2"},{"type":"improve","text":"'Why Us' paragraph needs a specific professor or program detail"}]</INSIGHTS>

<ESSAY>{"school":"Wharton","question":"Describe a time you turned a setback into a launching pad for success.","text":"Essay draft or rewritten text goes here..."}</ESSAY>

<INTERVIEW_RESULT>{"school":"Wharton","rating":7,"feedback":"Confident delivery and a clear, specific leadership story; the why-Wharton answer stayed generic and needs a specific class, club, or professor.","nextSteps":["Name 2-3 specific Wharton resources (clubs, courses, professors) and weave them into your why-school answer","Tighten your career-goals answer to one clear 5-year target instead of three options","Practice the weakness question aloud — current answer sounds rehearsed"]}</INTERVIEW_RESULT>

IMPORTANT: Never display block tag content in the visible chat.`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ADMIN_SECRET) process.env.ADMIN_SECRET = env.ADMIN_SECRET;
  if (env.KV_REST_API_URL) process.env.KV_REST_API_URL = env.KV_REST_API_URL;
  if (env.KV_REST_API_TOKEN) process.env.KV_REST_API_TOKEN = env.KV_REST_API_TOKEN;
  if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;
  if (env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  if (env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
  if (env.GOOGLE_ID) process.env.GOOGLE_ID = env.GOOGLE_ID;
  if (env.GOOGLE_SECRET) process.env.GOOGLE_SECRET = env.GOOGLE_SECRET;
  if (env.AUTH_GOOGLE_ID) process.env.AUTH_GOOGLE_ID = env.AUTH_GOOGLE_ID;
  if (env.AUTH_GOOGLE_SECRET) process.env.AUTH_GOOGLE_SECRET = env.AUTH_GOOGLE_SECRET;
  if (env.MICROSOFT_CLIENT_ID) process.env.MICROSOFT_CLIENT_ID = env.MICROSOFT_CLIENT_ID;
  if (env.MICROSOFT_CLIENT_SECRET) process.env.MICROSOFT_CLIENT_SECRET = env.MICROSOFT_CLIENT_SECRET;

  return {
    plugins: [
      react(),
      {
        name: 'anthropic-api',
        configureServer(server) {
          server.middlewares.use('/api/register', withApiAdapter(registerHandler));
          server.middlewares.use('/api/login', withApiAdapter(loginHandler));
          server.middlewares.use('/api/session', withApiAdapter(sessionHandler));
          server.middlewares.use('/api/admin-auth', withApiAdapter(adminAuthHandler));
          server.middlewares.use('/api/admin-users', withApiAdapter(adminUsersHandler));
          server.middlewares.use('/api/admin-session', withApiAdapter(adminSessionHandler));
          server.middlewares.use('/api/user-details', withApiAdapter(userDetailsHandler));
          server.middlewares.use('/api/oauth-start', (req, res) => {
            oauthStartHandler(req, res).catch((err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'OAuth start failed' }));
            });
          });
          server.middlewares.use('/api/oauth-callback', (req, res) => {
            oauthCallbackHandler(req, res).catch((err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'OAuth callback failed' }));
            });
          });

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

          // File parse endpoint (PDF + .docx)
          server.middlewares.use('/api/parse-file', withApiAdapter(parseFileHandler));

          server.middlewares.use('/api/download-file', (req, res) => {
            downloadFileHandler(req, res).catch((err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Download failed' }));
            });
          });

          // Contact form email endpoint
          server.middlewares.use('/api/contact', withApiAdapter(contactHandler));

          // Help summary endpoint
          server.middlewares.use('/api/help', withApiAdapter(helpHandler));

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
