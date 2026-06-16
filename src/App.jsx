import React, { useState, useCallback, useRef, useEffect } from 'react';
import Login from './components/Login.jsx';
import Landing from './components/Landing.jsx';
import CandidatePortal from './components/candidate/CandidatePortal.jsx';
import AdminPortal from './components/admin/AdminPortal.jsx';

export const STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV'];

const INITIAL_CHAT = [
  {
    role: 'ai',
    text: "Welcome to your Pathway Private Office. I'm your Lead Admissions Strategist — here to engineer a narrative that top-tier institutions can't ignore.\n\nWhat type of program are you targeting — MBA, Masters, PhD, or undergraduate? And to fast-track your analysis, feel free to paste your CV using the button below.",
  },
];

function parseBlocks(raw) {
  const extract = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };
  const clean = raw
    .replace(/<(PROFILE|SCORES|STRENGTHS|WEAKNESSES|PROGRAMS|INSIGHTS)>[\s\S]*?<\/\1>/g, '')
    .trim();
  return {
    clean,
    profile: extract('PROFILE'),
    scores: extract('SCORES'),
    strengths: extract('STRENGTHS'),
    weaknesses: extract('WEAKNESSES'),
    programs: extract('PROGRAMS'),
    insights: extract('INSIGHTS'),
  };
}

function loadSession() {
  try {
    const s = localStorage.getItem('pathway_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function App() {
  const saved = loadSession();

  const [screen, setScreen] = useState('login');
  const [role, setRole] = useState('candidate');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [candTab, setCandTab] = useState('advisor');
  const [docTab, setDocTab] = useState('editor');
  const [adminTab, setAdminTab] = useState('feed');
  const [sel, setSel] = useState(0);
  const [narrative, setNarrative] = useState(saved?.narrative || null);
  const [toast, setToast] = useState('');
  const [chat, setChat] = useState(saved?.chat || INITIAL_CHAT);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(saved?.stepIdx || 0);
  const [profile, setProfile] = useState(saved?.profile || null);
  const [scores, setScores] = useState(saved?.scores || null);
  const [strengths, setStrengths] = useState(saved?.strengths || null);
  const [weaknesses, setWeaknesses] = useState(saved?.weaknesses || null);
  const [programs, setPrograms] = useState(saved?.programs || null);
  const [cvText, setCvText] = useState(saved?.cvText || '');
  const [essayText, setEssayText] = useState(saved?.essayText || '');
  const [essaySchool, setEssaySchool] = useState(saved?.essaySchool || '');
  const [insights, setInsights] = useState(saved?.insights || null);
  const [override, setOverride] = useState(saved?.scores?.overall || 0);
  const [showCvModal, setShowCvModal] = useState(false);
  const [cvDraft, setCvDraft] = useState('');
  const toastTimerRef = useRef(null);

  // Persist session on every meaningful change
  useEffect(() => {
    if (chat.length > 1) {
      localStorage.setItem('pathway_session', JSON.stringify({
        chat, stepIdx, profile, scores, strengths, weaknesses,
        programs, cvText, essayText, essaySchool, insights, narrative,
      }));
    }
  }, [chat, stepIdx, profile, scores, strengths, weaknesses, programs, cvText, essayText, essaySchool, insights, narrative]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const go = useCallback((s) => { setScreen(s); window.scrollTo(0, 0); }, []);
  const enter = useCallback(() => { setScreen(role === 'consultant' ? 'admin' : 'candidate'); window.scrollTo(0, 0); }, [role]);
  const signOut = useCallback(() => { setScreen('login'); setCandTab('advisor'); window.scrollTo(0, 0); }, []);

  const resetSession = useCallback(() => {
    localStorage.removeItem('pathway_session');
    setChat(INITIAL_CHAT);
    setStepIdx(0);
    setProfile(null); setScores(null); setStrengths(null); setWeaknesses(null);
    setPrograms(null); setCvText(''); setEssayText(''); setEssaySchool('');
    setInsights(null); setNarrative(null);
    showToast('Session cleared — starting fresh.');
  }, [showToast]);

  const send = useCallback(async (text) => {
    const t = (text != null ? text : input).trim();
    if (!t || busy) return;

    const userMsg = { role: 'user', text: t };
    const newChat = [...chat, userMsg];
    setChat(newChat);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newChat }),
      });
      const data = await res.json();
      const raw = data.raw || data.reply || '';

      if (raw) {
        const parsed = parseBlocks(raw);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.scores) {
          const vals = Object.values(parsed.scores);
          const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
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
        if (parsed.insights) setInsights(parsed.insights);
        const displayText = parsed.clean || raw;
        setChat(prev => [...prev, { role: 'ai', text: displayText }]);
        if (!parsed.scores && !parsed.programs) {
          setStepIdx(prev => Math.min(prev + 1, STEPS.length - 1));
        }
      } else {
        setChat(prev => [...prev, { role: 'ai', text: data.error || 'Connection issue. Please try again.' }]);
      }
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Connection issue. Please try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  }, [input, chat, busy]);

  const submitCv = useCallback(() => {
    if (!cvDraft.trim()) return;
    setCvText(cvDraft);
    setShowCvModal(false);
    const draft = cvDraft;
    setCvDraft('');
    send(`Here is my CV/resume:\n\n${draft}`);
  }, [cvDraft, send]);

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
      if (data.result) { setEssayText(data.result); showToast('Essay rewritten by AI.'); }
      else showToast('Rewrite failed. Check your API key.');
    } catch { showToast('Rewrite failed. Please try again.'); }
    finally { setBusy(false); }
  }, [essayText, essaySchool, narrative, showToast]);

  const analyzeEssay = useCallback(() => {
    if (!essayText.trim()) { showToast('Paste your essay text first.'); return; }
    const msg = `Please analyze this essay draft${essaySchool ? ` for ${essaySchool}` : ''} and give me specific, actionable feedback:\n\n${essayText}`;
    setCandTab('advisor');
    send(msg);
  }, [essayText, essaySchool, send, showToast]);

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
    chat, input, setInput, busy,
    STEPS, stepIdx,
    profile, scores, strengths, weaknesses, programs, insights,
    cvText, setCvText,
    essayText, setEssayText,
    essaySchool, setEssaySchool,
    showCvModal, setShowCvModal,
    cvDraft, setCvDraft,
    go, enter, signOut, send, submitCv, rewriteEssay, analyzeEssay, resetSession, showToast,
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

      {/* CV Paste Modal */}
      {showCvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,48,.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 36, width: '100%', maxWidth: 600, boxShadow: '0 24px 60px rgba(15,26,48,.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#16233f', margin: 0 }}>Paste Your CV</h2>
              <button onClick={() => setShowCvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a93a3', fontSize: 26, lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <p style={{ fontSize: 14, color: '#7a8295', marginBottom: 16, lineHeight: 1.5 }}>Paste your full CV or resume. Claude will extract your profile, score your competitiveness, and personalize your entire strategy in one step.</p>
            <textarea
              autoFocus
              value={cvDraft}
              onChange={e => setCvDraft(e.target.value)}
              placeholder="Paste your full CV or resume text here..."
              style={{ width: '100%', height: 260, border: '1px solid #d7ddec', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1c2433', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCvModal(false)} style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitCv} disabled={!cvDraft.trim()} style={{ background: '#16233f', border: 'none', borderRadius: 9, padding: '11px 26px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: cvDraft.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: cvDraft.trim() ? 1 : 0.5 }}>
                Analyze My CV →
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'login' && <Login {...sharedProps} />}
      {screen === 'landing' && <Landing {...sharedProps} />}
      {screen === 'candidate' && <CandidatePortal {...sharedProps} />}
      {screen === 'admin' && <AdminPortal {...sharedProps} />}
    </div>
  );
}
