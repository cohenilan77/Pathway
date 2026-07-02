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
import { upcomingTestDatesPromptLine, getUpcomingTestDates } from './lib/testDates.js';
import { DEFAULT_STEPS as STEPS, UNDERGRAD_STEPS, TRACK_CONFIG, getTrackConfig, resolveTrack } from './trackConfig.js';
export { STEPS, UNDERGRAD_STEPS, TRACK_CONFIG };

export const PLANS = {
  free: { label: 'Free' },
  ai: { label: 'AI' },
  ai_strategy: { label: 'AI + Strategy' },
};

const PLAN_UPGRADE_MESSAGE = "You've reached the end of the Free plan. Please upgrade in Settings to continue with AI guidance, or choose AI + Strategy to add Live Chat with your consultant.";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

function isLegacyCandidateCategory(profile) {
  return profile?.category === 'Undergraduate' || profile?.category === 'Personal Development';
}

const WELCOME_MESSAGE = {
  English: "Welcome to your Pathway Private Office. I'm your Lead Admissions Strategist — here to craft the narrative that gets you in.\n\nLet's start with where you are in your journey. Which best describes you? → Undergraduate | Graduate | Postgraduate / Doctoral | Personal Development",
  Spanish: "Bienvenido a tu Oficina Privada Pathway. Soy tu Estratega Principal de Admisiones — aquí para construir la narrativa que te abrirá las puertas.\n\nEmpecemos por saber en qué etapa de tu camino estás. ¿Cuál te describe mejor? → Pregrado | Posgrado | Posgrado / Doctorado | Desarrollo Personal",
  Hebrew: "ברוכים הבאים ללשכה הפרטית שלך ב-Pathway. אני האסטרטג הראשי שלך לקבלה ללימודים — כאן כדי לבנות את הסיפור שיכניס אותך.\n\nנתחיל בלברר באיזה שלב במסע שלך אתה נמצא. מה הכי מתאר אותך? → תואר ראשון | תואר שני | לימודים מתקדמים / דוקטורט | התפתחות אישית",
  Arabic: "مرحبًا بك في مكتبك الخاص في Pathway. أنا كبير استراتيجيي القبول لديك — هنا لصياغة القصة التي ستضمن قبولك.\n\nلنبدأ بمعرفة أين أنت في رحلتك. ما الذي يصفك أكثر؟ → بكالوريوس | دراسات عليا | دراسات عليا / دكتوراه | تطوير شخصي",
  Chinese: "欢迎来到您的 Pathway 私人办公室。我是您的首席招生策略师——在这里为您打造能助您成功录取的故事。\n\n让我们先了解您目前的阶段。以下哪项最符合您的情况？ → 本科 | 研究生 | 研究生／博士 | 个人发展",
  French: "Bienvenue dans votre Bureau Privé Pathway. Je suis votre Stratège Principal en Admissions — ici pour construire le récit qui vous fera accepter.\n\nCommençons par savoir où vous en êtes dans votre parcours. Qu'est-ce qui vous décrit le mieux ? → Licence | Master | Doctorat / Postdoctorat | Développement Personnel",
  Portuguese: "Bem-vindo ao seu Escritório Privado Pathway. Sou o seu Estrategista Principal de Admissões — aqui para construir a narrativa que vai garantir a sua aceitação.\n\nVamos começar por saber em que fase da sua jornada está. O que melhor o descreve? → Graduação | Mestrado | Pós-graduação / Doutorado | Desenvolvimento Pessoal",
};

function buildInitialChat(language) {
  return [{ role: 'ai', channel: 'web', text: WELCOME_MESSAGE[language] || WELCOME_MESSAGE.English }];
}

const INITIAL_CHAT = buildInitialChat('English');
const DATA_BLOCK_TAGS = 'PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT|TASKS';

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
    overallScore: scores?.overall ?? null,
    pathwayType: profile?.pathwayType || null,

    // Stage-specific insights
    nextStageName: stepIdx + 1 < steps.length ? steps[stepIdx + 1] : 'Complete',
    shouldNudgeToNextStage: daysInStage > 60 || stepIdx === 3,
  };
}

// Stage progression triggers
function getStageAdvancementTrigger(stepIdx, isUndergrad, displayText, parsed) {
  const lc = displayText.toLowerCase();

  if (isUndergrad) {
    if (stepIdx === 0 && parsed.profile?.category) return 1; // Profile → Roadmap
    if (stepIdx === 1 && (lc.includes('activities') || lc.includes('roadmap'))) return 2; // Roadmap → Activities
    if (stepIdx === 2 && (lc.includes('university') || parsed.programs)) return 3; // Activities → Universities
    if (stepIdx === 3 && (lc.includes('sat') || lc.includes('act') || lc.includes('testing') || lc.includes('standardized') || parsed.scores?.testScore)) return 4; // Universities → Testing
    if (stepIdx === 4 && (lc.includes('essay') || parsed.essay)) return 5; // Testing → Essays
    if (stepIdx === 5 && (lc.includes('application') || lc.includes('submit'))) return 6; // Essays → Applications
  } else {
    if (stepIdx === 0 && parsed.profile?.category) return 1; // Profile → Recommender
    if (stepIdx === 2 && parsed.programs) return 3; // Analysis → Programs
    if (stepIdx === 3 && (lc.includes('narrative') || lc.includes('your story'))) return 4; // Programs → Narrative
    if (stepIdx === 4 && (lc.includes('cv') || lc.includes('resume'))) return 5; // Narrative → CV
    if (stepIdx === 5 && (lc.includes('essay') || parsed.essay)) return 6; // CV → Essay
    if (stepIdx === 6 && (lc.includes('interview') || lc.includes('mock'))) return 7; // Essay → Interview
    if (stepIdx === 7 && parsed.interviewResult) return 8; // Interview → Result
  }

  return null; // No advancement
}

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

NEXT FOCUS: Still building the profile. If no transcript/CV file has been shared yet, ask for a file upload first and extract everything from it. Then ask ONLY for the next missing KPI: ${!stage.hasActivities ? 'activities and extracurriculars' : !stage.hasTestingScore ? `testing plans — ${upcomingTestDatesPromptLine()} Use only these future dates, never past ones` : 'recommenders, goals, and university preferences'}.`;
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
  const extract = (tag, kind = 'auto') => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!m) return null;
    let body = m[1].trim();
    // Strip markdown code fences the model sometimes wraps blocks in (```json ... ```)
    body = body.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(body); } catch { /* fall through */ }
    // Last resort: grab the outermost {...} or [...] in case of stray leading/trailing text.
    // For blocks that are always arrays (e.g. PROGRAMS), never fall back to the greedy
    // {...} match — on a malformed multi-school array it would just grab the FIRST
    // school object, silently collapsing the whole list down to one entry with no
    // details. Better to return null (no update) than a truncated single item.
    const arrMatch = body.match(/\[[\s\S]*\]/);
    const objMatch = body.match(/\{[\s\S]*\}/);
    const candidate = kind === 'array' ? arrMatch?.[0] : kind === 'object' ? objMatch?.[0] : (arrMatch?.[0] || objMatch?.[0]);
    if (candidate) {
      try { return JSON.parse(candidate); } catch { return null; }
    }
    return null;
  };
  const clean = sanitizeVisibleText(raw);
  return {
    clean,
    profile: extract('PROFILE', 'object'),
    scores: extract('SCORES', 'object'),
    strengths: extract('STRENGTHS', 'array'),
    weaknesses: extract('WEAKNESSES', 'array'),
    programs: normalizeProgramList(extract('PROGRAMS', 'array')),
    chosenSchools: extract('CHOSEN_SCHOOLS', 'array'),
    insights: extract('INSIGHTS', 'array'),
    essay: extract('ESSAY', 'object'),
    interviewResult: extract('INTERVIEW_RESULT', 'object'),
    tasks: extract('TASKS', 'array'),
  };
}

function safeVisibleReply(raw, parsed, currentProfile) {
  const clean = sanitizeVisibleText(parsed.clean || '');
  const category = parsed.profile?.category || currentProfile?.category;
  const isUndergrad = category === 'Undergraduate';
  if (parsed.profile && parsed.scores && parsed.programs) {
    if (isUndergrad) {
      return clean || 'Your profile, risk assessment, and university matches are live in the Analysis tab.';
    }
    // Prefer the AI's actual text (which should now include a follow-up question)
    return clean || 'Your analysis is live in the Analysis tab — head there to see your scores and school matches.';
  }
  if (clean) return clean;
  if (parsed.programs) {
    return isUndergrad
      ? 'Your updated university matches are live in the Analysis tab.'
      : 'Your portfolio is live in the Analysis tab.';
  }
  if (parsed.chosenSchools) return 'Your target schools are saved.';
  if (parsed.essay) return 'Your essay draft is saved in Documents.';
  if (parsed.interviewResult) return 'Your interview results are saved.';
  if (parsed.scores || parsed.profile) {
    return isUndergrad
      ? 'Your profile and risk analysis are live in the Analysis tab.'
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
  const weights = getTrackConfig(profile).scoreWeights || TRACK_CONFIG.Graduate.scoreWeights;
  let total = 0;
  let weight = 0;
  for (const key of Object.keys(weights)) {
    const value = scores?.[key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    const w = weights[key] || 1;
    total += value * w;
    weight += w;
  }
  return weight ? Math.round(total / weight) : 0;
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
  const [override, setOverride] = useState(0);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [cvDraft, setCvDraft] = useState('');
  const [journeyStage, setJourneyStage] = useState(null);
  const [advisorDirective, setAdvisorDirective] = useState(null);
  const [cvFileDraft, setCvFileDraft] = useState(null);
  const [cvExtra, setCvExtra] = useState('');
  const [aiConfig, setAiConfigState] = useState(loadAiConfig);
  const [plan, setPlanState] = useState(loadPlan);
  const [language, setLanguageState] = useState(loadLanguage);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [adaptiveGradEnabled, setAdaptiveGradEnabled] = useState(false);
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
    let cancelled = false;
    fetch('/api/agents/orchestrate', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { enabled: false })
      .then((data) => { if (!cancelled) setAdaptiveGradEnabled(data?.enabled === true); })
      .catch(() => { if (!cancelled) setAdaptiveGradEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!adaptiveGradEnabled || !auth?.token) return;
    let cancelled = false;
    fetch('/api/agents/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ extra: { getJourneyState: true } }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data?.journeyState?.flags?.stage) setJourneyStage(data.journeyState.flags.stage);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [adaptiveGradEnabled, auth?.token]);

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
        const loadedProfile = data?.profile || null;
        const loadedScores = data?.scores || null;
        const loadedPrograms = normalizeProgramList(data?.programs) || null;
        const loadedStrengths = data?.strengths || null;
        const loadedEssays = data?.essays || {};

        setChat(loadedChat);
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
        setOverride(data?.override ?? data?.scores?.overall ?? 0);

        // Detect if student is stuck and needs nudge
        const isUndergrad = loadedProfile?.category === 'Undergraduate';
        const stage = buildStageContext(loadedStepIdx, loadedProfile, loadedScores, loadedPrograms, loadedEssays, data?.tasks, loadedStrengths, loadedChat[0]?.timestamp, data?.weaknesses);

        if (isUndergrad && loadedStepIdx === 3 && loadedPrograms?.length > 0 && !loadedScores?.testScore && loadedChat.length > 10) {
          // Student has universities but hasn't discussed testing yet - add nudge
          const nudgeMsg = {
            role: 'ai',
            channel: 'web',
            text: (() => {
              const { sat, act } = getUpcomingTestDates(3);
              return `Welcome back! You've got a solid university list — next step is locking in your test plan. When are you thinking of sitting the SAT or ACT? → ${sat[0]} | ${act[0]} | ${sat[1]} | Not sure yet`;
            })()
          };
          if (!loadedChat.find(m => m.text?.includes('Welcome back'))) {
            setChat(prev => [...prev, nudgeMsg]);
          }
        }
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

  // Persist the candidate's session to their account, debounced
  useEffect(() => {
    if (!auth?.token || chat.length <= 1) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          data: { sessionId, chat, stepIdx, profile, scores, strengths, weaknesses, tasks, completedTasks, programs: normalizeProgramList(programs) || programs, chosenSchools, cvText, cvFile, essayText, essaySchool, essayQuestion, essays, documents, interviews, insights, narrative, override },
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [auth?.token, sessionId, chat, stepIdx, profile, scores, strengths, weaknesses, tasks, completedTasks, programs, chosenSchools, cvText, cvFile, essayText, essaySchool, essayQuestion, essays, documents, interviews, insights, narrative, override]);

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
    setAuth(null);
    sessionStorage.removeItem('pathway_admin_secret');
    setAdminSecret('');
    setAuthError('');
    setScreen('login'); setCandTab('advisor'); window.scrollTo(0, 0);
  }, [auth?.token, setAuth]);

  const resetSession = useCallback(() => {
    const confirmed = window.confirm('Are you sure? This will permanently delete your chat history, memory, and all files associated with it — profile, scores, school matches, uploaded documents, tasks, essays, and saved analysis.');
    if (!confirmed) return;
    // Kill any pending autosave so it can't re-persist the old session after the wipe.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    setChat(buildInitialChat(language));
    setStepIdx(0);
    setProfile(null); setScores(null); setStrengths(null); setWeaknesses(null);
    setTasks(null); setCompletedTasks({});
    setPrograms(null); setChosenSchools(null); setCvText(''); setCvFile(null); setEssayText(''); setEssaySchool('');
    setEssayQuestion(''); setEssays({}); setDocuments([]); setInterviews({});
    setInsights(null); setNarrative(null); setOverride(0);
    setJourneyStage(null); setAdvisorDirective(null);
    setCvDraft(''); setCvFileDraft(null); setCvExtra('');
    if (auth?.token) {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
      const wipe = () => fetch('/api/session', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ sessionId: nextSessionId }),
      }).then(r => { if (!r.ok) throw new Error('wipe failed'); });
      // Retry the wipe once; if it still fails, fall back to a blank overwrite so
      // the server never keeps the old chat/profile even on a flaky connection.
      wipe()
        .catch(() => wipe())
        .catch(() => fetch('/api/session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ data: { sessionId: nextSessionId } }),
        }).catch(() => {}));
    }
    setCandTab('advisor');
    showToast('Session deleted — chat, memory, and files cleared.');
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

  const send = useCallback(async (text) => {
    const raw_t = (text != null ? text : input).trim();
    if (!raw_t || busy) return;

    const selectingUndergrad = /^undergraduate$/i.test(raw_t);
    if (selectingUndergrad) {
      setProfile(prev => ({ ...(prev || {}), category: 'Undergraduate', degree: 'Undergraduate' }));
      setStepIdx(0);
      setCandTab('studentProfile');
    }

    if (plan === 'free' && scores) {
      setChat(prev => [...prev, { role: 'user', channel: 'web', text: raw_t }, { role: 'ai', channel: 'web', text: PLAN_UPGRADE_MESSAGE }]);
      setInput('');
      return;
    }

    const NEXT_KEYWORDS = /^(next|continue|move on|proceed|next step|go on)$/i;
    const t = NEXT_KEYWORDS.test(raw_t)
      ? 'Please advance to the next step of the pipeline and ask the appropriate next question.'
      : raw_t;

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
      const stage = buildStageContext(stepIdx, profile, scores, programs, essays, tasks, strengths, chat[0]?.timestamp, weaknesses);
      const systemContext = buildAISystemContext(stage);
      const legacyBody = { messages: newChat, aiConfig, language, conversationId: sessionId, profile, scores, programs: normalizeProgramList(programs) || programs, stage, systemContext };
      const useAdaptiveEndpoint = adaptiveGradEnabled && !isLegacyCandidateCategory(profile);
      const adaptiveBody = {
        message: t,
        conversationHistory: newChat.slice(0, -1),
        extra: { profile, scores, programs: normalizeProgramList(programs) || programs },
      };
      let res = await fetch(useAdaptiveEndpoint ? '/api/agents/orchestrate' : '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify(useAdaptiveEndpoint ? adaptiveBody : legacyBody),
      });
      let data = await res.json();
      if (useAdaptiveEndpoint && data?.fallThrough) {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          },
          body: JSON.stringify(legacyBody),
        });
        data = await res.json();
      }
      if (!res.ok) throw new Error(data.error || 'Advisor request failed.');
      const raw = data.raw || data.reply || '';

      if (raw) {
        const parsed = parseBlocks(raw);
        const category = parsed.profile?.category || profile?.category;
        const isUndergrad = category === 'Undergraduate';
        if (isUndergrad && candTab === 'advisor') setCandTab('studentProfile');
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.scores) {
          const overall = weightedOverallScore(parsed.scores, parsed.profile || profile);
          setScores({ ...parsed.scores, overall });
          setOverride(overall);
          setStepIdx(prev => Math.max(prev, isUndergrad ? 1 : 2));
        }
        if (parsed.strengths) setStrengths(parsed.strengths);
        if (parsed.weaknesses) setWeaknesses(parsed.weaknesses);
        // For legacy candidates, tasks come from parsing <TASKS> block; for adaptive,
        // they come directly in data.pendingTasks. Don't double-process for adaptive.
        if (!data.pendingTasks && parsed.tasks) {
          // Once a task is marked done it's treated as deleted — drop it permanently
          // the next time the AI refreshes the task list, instead of letting it reappear.
          const next = parsed.tasks.filter(t => !completedTasks[t]);
          console.log(`[App] Parsed ${parsed.tasks.length} tasks, keeping ${next.length} after filtering completed`);
          setTasks(next);
          setCompletedTasks({});
        } else if (!data.pendingTasks && raw.includes('<TASKS>')) {
          console.log(`[App] TASKS block found in response but failed to parse:`, raw.match(/<TASKS>[\s\S]*?<\/TASKS>/)?.[0]);
        }
        if (parsed.programs) {
          setPrograms(parsed.programs);
          setStepIdx(prev => Math.max(prev, isUndergrad ? 3 : 3));
        }
        if (parsed.chosenSchools) setChosenSchools(parsed.chosenSchools);
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
        const displayText = safeVisibleReply(raw, parsed, profile);

        // Auto-advance stepper based on stage-aware triggers
        const nextStep = getStageAdvancementTrigger(stepIdx, isUndergrad, displayText, parsed);
        if (nextStep !== null) {
          setStepIdx(prev => Math.max(prev, nextStep));
        }

        // ADAPTIVE_GRAD: handle open_screen and journey stage signals
        if (data.ui?.tab || data.openScreen) setCandTab(data.ui?.tab || data.openScreen);
        if (data.ui?.modal || data.openModal) {
          setAdvisorDirective({ modal: data.ui?.modal || data.openModal, nonce: Date.now() });
        }
        if (data.journeyStage) setJourneyStage(data.journeyStage);
        if (data.pendingTasks?.length) {
          // Filter out completed tasks and reset completed tracking for fresh task list
          const next = data.pendingTasks.filter(t => !completedTasks[t]);
          console.log(`[App] Using pendingTasks: ${data.pendingTasks.length} tasks, keeping ${next.length} after filtering completed`);
          setTasks(next);
          setCompletedTasks({});
        }

        setChat(prev => [...prev, { role: 'ai', channel: 'web', text: displayText }]);
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
  }, [input, chat, busy, aiConfig, plan, scores, profile, programs, completedTasks, language, sessionId, saveDocument, candTab, showToast, adaptiveGradEnabled, auth?.token]);

  // Sends a silent idle check-in to the AI without showing a user message in chat.
  // Only the AI response appears.
  const sendIdleCheckin = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const stage = buildStageContext(stepIdx, profile, scores, programs, essays, tasks, strengths, chat[0]?.timestamp, weaknesses);
      const systemContext = buildAISystemContext(stage);
      const idleMessages = [...chat, { role: 'user', channel: 'system', text: '__idle_checkin__' }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
        body: JSON.stringify({ messages: idleMessages, aiConfig, language, conversationId: sessionId, profile, scores, programs: normalizeProgramList(programs) || programs, stage, systemContext }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const raw = data.raw || data.reply || '';
      if (raw) {
        const parsed = parseBlocks(raw);
        const displayText = safeVisibleReply(raw, parsed, profile);
        if (displayText) setChat(prev => [...prev, { role: 'ai', channel: 'web', text: displayText }]);
      }
    } catch { /* silent — idle checkin failure must never break the UI */ } finally {
      setBusy(false);
    }
  }, [busy, chat, profile, scores, programs, essays, tasks, strengths, weaknesses, stepIdx, auth?.token, sessionId, language, aiConfig]);

  const submitCv = useCallback(() => {
    if (!cvDraft.trim() && !cvExtra.trim()) return;
    setCvText(cvDraft);
    setCvFile(cvFileDraft);
    saveDocument({
      name: cvFileDraft?.name || titleFromText(cvDraft, 'CV / Resume'),
      type: 'resume',
      source: cvFileDraft ? 'Upload' : 'Simulation',
      status: 'Ready',
      text: cvDraft,
      file: cvFileDraft,
      linkedWorkflow: 'my_cv',
    });
    setShowCvModal(false);
    const draft = cvDraft;
    const extra = cvExtra;
    setCvDraft('');
    setCvFileDraft(null);
    setCvExtra('');
    const combined = extra.trim()
      ? `Here is my CV/resume:\n\n${draft}\n\n---ADDITIONAL BACKGROUND---\n\n${extra}`
      : `Here is my CV/resume:\n\n${draft}`;
    send(combined);
  }, [cvDraft, cvFileDraft, cvExtra, send, saveDocument]);

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
            setCvDraft(data.text);
            setCvFileDraft(data.file || null);
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
    reader.onload = (ev) => { setCvDraft(ev.target.result || ''); setCvFileDraft(null); };
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
    sessionId, chat, setChat, input, setInput, busy,
    STEPS: currentSteps, UNDERGRAD_STEPS, stepIdx,
    currentConfig, currentTrack,
    profile, scores, setScores, strengths, weaknesses, programs, chosenSchools, setChosenSchools, insights,
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
    adaptiveGradEnabled, advisorDirective,
    requiresOAuthDetails, saveUserDetails, updateAuthUser, setProfile,
    login, register, adminAuth,
    journeyStage,
    go, signOut, send, sendIdleCheckin, submitCv, handleFileUpload, rewriteEssay, analyzeEssay, selectEssaySchool, resetSession, showToast,
    noop: () => showToast('This section is coming soon.'),
    forgot: () => showToast('Password reset link sent to your academic email.'),
  };

  return (
    <div style={{ fontFamily: "'Public Sans',system-ui,sans-serif", color: '#1c2433', minHeight: '100vh', background: '#eef1fc' }}>
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: '#16233f', color: '#fff', padding: '12px 22px', borderRadius: 10,
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
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#16233f', margin: 0 }}>Upload Your Profile</h2>
              <button onClick={() => { setShowCvModal(false); setCvDraft(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a93a3', fontSize: 26, lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <p style={{ fontSize: 14, color: '#7a8295', marginBottom: 16, lineHeight: 1.5 }}>
              Paste your CV or upload a file. Add honors, awards, major achievements, test scores, goals, and recommenders if they are not already clear.
            </p>

            {/* File upload row */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f4f6fb', border: '1.5px dashed #c5cde0', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', marginBottom: 12, fontSize: 13, color: '#6b7280', fontWeight: 600, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#16233f', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {cvDraft
                ? (cvFileDraft ? `Original saved: ${cvFileDraft.name}` : 'Text loaded — review below or upload another')
                : 'Upload PDF or Word (.docx) under 3 MB, or paste text below'}
              <input type="file" accept=".txt,.rtf,.pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginBottom: 8 }}>CV / RESUME</div>
              <textarea
                value={cvDraft}
                onChange={e => setCvDraft(e.target.value)}
                placeholder="Paste your CV, resume text, or work history…"
                style={{ width: '100%', height: 160, border: '1px solid #d7ddec', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1c2433', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ borderTop: '1px dashed #d7ddec', margin: '14px 0 14px', padding: '14px 0 0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginBottom: 4 }}>ADDITIONAL BACKGROUND DUMP <span style={{ color: '#b6bdcd', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
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
              <span style={{ fontSize: 12, color: '#b6bdcd', flex: 1 }}>{(cvDraft + ' ' + cvExtra).trim().split(/\s+/).filter(Boolean).length} words</span>
              <button onClick={() => { setShowCvModal(false); setCvDraft(''); setCvExtra(''); }} style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitCv} disabled={!cvDraft.trim() && !cvExtra.trim()} style={{ background: '#16233f', border: 'none', borderRadius: 9, padding: '11px 26px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: (cvDraft.trim() || cvExtra.trim()) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: (cvDraft.trim() || cvExtra.trim()) ? 1 : 0.5 }}>
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
