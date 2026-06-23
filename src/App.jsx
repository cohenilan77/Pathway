import React, { useState, useCallback, useRef, useEffect } from 'react';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Landing from './components/Landing.jsx';
import LegalPage from './components/LegalPage.jsx';
import CandidatePortal from './components/candidate/CandidatePortal.jsx';
import AdminPortal from './components/admin/AdminPortal.jsx';
import ContactModal from './components/ContactModal.jsx';
import { LANGUAGES } from './constants.js';

export const STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV', 'Essay', 'Interview'];
export const UNDERGRAD_STEPS = ['Foundation', 'Academic Plan', 'Profile Building', 'Testing', 'University List', 'Essays', 'Applications'];

export const TRACK_CONFIG = {
  Undergraduate: {
    scoreLabel: 'Application Readiness',
    steps: UNDERGRAD_STEPS,
    docLabel: 'CV, action plan, skills plan, university applications',
  },
  Graduate: {
    scoreLabel: 'Competitiveness Score',
    steps: STEPS,
    docLabel: 'CV, essays, SOP, recommendations',
  },
  'Postgraduate / Doctoral': {
    scoreLabel: 'Research Readiness',
    steps: ['Profile', 'Academic Depth', 'Research Experience', 'Research Direction', 'Supervisor Fit', 'Proposal', 'Writing Sample', 'Recommendations', 'Interview'],
    docLabel: 'Research proposal, writing sample, CV, papers',
  },
  'Personal Development': {
    scoreLabel: 'Growth Score',
    steps: ['Profile', 'Goals', 'Strengths', 'Gaps', 'Skills Plan', 'Experience Plan', 'Personal Brand', 'Execution', 'Review'],
    docLabel: 'CV, action plan, skills plan, portfolio',
  },
};

export const PLANS = {
  free: { label: 'Free' },
  ai: { label: 'AI' },
  ai_strategy: { label: 'AI + Strategy' },
};

const PLAN_UPGRADE_MESSAGE = "You've reached the end of the Free plan. Please upgrade in Settings to continue with AI guidance, or choose AI + Strategy to add Live Chat with your consultant.";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const WELCOME_MESSAGE = {
  English: "Welcome to your Pathway Private Office. I'm your Lead Admissions Strategist — here to craft the narrative that gets you in.\n\nLet's start with where you are in your journey. Which best describes you?\nUndergraduate | Graduate | Postgraduate / Doctoral | Personal Development",
  Spanish: "Bienvenido a tu Oficina Privada Pathway. Soy tu Estratega Principal de Admisiones — aquí para construir la narrativa que te abrirá las puertas.\n\nEmpecemos por saber en qué etapa de tu camino estás. ¿Cuál te describe mejor?\nPregrado | Posgrado | Posgrado / Doctorado | Desarrollo Personal",
  Hebrew: "ברוכים הבאים ללשכה הפרטית שלך ב-Pathway. אני האסטרטג הראשי שלך לקבלה ללימודים — כאן כדי לבנות את הסיפור שיכניס אותך.\n\nנתחיל בלברר באיזה שלב במסע שלך אתה נמצא. מה הכי מתאר אותך?\nתואר ראשון | תואר שני | לימודים מתקדמים / דוקטורט | התפתחות אישית",
  Arabic: "مرحبًا بك في مكتبك الخاص في Pathway. أنا كبير استراتيجيي القبول لديك — هنا لصياغة القصة التي ستضمن قبولك.\n\nلنبدأ بمعرفة أين أنت في رحلتك. ما الذي يصفك أكثر؟\nبكالوريوس | دراسات عليا | دراسات عليا / دكتوراه | تطوير شخصي",
  Chinese: "欢迎来到您的 Pathway 私人办公室。我是您的首席招生策略师——在这里为您打造能助您成功录取的故事。\n\n让我们先了解您目前的阶段。以下哪项最符合您的情况？\n本科 | 研究生 | 研究生／博士 | 个人发展",
  French: "Bienvenue dans votre Bureau Privé Pathway. Je suis votre Stratège Principal en Admissions — ici pour construire le récit qui vous fera accepter.\n\nCommençons par savoir où vous en êtes dans votre parcours. Qu'est-ce qui vous décrit le mieux ?\nLicence | Master | Doctorat / Postdoctorat | Développement Personnel",
  Portuguese: "Bem-vindo ao seu Escritório Privado Pathway. Sou o seu Estrategista Principal de Admissões — aqui para construir a narrativa que vai garantir a sua aceitação.\n\nVamos começar por saber em que fase da sua jornada está. O que melhor o descreve?\nGraduação | Mestrado | Pós-graduação / Doutorado | Desenvolvimento Pessoal",
};

function buildInitialChat(language) {
  return [{ role: 'ai', text: WELCOME_MESSAGE[language] || WELCOME_MESSAGE.English }];
}

const INITIAL_CHAT = buildInitialChat('English');

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
  const clean = raw
    .replace(/<(PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT|TASKS)>[\s\S]*?<\/\1>/g, '')
    .trim();
  return {
    clean,
    profile: extract('PROFILE'),
    scores: extract('SCORES'),
    strengths: extract('STRENGTHS'),
    weaknesses: extract('WEAKNESSES'),
    programs: extract('PROGRAMS'),
    chosenSchools: extract('CHOSEN_SCHOOLS'),
    insights: extract('INSIGHTS'),
    essay: extract('ESSAY'),
    interviewResult: extract('INTERVIEW_RESULT'),
    tasks: extract('TASKS'),
  };
}

function safeVisibleReply(raw, parsed) {
  const clean = (parsed.clean || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<\/?(PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT|TASKS)>/g, '')
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/\b(tool_use|tool_code|function_calls)\b[\s\S]*$/gi, '')
    .trim();
  if (clean) return clean;
  if (parsed.programs) return 'Your portfolio is live in the Analysis tab.';
  if (parsed.chosenSchools) return 'Your target schools are saved.';
  if (parsed.essay) return 'Your essay draft is saved in Documents.';
  if (parsed.interviewResult) return 'Your interview results are saved.';
  if (parsed.scores || parsed.profile) return 'Your profile analysis is live in the Analysis tab.';
  return raw.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').trim() || 'Done — I updated your workspace.';
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

const SCORE_KEYS = ['academic', 'testScore', 'professional', 'leadership', 'volunteering', 'uniqueness', 'diversity', 'goalClarity', 'narrative', 'potential'];

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
  const [interviews, setInterviews] = useState({});
  const [insights, setInsights] = useState(null);
  const [override, setOverride] = useState(0);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [cvDraft, setCvDraft] = useState('');
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
        setChat(data?.chat?.length ? data.chat : INITIAL_CHAT);
        setStepIdx(data?.stepIdx || 0);
        setProfile(data?.profile || null);
        setScores(data?.scores || null);
        setStrengths(data?.strengths || null);
        setWeaknesses(data?.weaknesses || null);
        setTasks(data?.tasks || null);
        setCompletedTasks(data?.completedTasks || {});
        setPrograms(data?.programs || null);
        setChosenSchools(data?.chosenSchools || null);
        setCvText(data?.cvText || '');
        setCvFile(data?.cvFile || null);
        setEssayText(data?.essayText || '');
        setEssaySchool(data?.essaySchool || '');
        setEssayQuestion(data?.essayQuestion || '');
        setEssays(data?.essays || {});
        setInterviews(data?.interviews || {});
        setInsights(data?.insights || null);
        setNarrative(data?.narrative || null);
        setOverride(data?.override ?? data?.scores?.overall ?? 0);
      } catch {
        if (!cancelled) { setAuth(null); setScreen('login'); }
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.token, setAuth]);

  const requiresOAuthDetails = !!auth?.user?.oauthProvider && !auth.user.oauthDetailsConfirmed;

  useEffect(() => {
    if (screen === 'candidate' && requiresOAuthDetails) setCandTab('settings');
  }, [screen, requiresOAuthDetails]);

  // Persist the candidate's session to their account, debounced
  useEffect(() => {
    if (!auth?.token || chat.length <= 1) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          data: { chat, stepIdx, profile, scores, strengths, weaknesses, tasks, completedTasks, programs, chosenSchools, cvText, cvFile, essayText, essaySchool, essayQuestion, essays, interviews, insights, narrative, override },
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [auth?.token, chat, stepIdx, profile, scores, strengths, weaknesses, tasks, completedTasks, programs, chosenSchools, cvText, cvFile, essayText, essaySchool, essayQuestion, essays, interviews, insights, narrative, override]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  }, []);

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
    setAuth(null);
    sessionStorage.removeItem('pathway_admin_secret');
    setAdminSecret('');
    setAuthError('');
    setScreen('login'); setCandTab('advisor'); window.scrollTo(0, 0);
  }, [setAuth]);

  const resetSession = useCallback(() => {
    setChat(buildInitialChat(language));
    setStepIdx(0);
    setProfile(null); setScores(null); setStrengths(null); setWeaknesses(null);
    setTasks(null); setCompletedTasks({});
    setPrograms(null); setChosenSchools(null); setCvText(''); setCvFile(null); setEssayText(''); setEssaySchool('');
    setEssayQuestion(''); setEssays({}); setInterviews({});
    setInsights(null); setNarrative(null); setOverride(0);
    if (auth?.token) {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ data: {} }),
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

  const send = useCallback(async (text) => {
    const raw_t = (text != null ? text : input).trim();
    if (!raw_t || busy) return;

    if (plan === 'free' && scores) {
      setChat(prev => [...prev, { role: 'user', text: raw_t }, { role: 'ai', text: PLAN_UPGRADE_MESSAGE }]);
      setInput('');
      return;
    }

    const NEXT_KEYWORDS = /^(next|continue|move on|proceed|next step|go on)$/i;
    const t = NEXT_KEYWORDS.test(raw_t)
      ? 'Please advance to the next step of the pipeline and ask the appropriate next question.'
      : raw_t;

    const userMsg = { role: 'user', text: t };
    // If re-submitting CV, replace the previous CV message to avoid duplicates in context
    const baseChat = t.startsWith('Here is my CV')
      ? chat.filter(m => !(m.role === 'user' && m.text.startsWith('Here is my CV')))
      : chat;
    const newChat = [...baseChat, userMsg];
    setChat(newChat);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ messages: newChat, aiConfig, language, profile, scores, programs }),
      });
      const data = await res.json();
      const raw = data.raw || data.reply || '';

      if (raw) {
        const parsed = parseBlocks(raw);
        const category = parsed.profile?.category || profile?.category;
        const isUndergrad = category === 'Undergraduate';
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.scores) {
          const vals = SCORE_KEYS.map(k => parsed.scores[k]).filter(v => typeof v === 'number' && !isNaN(v));
          const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
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
        if (parsed.programs) {
          setPrograms(parsed.programs);
          setStepIdx(prev => Math.max(prev, isUndergrad ? 4 : 3));
        }
        if (parsed.chosenSchools) setChosenSchools(parsed.chosenSchools);
        if (parsed.insights) setInsights(parsed.insights);
        if (parsed.essay && parsed.essay.school) {
          setEssays(prev => ({ ...prev, [parsed.essay.school]: { question: parsed.essay.question || '', text: parsed.essay.text || '' } }));
          setEssaySchool(parsed.essay.school);
          setEssayQuestion(parsed.essay.question || '');
          setEssayText(parsed.essay.text || '');
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
        const displayText = safeVisibleReply(raw, parsed);

        // Auto-advance stepper based on AI response keywords
        const lc = displayText.toLowerCase();
        if (isUndergrad) {
          if (lc.includes("let's map your academic plan")) {
            setStepIdx(prev => Math.max(prev, 1));
          }
          if (lc.includes("let's build your extracurricular profile")) {
            setStepIdx(prev => Math.max(prev, 2));
          }
          if (lc.includes("let's plan your testing timeline")) {
            setStepIdx(prev => Math.max(prev, 3));
          }
          if (lc.includes("let's build your university list")) {
            setStepIdx(prev => Math.max(prev, 4));
          }
          if (lc.includes("let's begin your essay workshop")) {
            setStepIdx(prev => Math.max(prev, 5));
          }
          if (lc.includes("let's finalize your application strategy")) {
            setStepIdx(prev => Math.max(prev, 6));
          }
        } else {
          if (lc.includes('convinced you this is the right path') || lc.includes("what's the specific moment")) {
            setStepIdx(prev => Math.max(prev, 4));
          }
          if (lc.includes('narrative strategy tab') || lc.includes('choose upgrade or pivot') || lc.includes('two narrative options')) {
            setStepIdx(prev => Math.max(prev, 4));
            setCandTab('strategy');
          }
          if (lc.includes('paste a cv section') || (lc.includes('action verbs') && lc.includes('quantified'))) {
            setStepIdx(prev => Math.max(prev, 5));
          }
          if (lc.includes("let's craft your essays") || (lc.includes('essay prompt') && lc.includes('school'))) {
            setStepIdx(prev => Math.max(prev, 6));
          }
          if (lc.includes('time for your mock interview') || lc.includes('simulate the admissions interview')) {
            setStepIdx(prev => Math.max(prev, 7));
          }
        }

        setChat(prev => [...prev, { role: 'ai', text: displayText }]);
      } else {
        setChat(prev => [...prev, { role: 'ai', text: data.error || 'Connection issue. Please try again.' }]);
      }
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Connection issue. Please try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  }, [input, chat, busy, aiConfig, plan, scores, profile, programs, completedTasks, language]);

  const submitCv = useCallback(() => {
    if (!cvDraft.trim() && !cvExtra.trim()) return;
    setCvText(cvDraft);
    setCvFile(cvFileDraft);
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
  }, [cvDraft, cvFileDraft, cvExtra, send]);

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, mediaType, fileName: file.name }),
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
  }, [showToast]);

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
        showToast('Essay rewritten by AI.');
      }
      else showToast('Rewrite failed. Check your API key.');
    } catch { showToast('Rewrite failed. Please try again.'); }
    finally { setBusy(false); }
  }, [essayText, essaySchool, essayQuestion, narrative, showToast]);

  const analyzeEssay = useCallback(() => {
    if (!essayText.trim()) { showToast('Paste your essay text first.'); return; }
    const msg = `Please analyze this essay draft${essaySchool ? ` for ${essaySchool}` : ''}${essayQuestion ? ` (prompt: "${essayQuestion}")` : ''} and give me specific, actionable feedback:\n\n${essayText}`;
    setCandTab('advisor');
    send(msg);
  }, [essayText, essaySchool, essayQuestion, send, showToast]);

  const selectEssaySchool = useCallback((school) => {
    if (essaySchool && essaySchool !== school) {
      setEssays(prev => ({ ...prev, [essaySchool]: { question: essayQuestion, text: essayText } }));
    }
    setEssaySchool(school);
    const existing = essays[school];
    setEssayQuestion(existing?.question || '');
    setEssayText(existing?.text || '');
  }, [essaySchool, essayQuestion, essayText, essays]);

  const currentTrack = profile?.category || 'Graduate';
  const currentConfig = TRACK_CONFIG[currentTrack] || TRACK_CONFIG.Graduate;
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
    chat, setChat, input, setInput, busy,
    STEPS: currentSteps, UNDERGRAD_STEPS, stepIdx,
    currentConfig, currentTrack,
    profile, scores, setScores, strengths, weaknesses, programs, chosenSchools, setChosenSchools, insights,
    tasks, completedTasks, setCompletedTasks,
    cvText, setCvText, cvFile, setCvFile,
    essayText, setEssayText,
    essaySchool, setEssaySchool,
    essayQuestion, setEssayQuestion,
    essays, interviews,
    showCvModal, setShowCvModal,
    showContactModal, setShowContactModal,
    cvDraft, setCvDraft,
    aiConfig, setAiConfig,
    plan, setPlan,
    language, setLanguage,
    authUser: auth?.user || null, authToken: auth?.token || null, authError, authBusy, adminSecret,
    requiresOAuthDetails, saveUserDetails,
    login, register, adminAuth,
    go, signOut, send, submitCv, handleFileUpload, rewriteEssay, analyzeEssay, selectEssaySchool, resetSession, showToast,
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
              Paste your CV, upload a file, or share a <strong style={{ color: '#16233f' }}>background dump</strong> — anything about yourself: work history, achievements, experiences, test scores, recommender names, personal story. The more context, the sharper your strategy.
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
                Anything else: personal story, achievements, test scores, recommenders, career pivot context, life experiences not in your CV.
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
