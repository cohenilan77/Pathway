const CATEGORIES = new Set(['MBA', 'Graduate', 'Postgraduate / Doctoral', 'Personal Development']);
export const STRATEGY_STATUSES = new Set(['draft', 'ready_for_confirmation', 'confirmed']);
export const CONFIRMATION_STATUSES = new Set(['unconfirmed', 'revised', 'confirmed']);
export const TRANSITION_TYPES = new Set(['upgrade', 'adjacent', 'pivot']);
export const ARCHETYPES = new Set(['Deepen', 'Accelerate', 'Broaden', 'Sector shift', 'Function shift', 'Synthesis', 'Legitimize', 'Reinvent']);

const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value, max = 50) => Array.isArray(value) ? value.slice(0, max) : [];

export function isNarrativeEligible(candidateState = {}) {
  const category = text(candidateState.profile?.category || candidateState.category, 80);
  return category !== 'Undergraduate' && (CATEGORIES.has(category) || category === '');
}

export function isNarrativeStage(candidateState = {}) {
  const raw = candidateState.stageName || candidateState.journeyStage || candidateState.stage?.name || candidateState.stage?.label;
  if (String(raw || '').toLowerCase() === 'narrative') return true;
  const idx = Number(candidateState.stepIdx);
  return idx === 4 && list(candidateState.chosenSchools).length > 0;
}

export function buildNarrativeEvidenceBundle(state = {}) {
  const profile = isObject(state.profile) ? state.profile : {};
  return {
    profile,
    cvExtraction: state.cvExtraction || profile.cvExtraction || null,
    academicRecord: profile.education || profile.academicRecord || null,
    testing: state.scores || profile.testScores || profile.testingPlan || null,
    workTimeline: profile.workExperience || profile.workTimeline || null,
    achievements: profile.achievements || profile.impact || null,
    leadership: profile.leadership || null,
    internationalExposure: profile.internationalExposure || null,
    community: profile.community || profile.extracurricular || null,
    research: profile.research || profile.projects || profile.publications || null,
    recommenders: profile.recommenders || state.recommenders || [],
    kpis: state.scores || state.kpis || null,
    kpiEvidence: state.scoreDetails || state.insights?.scoreDetails || null,
    programs: state.programs || [],
    chosenSchools: state.chosenSchools || [],
    matching: state.matching || state.insights?.programFit || null,
    priorAnswers: state.narrativeCoaching?.answers || [],
    priorFeedback: state.strategy?.candidateFeedback || state.narrativeCoaching?.strategy?.candidateFeedback || [],
    targetDegree: profile.degree || profile.programType || null,
    intake: profile.intake || state.preferences?.intake || null,
    geography: profile.targetGeography || profile.destination || profile.countries || null,
  };
}

function requiredString(value, field, errors) {
  const result = text(value);
  if (!result) errors.push(field);
  return result;
}

export function validateStrategy(input, { allowDraft = true } = {}) {
  if (!isObject(input)) return { valid: false, errors: ['strategy'], strategy: null };
  const errors = [];
  const status = STRATEGY_STATUSES.has(input.status) ? input.status : 'draft';
  const confirmationStatus = CONFIRMATION_STATUSES.has(input.confirmationStatus) ? input.confirmationStatus : 'unconfirmed';
  const goals = isObject(input.goals) ? input.goals : {};
  const educationLogic = isObject(input.educationLogic) ? input.educationLogic : {};
  const transition = isObject(input.transition) ? input.transition : {};
  const strategy = {
    ...input,
    version: Math.max(1, Number(input.version) || 1),
    status,
    confirmationStatus,
    goals: { ...goals },
    educationLogic: { ...educationLogic },
    transition: {
      ...transition,
      type: TRANSITION_TYPES.has(transition.type) ? transition.type : null,
      archetype: ARCHETYPES.has(transition.archetype) ? transition.archetype : null,
      distanceScore: Math.max(0, Math.min(3, Number(transition.distanceScore) || 0)),
    },
    proofInventory: list(input.proofInventory),
    riskRegister: list(input.riskRegister),
    alternatives: list(input.alternatives, 5),
    schoolStrategyCards: list(input.schoolStrategyCards, 20),
    recommenderStrategy: list(input.recommenderStrategy, 20),
    candidateFeedback: list(input.candidateFeedback, 20),
    revisionHistory: list(input.revisionHistory, 20),
    reasoningTrace: list(input.reasoningTrace, 12).map(item => text(item, 800)).filter(Boolean),
  };
  if (!allowDraft || status !== 'draft') {
    requiredString(strategy.goals.shortTerm, 'goals.shortTerm', errors);
    if (!text(strategy.goals.longTerm) && !text(strategy.goals.intendedImpact)) errors.push('goals.longTerm|intendedImpact');
    requiredString(strategy.educationLogic.whyDegree, 'educationLogic.whyDegree', errors);
    requiredString(strategy.educationLogic.whyNow, 'educationLogic.whyNow', errors);
    if (!strategy.transition.type) errors.push('transition.type');
    requiredString(strategy.admissionsProposition, 'admissionsProposition', errors);
    if (!strategy.proofInventory.length) errors.push('proofInventory');
    requiredString(strategy.memoryTag, 'memoryTag', errors);
  }
  return { valid: errors.length === 0, errors, strategy };
}

export function canUnlockEssayStage(strategy) {
  const checked = validateStrategy(strategy, { allowDraft: false });
  return checked.valid && checked.strategy.status === 'confirmed' && checked.strategy.confirmationStatus === 'confirmed';
}

export function isSubstantiveConfirmation(message = '') {
  const clean = text(message, 800);
  if (clean.length < 12) return false;
  if (/^(yes|yes please|ok|okay|sure|looks good|sounds good|i agree|confirm)[.! ]*$/i.test(clean)) return false;
  return /\b(feels? true|accurate|because|captures?|reflects?|confirm|this is me|nothing missing)\b/i.test(clean);
}

export function legacyNarrativeText(strategy) {
  return text(strategy?.admissionsProposition || strategy?.recommendedStrategy?.thesis || strategy?.paperStory, 800);
}

export function shouldStartNarrativeStrategy(state = {}) {
  if (!isNarrativeEligible(state) || !isNarrativeStage(state)) return false;
  const strategy = state.strategy || state.narrativeCoaching?.strategy;
  if (canUnlockEssayStage(strategy)) return false;
  const hasProfile = isObject(state.profile) && Object.keys(state.profile).length > 1;
  return hasProfile && (!!state.scores || !!state.profile?.workExperience || !!state.profile?.education);
}
