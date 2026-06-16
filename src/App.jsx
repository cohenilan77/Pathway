import React, { useState, useCallback, useRef } from 'react';
import Login from './components/Login.jsx';
import Landing from './components/Landing.jsx';
import CandidatePortal from './components/candidate/CandidatePortal.jsx';
import AdminPortal from './components/admin/AdminPortal.jsx';

const STEPS = ['Profile', 'Recommender', 'Analysis', 'Programs', 'Narrative', 'Fit', 'CV'];

const CANDIDATES = [
  { name: 'Julian Thorne', sub: 'Economics @ Stanford', mono: 'JT', step: 'Fit Analysis', stepKind: 'gold', score: 88, activity: '2m ago', avatar: '#dbe3f5', avatarFg: '#2b3c63' },
  { name: 'Elena Rodriguez', sub: 'Law @ Yale', mono: 'ER', step: 'Initial Intake', stepKind: 'soft', score: 72, activity: '14h ago', avatar: '#f6dcc0', avatarFg: '#a9682c' },
  { name: 'Marcus Chen', sub: 'CS @ MIT', mono: 'MC', step: 'Interview Prep', stepKind: 'navy', score: 94, activity: '1d ago', avatar: '#1f2d4d', avatarFg: '#ffffff' },
  { name: 'Sophia Laurent', sub: 'Fine Arts @ RISD', mono: 'SL', step: 'Risk Alert', stepKind: 'red', score: 45, activity: '3h ago', avatar: '#f3d97e', avatarFg: '#6b531a' },
];

const INITIAL_CHAT = [
  { role: 'ai', text: 'Welcome to your Pathway Private Office. I am your Lead Admissions Strategist. We are not just filling out forms — we are engineering a narrative that top-tier institutions cannot ignore.' },
  { role: 'ai', text: 'To begin our calibration, I have analyzed your initial data points. Your professional trajectory is strong, but your academic narrative requires more aggressive positioning to match Elite graduate program benchmarks.' },
];

export { STEPS, CANDIDATES };

export default function App() {
  const [screen, setScreen] = useState('login');
  const [role, setRole] = useState('candidate');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [candTab, setCandTab] = useState('advisor');
  const [docTab, setDocTab] = useState('editor');
  const [stepIdx, setStepIdx] = useState(0);
  const [adminTab, setAdminTab] = useState('feed');
  const [sel, setSel] = useState(0);
  const [override, setOverride] = useState(88);
  const [narrative, setNarrative] = useState(null);
  const [toast, setToast] = useState('');
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const go = useCallback((s) => {
    setScreen(s);
    window.scrollTo(0, 0);
  }, []);

  const enter = useCallback(() => {
    setScreen(role === 'consultant' ? 'admin' : 'candidate');
    window.scrollTo(0, 0);
  }, [role]);

  const signOut = useCallback(() => {
    setScreen('login');
    setCandTab('advisor');
    window.scrollTo(0, 0);
  }, []);

  const send = useCallback(async (text) => {
    const t = (text != null ? text : input).trim();
    if (!t || busy) return;

    const userMsg = { role: 'user', text: t };
    const newChat = [...chat, userMsg];
    setChat(newChat);
    setInput('');
    setStepIdx(prev => Math.min(prev + 1, STEPS.length - 1));
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newChat }),
      });
      const data = await res.json();
      if (data.reply) {
        setChat(prev => [...prev, { role: 'ai', text: data.reply }]);
      }
    } catch (err) {
      setChat(prev => [...prev, { role: 'ai', text: 'I apologize — there was a connection issue. Please try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  }, [input, chat, busy]);

  const noop = useCallback(() => {
    showToast('This is a prototype — that section is not wired up yet.');
  }, [showToast]);

  const forgot = useCallback(() => {
    showToast('Password reset link sent to your academic email.');
  }, [showToast]);

  const sharedProps = {
    screen, role, setRole,
    showPw, setShowPw,
    remember, setRemember,
    candTab, setCandTab,
    docTab, setDocTab,
    stepIdx, setStepIdx,
    adminTab, setAdminTab,
    sel, setSel,
    override, setOverride,
    narrative, setNarrative,
    toast,
    chat, input, setInput, busy,
    STEPS, CANDIDATES,
    go, enter, signOut, send, noop, forgot, showToast,
  };

  return (
    <div style={{ fontFamily: "'Public Sans',system-ui,sans-serif", color: '#1c2433', minHeight: '100vh', background: '#eef1fc' }}>
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: '#16233f', color: '#fff', padding: '12px 22px',
          borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: '0 12px 30px rgba(15,26,48,.32)', zIndex: 9999,
          animation: 'pwFade .25s ease',
        }}>
          {toast}
        </div>
      )}
      {screen === 'login' && <Login {...sharedProps} />}
      {screen === 'landing' && <Landing {...sharedProps} />}
      {screen === 'candidate' && <CandidatePortal {...sharedProps} />}
      {screen === 'admin' && <AdminPortal {...sharedProps} />}
    </div>
  );
}
