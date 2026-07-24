// Undergrad Rail v2 — REVIEWER (Y12 only, not conversational).
//
// Fires ONLY when a personal statement is uploaded in Y12. It REVIEWS. It
// never writes a replacement essay — the undergrad reviews the personal
// statement, the tool never authors it.
const MODEL = process.env.UNDERGRAD_MODEL || 'claude-sonnet-4-6';

export async function reviewPersonalStatement(state, psText, anthropic) {
  if (state.phase !== 'Y12') throw new Error('PS review is Y12 only');

  const res = await anthropic.messages.create({
    model: MODEL, max_tokens: 1200,
    messages: [{ role: 'user', content: `
Review this personal statement. DO NOT rewrite it. DO NOT write a replacement.

Student's spike: ${state.spike.named || 'not yet named'}
Evidence we know about: ${state.spike.evidence.slice(-5).join(' · ')}

STATEMENT:
${psText}

Return:
- SCORE: X/10
- WHAT WORKS: 2-3 bullets, specific
- WHAT'S WEAK: 2-3 bullets, specific, quote the line
- DOES IT SHOW THE SPIKE? yes/no + one line
- 3 CONCRETE FIXES: each one sentence, actionable

Short bullets. No fluff. Never produce replacement prose longer than a single example phrase.
` }],
  });

  return res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
}
