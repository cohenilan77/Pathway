// Undergrad Rail v2 — gating.
//
// The rail constrains TOPICS (what may/may not be raised at each phase) and
// posture (build/compressed/salvage). It never scripts dialogue — the Run
// agent is free within these bounds.
const PHASE_RULES = {
  Y10: {
    focus: 'Explore AND filter at the same time. Converge by mid-year.',
    allowed: ['interests', 'subjects', 'activities', 'grades', 'early spike candidates'],
    forbidden: ['specific universities', 'application mechanics', 'personal statement'],
    spikeTarget: 'candidates',
    note: 'COMPRESSED — one year doing two years of work. Do not let exploration drift.',
  },
  Y11: {
    focus: 'Name the spike. Cut the scatter. Go deep.',
    allowed: ['spike naming', 'depth', 'positioning', 'gaps', 'subject direction', 'broad school types'],
    forbidden: ['final school list', 'writing essays'],
    spikeTarget: 'deepening',
  },
  Y12: {
    focus: 'School selection, application quality, recommendations.',
    allowed: ['school list', 'application quality', 'recommendations', 'personal statement REVIEW'],
    forbidden: ['writing the personal statement for them'],
    spikeTarget: 'presentable',
    psRule: 'Review only. Score 1-10 + concrete fixes. NEVER write a full essay.',
  },
};

const MODE_RULES = {
  build:      { posture: 'Full arc. Explore properly, then filter. You have time.', pace: 'patient' },
  compressed: { posture: 'No exploration phase. Rapid audit of what exists, then straight to naming the spike.', pace: 'brisk' },
  salvage:    { posture: 'You CANNOT build a spike in six months. Find the strongest thread that already exists and frame it well. Be honest about the timeline — never promise transformation.', pace: 'urgent, realistic' },
};

export const getGating = state => ({ phase: PHASE_RULES[state.phase], mode: MODE_RULES[state.mode] });
