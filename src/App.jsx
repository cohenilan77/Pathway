import React, { useState, useCallback, useRef, useEffect } from 'react';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Landing from './components/Landing.jsx';
import LegalPage from './components/LegalPage.jsx';
import CandidatePortal from './components/candidate/CandidatePortal.jsx';
import AdminPortal from './components/admin/AdminPortal.jsx';
import ContactModal from './components/ContactModal.jsx';
import { LANGUAGES } from './constants.js';
import { normalizeProgramList } from '../lib/program-normalizer.js';
import { N1_QUESTION } from '../lib/selection-continuity.js';
import { buildProfileSourceBundle } from '../lib/profile-source-bundle.js';
import { calculateCandidateOverall } from '../lib/candidate-kpi-schemas.js';
import { OPENING_PATH_OPTIONS, resolveOpeningPathChoice } from '../lib/onboarding.js';
import {
  needsGraduateDegree,
  resolveGraduateDegreeChoice,
  GRADUATE_DEGREE_PROMPT,
  GRADUATE_DEGREE_OTHER_PROMPT,
  computeStageAdvancement,
  explainIfTooEarly,
} from '../lib/candidate-stage-flow.js';
import { processUndergradInput, runScheduledNagger } from '../lib/undergrad/engine.js';
import { normalizeUndergradAdvisorOutput } from '../lib/undergrad/advisor-output.js';
import { ensureUndergradState, completeTask } from '../lib/undergrad/store.js';
import { syncRoadmap } from '../lib/undergrad/agents/roadmap-agent.js';
import { isSchoolListRequest } from '../lib/candidate-facts.js';
import { gateProgramReadyReply } from '../lib/program-ready-gate.js';
import { buildReturningCandidateMessage } from '../lib/returning-candidate.js';
import { normalizeUndergradProfile, normalizeUndergradPrograms } from '../lib/undergrad-profile.js';
import { upcomingTestDatesPromptLine } from './lib/testDates.js';
import { DEFAULT_STEPS as STEPS, UNDERGRAD_STEPS, TRACK_CONFIG, getTrackConfig, resolveTrack } from './trackConfig.js';
export { STEPS, UNDERGRAD_STEPS, TRACK_CONFIG };

export const PLANS = {
  free: { label: 'Free' },
  ai: { label: 'AI' },
  ai_strategy: { label: 'AI + Strategy' },
};

const PLAN_UPGRADE_MESSAGE = "You've reached the end of the Free plan. Please upgrade in Settings to continue with AI guidance, or choose AI + Strategy to add Live Chat with your consultant.";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const PROGRAM_LIST_RECOVERY = /\b(?:show(?: me)? (?:the )?(?:programs?|school list|university list|list)|where (?:is|are) (?:the )?(?:programs?|school list|university list|list)|i (?:do not|don't|cannot|can't) see (?:the )?(?:programs?|schools?|list|matches))\b/i;

const WELCOME_MESSAGE = {
  English: "Welcome — I’m glad you’re here. We’ll take this one clear step at a time.",
  Spanish: "Bienvenido — me alegra que estés aquí. Avanzaremos paso a paso, con claridad.",
  Hebrew: "ברוכים הבאים — שמח שאתם כאן. נתקדם יחד, צעד ברור בכל פעם.",
  Arabic: "مرحبًا — يسعدني أنك هنا. سنتقدم معًا بخطوة واضحة في كل مرة.",
  Chinese: "欢迎你——很高兴你来到这里。我们会一步一步，清晰地向前推进。",
  French: "Bienvenue — je suis ravi de vous accueillir. Nous avancerons clairement, une étape à la fois.",
  Portuguese: "Bem-vindo — fico feliz que esteja aqui. Vamos avançar com clareza, um passo de cada vez.",
};

const PATH_QUESTION = {
  English: 'Which path best describes you?',
  Spanish: '¿Qué camino te describe mejor?',
  Hebrew: 'איזה מסלול מתאר אתכם בצורה הטובה ביותר?',
  Arabic: 'أي مسار يصفك بشكل أفضل؟',
  Chinese: '哪条路径最符合你的情况？',
  French: 'Quel parcours vous correspond le mieux ?',
  Portuguese: 'Qual caminho descreve melhor você?',
};

function buildInitialChat(language) {
  const options = OPENING_PATH_OPTIONS.join(' | ');
  return [
    { role: 'ai', channel: 'web', text: WELCOME_MESSAGE[language] || WELCOME_MESSAGE.English },
    { role: 'ai', channel: 'web', text: `${PATH_QUESTION[language] || PATH_QUESTION.English} → ${options}` },
  ];
}

const INITIAL_CHAT = buildInitialChat('English');
const DATA_BLOCK_TAGS = 'PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT|TASKS';

// Candidates created through the current opening flow always carry one of these
// categories. Anything else (or a missing category) is a legacy/unknown profile
// for which the modern stage-order guardrails do not apply.
const MODERN_CANDIDATE_CATEGORIES = new Set(['Undergraduate', 'Graduate', 'Postgraduate / Doctoral', 'Personal Development']);
function isLegacyCandidateCategory(profile) {
  return !MODERN_CANDIDATE_CATEGORIES.has(String(profile?.category || '').trim());
}

// Stage context for AI engagement
function buildStageContext(stepIdx, profile, scores, programs, essays, tasks, strengths, lastChatTime, weaknesses) {
  const category = profile?.category;
  const isUndergrad = category === 'Undergraduate';
  const steps = isUndergrad ? UNDERGRAD_STEPS : STEPS;
  const currentStep = steps[Math.min(stepIdx, steps.length - 1)] || 'Profile';

  const daysInStage = lastChatTime ? Math.floor((Date.now() - lastChatTime) / (1000 * 60 * 60 * 24)) : 0;

  // Find the weakest scoring dimension for adaptive guidance
  const scoreWeights = getTrackConfig(profile).scoreWeights || {};
  const lowestScoreKey = scores
    ? Object.entries(scoreWeights)
        .map(([k]) => ({ key: k, val: scores[k] ?? 100 }))
        .filter(({ val }) => typeof val === 'number')
        .sort((a, b) => a.val - b.val)[0]?.key || null
    : null;

  return {
    stepIdx,
    stageName: currentStep,
    totalSteps: steps.length,
    isUndergrad,
    grade: profile?.grade,
    intendedMajor: profile?.intendedMajor || profile?.major || profile?.subjects || '',
    destination: profile?.destination || profile?.countries || '',
    daysInStage,

    // Completion tracking
    hasProfile: !!profile?.category,
    hasScores: !!scores?.overall,
    hasActivities: Array.isArray(strengths) && strengths.length > 0,
    hasUniversities: Array.isArray(programs) && programs.length > 0,
    hasTestingScore: !!scores?.testScore && scores.testScore > 0,
    hasEssays: Object.keys(essays || {}).length > 0,
    hasTasks: Array.isArray(tasks) && tasks.length > 0,

    // Actual content for adaptive questioning
    topTask: Array.isArray(tasks) && tasks.length > 0 ? tasks[0] : null,
    topWeakness: Array.isArray(weaknesses) && weaknesses.length > 0 ? weaknesses[0] : null,
    lowestScoreKey,
    scoreWeights,
    scores: scores || null,
    kpis: getTrackConfig(profile).kpis || [],
    overallScore: scores?.overall ?? null,
    pathwayType: profile?.pathwayType || null,

    // Stage-specific insights
    nextStageName: stepIdx + 1 < steps.length ? steps[stepIdx + 1] : 'Complete',
    shouldNudgeToNextStage: daysInStage > 60 || stepIdx === 3,
  };
}

// Stage progression is enforced by lib/candidate-stage-flow.js
// (computeStageAdvancement), which keeps the required order and prevents a later
// stage from starting before its prerequisite.

// Build AI system context based on student stage for better guidance
function buildAISystemContext(stage) {
  const { isUndergrad, daysInStage, shouldNudgeToNextStage } = stage;

  let systemContext = `You are an admissions advisor guiding a student through their journey.

CURRENT STAGE: "${stage.stageName}" (Step ${stage.stepIdx + 1} of ${stage.totalSteps})
TRACK: ${isUndergrad ? 'Undergraduate' : 'Graduate/Professional'}
DATA: Profile ${stage.hasProfile ? '✓' : '✗'} · Scores ${stage.hasScores ? '✓' : '✗'} · Activities ${stage.hasActivities ? '✓' : '✗'} · Universities ${stage.hasUniversities ? '✓' : '✗'} · Testing ${stage.hasTestingScore ? '✓' : '✗'} · Essays ${stage.hasEssays ? '✓' : '✗'}`;

  if (isUndergrad) {
    systemContext += `

MANDATORY RESPONSE RULES (no exceptions):
1. Max 1-2 sentences. No paragraphs.
2. No hyphens or dashes anywhere.
3. Every message ends with → Option1 | Option2 | Option3 | Other
4. Never echo or confirm what the student said. Move forward.`;

    const gradeStr = stage.grade ? `Grade ${stage.grade}` : 'this student';
    const majorStr = stage.intendedMajor ? `(interested in ${stage.intendedMajor})` : '';
    const pathwayType = stage.pathwayType;
    const pathwayLabel = pathwayType === 'focused' ? 'focused' : pathwayType === 'exploring' ? 'still exploring' : pathwayType === 'partial' ? 'partially decided' : null;

    if (stage.grade) {
      systemContext += `

STUDENT: ${gradeStr}${pathwayLabel ? ` · Pathway: ${pathwayLabel}` : ''}${stage.intendedMajor ? ` · Interested in: ${stage.intendedMajor}` : ''}${stage.destination ? ` · Destination: ${stage.destination}` : ''}`;
    }

    if (stage.hasProfile && stage.hasScores && stage.hasUniversities) {
      // Post-snapshot: derive next question from pathway type + top task / lowest score
      if (pathwayType === 'exploring' || pathwayType === null) {
        if (!stage.hasTestingScore) {
          systemContext += `

NEXT FOCUS: Student is still exploring their direction. Ask about a subject or activity they enjoyed most recently to help uncover their interests. Keep it discovery-focused, not pressure-filled. Options should be specific subjects, clubs, or experiences, not generic.`;
        } else if (stage.topWeakness) {
          systemContext += `

NEXT FOCUS: Student is exploring. Address this gap: "${stage.topWeakness}". Ask ONE question to help them discover something new or deepen an interest. Options must be concrete activities or experiences.`;
        } else if (stage.topTask) {
          systemContext += `

NEXT FOCUS: Help exploring student with this task: "${stage.topTask}". Frame as an opportunity to discover, not a deadline. Options must be specific to that task.`;
        }
      } else if (pathwayType === 'focused') {
        if (!stage.hasTestingScore) {
          systemContext += `

NEXT FOCUS: Student is focused on ${stage.intendedMajor || 'their intended field'}. They have no SAT/ACT score yet. Ask about their testing plan. ${upcomingTestDatesPromptLine()} Use only these future dates as chip options — never a date that has already passed.`;
        } else if (stage.topWeakness) {
          systemContext += `

NEXT FOCUS: Focused student. Address this specific weakness: "${stage.topWeakness}". Ask ONE concrete question to close this gap. Options must be actionable steps in their intended field, not generic.`;
        } else if (stage.topTask) {
          systemContext += `

NEXT FOCUS: Help focused student with: "${stage.topTask}". Ask ONE specific question. Options must be field-specific actions tied to ${stage.intendedMajor || 'their focus area'}.`;
        } else if (shouldNudgeToNextStage) {
          systemContext += `

NEXT FOCUS: Student has been here ${daysInStage} days. Ask about their next concrete step in ${stage.intendedMajor || 'their field'} with specific competition, project, or activity options.`;
        }
      } else if (pathwayType === 'partial') {
        if (stage.topTask) {
          systemContext += `

NEXT FOCUS: Student is partially decided ${majorStr}. Help them commit by asking about one of their top interests: "${stage.topTask}". Options should help them choose between their two or three possible directions.`;
        } else if (!stage.hasTestingScore) {
          systemContext += `

NEXT FOCUS: Partially-decided student. Ask about testing plans. ${upcomingTestDatesPromptLine()} Offer upcoming dates from both tests — use only future dates, never past ones.`;
        }
      }
    } else if (stage.hasProfile && !stage.hasScores) {
      systemContext += `

NEXT FOCUS: Still collecting profile. Continue onboarding questions. Ask about the next missing piece: ${!stage.hasActivities ? 'activities and extracurriculars' : !stage.hasTestingScore ? `testing plans — ${upcomingTestDatesPromptLine()} Use only these future dates, never past ones` : 'goals and university preferences'}.`;
    }
  } else if (stage.hasProfile && stage.hasScores) {
    // Graduate, MBA, Postgraduate/Doctoral, Personal Development: probe every
    // KPI dimension that is missing or sitting at a low, unconfirmed score.
    // Each track has its own kpis list (trackConfig.js), so the labels and
    // descriptions below always match the dimensions actually in play —
    // never a hardcoded MBA-specific name.
    const kpiLookup = new Map((stage.kpis || []).map(([key, label, description]) => [key, { label, description }]));
    const missingGaps = [];
    const lowGaps = [];
    for (const key of Object.keys(stage.scoreWeights || {})) {
      const info = kpiLookup.get(key);
      if (!info) continue;
      const value = stage.scores ? stage.scores[key] : undefined;
      if (value === undefined || value === null) {
        missingGaps.push({ key, ...info });
      } else if (typeof value === 'number' && value <= 50) {
        lowGaps.push({ key, ...info, value });
      }
    }
    if (missingGaps.length || lowGaps.length) {
      // Missing data blocks scoring outright, so it always wins the turn's
      // focus over a low-but-present score. lowestScoreKey (already computed
      // in buildStageContext) breaks ties within whichever tier has entries.
      const isMissing = missingGaps.length > 0;
      const pool = isMissing ? missingGaps : lowGaps;
      const focusGap = pool.find(g => g.key === stage.lowestScoreKey) || pool[0];
      const remaining = [...missingGaps, ...lowGaps].filter(g => g.key !== focusGap.key).map(g => g.label);

      systemContext += isMissing
        ? `

NEXT FOCUS: The "${focusGap.label}" dimension (${focusGap.description}) has no score yet. Ask ONE direct, specific question to fill this gap before moving on.`
        : `

NEXT FOCUS: The "${focusGap.label}" dimension (${focusGap.description}) is currently scored at ${focusGap.value}/100. Explicitly confirm this with the candidate — surface the current value and ask them to confirm or correct it — rather than accepting it silently.`;

      if (remaining.length) {
        systemContext += ` Other dimensions still needing a missing-data question or score confirmation (address these on later turns, one at a time): ${remaining.join(', ')}.`;
      }
    }
  }

  return systemContext;
}

function sanitizeVisibleText(text) {
  return String(text || '')
    .replace(new RegExp(`<(${DATA_BLOCK_TAGS})>[\\s\\S]*?<\\/\\1>`, 'gi'), '')
    .replace(/<(thinking|analysis|reasoning|scratchpad|internal|hidden)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/```(?:json)?[\s\S]*?```/gi, '')
    .replace(/<\/?(thinking|analysis|reasoning|scratchpad|internal|hidden)[^>]*>/gi, '')
    .replace(/<\/?(?:tool_use|tool_code|function_calls|invoke)[^>]*>/gi, '')
    .replace(/^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseBlocks(raw) {
  const extract = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!m) return null;
    let body = m[1].trim();
    // Strip markdown code fences the model sometimes wraps blocks in (```json ... ```)
    body = body.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(body); } catch { /* fall through */ }
    // Last resort: grab the outermost {...} or [...] in case of stray leading/trailing text
    const arrMatch = body.match(/\[[\s\S]*\]/);
    const objMatch = body.match(/\{[\s\S]*\}/);
    const candidate = arrMatch?.[0] || objMatch?.[0];
    if (candidate) {
      try { return JSON.parse(candidate); } catch { return null; }
    }
    return null;
  };
  const clean = sanitizeVisibleText(raw);
  return {
    clean,
    profile: extract('PROFILE'),
    scores: extract('SCORES'),
    strengths: extract('STRENGTHS'),
    weaknesses: extract('WEAKNESSES'),
    programs: normalizeProgramList(extract('PROGRAMS')),
    chosenSchools: extract('CHOSEN_SCHOOLS'),
    insights: extract('INSIGHTS'),
    essay: extract('ESSAY'),
    interviewResult: extract('INTERVIEW_RESULT'),
    tasks: extract('TASKS'),
  };
}

function safeVisibleReply(raw, parsed, currentProfile) {
  const clean = sanitizeVisibleText(parsed.clean || '');
  const category = parsed.profile?.category || currentProfile?.category;
  const isUndergrad = category === 'Undergraduate';
  if (parsed.profile && parsed.scores && parsed.programs) {
    if (isUndergrad) {
      return clean || 'Your university matches are ready — check the University List tab to see your Reach, Target, and Likely schools.';
    }
    // Prefer the AI's actual text (which should now include a follow-up question)
    return clean || 'Your analysis is live in the Analysis tab — head there to see your scores and school matches.';
  }
  if (clean) return clean;
  if (parsed.programs) {
    return isUndergrad
      ? 'Your university matches are live in the University List tab.'
      : 'Your portfolio is live in the Analysis tab.';
  }
  // Never leave the candidate at a dead end after picking schools: if the model
  // sent no visible question with the CHOSEN_SCHOOLS block, hand them the next move.
  if (parsed.chosenSchools) return 'Your target schools are locked in. Type "next" and we\'ll start shaping your narrative.';
  if (parsed.essay) return 'Your essay draft is saved in Documents.';
  if (parsed.interviewResult) return 'Your interview results are saved.';
  if (parsed.scores || parsed.profile) {
    return isUndergrad
      ? 'Your profile is updated in the Advisor.'
      : 'Your profile analysis is live in the Analysis tab.';
  }
  return sanitizeVisibleText(raw) || 'Done — I updated your workspace.';
}

function loadAuth() {
  try {
    const s = localStorage.getItem('pathway_auth');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function loadAiConfig() {
  try {
    const s = localStorage.getItem('pathway_ai_config');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function loadPlan() {
  try {
    const s = localStorage.getItem('pathway_plan');
    if (s === 'aiStrategist') return 'ai_strategy';
    if (s === 'pathwayAI') return 'ai';
    return s && PLANS[s] ? s : 'free';
  } catch { return 'free'; }
}

function loadLanguage() {
  try {
    const s = localStorage.getItem('pathway_language');
    return s && LANGUAGES.includes(s) ? s : 'English';
  } catch { return 'English'; }
}

function createSessionId() {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `session_${randomPart}`;
}

function weightedOverallScore(scores, profile) {
  return calculateCandidateOverall(scores, profile);
}

function safeDocBaseName(value, fallback) {
  const raw = String(value || '').trim() || fallback;
  return raw
    .replace(/^\s*#+\s*/, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || fallback;
}

function titleFromText(text, fallback) {
  const firstLine = String(text || '').split('\n').map(line => line.trim()).find(Boolean);
  if (!firstLine) return fallback;
  return safeDocBaseName(firstLine.replace(/[:\-–—]\s*$/, ''), fallback);
}

function uniqueDocumentName(existingDocs, desiredName, currentId = null) {
  const names = new Set((existingDocs || []).filter(doc => doc.id !== currentId).map(doc => doc.name));
  if (!names.has(desiredName)) return desiredName;
  let index = 1;
  let next = `${desiredName} (${index})`;
  while (names.has(next)) {
    index += 1;
    next = `${desiredName} (${index})`;
  }
  return next;
}

export default function App() {
  const [auth, setAuthState] = useState(loadAuth); // {token, user} | null

  const [screen, setScreen] = useState(() => {
    const saved = loadAuth();
    if (!saved) return 'landing';
    return ['admin', 'consultant'].includes(saved.user?.role) ? 'admin' : 'candidate';
  });
  const [role, setRole] = useState('candidate');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [candTab, setCandTab] = useState('advisor');
  const [docTab, setDocTab] = useState('editor');
  const [adminTab, setAdminTab] = useState('feed');
  const [sel, setSel] = useState(0);
  const [narrative, setNarrative] = useState(null);
  const [toast, setToast] = useState('');
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [sessionId, setSessionId] = useState(createSessionId);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState(null);
  const [strengths, setStrengths] = useState(null);
  const [weaknesses, setWeaknesses] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [completedTasks, setCompletedTasks] = useState({});
  const [programs, setPrograms] = useState(null);
  const [chosenSchools, setChosenSchools] = useState(null);
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [essayText, setEssayText] = useState('');
  const [essaySchool, setEssaySchool] = useState('');
  const [essayQuestion, setEssayQuestion] = useState('');
  const [essays, setEssays] = useState({});
  const [documents, setDocuments] = useState([]);
  const [interviews, setInterviews] = useState({});
  const [insights, setInsights] = useState(null);
  // Undergrad Candidate-Building Engine state (roadmap/tasks/calendar/reminders/
  // alerts/progress/notes/log). Undergraduate candidates only.
  const [undergrad, setUndergrad] = useState(null);
  const [override, setOverride] = useState(0);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [cvDraft, setCvDraft] = useState('');
  const [cvFileTextDraft, setCvFileTextDraft] = useState('');
  const [cvFileDraft, setCvFileDraft] = useState(null);
  const [cvExtra, setCvExtra] = useState('');
  const [aiConfig, setAiConfigState] = useState(loadAiConfig);
  const [plan, setPlanState] = useState(loadPlan);
  const [language, setLanguageState] = useState(loadLanguage);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [adminSecret, setAdminSecret] = useState(() => sessionStorage.getItem('pathway_admin_secret') || '');
  const toastTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  const setAiConfig = useCallback((next) => {
    setAiConfigState(next);
    if (next && Object.keys(next).length) {
      localStorage.setItem('pathway_ai_config', JSON.stringify(next));
    } else {
      localStorage.removeItem('pathway_ai_config');
    }
  }, []);

  const setAuth = useCallback((next) => {
    setAuthState(next);
    if (next) localStorage.setItem('pathway_auth', JSON.stringify(next));
    else localStorage.removeItem('pathway_auth');
  }, []);

  const setPlan = useCallback((next) => {
    const normalized = next === 'aiStrategist'
      ? 'ai_strategy'
      : next === 'pathwayAI'
        ? 'ai'
        : (next === 'ai' || next === 'ai_strategy' ? next : 'free');
    setPlanState(normalized);
    localStorage.setItem('pathway_plan', normalized);
    if (auth?.token) {
      fetch('/api/user-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ plan: normalized }),
      })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (ok && data.user) setAuth({ token: auth.token, user: data.user });
        })
        .catch(() => {});
    }
  }, [auth?.token, setAuth]);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    localStorage.setItem('pathway_language', next);
    setChat(buildInitialChat(next));
  }, []);

  // Pick up the session token (or error) handed back by /api/oauth-callback after
  // a Google/Outlook sign-in redirect, then strip it from the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    const oauthError = params.get('oauth_error');
    if (!oauthToken && !oauthError) return;
    if (oauthToken) { setAuth({ token: oauthToken, user: null }); setScreen('candidate'); }
    if (oauthError) setToast(oauthError);
    params.delete('oauth_token');
    params.delete('oauth_error');
    const rest = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
  }, [setAuth]);

  // Hydrate the candidate's session from the server whenever we have a token
  // (on initial load with a remembered token, and right after login/register).
  useEffect(() => {
    if (!auth?.token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/session', { headers: { Authorization: `Bearer ${auth.token}` } });
        if (!res.ok) throw new Error('unauthorized');
        const { data, user } = await res.json();
        if (cancelled) return;
        if (user) {
          setAuth({ token: auth.token, user });
          setPlanState(user.plan || 'free');
          localStorage.setItem('pathway_plan', user.plan || 'free');
        }
        if (user?.role === 'admin' || user?.role === 'consultant') {
          setScreen('admin');
          return;
        }
        const loadedChat = data?.chat?.length ? data.chat : INITIAL_CHAT;
        const loadedStepIdx = data?.stepIdx || 0;
        const rawLoadedProfile = data?.profile || null;
        const loadedProfile = rawLoadedProfile?.category === 'Undergraduate' ? normalizeUndergradProfile(rawLoadedProfile) : rawLoadedProfile;
        const loadedScores = data?.scores || null;
        const loadedPrograms = normalizeProgramList(data?.programs) || null;
        const loadedStrengths = data?.strengths || null;
        const loadedEssays = data?.essays || {};

        const returnWelcomeKey = `pathway_return_welcome_${user?.id || data?.sessionId || 'candidate'}`;
        const returnMessage = sessionStorage.getItem(returnWelcomeKey) ? null : buildReturningCandidateMessage({
          user,
          profile: loadedProfile,
          scores: loadedScores,
          programs: loadedPrograms,
          chosenSchools: data?.chosenSchools,
          narrative: data?.narrative,
          cvText: data?.cvText,
          essays: loadedEssays,
          interviews: data?.interviews,
          chat: loadedChat,
        });
        setChat(returnMessage ? [...loadedChat, { role: 'ai', channel: 'web', text: returnMessage }] : loadedChat);
        if (returnMessage) sessionStorage.setItem(returnWelcomeKey, '1');
        setSessionId(data?.sessionId || createSessionId());
        setStepIdx(loadedStepIdx);
        setProfile(loadedProfile);
        setScores(loadedScores);
        setStrengths(loadedStrengths);
        setWeaknesses(data?.weaknesses || null);
        setTasks(data?.tasks || null);
        setCompletedTasks(data?.completedTasks || {});
        setPrograms(loadedPrograms);
        setChosenSchools(data?.chosenSchools || null);
        setCvText(data?.cvText || '');
        setCvFile(data?.cvFile || null);
        setEssayText(data?.essayText || '');
        setEssaySchool(data?.essaySchool || '');
        setEssayQuestion(data?.essayQuestion || '');
        setEssays(loadedEssays);
        setDocuments(data?.documents || []);
        setInterviews(data?.interviews || {});
        setInsights(data?.insights || null);
        setNarrative(data?.narrative || null);
        const isUndergrad = loadedProfile?.category === 'Undergraduate';
        const loadedUndergrad = data?.undergrad || null;
        setUndergrad(isUndergrad && loadedUndergrad
          ? runScheduledNagger(loadedUndergrad, { candidateId: user?.id, candidateName: user?.name, now: Date.now() }).state
          : loadedUndergrad);
        setOverride(data?.override ?? data?.scores?.overall ?? 0);

      } catch {
        if (!cancelled) { setAuth(null); setScreen('login'); }
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.token, setAuth]);

  // First-time candidates must confirm details only on their first login
  // For OAuth users: force Settings if they don't have firstLoginSetupComplete (false means not yet confirmed)
  // For password users and existing users: no forced Settings
  const requiresOAuthDetails = auth?.user?.oauthProvider && auth?.user?.firstLoginSetupComplete === false;

  useEffect(() => {
    if (screen === 'candidate' && requiresOAuthDetails) setCandTab('settings');
  }, [screen, requiresOAuthDetails]);

  // Keep server-side online state accurate. If the tab closes without a formal
  // logout, the two-minute activity window expires and offline routing resumes.
  useEffect(() => {
    if (screen !== 'candidate' || !auth?.token) return undefined;
    const heartbeat = () => fetch('/api/activity', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    }).catch(() => {});
    heartbeat();
    const interval = setInterval(heartbeat, 60_000);
    return () => clearInterval(interval);
  }, [screen, auth?.token]);

  // Candidate-specific navigation telemetry powers the admin activity trace.
  // It records meaningful tab changes only; the regular online heartbeat stays quiet.
  useEffect(() => {
    if (screen !== 'candidate' || !auth?.token || !candTab) return;
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ event: 'navigation', tab: candTab }),
    }).catch(() => {});
  }, [screen, auth?.token, candTab]);

  // Persist the candidate's session to their account, debounced
  useEffect(() => {
    if (!auth?.token || chat.length <= 1) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          data: { sessionId, chat, stepIdx, profile, scores, strengths, weaknesses, tasks, completedTasks, programs: normalizeProgramList(programs) || programs, chosenSchools, cvText, cvFile, essayText, essaySchool, essayQuestion, essays, documents, interviews, insights, narrative, undergrad, override },
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [auth?.token, sessionId, chat, stepIdx, profile, scores, strengths, weaknesses, tasks, completedTasks, programs, chosenSchools, cvText, cvFile, essayText, essaySchool, essayQuestion, essays, documents, interviews, insights, narrative, undergrad, override]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const saveDocument = useCallback((doc) => {
    let savedDoc;
    setDocuments(prev => {
      const existingIndex = doc.id ? prev.findIndex(item => item.id === doc.id) : -1;
      const existing = existingIndex >= 0 ? prev[existingIndex] : null;
      const baseName = safeDocBaseName(doc.name, `${doc.type || 'Document'} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      const name = existing ? existing.name : uniqueDocumentName(prev, baseName);
      savedDoc = {
        ...(existing || {}),
        id: existing?.id || doc.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        type: doc.type || existing?.type || 'other',
        source: doc.source || existing?.source || 'Simulation',
        status: doc.status || existing?.status || 'Ready',
        text: doc.text ?? existing?.text ?? '',
        file: doc.file ?? existing?.file ?? null,
        linkedSchool: doc.linkedSchool ?? existing?.linkedSchool ?? '',
        linkedWorkflow: doc.linkedWorkflow ?? existing?.linkedWorkflow ?? '',
        version: (existing?.version || 0) + 1,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = savedDoc;
        return next;
      }
      return [savedDoc, ...prev];
    });
    showToast(`${savedDoc?.name || 'Document'} saved to Documents.`);
    return savedDoc;
  }, [showToast]);

  const archiveDocument = useCallback((id) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, status: 'Archived', updatedAt: Date.now() } : doc));
    showToast('Document archived.');
  }, [showToast]);

  const go = useCallback((s) => { setScreen(s); window.scrollTo(0, 0); }, []);

  const login = useCallback(async (email, password) => {
    setAuthBusy(true); setAuthError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Login failed.'); return; }
      setAuth({ token: data.token, user: data.user });
      setPlanState(data.user?.plan || 'free');
      localStorage.setItem('pathway_plan', data.user?.plan || 'free');
      setScreen(['admin', 'consultant'].includes(data.user?.role) ? 'admin' : 'candidate'); window.scrollTo(0, 0);
    } catch { setAuthError('Connection issue. Please try again.'); }
    finally { setAuthBusy(false); }
  }, [setAuth]);

  const register = useCallback(async ({ name, residency, email, age, password }) => {
    setAuthBusy(true); setAuthError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, residency, email, age, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Registration failed.'); return; }
      setAuth({ token: data.token, user: data.user });
      setPlanState(data.user?.plan || 'free');
      localStorage.setItem('pathway_plan', data.user?.plan || 'free');
      setScreen('candidate'); window.scrollTo(0, 0);
    } catch { setAuthError('Connection issue. Please try again.'); }
    finally { setAuthBusy(false); }
  }, [setAuth]);

  const adminAuth = useCallback(async (secret) => {
    setAuthBusy(true); setAuthError('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Invalid access code.'); return; }
      setAdminSecret(secret);
      sessionStorage.setItem('pathway_admin_secret', secret);
      setAuth(null);
      setScreen('admin'); window.scrollTo(0, 0);
    } catch { setAuthError('Connection issue. Please try again.'); }
    finally { setAuthBusy(false); }
  }, []);

  const signOut = useCallback(() => {
    if (auth?.token) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        keepalive: true,
      }).catch(() => {});
    }
    if (auth?.user?.id) sessionStorage.removeItem(`pathway_return_welcome_${auth.user.id}`);
    setAuth(null);
    sessionStorage.removeItem('pathway_admin_secret');
    setAdminSecret('');
    setAuthError('');
    setScreen('login'); setCandTab('advisor'); window.scrollTo(0, 0);
  }, [auth?.token, auth?.user?.id, setAuth]);

  const resetSession = useCallback(() => {
    const confirmed = window.confirm('Start a new session? This will clear your chat, profile, scores, school matches, documents, tasks, essays, and saved analysis.');
    if (!confirmed) return;
    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    setChat(buildInitialChat(language));
    setStepIdx(0);
    setProfile(null); setScores(null); setStrengths(null); setWeaknesses(null);
    setTasks(null); setCompletedTasks({});
    setPrograms(null); setChosenSchools(null); setCvText(''); setCvFile(null); setEssayText(''); setEssaySchool('');
    setEssayQuestion(''); setEssays({}); setDocuments([]); setInterviews({});
    setInsights(null); setNarrative(null); setUndergrad(null); setOverride(0);
    if (auth?.token) {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: { sessionId: nextSessionId } }),
      }).catch(() => {});
    }
    showToast('Session cleared — starting fresh.');
  }, [auth?.token, showToast, language]);

  const saveUserDetails = useCallback(async (details) => {
    if (!auth?.token) throw new Error('You must be signed in to save details.');
    const res = await fetch('/api/user-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(details),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save details.');
    setAuth({ token: auth.token, user: data.user });
    return data.user;
  }, [auth?.token, setAuth]);

  const updateAuthUser = useCallback((patch) => {
    if (!auth?.token || !patch) return;
    setAuth({ token: auth.token, user: { ...(auth.user || {}), ...patch } });
  }, [auth, setAuth]);

  const send = useCallback(async (text, requestExtras = {}) => {
    const raw_t = (text != null ? text : input).trim();
    if (!raw_t || busy) return;

    // Graduate degree sub-choice. Once the candidate has picked the Graduate
    // opening path we still need the exact degree before the agent proceeds.
    // Whatever they click or type next IS that degree, so this must run before
    // the opening-path resolver (otherwise "MBA" would be re-read as a category).
    // Only capture when we actually just asked (the last advisor message is the
    // degree prompt); otherwise a placeholder degree from an older session would
    // swallow unrelated answers like a narrative reply.
    const lastAiText = [...chat].reverse().find(m => m.role === 'ai')?.text || '';
    const awaitingGraduateDegree = needsGraduateDegree(profile)
      && (lastAiText === GRADUATE_DEGREE_PROMPT || lastAiText === GRADUATE_DEGREE_OTHER_PROMPT);
    let graduateDegreeProfile = null;
    if (awaitingGraduateDegree) {
      const choice = resolveGraduateDegreeChoice(raw_t);
      if (choice?.other) {
        // Keep the normal input open and ask for the exact degree or field.
        setChat(prev => [
          ...prev,
          { role: 'user', channel: 'web', text: raw_t },
          { role: 'ai', channel: 'web', text: GRADUATE_DEGREE_OTHER_PROMPT },
        ]);
        setInput('');
        return;
      }
      if (choice) {
        graduateDegreeProfile = { ...(profile || {}), category: 'Graduate', degree: choice.degree };
      }
    }

    const isTargetSelection = /^i'?d like to move forward with:/i.test(raw_t);
    const isProgramRecovery = PROGRAM_LIST_RECOVERY.test(raw_t);
    const hasSavedPrograms = Array.isArray(programs) && programs.length > 0;
    const requestsFirstProgramList = (isSchoolListRequest(raw_t) || isProgramRecovery) && !hasSavedPrograms;

    // A saved list is already the source of truth for both the inline card and
    // University List. Recover it locally instead of asking the model to claim
    // it generated something that the candidate still cannot see.
    if (isProgramRecovery && hasSavedPrograms) {
      setChat(prev => [...prev,
        { role: 'user', channel: 'web', text: raw_t },
        { role: 'ai', channel: 'web', text: 'Here’s your list again. You can review and select schools directly below.' },
      ]);
      setInput('');
      setCandTab('universities');
      return;
    }

    // Persist the four-way opening choice before the request leaves the browser.
    // The request must carry this same profile immediately; React state updates
    // alone would arrive one render too late and derail the server-side cycle.
    const openingPath = awaitingGraduateDegree ? null : resolveOpeningPathChoice(raw_t);
    let requestProfile = profile;
    if (graduateDegreeProfile) {
      requestProfile = graduateDegreeProfile;
      setProfile(requestProfile);
      setStepIdx(0);
    } else if (openingPath) {
      requestProfile = { ...(profile || {}), ...openingPath };
      setProfile(requestProfile);
      setStepIdx(0);
      if (openingPath.category === 'Undergraduate') setCandTab('studentProfile');
      // Graduate needs a specific degree next. Show the degree bubbles
      // deterministically (input stays open) instead of calling the model.
      if (needsGraduateDegree(requestProfile)) {
        setChat(prev => [
          ...prev,
          { role: 'user', channel: 'web', text: raw_t },
          { role: 'ai', channel: 'web', text: GRADUATE_DEGREE_PROMPT },
        ]);
        setInput('');
        return;
      }
    }

    // Saving selected targets is a deterministic workspace action and must not
    // be swallowed by plan gating. The server completes this handoff without
    // an AI call, then normal plan rules apply to later AI-guidance turns.
    if (plan === 'free' && scores && !isTargetSelection && !requestsFirstProgramList) {
      setChat(prev => {
        const previousAi = [...prev].reverse().find(message => message.role === 'ai');
        return [
          ...prev,
          { role: 'user', channel: 'web', text: raw_t },
          ...(previousAi?.text === PLAN_UPGRADE_MESSAGE ? [] : [{ role: 'ai', channel: 'web', text: PLAN_UPGRADE_MESSAGE }]),
        ];
      });
      setInput('');
      return;
    }

    // Preserve direct "next"/"continue" text so the server can distinguish a
    // first school-list request from later post-portfolio continuation.
    const t = raw_t;

    // Do NOT advance to Narrative just because the message text looks like a
    // target selection. The move to Narrative is gated on chosenSchools being
    // saved — handled deterministically by confirmTargetSchools() and by the
    // parsed <CHOSEN_SCHOOLS> handling below.

    const userMsg = { role: 'user', channel: 'web', text: t };
    // If re-submitting CV, replace the previous CV message to avoid duplicates in context
    const baseChat = t.startsWith('Here is my CV')
      ? chat.filter(m => !(m.role === 'user' && m.text.startsWith('Here is my CV')))
      : chat;
    const newChat = [...baseChat, userMsg];
    setChat(newChat);
    setInput('');
    setBusy(true);

    try {
      const stage = buildStageContext(stepIdx, requestProfile, scores, programs, essays, tasks, strengths, chat[0]?.timestamp, weaknesses);
      let systemContext = buildAISystemContext(stage);
      if (requestsFirstProgramList) {
        systemContext += '\n\nPROGRAM LIST RECOVERY: The candidate explicitly asked to see the missing list. This response MUST include a valid <PROGRAMS>[...]</PROGRAMS> block with at least 10 items. Do not say the list is ready, live, or in a tab unless that block is present in this same response.';
      }
      // Stage guardrail: if the candidate reaches for a later stage before its
      // prerequisite, tell the agent to explain the current required next step
      // instead of skipping ahead. The agent still owns the wording.
      const isUndergrad = requestProfile?.category === 'Undergraduate';
      if (!isLegacyCandidateCategory(requestProfile) && !isUndergrad) {
        const tooEarly = explainIfTooEarly({ scores, programs, chosenSchools, narrative, cvUnlocked: stepIdx >= (STEPS.indexOf('CV')) }, t);
        if (tooEarly) {
          systemContext += `\n\nSTAGE GUARDRAIL: The candidate is asking to jump ahead. Do not start that later stage yet. In your own words, explain the current required next step: ${tooEarly}`;
        }
      }

      const callAdvisor = () => fetch('/api/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({
          action: 'candidate_message',
          message: t,
          messages: newChat,
          aiConfig,
          language,
          conversationId: sessionId,
          profile: requestProfile,
          scores,
          programs: normalizeProgramList(programs) || programs,
          chosenSchools,
          stage,
          systemContext,
          ...requestExtras,
          candidateState: {
            profile: requestProfile, scores, programs, chosenSchools, narrative, documents, essays, interviews,
            ...(requestExtras.profileSources ? { profileSources: requestExtras.profileSources } : {}),
          },
        }),
      });

      // Undergraduate candidates route through the multi-agent coordinator
      // (requires an authenticated session — /api/agents/orchestrate 401s
      // without one). Every other track keeps hitting /api/advisor unchanged.
      let usedOrchestrate = isUndergrad && !!auth?.token;
      let res = usedOrchestrate
        ? await fetch('/api/agents/orchestrate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              message: t,
              candidateId: auth?.user?.id || sessionId,
              conversationHistory: newChat,
              extra: {
                profile: requestProfile,
                scores,
                programs: normalizeProgramList(programs) || programs,
                chosenSchools,
                stage,
                systemContext,
                ...requestExtras,
              },
            }),
          })
        : await callAdvisor();

      // Multi-agent architecture disabled server-side (admin forced legacy
      // mode) — fall back to the legacy advisor instead of throwing.
      if (usedOrchestrate && res.status === 409) {
        usedOrchestrate = false;
        res = await callAdvisor();
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Advisor request failed.');
      // /api/agents/orchestrate returns { text }, not { raw }/{ reply } — adapt
      // it into the same shape the rest of this pipeline (parseBlocks etc.) expects.
      if (usedOrchestrate) data.raw = data.text || '';
      const raw = data.raw || data.reply || '';

      if (raw) {
        const parsed = parseBlocks(raw);
        const typedPatch = data.statePatch || {};
        if (!parsed.profile && typedPatch.profile) parsed.profile = typedPatch.profile;
        if (!parsed.scores && typedPatch.scores) parsed.scores = typedPatch.scores;
        if (!parsed.strengths && typedPatch.strengths) parsed.strengths = typedPatch.strengths;
        if (!parsed.weaknesses && typedPatch.weaknesses) parsed.weaknesses = typedPatch.weaknesses;
        if (!parsed.tasks && typedPatch.tasks) parsed.tasks = typedPatch.tasks;
        if (!parsed.programs && typedPatch.programs) parsed.programs = normalizeProgramList(typedPatch.programs);
        if (!parsed.chosenSchools && typedPatch.chosenSchools) parsed.chosenSchools = typedPatch.chosenSchools;
        if (!parsed.insights && typedPatch.insights) parsed.insights = typedPatch.insights;
        if (!parsed.essay && typedPatch.essays) parsed.essay = Object.entries(typedPatch.essays).map(([school, value]) => ({ school, ...value }))[0];
        if (!parsed.interviewResult && typedPatch.interviews) parsed.interviewResult = Object.values(typedPatch.interviews)[0];
        const category = parsed.profile?.category || requestProfile?.category;
        const isUndergrad = category === 'Undergraduate';
        if (isUndergrad && candTab === 'advisor') setCandTab('studentProfile');
        if (parsed.profile) {
          parsed.profile = isUndergrad ? normalizeUndergradProfile({ ...requestProfile, ...parsed.profile, category: 'Undergraduate' }) : parsed.profile;
          setProfile(parsed.profile);
        }
        if (parsed.scores) {
          const overall = weightedOverallScore(parsed.scores, parsed.profile || requestProfile);
          setScores({ ...parsed.scores, overall });
          setOverride(overall);
          setStepIdx(prev => Math.max(prev, isUndergrad ? 1 : 2));
        }
        if (parsed.strengths) setStrengths(parsed.strengths);
        if (parsed.weaknesses) setWeaknesses(parsed.weaknesses);
        if (parsed.tasks) {
          // Once a task is marked done it's treated as deleted — drop it permanently
          // the next time the AI refreshes the task list, instead of letting it reappear.
          const next = parsed.tasks.filter(t => !completedTasks[t]);
          setTasks(next);
          setCompletedTasks({});
        }
        if (parsed.programs?.length) {
          let normalizedPrograms = normalizeProgramList(parsed.programs) || [];
          if (isUndergrad) normalizedPrograms = normalizeUndergradPrograms(normalizedPrograms, parsed.profile || requestProfile || {});
          parsed.programs = normalizedPrograms;
          // Verification log: confirms the advisor's <PROGRAMS> block was parsed
          // into structured university data and dispatched into state, which the
          // University List and Advisor panels then render.
          console.log('[Pathway] recommended universities parsed from advisor:', normalizedPrograms.map(p => ({ name: p.name, tier: p.tier, fit: p.fitIndex ?? p.fit, location: p.location })));
          setPrograms(normalizedPrograms);
          const regeneratedProgramList = /(?:recommend|generate|regenerate|show|build|create|refresh)[\s\S]{0,80}(?:programs?|portfolio|schools?|school\s+list|matches)/i.test(t)
            || /(?:cannot|can't|do not|don't)\s+see[\s\S]{0,80}(?:programs?|portfolio|schools?|list|matches)/i.test(t);
          if (!isUndergrad && regeneratedProgramList) {
            // A fresh list invalidates earlier picks. Reopen selection so the
            // new rows are visible and can be confirmed without typing names.
            setChosenSchools(null);
            setStepIdx(3);
          } else {
            setStepIdx(prev => Math.max(prev, 3));
          }
        }
        if (parsed.chosenSchools) {
          setChosenSchools(parsed.chosenSchools);
          // Saving target schools is the only gate into Narrative. Advance the
          // stepper once chosenSchools actually exists, never on message text.
          if (!isUndergrad && Array.isArray(parsed.chosenSchools) && parsed.chosenSchools.length) {
            setStepIdx(prev => Math.max(prev, STEPS.indexOf('Narrative')));
          }
        }
        if (parsed.insights) setInsights(parsed.insights);
        if (parsed.essay && parsed.essay.school) {
          const essayName = safeDocBaseName(parsed.essay.school ? `Essay - ${parsed.essay.school}` : titleFromText(parsed.essay.text, 'Essay Draft'), 'Essay Draft');
          setEssays(prev => ({ ...prev, [parsed.essay.school]: { question: parsed.essay.question || '', text: parsed.essay.text || '' } }));
          setEssaySchool(parsed.essay.school);
          setEssayQuestion(parsed.essay.question || '');
          setEssayText(parsed.essay.text || '');
          saveDocument({
            name: essayName,
            type: 'essay',
            source: 'Advisor Chat',
            status: 'Generated',
            text: parsed.essay.text || '',
            linkedSchool: parsed.essay.school,
            linkedWorkflow: 'advisor_chat',
          });
          setStepIdx(prev => Math.max(prev, isUndergrad ? 5 : 7));
        }
        if (parsed.interviewResult && parsed.interviewResult.school) {
          setInterviews(prev => ({
            ...prev,
            [parsed.interviewResult.school]: {
              school: parsed.interviewResult.school,
              rating: parsed.interviewResult.rating,
              feedback: parsed.interviewResult.feedback,
              nextSteps: parsed.interviewResult.nextSteps || [],
            },
          }));
          setStepIdx(prev => Math.max(prev, 8));
        }
        let displayText = safeVisibleReply(raw, parsed, requestProfile);
        const undergradOutput = isUndergrad
          ? normalizeUndergradAdvisorOutput(parsed.undergradOutput || displayText, { message: t })
          : null;
        if (undergradOutput) displayText = undergradOutput.chatMessage;
        displayText = gateProgramReadyReply({
          text: displayText,
          isUndergrad,
          parsedPrograms: parsed.programs,
          currentPrograms: programs,
        });
        // Safety net: if the model confirmed chosen schools without asking a
        // follow-up question, the flow would dead-end. Hand the candidate the
        // next move so the journey always continues.
        if (!isUndergrad && parsed.chosenSchools && !displayText.includes('?')) {
          displayText += '\n\nType "next" and we\'ll start shaping your narrative.';
        }

        // Auto-advance the stepper within the required stage order. The reply
        // text can influence wording, but a later stage never starts before its
        // prerequisite (e.g. CV waits for the narrative stage to begin).
        const nextStep = computeStageAdvancement({
          stepIdx,
          isUndergrad,
          steps: isUndergrad ? UNDERGRAD_STEPS : STEPS,
          aiText: displayText,
          userText: t,
          parsed,
          chosenSchools: parsed.chosenSchools || chosenSchools,
          narrative,
          cvText,
        });
        if (nextStep !== null) {
          setStepIdx(prev => Math.max(prev, nextStep));
        }

        // Undergrad Candidate-Building Engine (Part 3). Turn this turn's advice +
        // scores into structured, stored roadmap/tasks/calendar/reminders. Runs
        // for Undergraduate candidates ONLY — graduate/PhD/personal-development
        // flow is untouched. Functional update keeps it out of the send() deps.
        if (isUndergrad) {
          const candidateId = auth?.user?.id || sessionId;
          const s = parsed.scores || {};
          const ugScores = parsed.scores ? {
            academics: s.academic, testing: s.testScore, activities: s.activities,
            leadership: s.leadership, awards: s.awards, volunteering: s.volunteering,
            research: s.research, majorFit: s.goalClarity, profileDepth: s.uniqueness ?? s.potential,
          } : undefined;
          setUndergrad(prev => processUndergradInput(prev, {
            candidateId,
            message: t,
            advice: displayText,
            advisorOutput: undergradOutput,
            scores: ugScores,
            grade: requestProfile?.grade,
            targetCountry: requestProfile?.destination || requestProfile?.countries,
            targetMajor: requestProfile?.intendedMajor || requestProfile?.major || requestProfile?.subjects,
            profileSnapshot: parsed.profile || requestProfile,
            now: Date.now(),
          }).state);
        }

        setChat(prev => {
          const previousAi = [...prev].reverse().find(message => message.role === 'ai');
          return previousAi?.text === displayText
            ? prev
            : [...prev, { role: 'ai', channel: 'web', text: displayText }];
        });
      } else {
        setChat(baseChat);
        showToast('The Advisor is temporarily unavailable. Please try again.');
      }
    } catch {
      setChat(baseChat);
      showToast('The Advisor is temporarily unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [input, chat, busy, aiConfig, plan, scores, profile, programs, chosenSchools, narrative, cvText, completedTasks, language, sessionId, saveDocument, candTab, showToast]);

  // Sends a silent idle check-in to the AI without showing a user message in chat.
  // Only the AI response appears.
  const sendIdleCheckin = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const stage = buildStageContext(stepIdx, profile, scores, programs, essays, tasks, strengths, chat[0]?.timestamp, weaknesses);
      const systemContext = buildAISystemContext(stage);
      const idleMessages = [...chat, { role: 'user', channel: 'system', text: '__idle_checkin__' }];
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
        body: JSON.stringify({ action: 'candidate_message', message: '__idle_checkin__', messages: idleMessages, aiConfig, language, conversationId: sessionId, profile, scores, programs: normalizeProgramList(programs) || programs, chosenSchools, stage, systemContext, candidateState: { profile, scores, programs, chosenSchools, narrative, documents, essays, interviews } }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const raw = data.raw || data.reply || '';
      if (raw) {
        const parsed = parseBlocks(raw);
        const displayText = safeVisibleReply(raw, parsed, profile);
        if (displayText) setChat(prev => {
          const previousAi = [...prev].reverse().find(message => message.role === 'ai');
          return previousAi?.text === displayText
            ? prev
            : [...prev, { role: 'ai', channel: 'web', text: displayText }];
        });
      }
    } catch { /* silent — idle checkin failure must never break the UI */ } finally {
      setBusy(false);
    }
  }, [busy, chat, profile, scores, programs, chosenSchools, essays, tasks, strengths, weaknesses, stepIdx, auth?.token, sessionId, language, aiConfig]);

  const submitCv = useCallback(() => {
    const sourceBundle = buildProfileSourceBundle({
      fileText: cvFileTextDraft,
      pastedText: cvDraft,
      additionalText: cvExtra,
    });
    if (!sourceBundle.combinedOriginal) return;
    setCvText(sourceBundle.combinedOriginal);
    setCvFile(cvFileDraft);
    saveDocument({
      name: cvFileDraft?.name || titleFromText(cvDraft || cvExtra, 'CV / Resume'),
      type: 'resume',
      source: cvFileDraft ? 'Upload' : 'Simulation',
      status: 'Ready',
      text: sourceBundle.combinedOriginal,
      file: cvFileDraft,
      linkedWorkflow: 'my_cv',
    });
    setShowCvModal(false);
    setCvDraft('');
    setCvFileTextDraft('');
    setCvFileDraft(null);
    setCvExtra('');
    send(sourceBundle.advisorMessage, {
      profileSources: sourceBundle,
      cvExtraction: sourceBundle.fileText,
      extraText: [sourceBundle.pastedText, sourceBundle.additionalText].filter(Boolean).join('\n\n'),
    });
  }, [cvDraft, cvFileTextDraft, cvFileDraft, cvExtra, send, saveDocument]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (file.size > MAX_UPLOAD_BYTES) {
      showToast('File is too large — please upload a PDF or Word file under 3 MB.');
      e.target.value = '';
      return;
    }

    if (ext === 'doc') {
      showToast('Legacy .doc format not supported — please save as .docx or PDF.');
      e.target.value = '';
      return;
    }

    if (ext === 'pdf' || ext === 'docx') {
      const mediaType = ext === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      showToast(ext === 'pdf' ? 'Extracting text from PDF…' : 'Extracting text from Word document…');
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        try {
          const res = await fetch('/api/parse-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
            body: JSON.stringify({ base64, mediaType, fileName: file.name, conversationId: sessionId }),
          });
          const data = await res.json();
          if (data.text) {
            setCvFileTextDraft(data.text);
            setCvFileDraft(data.file || { name: file.name, size: file.size, type: mediaType });
            showToast(ext === 'pdf' ? 'PDF loaded — review the text below.' : 'Word document loaded — review the text below.');
          }
          else showToast('Could not extract text — please paste it manually.');
        } catch { showToast('Extraction failed — please paste the text manually.'); }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    // .txt / .rtf
    const reader = new FileReader();
    reader.onload = (ev) => { setCvFileTextDraft(ev.target.result || ''); setCvFileDraft({ name: file.name, size: file.size, type: file.type || 'text/plain' }); };
    reader.onerror = () => showToast('Could not read file — try pasting the text directly.');
    reader.readAsText(file);
    e.target.value = '';
  }, [auth?.token, sessionId, showToast]);

  const rewriteEssay = useCallback(async () => {
    if (!essayText.trim()) { showToast('Paste your essay text in the editor first.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: essayText, school: essaySchool, narrative }),
      });
      const data = await res.json();
      if (data.result) {
        setEssayText(data.result);
        if (essaySchool) setEssays(prev => ({ ...prev, [essaySchool]: { question: essayQuestion, text: data.result } }));
        saveDocument({
          name: essaySchool ? `Essay - ${essaySchool}` : titleFromText(data.result, 'Essay Draft'),
          type: 'essay',
          source: 'AI Rewrite',
          status: 'Generated',
          text: data.result,
          linkedSchool: essaySchool,
          linkedWorkflow: 'essay_editor',
        });
        showToast('Essay rewritten by AI.');
      }
      else showToast('Rewrite failed. Check your API key.');
    } catch { showToast('Rewrite failed. Please try again.'); }
    finally { setBusy(false); }
  }, [essayText, essaySchool, essayQuestion, narrative, showToast, saveDocument]);

  const analyzeEssay = useCallback(() => {
    if (!essayText.trim()) { showToast('Paste your essay text first.'); return; }
    const msg = `Please analyze this essay draft${essaySchool ? ` for ${essaySchool}` : ''}${essayQuestion ? ` (prompt: "${essayQuestion}")` : ''} and give me specific, actionable feedback:\n\n${essayText}`;
    setCandTab('advisor');
    send(msg);
  }, [essayText, essaySchool, essayQuestion, send, showToast]);

  const saveEssayToDocuments = useCallback(() => {
    if (!essayText.trim()) { showToast('Paste your essay text first.'); return; }
    if (essaySchool) setEssays(prev => ({ ...prev, [essaySchool]: { question: essayQuestion, text: essayText } }));
    saveDocument({
      name: essaySchool ? `Essay - ${essaySchool}` : titleFromText(essayText, 'Essay Draft'),
      type: 'essay',
      source: 'Simulation',
      status: 'Ready',
      text: essayText,
      linkedSchool: essaySchool,
      linkedWorkflow: 'essay_editor',
    });
  }, [essayText, essaySchool, essayQuestion, setEssays, saveDocument, showToast]);

  const saveCvToDocuments = useCallback((text = cvText) => {
    if (!String(text || '').trim()) { showToast('Add your CV text first.'); return; }
    saveDocument({
      name: cvFile?.name || titleFromText(text, 'CV / Resume'),
      type: 'resume',
      source: cvFile ? 'Upload' : 'Simulation',
      status: 'Ready',
      text,
      file: cvFile,
      linkedWorkflow: 'my_cv',
    });
  }, [cvText, cvFile, saveDocument, showToast]);

  const selectEssaySchool = useCallback((school) => {
    if (essaySchool && essaySchool !== school) {
      setEssays(prev => ({ ...prev, [essaySchool]: { question: essayQuestion, text: essayText } }));
    }
    setEssaySchool(school);
    const existing = essays[school];
    setEssayQuestion(existing?.question || '');
    setEssayText(existing?.text || '');
  }, [essaySchool, essayQuestion, essayText, essays]);

  const currentTrack = resolveTrack(profile || {});
  const currentConfig = getTrackConfig(profile || {});
  const currentSteps = currentConfig.steps;
  const reopenProgramSelection = useCallback(() => {
    setChosenSchools(null);
    setStepIdx(3);
    setCandTab('advisor');
  }, []);
  const confirmTargetSchools = useCallback((schools) => {
    const confirmed = [...new Set((Array.isArray(schools) ? schools : []).map(name => String(name || '').trim()).filter(Boolean))];
    if (!confirmed.length) return;
    const userText = `I confirm these target schools: ${confirmed.join(' | ')}.`;
    const aiText = `Your targets are locked in. Now let's shape your Narrative & Strategy. ${N1_QUESTION}`;
    setChosenSchools(confirmed);
    setStepIdx(prev => Math.max(prev, 4));
    setCandTab('advisor');
    setInput('');
    setBusy(false);
    setChat(prev => {
      const lastTwo = prev.slice(-2);
      if (lastTwo[0]?.text === userText && lastTwo[1]?.text === aiText) return prev;
      return [...prev, { role: 'user', channel: 'web', text: userText }, { role: 'ai', channel: 'web', text: aiText }];
    });
  }, []);

  // Undergrad engine candidate-side actions (mark task/roadmap item done,
  // acknowledge a reminder, rebuild the roadmap). All persist via `undergrad`.
  const setUndergradTaskStatus = useCallback((id, status, kind = 'task') => {
    setUndergrad(prev => {
      const s = ensureUndergradState(prev);
      const now = Date.now();
      if (kind === 'roadmap') {
        return { ...s, roadmap: s.roadmap.map(it => (it.id === id ? { ...it, status, updatedAt: now } : it)) };
      }
      const updated = status === 'done'
        ? completeTask(s, id, now)
        : { ...s, tasks: s.tasks.map(t => (t.id === id ? { ...t, status, updatedAt: now, lastUpdateAt: now } : t)) };
      return runScheduledNagger(updated, { candidateId: updated.candidateId, now }).state;
    });
  }, []);

  const acknowledgeReminder = useCallback((id) => {
    setUndergrad(prev => {
      const s = ensureUndergradState(prev);
      return { ...s, reminders: s.reminders.map(r => (r.id === id ? { ...r, status: 'acknowledged', updatedAt: Date.now() } : r)) };
    });
  }, []);

  const regenerateRoadmap = useCallback(() => {
    setUndergrad(prev => {
      const s = ensureUndergradState(prev, auth?.user?.id || sessionId);
      return syncRoadmap(s, {
        candidateId: s.candidateId,
        profile: s.profile,
        grade: profile?.grade,
        targetCountry: profile?.destination || profile?.countries,
        targetMajor: profile?.intendedMajor || profile?.major || profile?.subjects,
        now: Date.now(),
      });
    });
  }, [auth?.user?.id, sessionId, profile]);

  const sharedProps = {
    screen, role, setRole,
    showPw, setShowPw,
    remember, setRemember,
    candTab, setCandTab,
    docTab, setDocTab,
    adminTab, setAdminTab,
    sel, setSel,
    override, setOverride,
    narrative, setNarrative,
    undergrad, setUndergradTaskStatus, acknowledgeReminder, regenerateRoadmap,
    sessionId, chat, setChat, input, setInput, busy,
    STEPS: currentSteps, UNDERGRAD_STEPS, stepIdx,
    currentConfig, currentTrack,
    profile, scores, setScores, strengths, weaknesses, programs, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, insights,
    tasks, completedTasks, setCompletedTasks,
    cvText, setCvText, cvFile, setCvFile,
    essayText, setEssayText,
    essaySchool, setEssaySchool,
    essayQuestion, setEssayQuestion,
    essays, documents, setDocuments, archiveDocument, saveDocument, saveEssayToDocuments, saveCvToDocuments, interviews,
    showCvModal, setShowCvModal,
    showContactModal, setShowContactModal,
    cvDraft, setCvDraft,
    aiConfig, setAiConfig,
    plan, setPlan,
    language, setLanguage,
    authUser: auth?.user || null, authToken: auth?.token || null, authError, authBusy, adminSecret,
    requiresOAuthDetails, saveUserDetails, updateAuthUser, setProfile,
    login, register, adminAuth,
    go, signOut, send, sendIdleCheckin, submitCv, handleFileUpload, rewriteEssay, analyzeEssay, selectEssaySchool, resetSession, showToast,
    noop: () => showToast('This section is coming soon.'),
    forgot: () => showToast('Password reset link sent to your academic email.'),
  };

  return (
    <div style={{ fontFamily: screen === 'candidate' ? "'Albert Sans',system-ui,sans-serif" : "'Public Sans',system-ui,sans-serif", color: screen === 'candidate' ? '#33405e' : '#1c2433', minHeight: '100vh', background: screen === 'candidate' ? 'linear-gradient(180deg,#faf7f2 0%,#f6f1e8 100%)' : '#eef1fc' }}>
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: screen === 'candidate' ? '#141b34' : '#16233f', color: '#fff', padding: '12px 22px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, boxShadow: '0 12px 30px rgba(15,26,48,.32)',
          zIndex: 9999, animation: 'pwFade .25s ease', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* CV / Background Upload Modal */}
      {showCvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,48,.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 36, width: '100%', maxWidth: 620, boxShadow: '0 24px 60px rgba(15,26,48,.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 600, color: '#141b34', margin: 0 }}>Upload Your Profile</h2>
              <button onClick={() => { setShowCvModal(false); setCvDraft(''); setCvFileTextDraft(''); setCvFileDraft(null); setCvExtra(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a93a3', fontSize: 26, lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <p style={{ fontSize: 14, color: '#7a8295', marginBottom: 16, lineHeight: 1.5 }}>
              Paste your CV or upload a file. Add honors, awards, major achievements, test scores, goals, and recommenders if they are not already clear.
            </p>

            {/* File upload row */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f4f6fb', border: '1.5px dashed #c5cde0', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', marginBottom: 12, fontSize: 13, color: '#6b7280', fontWeight: 600, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#5b46e0', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {cvFileTextDraft
                ? (cvFileDraft ? `File loaded: ${cvFileDraft.name}` : 'File text loaded')
                : 'Upload PDF or Word (.docx) under 3 MB'}
              <input type="file" accept=".txt,.rtf,.pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            {/* Extracted file text — shown so the candidate can see and edit what
                was parsed from the upload before submitting. */}
            {cvFileTextDraft && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#2fa876' }}>
                    ✓ EXTRACTED FROM FILE{cvFileDraft?.name ? ` · ${cvFileDraft.name}` : ''}
                  </div>
                  <button
                    onClick={() => { setCvFileTextDraft(''); setCvFileDraft(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a93a3', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    Remove file
                  </button>
                </div>
                <textarea
                  value={cvFileTextDraft}
                  onChange={e => setCvFileTextDraft(e.target.value)}
                  aria-label="Extracted CV text"
                  placeholder="Text extracted from your file appears here…"
                  style={{ width: '100%', height: 180, border: '1px solid #cfe6dc', background: '#f6fbf8', borderRadius: 10, padding: '14px 16px', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1c2433', boxSizing: 'border-box', lineHeight: 1.6 }}
                />
                <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 6 }}>
                  Review the extracted text above. You can edit it before analyzing.
                </div>
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginBottom: 8 }}>PASTED CV / PROFILE TEXT</div>
              <textarea
                value={cvDraft}
                onChange={e => setCvDraft(e.target.value)}
                placeholder="Paste your CV, resume text, or work history…"
                style={{ width: '100%', height: 160, border: '1px solid #d7ddec', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1c2433', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ borderTop: '1px dashed #d7ddec', margin: '14px 0 14px', padding: '14px 0 0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginBottom: 4 }}>ADDITIONAL BACKGROUND DUMP <span style={{ color: '#b6bdcd', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
              <div style={{ fontSize: 12, color: '#8a93a3', marginBottom: 8, lineHeight: 1.5 }}>
                Use this for honors, awards, major achievements, goals, recommenders, or context missing from the CV.
              </div>
              <textarea
                value={cvExtra}
                onChange={e => setCvExtra(e.target.value)}
                placeholder="e.g. I was born in Brazil, started in banking, switched to tech startup... My portfolio includes interactive installations and prototypes. My recommenders are my VP and my professor..."
                style={{ width: '100%', height: 110, border: '1px solid #d7ddec', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1c2433', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#b6bdcd', flex: 1 }}>{(cvFileTextDraft + ' ' + cvDraft + ' ' + cvExtra).trim().split(/\s+/).filter(Boolean).length} words across all sources</span>
              <button onClick={() => { setShowCvModal(false); setCvDraft(''); setCvFileTextDraft(''); setCvFileDraft(null); setCvExtra(''); }} style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitCv} disabled={!cvFileTextDraft.trim() && !cvDraft.trim() && !cvExtra.trim()} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', border: 'none', borderRadius: 999, padding: '11px 26px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: (cvFileTextDraft.trim() || cvDraft.trim() || cvExtra.trim()) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: (cvFileTextDraft.trim() || cvDraft.trim() || cvExtra.trim()) ? 1 : 0.5, boxShadow: '0 3px 10px rgba(148,153,251,.4)' }}>
                Analyze →
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} profile={profile} />}

      {screen === 'login' && <Login {...sharedProps} />}
      {screen === 'register' && <Register {...sharedProps} />}
      {screen === 'landing' && <Landing {...sharedProps} />}
      {screen === 'terms' && <LegalPage {...sharedProps} type="terms" />}
      {screen === 'privacy' && <LegalPage {...sharedProps} type="privacy" />}
      {screen === 'candidate' && <CandidatePortal {...sharedProps} />}
      {screen === 'admin' && <AdminPortal {...sharedProps} />}
    </div>
  );
}
