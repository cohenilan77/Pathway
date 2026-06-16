import React, { useState, useCallback, useRef, useEffect } from 'react';
import Login from './components/Login.jsx';
import Landing from './components/Landing.jsx';
import CandidatePortal from './components/candidate/CandidatePortal.jsx';
import AdminPortal from './components/admin/AdminPortal.jsx';
import ContactModal from './components/ContactModal.jsx';

export const STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV'];

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

const SCORE_KEYS = ['academic', 'professional', 'leadership', 'narrative', 'potential'];

export default function App() {
  const [saved] = useState(loadSession); // called once, not on every render

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
  const [override, setOverride] = useState(saved?.override ?? saved?.scores?.overall ?? 0);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [cvDraft, setCvDraft] = useState('');
  const toastTimerRef = useRef(null);

  // Persist session on every meaningful change
  useEffect(() => {
    if (chat.length > 1) {
      localStorage.setItem('pathway_session', JSON.stringify({
        chat, stepIdx, profile, scores, strengths, weaknesses,
        programs, cvText, essayText, essaySchool, insights, narrative, override,
      }));
    }
  }, [chat, stepIdx, profile, scores, strengths, weaknesses, programs, cvText, essayText, essaySchool, insights, narrative, override]);

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
        body: JSON.stringify({ messages: newChat }),
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
        if (parsed.insights) setInsights(parsed.insights);
        const displayText = parsed.clean || raw;
        setChat(prev => [...prev, { role: 'ai', text: displayText }]);
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

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(ext)) {
      showToast('PDF/Word files can\'t be read directly — please copy-paste the text content instead.');
      e.target.value = '';
      return;
    }
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
    chat, setChat, input, setInput, busy,
    STEPS, stepIdx,
    profile, scores, setScores, strengths, weaknesses, programs, insights,
    cvText, setCvText,
    essayText, setEssayText,
    essaySchool, setEssaySchool,
    showCvModal, setShowCvModal,
    showContactModal, setShowContactModal,
    cvDraft, setCvDraft,
    go, enter, signOut, send, submitCv, handleFileUpload, rewriteEssay, analyzeEssay, resetSession, showToast,
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
              Paste your CV, upload a file, or paste any background info. Claude will extract your full profile, score your competitiveness, and personalize your strategy in one step.
            </p>

            {/* File upload row */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f4f6fb', border: '1.5px dashed #c5cde0', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', marginBottom: 12, fontSize: 13, color: '#6b7280', fontWeight: 600, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#16233f', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {cvDraft ? '✓ File loaded — review below or upload another' : 'Upload file (.txt) or paste CV text below'}
              <input type="file" accept=".txt,.rtf,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginBottom: 8 }}>OR PASTE TEXT BELOW</div>
              <textarea
                value={cvDraft}
                onChange={e => setCvDraft(e.target.value)}
                placeholder="Paste your CV, resume, or any background info (work history, education, test scores, goals)…"
                style={{ width: '100%', height: 220, border: '1px solid #d7ddec', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1c2433', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 14, justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#b6bdcd', flex: 1 }}>{cvDraft.trim().split(/\s+/).filter(Boolean).length} words</span>
              <button onClick={() => { setShowCvModal(false); setCvDraft(''); }} style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitCv} disabled={!cvDraft.trim()} style={{ background: '#16233f', border: 'none', borderRadius: 9, padding: '11px 26px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: cvDraft.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: cvDraft.trim() ? 1 : 0.5 }}>
                Analyze →
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} profile={profile} />}

      {screen === 'login' && <Login {...sharedProps} />}
      {screen === 'landing' && <Landing {...sharedProps} />}
      {screen === 'candidate' && <CandidatePortal {...sharedProps} />}
      {screen === 'admin' && <AdminPortal {...sharedProps} />}
    </div>
  );
}
