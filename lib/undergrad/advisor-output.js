const TECHNICAL_SETUP = /hugging\s*face|api\s*token|colab|gpu|pip install|npm install|download (?:the )?dataset|llama|mistral|gpt-?2|100[- ]question/i;
const AI_INTEREST = /\b(ai|artificial intelligence|machine learning|ml|anthropic|ai safety|llms?|large language model)\b/i;
const OVERPROMISE = /(?:gets? you into|guarantees? (?:admission|acceptance)|you will be in range|locked path to|non-negotiable gate)/gi;
const FIXED_CHOICES = /([\s\S]*?)→\s*([\s\S]+)$/;
const TRAILING_PROMPT = /\s+(?:What should we work on next\??|Inquire about your strategy…?)\s*$/i;

function sentences(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
}

export function shortUndergradChat(text, { message = '' } = {}) {
  let clean = String(text || '')
    .replace(/<(?:TASKS|PROGRAMS|PROFILE|SCORES|STRENGTHS|WEAKNESSES)>[\s\S]*$/i, '')
    .replace(OVERPROMISE, 'strengthens your profile for')
    .trim();
  const fixed = FIXED_CHOICES.exec(clean);
  if (fixed) {
    const question = fixed[1].trim();
    const options = fixed[2]
      .replace(TRAILING_PROMPT, '')
      .split('|')
      .map(option => option.replace(TRAILING_PROMPT, '').trim())
      .filter(Boolean);
    if (options.length >= 2) return `${question} → ${options.join(' | ')}`;
  }
  const safe = sentences(clean).filter(sentence => !TECHNICAL_SETUP.test(sentence));
  const question = [...safe].reverse().find(sentence => sentence.includes('?'));
  const insight = safe.find(sentence => !sentence.includes('?'));
  let selected = [insight, question].filter(Boolean).slice(0, 2);
  if (!selected.length && AI_INTEREST.test(`${message} ${text}`)) {
    selected = ['That is a strong direction, and an age-appropriate AI/CS project can strengthen your profile.', 'Should we focus first on academics, testing, or the project?'];
  }
  if (!selected.length) selected = ['I saved your profile.', 'Which academic or activity priority should we work on next?'];
  if (!selected.some(sentence => sentence.includes('?'))) selected.push('What should we work on next?');
  return selected.slice(0, 3).join(' ');
}

export function normalizeUndergradAdvisorOutput(value, context = {}) {
  const raw = value && typeof value === 'object' ? value : { chatMessage: String(value || '') };
  const aiInterest = AI_INTEREST.test(`${context.message || ''} ${raw.chatMessage || ''}`);
  const roadmapUpdates = Array.isArray(raw.roadmapUpdates) ? raw.roadmapUpdates : [];
  const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  if (aiInterest && /project/i.test(`${context.message || ''} ${raw.chatMessage || ''}`)) {
    if (!roadmapUpdates.length) roadmapUpdates.push({ title: 'Build one serious AI/CS activity', description: 'Choose an age-appropriate research-, app-, or competition-style project.', area: 'Activities', section: 'This semester' });
    if (!tasks.length) tasks.push({ title: 'Choose an AI project direction', header: 'Choose AI project', description: 'Choose whether the first proof of concept should be research-style, app-style, or competition-style.', area: 'Activities', priority: 'high', status: 'todo', source: 'advisor' });
  }
  return {
    chatMessage: shortUndergradChat(raw.chatMessage, context),
    roadmapUpdates,
    tasks,
    calendarItems: Array.isArray(raw.calendarItems) ? raw.calendarItems : [],
    consultantAlerts: Array.isArray(raw.consultantAlerts) ? raw.consultantAlerts : [],
  };
}

export { AI_INTEREST, TECHNICAL_SETUP };
