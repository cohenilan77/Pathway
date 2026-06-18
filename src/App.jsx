import React, { useState, useCallback, useRef, useEffect } from 'react';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Landing from './components/Landing.jsx';
import CandidatePortal from './components/candidate/CandidatePortal.jsx';
import AdminPortal from './components/admin/AdminPortal.jsx';
import ContactModal from './components/ContactModal.jsx';

export const STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV', 'Essay', 'Interview'];

const INITIAL_CHAT = [
  {
    role: 'ai',
    text: "Welcome to your Pathway Private Office. I'm your Lead Admissions Strategist — here to craft the narrative that gets you in.\n\nWhich degree are you targeting?",
  },
];

function parseBlocks(raw) {
  const extract = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };
  const clean = raw
    .replace(/<(PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|CHOSEN_SCHOOLS|INSIGHTS|ESSAY|INTERVIEW_RESULT)>[\s\S]*?<\/\1>/g, '')
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
  };
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

const SCORE_KEYS = ['academic', 'professional', 'leadership', 'narrative', 'potential'];

export default function App() {
  const [auth, setAuthState] = useState(loadAuth); // {token, user} | null

  const [screen, setScreen] = useState(() => (loadAuth() ? 'candidate' : 'login'));
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
  const [programs, setPrograms] = useState(null);
  const [chosenSchools, setChosenSchools] = useState(null);
  const [cvText, setCvText] = useState('');
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
  const [cvExtra, setCvExtra] = useState('');
  const [aiConfig, setAiConfigState] = useState(loadAiConfig);
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

  // Hydrate the candidate's session from the server whenever we have a token
  // (on initial load with a remembered token, and right after login/register).
  useEffect(() => {
    if (!auth?.token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/session', { headers: { Authorization: `Bearer ${auth.token}` } });
        if (!res.ok) throw new Error('unauthorized');
        const { data } = await res.json();
        if (cancelled) return;
        setChat(data?.chat?.length ? data.chat : INITIAL_CHAT);
        setStepIdx(data?.stepIdx || 0);
        setProfile(data?.profile || null);
        setScores(data?.scores || null);
        setStrengths(data?.strengths || null);
        setWeaknesses(data?.weaknesses || null);
        setPrograms(data?.programs || null);
        setChosenSchools(data?.chosenSchools || null);
        setCvText(data?.cvText || '');
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

  // Persist the candidate's session to their account, debounced
  useEffect(() => {
    if (!auth?.token || chat.length <= 1) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          data: { chat, stepIdx, profile, scores, strengths, weaknesses, programs, chosenSchools, cvText, essayText, essaySchool, essayQuestion, essays, interviews, insights, narrative, override },
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [auth?.token, chat, stepIdx, profile, scores, strengths, weaknesses, programs, chosenSchools, cvText, essayText, essaySchool, essayQuestion, essays, interviews, insights, narrative, override]);

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
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Login failed.'); return; }
      setAuth({ token: data.token, user: data.user });
      setScreen('candidate'); window.scrollTo(0, 0);
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
    setChat(INITIAL_CHAT);
    setStepIdx(0);
    setProfile(null); setScores(null); setStrengths(null); setWeaknesses(null);
    setPrograms(null); setChosenSchools(null); setCvText(''); setEssayText(''); setEssaySchool('');
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
  }, [auth?.token, showToast]);

  const send = useCallback(async (text) => {
    const raw_t = (text != null ? text : input).trim();
    if (!raw_t || busy) return;
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newChat, aiConfig }),
      });
      const data = await res.json();
      const raw = data.raw || data.reply || '';

      if (raw) {
        const parsed = parseBlocks(raw);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.scores) {
          const vals = SCORE_KEYS.map(k => parsed.scores[k]).filter(v => typeof v === 'number' && !isNaN(v));
          const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          setScores({ ...parsed.scores, overall });
          setOverride(overall);
          setStepIdx(prev => Math.max(prev, 2));
        }
        if (parsed.strengths) setStrengths(parsed.strengths);
        if (parsed.weaknesses) setWeaknesses(parsed.weaknesses);
        if (parsed.programs) {
          setPrograms(parsed.programs);
          setStepIdx(prev => Math.max(prev, 3));
        }
        if (parsed.chosenSchools) setChosenSchools(parsed.chosenSchools);
        if (parsed.insights) setInsights(parsed.insights);
        if (parsed.essay && parsed.essay.school) {
          setEssays(prev => ({ ...prev, [parsed.essay.school]: { question: parsed.essay.question || '', text: parsed.essay.text || '' } }));
          setEssaySchool(parsed.essay.school);
          setEssayQuestion(parsed.essay.question || '');
          setEssayText(parsed.essay.text || '');
          setStepIdx(prev => Math.max(prev, 7));
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
        const displayText = parsed.clean || raw;

        // Auto-advance stepper based on AI response keywords
        const lc = displayText.toLowerCase();
        if (lc.includes('convinced you this is the right path') || lc.includes("what's the specific moment")) {
          setStepIdx(prev => Math.max(prev, 4));
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

        setChat(prev => [...prev, { role: 'ai', text: displayText }]);
      } else {
        setChat(prev => [...prev, { role: 'ai', text: data.error || 'Connection issue. Please try again.' }]);
      }
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Connection issue. Please try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  }, [input, chat, busy, aiConfig]);

  const submitCv = useCallback(() => {
    if (!cvDraft.trim() && !cvExtra.trim()) return;
    setCvText(cvDraft);
    setShowCvModal(false);
    const draft = cvDraft;
    const extra = cvExtra;
    setCvDraft('');
    setCvExtra('');
    const combined = extra.trim()
      ? `Here is my CV/resume:\n\n${draft}\n\n---ADDITIONAL BACKGROUND---\n\n${extra}`
      : `Here is my CV/resume:\n\n${draft}`;
    send(combined);
  }, [cvDraft, cvExtra, send]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (['doc', 'docx'].includes(ext)) {
      showToast('Word files not supported — save as PDF, or paste the text directly.');
      e.target.value = '';
      return;
    }

    if (ext === 'pdf') {
      showToast('Extracting text from PDF…');
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        try {
          const res = await fetch('/api/parse-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, mediaType: 'application/pdf' }),
          });
          const data = await res.json();
          if (data.text) { setCvDraft(data.text); showToast('PDF loaded — review the text below.'); }
          else showToast('Could not extract PDF text — please paste it manually.');
        } catch { showToast('PDF extraction failed — please paste the text manually.'); }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    // .txt / .rtf
    const reader = new FileReader();
    reader.onload = (ev) => setCvDraft(ev.target.result || '');
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
    STEPS, stepIdx,
    profile, scores, setScores, strengths, weaknesses, programs, chosenSchools, insights,
    cvText, setCvText,
    essayText, setEssayText,
    essaySchool, setEssaySchool,
    essayQuestion, setEssayQuestion,
    essays, interviews,
    showCvModal, setShowCvModal,
    showContactModal, setShowContactModal,
    cvDraft, setCvDraft,
    aiConfig, setAiConfig,
    authUser: auth?.user || null, authError, authBusy, adminSecret,
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
              {cvDraft ? '✓ File loaded — review below or upload another' : 'Upload PDF or .txt file (or paste text below)'}
              <input type="file" accept=".txt,.rtf,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
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
                placeholder="e.g. I was born in Brazil, started my career in banking, switched to tech startup... My GMAT is 710. My recommenders are my VP at Goldman and my professor at NYU..."
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
      {screen === 'candidate' && <CandidatePortal {...sharedProps} />}
      {screen === 'admin' && <AdminPortal {...sharedProps} />}
    </div>
  );
}
