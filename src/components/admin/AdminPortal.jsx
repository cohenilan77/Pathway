import React, { useState, useEffect, useCallback, useRef } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';
import useIsMobile from '../../hooks/useIsMobile.js';

const sideStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? '#16233f' : 'transparent', color: active ? '#fff' : '#3a425a',
});

const ADMIN_NAV_ITEMS = [
  {
    key: 'candidates', label: 'Candidates',
    icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></svg>
  },
  {
    key: 'users', label: 'Users',
    icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  },
  {
    key: 'session', label: 'Live Session',
    icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>
  },
  {
    key: 'settings', label: 'Settings',
    icon: <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>
  },
];

function AdminSidebarNav({ adminView, setAdminView, signOut, onNavigate }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 26 }}>
        {ADMIN_NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => { setAdminView(item.key); onNavigate?.(); }} style={sideStyle(adminView === item.key)}>
            {item.icon}{item.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 1, background: '#dde3f4', marginBottom: 14 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: '#16233f', color: '#f5c94c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>✦</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f' }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: '#8a93a3', letterSpacing: '.5px' }}>IVY ADMISSIONS</div>
          </div>
        </div>
        <button onClick={() => { signOut(); onNavigate?.(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#3a425a', fontWeight: 600, padding: 8, width: '100%', marginTop: 4 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          Sign Out
        </button>
      </div>
    </>
  );
}

function AdminDesktopShell({ adminView, setAdminView, signOut, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f7fb' }}>
      <div style={{ width: 258, flexShrink: 0, background: '#eef1fc', borderRight: '1px solid #e1e6f5', display: 'flex', flexDirection: 'column', padding: '26px 18px', minHeight: '100vh' }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 25, fontWeight: 800, color: '#16233f' }}>Pathway</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginTop: 2 }}>ADMIN PORTAL</div>
        </div>
        <AdminSidebarNav adminView={adminView} setAdminView={setAdminView} signOut={signOut} />
      </div>
      {children}
    </div>
  );
}

function AdminMobileShell({ adminView, setAdminView, signOut, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeLabel = ADMIN_NAV_ITEMS.find(i => i.key === adminView)?.label || 'Pathway';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f6f7fb' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#eef1fc', borderBottom: '1px solid #e1e6f5', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 800, color: '#16233f' }}>Pathway</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{activeLabel}</div>
        </div>
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" style={{ background: 'none', border: '1px solid #c5cde0', borderRadius: 9, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" style={{ fill: 'none', stroke: '#16233f', strokeWidth: '2', strokeLinecap: 'round' }}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>

      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex' }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,26,48,.5)' }} />
          <div style={{ position: 'relative', width: '82%', maxWidth: 300, height: '100%', background: '#eef1fc', padding: '20px 18px', display: 'flex', flexDirection: 'column', boxShadow: '8px 0 30px rgba(15,26,48,.25)', animation: 'pwFade .2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, color: '#16233f' }}>Pathway</div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <AdminSidebarNav
              adminView={adminView} setAdminView={setAdminView} signOut={signOut}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPortal({ adminTab, setAdminTab, signOut, showToast, STEPS, UNDERGRAD_STEPS, adminSecret,
  aiConfig, setAiConfig }) {
  const isMobile = useIsMobile();
  const stepsFor = (category) => (category === 'Undergraduate' ? UNDERGRAD_STEPS : STEPS);
  const [adminView, setAdminView] = useState('candidates');
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [aiSections, setAiSections] = useState([]);
  const [aiDefaults, setAiDefaults] = useState({});
  const [aiDrafts, setAiDrafts] = useState({});
  const [aiConfigLoaded, setAiConfigLoaded] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedData, setSelectedData] = useState(null); // { user, data }
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [userDetailId, setUserDetailId] = useState(null);
  const [userActionBusy, setUserActionBusy] = useState(null);

  const adminHeaders = { 'X-Admin-Secret': adminSecret };

  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    setUsersError('');
    fetch('/api/admin-users', { headers: adminHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.users) setUsers(d.users);
        else setUsersError(d.error || 'Failed to load candidates.');
      })
      .catch(() => setUsersError('Failed to load candidates.'))
      .finally(() => setUsersLoading(false));
  }, [adminSecret]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCandidate = (userId) => {
    setSelectedUserId(userId);
    setCandidateOpen(true);
    setSelectedLoading(true);
    setSummary(''); setSummaryVisible(false);
    fetch(`/api/admin-session?userId=${userId}`, { headers: adminHeaders })
      .then(r => r.json())
      .then(d => setSelectedData(d))
      .catch(() => showToast('Failed to load candidate session.'))
      .finally(() => setSelectedLoading(false));
  };

  const closeCandidate = () => {
    setCandidateOpen(false);
    setSelectedUserId(null);
    setSelectedData(null);
    fetchUsers();
  };

  const formatDateTime = (ts) => ts ? new Date(ts).toLocaleString() : '—';

  const formatDuration = (ms) => {
    if (ms == null) return '—';
    const mins = Math.round(ms / 60000);
    if (mins < 1) return '<1 min';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  const performUserAction = async (userId, action) => {
    setUserActionBusy(`${userId}:${action}`);
    try {
      const res = await fetch('/api/admin-user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ userId, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Action failed.');
      showToast(
        action === 'delete' ? 'User deleted.' :
        action === 'suspend' ? 'User suspended.' : 'User reinstated.'
      );
      if (action === 'delete' && userDetailId === userId) setUserDetailId(null);
      fetchUsers();
    } catch (e) {
      showToast(e.message || 'Action failed.');
    } finally {
      setUserActionBusy(null);
    }
  };

  const confirmUserAction = (userId, action, confirmMsg) => {
    if (window.confirm(confirmMsg)) performUserAction(userId, action);
  };

  const userDetail = users.find(u => u.id === userDetailId) || null;

  const patchSelected = useCallback((patch) => {
    if (!selectedUserId) return;
    setSelectedData(prev => prev ? { ...prev, data: { ...prev.data, ...patch } } : prev);
    fetch('/api/admin-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ userId: selectedUserId, patch }),
    }).catch(() => showToast('Failed to save change.'));
  }, [selectedUserId, adminSecret, showToast]);

  // Derived view of the currently selected candidate's session
  const selUser = selectedData?.user || null;
  const sd = selectedData?.data || {};
  const chat = sd.chat || [];
  const scores = sd.scores || null;
  const profile = sd.profile || null;
  const programs = sd.programs || null;
  const chosenSchools = sd.chosenSchools || null;
  const strengths = sd.strengths || null;
  const weaknesses = sd.weaknesses || null;
  const stepIdx = sd.stepIdx || 0;
  const narrative = sd.narrative || null;
  const cvText = sd.cvText || '';
  const essayText = sd.essayText || '';
  const override = sd.override ?? scores?.overall ?? 0;

  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(data => {
      setAiSections(data.sections || []);
      setAiDefaults(data.defaults || {});
      setAiConfigLoaded(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!aiConfigLoaded) return;
    const initial = {};
    for (const s of aiSections) {
      initial[s.key] = (aiConfig && aiConfig[s.key]) || aiDefaults[s.key] || '';
    }
    setAiDrafts(initial);
  }, [aiConfigLoaded, aiSections, aiDefaults]);

  const saveAiSection = (key) => {
    const next = { ...(aiConfig || {}) };
    const draftVal = (aiDrafts[key] || '').trim();
    if (draftVal && draftVal !== (aiDefaults[key] || '').trim()) {
      next[key] = draftVal;
    } else {
      delete next[key];
    }
    setAiConfig(next);
    showToast('AI configuration saved — applies to the candidate\'s next message.');
  };

  const resetAiSection = (key) => {
    setAiDrafts(prev => ({ ...prev, [key]: aiDefaults[key] || '' }));
    const next = { ...(aiConfig || {}) };
    delete next[key];
    setAiConfig(next);
    showToast('Reset to default.');
  };

  const sessionActive = chat && chat.length > 1;
  const stepLabel = stepsFor(profile?.category)[stepIdx] || 'Profile';
  const candidateName = selUser?.name || profile?.name || 'Candidate';
  const candidateSub = [selUser?.residency, profile?.degree, profile?.industry].filter(Boolean).join(' · ') || 'Session in progress';
  const initials = candidateName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const chatLogEndRef = useRef(null);
  useEffect(() => {
    if (adminView === 'session') chatLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, adminView, selectedUserId]);

  const handleOverride = (d) => {
    const next = Math.max(0, Math.min(100, (override || 0) + d));
    patchSelected({ override: next, scores: scores ? { ...scores, overall: next } : scores });
  };

  const sendConsultantNote = () => {
    if (!msgInput.trim()) return;
    patchSelected({ chat: [...chat, { role: 'ai', text: `💬 Advisor note: ${msgInput.trim()}` }] });
    showToast('Note sent to candidate session.');
    setMsgInput('');
  };

  const saveBlob = (blob, filename) => {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = filename; a.click();
    URL.revokeObjectURL(u);
  };

  const downloadAsPdf = (text, baseName) => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica');
    doc.setFontSize(11);
    let y = margin;
    text.split('\n').forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph || ' ', maxWidth);
      lines.forEach((line) => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      });
    });
    doc.save(`${baseName}.pdf`);
  };

  const downloadAsDocx = async (text, baseName) => {
    const doc = new Document({
      sections: [{ children: text.split('\n').map((line) => new Paragraph(line)) }],
    });
    saveBlob(await Packer.toBlob(doc), `${baseName}.docx`);
  };

  const documents = [
    cvText && { label: 'CV / Resume', text: cvText, baseName: 'candidate_cv' },
    essayText && { label: 'Essay Draft', text: essayText, baseName: 'candidate_essay' },
  ].filter(Boolean);

  const generateSummary = async () => {
    setSummarizing(true);
    setSummaryVisible(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
      else showToast('Could not generate summary.');
    } catch { showToast('Summary failed.'); }
    finally { setSummarizing(false); }
  };

  const tierCounts = programs ? {
    stretch: programs.filter(p => p.tier === 'stretch').length,
    possible: programs.filter(p => p.tier === 'possible').length,
    safe: programs.filter(p => p.tier === 'safe').length,
  } : null;

  // Primary source: the AI-emitted CHOSEN_SCHOOLS block (structured, reliable).
  // Fallback for older sessions recorded before that block existed: infer from the
  // candidate's reply right after the AI asks "which schools excite you most".
  const norm = (s) => (s || '').trim().toLowerCase();
  const chosenPrograms = (() => {
    if (chosenSchools && chosenSchools.length) {
      // Map every chosen name to its program match — never drop a name the candidate
      // chose just because it doesn't exactly match the PROGRAMS list.
      return chosenSchools.map(name => {
        const match = (programs || []).find(p => norm(p.name) === norm(name));
        return match || { name, tier: null, fit: null };
      });
    }
    if (!programs || !chat || !chat.length) return [];
    const portfolioMsgIdx = chat.findIndex(m =>
      m.role === 'ai' && (
        m.text.includes('excite you most') ||
        m.text.includes('3–5 schools') ||
        m.text.includes('3-5 schools') ||
        (m.text.includes('portfolio') && m.text.includes('excite'))
      )
    );
    if (portfolioMsgIdx < 0) return [];
    const userMsg = chat.slice(portfolioMsgIdx + 1).find(m => m.role === 'user');
    if (!userMsg) return [];
    const t = userMsg.text.toLowerCase();
    return programs.filter(p => {
      const nameLower = p.name.toLowerCase();
      if (t.includes(nameLower)) return true;
      // Also match on first word e.g. "Harvard" → "Harvard Business School", "Booth" → "Booth"
      const firstWord = nameLower.split(' ')[0];
      return firstWord.length >= 3 && t.includes(firstWord);
    });
  })();

  // Chosen schools first (in full, regardless of fit), then the rest of the portfolio.
  const sortedPrograms = programs
    ? [...chosenPrograms, ...programs.filter(p => !chosenPrograms.some(c => c.name === p.name))]
    : [];

  const Shell = isMobile ? AdminMobileShell : AdminDesktopShell;

  return (
    <Shell adminView={adminView} setAdminView={setAdminView} signOut={signOut}>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 0 : '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: isMobile ? '18px 18px' : '26px 36px', borderBottom: '1px solid #e7eaf3', background: '#fff', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: isMobile ? 22 : 30, fontWeight: 800, color: '#16233f', margin: 0 }}>
            {adminView === 'candidates' && (candidateOpen ? candidateName : 'Candidates')}
            {adminView === 'users' && 'Users'}
            {adminView === 'session' && 'Live Session'}
            {adminView === 'settings' && 'Settings'}
          </h1>
          {sessionActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f7ea', border: '1px solid #c8dba8', borderRadius: 9, padding: '8px 16px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3a7d1e' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3a7d1e' }}>Session Active</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '18px 16px' : '30px 36px' }}>

          {/* ── CANDIDATES LIST ── */}
          {adminView === 'candidates' && !candidateOpen && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={fetchUsers} disabled={usersLoading} style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, color: '#3a425a', cursor: usersLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {usersLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {usersError ? (
                <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 16, padding: 24, textAlign: 'center', color: '#b42318', fontSize: 14, fontWeight: 600 }}>
                  {usersError}
                </div>
              ) : !users.length ? (
                <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#8a93a3', marginBottom: 8 }}>{usersLoading ? 'Loading candidates…' : 'No registered candidates yet.'}</div>
                  <div style={{ fontSize: 13, color: '#b6bdcd' }}>Once candidates register and start the advisor, they'll appear here.</div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, overflow: 'hidden' }}>
                  {!isMobile && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 1fr 40px', gap: 0, padding: '10px 20px', borderBottom: '1px solid #f0f2f7', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>
                      <span>CANDIDATE</span><span>SCORE</span><span>STEP</span><span>TOP INSIGHT</span><span></span>
                    </div>
                  )}
                  {users.map(u => {
                    const uInitials = (u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    if (isMobile) {
                      return (
                        <button key={u.id} onClick={() => openCandidate(u.id)} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderBottom: '1px solid #f8f9fb', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                            <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{uInitials}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{u.name}</div>
                              <div style={{ fontSize: 12, color: '#8a93a3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[u.residency, u.email].filter(Boolean).join(' · ')}</div>
                            </div>
                            {u.scores && (
                              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, flexShrink: 0, color: u.scores.overall >= 70 ? '#2d7d46' : u.scores.overall >= 50 ? '#b8902f' : '#d64545' }}>{u.scores.overall}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ background: '#f6e2a8', color: '#7a5d12', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 7, flexShrink: 0 }}>{stepsFor(u.category)[u.stepIdx] || 'Profile'}</span>
                            <span style={{ fontSize: 12.5, color: '#5d6577', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {u.topInsight || (u.degree ? `${u.degree} candidate` : (u.sessionActive ? 'Session in progress' : 'Not started'))}
                            </span>
                          </div>
                        </button>
                      );
                    }
                    return (
                      <button key={u.id} onClick={() => openCandidate(u.id)} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 1fr 40px', gap: 0, padding: '18px 20px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', alignItems: 'center', borderBottom: '1px solid #f8f9fb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{uInitials}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{u.name}</div>
                            <div style={{ fontSize: 12, color: '#8a93a3' }}>{[u.residency, u.email].filter(Boolean).join(' · ')}</div>
                          </div>
                        </div>
                        <div>
                          {u.scores ? (
                            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: u.scores.overall >= 70 ? '#2d7d46' : u.scores.overall >= 50 ? '#b8902f' : '#d64545' }}>{u.scores.overall}</span>
                          ) : <span style={{ fontSize: 13, color: '#b6bdcd' }}>—</span>}
                        </div>
                        <div>
                          <span style={{ background: '#f6e2a8', color: '#7a5d12', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7 }}>{stepsFor(u.category)[u.stepIdx] || 'Profile'}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#5d6577', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.topInsight || (u.degree ? `${u.degree} candidate` : (u.sessionActive ? 'Session in progress' : 'Not started'))}
                        </div>
                        <div style={{ color: '#b8902f', fontSize: 18, fontWeight: 700 }}>→</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CANDIDATE DETAIL ── */}
          {adminView === 'candidates' && candidateOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: isMobile ? 16 : 24 }}>
              <div>
                <button onClick={closeCandidate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#8a93a3', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', padding: '0 0 20px', marginLeft: -4 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                  All Candidates
                </button>

                {selectedLoading && (
                  <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 32, textAlign: 'center', color: '#8a93a3', fontSize: 14, marginBottom: 20 }}>
                    Loading candidate session…
                  </div>
                )}

                {/* Candidate card */}
                <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: isMobile ? 18 : 24, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{initials}</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f' }}>{candidateName}</div>
                      <div style={{ fontSize: 13, color: '#8a93a3', marginTop: 2 }}>{candidateSub}</div>
                      {profile && (
                        <div style={{ fontSize: 12, color: '#b6bdcd', marginTop: 4 }}>
                          {[profile.gpa && `GPA ${profile.gpa}`, profile.gmat && `GMAT ${profile.gmat}`, profile.experience].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {scores && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 800, color: '#16233f', lineHeight: 1 }}>{scores.overall}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginTop: 2 }}>OVERALL</div>
                        </div>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 4 }}>PIPELINE STEP</div>
                        <span style={{ background: '#f6e2a8', color: '#7a5d12', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8 }}>{stepLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key insights */}
                {strengths && strengths.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 14 }}>KEY INSIGHTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {strengths.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b8902f', marginTop: 6, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, color: '#2a3447', lineHeight: 1.55 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk profile */}
                {weaknesses && weaknesses.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ color: '#d64545', fontSize: 15 }}>⚠</span>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#d64545' }}>RISK PROFILE</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {weaknesses.map((w, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d64545', marginTop: 6, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, color: '#2a3447', lineHeight: 1.55 }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* School portfolio */}
                {programs && programs.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 22 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 14 }}>SCHOOL PORTFOLIO — {programs.length} schools</div>

                    {/* Tier counts */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                      {[{ key: 'stretch', label: 'STRETCH', color: '#d64545', bg: '#fff5f5' },
                        { key: 'possible', label: 'POSSIBLE', color: '#ca8a04', bg: '#fffbf0' },
                        { key: 'safe', label: 'SAFE', color: '#2d7d46', bg: '#f0fdf4' }].map(t => {
                        const n = programs.filter(p => p.tier === t.key).length;
                        if (!n) return null;
                        return (
                          <div key={t.key} style={{ flex: 1, background: t.bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: t.color }}>{n}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: t.color, letterSpacing: '.5px', marginTop: 2 }}>{t.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Candidate's chosen schools */}
                    {chosenPrograms.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#b8902f', marginBottom: 8 }}>★ CANDIDATE'S CHOSEN SCHOOLS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {chosenPrograms.map(p => {
                            const tierColor = p.tier === 'stretch' ? '#d64545' : p.tier === 'safe' ? '#2d7d46' : p.tier === 'possible' ? '#ca8a04' : '#9aa3b5';
                            const tierBg = p.tier === 'stretch' ? '#fff5f5' : p.tier === 'safe' ? '#f0fdf4' : p.tier === 'possible' ? '#fffbf0' : '#f6f7fb';
                            const tierBorder = p.tier === 'stretch' ? '#fecaca' : p.tier === 'safe' ? '#86efac' : p.tier === 'possible' ? '#fde68a' : '#e2e7f2';
                            return (
                              <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tierBg, border: `1.5px solid ${tierBorder}`, borderRadius: 9, padding: '9px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#b8902f', fontSize: 13 }}>★</span>
                                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#16233f' }}>{p.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {p.tier && <span style={{ fontSize: 10, fontWeight: 700, color: tierColor, letterSpacing: '.5px', textTransform: 'uppercase' }}>{p.tier}</span>}
                                  <span style={{ fontSize: 13, fontWeight: 700, color: tierColor }}>{p.fit != null ? `${p.fit}%` : '—'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ height: 1, background: '#eaedf4', margin: '14px 0 10px' }} />
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 8 }}>FULL PORTFOLIO</div>
                      </div>
                    )}

                    {/* All schools list — chosen schools first, then the rest */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sortedPrograms.slice(0, Math.max(6, chosenPrograms.length)).map(p => {
                        const isChosen = chosenPrograms.some(c => c.name === p.name);
                        return (
                          <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f6fa' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.tier === 'stretch' ? '#d64545' : p.tier === 'safe' ? '#2d7d46' : p.tier === 'possible' ? '#ca8a04' : '#9aa3b5' }} />
                              <span style={{ fontSize: 13.5, fontWeight: isChosen ? 700 : 600, color: '#16233f' }}>{p.name}</span>
                              {isChosen && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '.3px' }}>CHOSEN</span>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#b8902f' }}>{p.fit != null ? `${p.fit}%` : '—'}</span>
                          </div>
                        );
                      })}
                      {programs.length > Math.max(6, chosenPrograms.length) && (
                        <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 4 }}>+{programs.length - Math.max(6, chosenPrograms.length)} more schools in full portfolio</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Session summary */}
              <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 22, marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: summaryVisible && summary ? 14 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>SESSION SUMMARY</div>
                  <button onClick={generateSummary} disabled={summarizing || !sessionActive}
                    style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: summarizing || !sessionActive ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: summarizing || !sessionActive ? 0.5 : 1 }}>
                    {summarizing ? 'Summarizing…' : summary ? 'Re-summarize Chat' : 'Summarize Chat'}
                  </button>
                </div>
                {summaryVisible && (
                  <div style={{ marginTop: 14 }}>
                    {summarizing && !summary && (
                      <div style={{ fontSize: 13, color: '#8a93a3', fontStyle: 'italic' }}>Analyzing conversation…</div>
                    )}
                    {summary && (
                      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#2a3447', whiteSpace: 'pre-wrap', background: '#fafbfd', borderRadius: 10, padding: '14px 16px', border: '1px solid #eaedf4' }}>{renderFormattedText(summary)}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Consultant controls panel */}
              <div style={{ background: '#fbfcfe', border: '1px solid #eaedf4', borderRadius: 16, padding: isMobile ? 18 : 24, alignSelf: 'start', position: isMobile ? 'static' : 'sticky', top: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginBottom: 16 }}>CONSULTANT CONTROLS</div>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>Score Override</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => handleOverride(-1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d7ddec', background: '#f1f3fa', color: '#16233f', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>–</button>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#16233f', minWidth: 32, textAlign: 'center' }}>{override}</span>
                      <button onClick={() => handleOverride(1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d7ddec', background: '#f1f3fa', color: '#16233f', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>+</button>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#eef1f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${override}%`, height: '100%', background: override >= 70 ? '#3a7d1e' : override >= 50 ? '#b8902f' : '#d64545', transition: 'all .2s' }} />
                  </div>
                </div>

                {/* Candidate documents */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 10 }}>CANDIDATE DOCUMENTS</div>
                  {documents.length === 0 ? (
                    <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 12, padding: '18px 14px', textAlign: 'center', fontSize: 12.5, color: '#8a93a3' }}>
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {documents.map(doc => (
                        <div key={doc.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e7f2', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 28, height: 28, borderRadius: 7, background: '#eef1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16233f', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                            </span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f' }}>{doc.label}</div>
                              <div style={{ fontSize: 11, color: '#8a93a3' }}>{doc.text.trim().split(/\s+/).length} words</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => downloadAsPdf(doc.text, doc.baseName)} style={{ background: '#eef1f7', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#16233f', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>PDF</button>
                            <button onClick={() => downloadAsDocx(doc.text, doc.baseName)} style={{ background: '#eef1f7', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#16233f', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>Word</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {narrative && (
                  <div style={{ background: '#f4f6fc', border: '1px solid #d7ddec', borderRadius: 12, padding: 14, marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 5 }}>NARRATIVE STRATEGY</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#16233f', textTransform: 'capitalize' }}>{narrative}</div>
                    <div style={{ fontSize: 13, color: '#7a8295', marginTop: 3 }}>
                      {narrative === 'upgrade' ? 'Deepening existing trajectory' : 'Pivoting to new direction'}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 10 }}>SEND NOTE TO CANDIDATE</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#fff', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 14px', marginBottom: 0 }}>
                  <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Send a note to candidate's session..." rows="3"
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'none', resize: 'none', fontSize: 13, fontFamily: 'inherit', color: '#1c2433', padding: '8px 0' }} />
                  <button onClick={sendConsultantNote}
                    style={{ background: '#16233f', border: 'none', borderRadius: 9, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M22 2 11 13M22 2 15 22l-4-9-9-4Z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {adminView === 'users' && (
            <div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 12, padding: '10px 18px', flex: isMobile ? 1 : undefined, minWidth: isMobile ? 90 : undefined }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>TOTAL USERS</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, color: '#16233f' }}>{users.length}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 12, padding: '10px 18px', flex: isMobile ? 1 : undefined, minWidth: isMobile ? 90 : undefined }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>ACTIVE</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, color: '#2d7d46' }}>{users.filter(u => !u.suspended).length}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 12, padding: '10px 18px', flex: isMobile ? 1 : undefined, minWidth: isMobile ? 90 : undefined }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>SUSPENDED</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, color: '#d64545' }}>{users.filter(u => u.suspended).length}</div>
                  </div>
                </div>
                <button onClick={fetchUsers} disabled={usersLoading} style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, color: '#3a425a', cursor: usersLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {usersLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {usersError ? (
                <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 16, padding: 24, textAlign: 'center', color: '#b42318', fontSize: 14, fontWeight: 600 }}>
                  {usersError}
                </div>
              ) : !users.length ? (
                <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#8a93a3' }}>{usersLoading ? 'Loading users…' : 'No registered users yet.'}</div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, overflow: 'hidden' }}>
                  {!isMobile && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr .8fr 1.6fr', gap: 0, padding: '10px 20px', borderBottom: '1px solid #f0f2f7', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>
                      <span>USER</span><span>LAST LOGIN</span><span>SESSION DURATION</span><span>STATUS</span><span>ACTIONS</span>
                    </div>
                  )}
                  {users.map(u => {
                    const uInitials = (u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const busySuspend = userActionBusy === `${u.id}:suspend` || userActionBusy === `${u.id}:unsuspend`;
                    const busyDelete = userActionBusy === `${u.id}:delete`;
                    if (isMobile) {
                      return (
                        <div key={u.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderBottom: '1px solid #f8f9fb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <button onClick={() => setUserDetailId(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0, minWidth: 0, flex: 1 }}>
                              <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{uInitials}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{u.name}</div>
                                <div style={{ fontSize: 12, color: '#8a93a3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                              </div>
                            </button>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, letterSpacing: '.3px', flexShrink: 0,
                              background: u.suspended ? '#fff5f5' : '#f0fdf4',
                              color: u.suspended ? '#d64545' : '#2d7d46',
                              border: `1px solid ${u.suspended ? '#fecaca' : '#bbf0cb'}`,
                            }}>{u.suspended ? 'SUSPENDED' : 'ACTIVE'}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#3a425a' }}>Last login: {formatDateTime(u.lastLoginAt)} · Session: {formatDuration(u.sessionDurationMs)}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => u.suspended
                                ? performUserAction(u.id, 'unsuspend')
                                : confirmUserAction(u.id, 'suspend', `Suspend ${u.name}? They will be unable to log in until reinstated.`)}
                              disabled={busySuspend}
                              style={{ flex: 1, background: '#eef1f7', border: 'none', borderRadius: 7, padding: '8px 12px', cursor: busySuspend ? 'not-allowed' : 'pointer', color: '#16233f', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: busySuspend ? 0.5 : 1 }}>
                              {u.suspended ? 'Reinstate' : 'Suspend'}
                            </button>
                            <button
                              onClick={() => confirmUserAction(u.id, 'delete', `Permanently delete ${u.name} (${u.email})? This cannot be undone.`)}
                              disabled={busyDelete}
                              style={{ flex: 1, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 7, padding: '8px 12px', cursor: busyDelete ? 'not-allowed' : 'pointer', color: '#d64545', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: busyDelete ? 0.5 : 1 }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr .8fr 1.6fr', gap: 0, padding: '16px 20px', alignItems: 'center', borderBottom: '1px solid #f8f9fb' }}>
                        <button onClick={() => setUserDetailId(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
                          <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{uInitials}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{u.name}</div>
                            <div style={{ fontSize: 12, color: '#8a93a3' }}>{u.email}</div>
                          </div>
                        </button>
                        <div style={{ fontSize: 13, color: '#3a425a' }}>{formatDateTime(u.lastLoginAt)}</div>
                        <div style={{ fontSize: 13, color: '#3a425a' }}>{formatDuration(u.sessionDurationMs)}</div>
                        <div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, letterSpacing: '.3px',
                            background: u.suspended ? '#fff5f5' : '#f0fdf4',
                            color: u.suspended ? '#d64545' : '#2d7d46',
                            border: `1px solid ${u.suspended ? '#fecaca' : '#bbf0cb'}`,
                          }}>{u.suspended ? 'SUSPENDED' : 'ACTIVE'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => u.suspended
                              ? performUserAction(u.id, 'unsuspend')
                              : confirmUserAction(u.id, 'suspend', `Suspend ${u.name}? They will be unable to log in until reinstated.`)}
                            disabled={busySuspend}
                            style={{ background: '#eef1f7', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: busySuspend ? 'not-allowed' : 'pointer', color: '#16233f', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: busySuspend ? 0.5 : 1 }}>
                            {u.suspended ? 'Reinstate' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => confirmUserAction(u.id, 'delete', `Permanently delete ${u.name} (${u.email})? This cannot be undone.`)}
                            disabled={busyDelete}
                            style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 12px', cursor: busyDelete ? 'not-allowed' : 'pointer', color: '#d64545', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: busyDelete ? 0.5 : 1 }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* User detail overlay */}
              {userDetail && (
                <div onClick={() => setUserDetailId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(22,35,63,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: isMobile ? 20 : 28, width: isMobile ? '100%' : 460, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                      <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                        {(userDetail.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, color: '#16233f' }}>{userDetail.name}</div>
                        <div style={{ fontSize: 13, color: '#8a93a3' }}>{userDetail.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
                      {[
                        ['Status', userDetail.suspended ? 'Suspended' : 'Active'],
                        ['Residency', userDetail.residency || '—'],
                        ['Joined', formatDateTime(userDetail.createdAt)],
                        ['Total logins', userDetail.loginCount || 0],
                        ['Last login', formatDateTime(userDetail.lastLoginAt)],
                        ['Last active', formatDateTime(userDetail.lastActiveAt)],
                        ['Session duration', formatDuration(userDetail.sessionDurationMs)],
                        ['Pipeline step', stepsFor(userDetail.category)[userDetail.stepIdx] || 'Profile'],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: '#f6f7fb', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', color: '#8a93a3', marginBottom: 3 }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#16233f' }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {userDetail.loginHistory && userDetail.loginHistory.length > 0 && (
                      <div style={{ marginBottom: 22 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 8 }}>RECENT LOGIN ACTIVITY</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                          {[...userDetail.loginHistory].reverse().map((h, i) => (
                            <div key={i} style={{ fontSize: 12.5, color: '#3a425a', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5f6fa', padding: '4px 0' }}>
                              <span>Login</span><span style={{ color: '#8a93a3' }}>{formatDateTime(h.at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => userDetail.suspended
                          ? performUserAction(userDetail.id, 'unsuspend')
                          : confirmUserAction(userDetail.id, 'suspend', `Suspend ${userDetail.name}? They will be unable to log in until reinstated.`)}
                        style={{ flex: 1, background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {userDetail.suspended ? 'Reinstate User' : 'Suspend User'}
                      </button>
                      <button
                        onClick={() => confirmUserAction(userDetail.id, 'delete', `Permanently delete ${userDetail.name} (${userDetail.email})? This cannot be undone.`)}
                        style={{ flex: 1, background: '#fff5f5', border: '1px solid #fecaca', color: '#d64545', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Delete User
                      </button>
                    </div>
                    <button onClick={() => setUserDetailId(null)} style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: '#8a93a3', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 6 }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LIVE SESSION FEED ── */}
          {adminView === 'session' && !selectedUserId && (
            <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#8a93a3', marginBottom: 8 }}>No candidate selected.</div>
              <div style={{ fontSize: 13, color: '#b6bdcd' }}>Open a candidate from the Candidates list to view their live session.</div>
            </div>
          )}
          {adminView === 'session' && selectedUserId && (
            <div style={{ maxWidth: 800, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 13, color: '#8a93a3', fontWeight: 600, marginBottom: 4 }}>Viewing: {candidateName}</div>
              {/* Summarize button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#8a93a3', fontWeight: 600 }}>{chat.length} messages in session</div>
                <button onClick={generateSummary} disabled={summarizing || !sessionActive}
                  style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: summarizing || !sessionActive ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: summarizing || !sessionActive ? 0.5 : 1 }}>
                  {summarizing ? 'Summarizing…' : 'Summarize Chat'}
                </button>
              </div>

              {/* Summary card */}
              {summary && (
                <div style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#b8902f', marginBottom: 10 }}>SESSION SUMMARY</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2a3447', whiteSpace: 'pre-wrap' }}>{renderFormattedText(summary)}</div>
                </div>
              )}

              {/* Full chat log */}
              {!sessionActive ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#8a93a3', border: '1px solid #eaedf4' }}>No session data. Have a candidate log in and start the advisor.</div>
              ) : (
                <div
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 10,
                    height: '55vh', minHeight: 280, maxHeight: 640,
                    overflowY: 'auto', overscrollBehavior: 'contain',
                    background: '#fff', border: '1px solid #eaedf4', borderRadius: 14, padding: 18,
                  }}
                >
                  {chat.map((m, i) => (
                    <div key={i} style={{
                      borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      padding: '12px 16px', maxWidth: '88%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      background: m.role === 'ai' ? '#eef3fb' : '#16233f',
                      border: m.role === 'ai' ? '1px solid #d7e1f2' : 'none',
                      flexShrink: 0,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: m.role === 'ai' ? '#8a93a3' : '#9bb0d8', marginBottom: 4 }}>
                        {m.role === 'ai' ? 'AI ADVISOR' : candidateName.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: m.role === 'ai' ? '#2a3447' : '#e5ebf6', whiteSpace: 'pre-wrap' }}>
                        {m.role === 'user' && m.text.startsWith('Here is my CV')
                          ? '📄 [CV submitted for analysis]'
                          : m.role === 'ai' ? renderFormattedText(m.text) : m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatLogEndRef} />
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {adminView === 'settings' && (
            <div style={{ maxWidth: 700, width: '100%', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
              <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: isMobile ? '18px 16px' : 28, boxSizing: 'border-box' }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: '0 0 18px' }}>Portal Settings</h3>
                <div style={{ fontSize: 14, color: '#7a8295', lineHeight: 1.6, marginBottom: 18 }}>
                  This admin panel shows live session data from the active candidate. In a production deployment, this would connect to a database with historical sessions and multi-consultant features.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#8a93a3' }}>
                  <div>• Session persistence: server-side per account (any device)</div>
                  <div>• AI model: claude-haiku-4-5-20251001</div>
                  <div>• API: Anthropic Claude via /api/chat</div>
                  <div>• Email: /api/contact (requires EMAIL_USER + EMAIL_PASS)</div>
                  <div>• File parse: /api/parse-file (PDF via Anthropic document API, .docx via mammoth)</div>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: isMobile ? '18px 16px' : 28, boxSizing: 'border-box' }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: '0 0 8px' }}>AI Process Configuration</h3>
                <div style={{ fontSize: 14, color: '#7a8295', lineHeight: 1.6, marginBottom: 22 }}>
                  Edit how the advisor analyzes profiles, ranks candidates, searches programs, and scores fit. Saved changes apply to every candidate message going forward.
                </div>

                {!aiConfigLoaded && (
                  <div style={{ fontSize: 13, color: '#8a93a3' }}>Loading configuration…</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                  {aiSections.map(s => {
                    const isCustom = !!(aiConfig && aiConfig[s.key]);
                    return (
                      <div key={s.key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{s.label}</div>
                          {isCustom && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7a5d12', background: '#fffbf0', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 8px' }}>CUSTOM</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#8a93a3', marginBottom: 8, lineHeight: 1.5 }}>{s.description}</div>
                        <textarea
                          value={aiDrafts[s.key] || ''}
                          onChange={(e) => setAiDrafts(prev => ({ ...prev, [s.key]: e.target.value }))}
                          rows={8}
                          style={{
                            width: '100%', fontFamily: "'SF Mono',Consolas,monospace", fontSize: 12.5, lineHeight: 1.6,
                            color: '#3a425a', background: '#f6f7fb', border: '1px solid #eaedf4', borderRadius: 10,
                            padding: '12px 14px', resize: 'vertical', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button onClick={() => saveAiSection(s.key)} style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Save
                          </button>
                          <button onClick={() => resetAiSection(s.key)} style={{ background: 'transparent', color: '#7a8295', border: '1px solid #eaedf4', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Reset to Default
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
