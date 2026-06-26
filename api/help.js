import { createAnthropicClient } from '../lib/anthropic-client.js';
import { getUserIdByToken } from '../lib/db.js';
import { recordUsage } from '../lib/usage.js';
const MODEL = 'claude-haiku-4-5-20251001';

async function resolveUserId(req) {
  try {
    const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
    if (!match) return 'anonymous';
    return (await getUserIdByToken(match[1])) || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

const PLATFORM_FACTS = `
PIPELINE STEPS (in order, tracked by the stepper at the top of the Admissions Advisor chat):
1. Profile — share your CV, a background dump, or answer guided questions about your GPA, test score, work experience, and goals. Goal: build an accurate picture of your candidacy.
2. Recommender — name the people who will write your recommendation letters. Goal: confirm strong, relevant references are lined up.
3. Analysis — the AI scores your candidacy (academic, professional, leadership, narrative, potential) against real program benchmarks. Goal: get an honest, calibrated read on where you stand.
4. Programs — the AI recommends schools grouped by candidate fit (Challenging Fit / Good Fit / Strong Fit) with separate selectivity badges, or evaluates schools you already have in mind. Goal: build a realistic, balanced target list.
5. Narrative — answer a few questions about your motivations and story, then choose an "Upgrade" or "Pivot" framing. Goal: lock in the core story that ties your whole application together.
6. Fit — review each target school's candidate-fit percentage separately from program selectivity. Goal: understand where your profile aligns and where to focus effort.
7. CV — get your resume bullets rewritten with strong action verbs and quantified outcomes, tailored to your narrative. Goal: make your CV reinforce your story.

PORTAL TABS (left sidebar):
- Admissions Advisor — the main chat where you move through the pipeline steps above.
- Analysis — your scores, strengths/weaknesses, and recommended schools with fit percentages.
- Narrative Strategy — where you pick Upgrade vs Pivot and see your core narrative, theme, and essay opener.
- Documents — paste or upload your CV and essays for AI rewriting and feedback.
- Settings — session controls, like starting a new session.
`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = createAnthropicClient();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: 'You are a concise product guide for the Pathway admissions platform. Using ONLY the facts given, produce a short summary the user can scan in seconds. For each pipeline step and each tab, give one short line in the format "Name — what to do; goal: why it matters." Use plain text only — no markdown, no asterisks, no bold. Use a dash for bullets. Group into two sections with plain text headers: "YOUR 7-STEP PROCESS" and "PORTAL TABS".',
      messages: [{ role: 'user', content: PLATFORM_FACTS }],
    });

    const userId = await resolveUserId(req);
    recordUsage({
      userId,
      conversationId: 'session',
      feature: 'help_guide',
      model: MODEL,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    }).catch((e) => console.error('Failed to record usage:', e));

    const text = response.content[0]?.text || '';
    return res.status(200).json({ text });
  } catch (error) {
    console.error('Help endpoint error:', error);
    return res.status(500).json({ error: 'Failed to generate help summary' });
  }
}
