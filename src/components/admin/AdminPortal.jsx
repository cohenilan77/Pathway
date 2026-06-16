import React, { useState } from 'react';

const sideStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? '#16233f' : 'transparent', color: active ? '#fff' : '#3a425a',
});

export default function AdminPortal({ adminTab, setAdminTab, signOut, override, setOverride, setScores, showToast,
  chat, setChat, scores, profile, programs, chosenSchools, strengths, weaknesses, stepIdx, STEPS, narrative, cvText }) {
  const [adminView, setAdminView] = useState('candidates');
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);

  const sessionActive = chat && chat.length > 1;
  const stepLabel = STEPS[stepIdx] || 'Profile';
  const candidateName = profile?.name || 'Active Candidate';
  const candidateSub = profile ? [profile.degree, profile.industry].filter(Boolean).join(' · ') : 'Session in progress';
  const initials = candidateName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleOverride = (d) => {
    const next = Math.max(0, Math.min(100, (override || 0) + d));
    setOverride(next);
    setScores(prev => prev ? { ...prev, overall: next } : prev);
  };

  const sendConsultantNote = () => {
    if (!msgInput.trim()) return;
    setChat(prev => [...prev, { role: 'ai', text: `💬 Advisor note: ${msgInput.trim()}` }]);
    showToast('Note sent to candidate session.');
    setMsgInput('');
  };

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
  const chosenPrograms = (() => {
    if (!programs) return [];
    if (chosenSchools && chosenSchools.length) {
      return programs.filter(p => chosenSchools.includes(p.name));
    }
    if (!chat || !chat.length) return [];
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f7fb' }}>
      {/* Sidebar */}
      <div style={{ width: 258, flexShrink: 0, background: '#eef1fc', borderRight: '1px solid #e1e6f5', display: 'flex', flexDirection: 'column', padding: '26px 18px', minHeight: '100vh' }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 25, fontWeight: 800, color: '#16233f' }}>Pathway</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginTop: 2 }}>ADMIN PORTAL</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 26 }}>
          <button onClick={() => setAdminView('candidates')} style={sideStyle(adminView === 'candidates')}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></svg>
            Candidates
          </button>
          <button onClick={() => setAdminView('session')} style={sideStyle(adminView === 'session')}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>
            Live Session
          </button>
          <button onClick={() => setAdminView('documents')} style={sideStyle(adminView === 'documents')}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
            Documents
          </button>
          <button onClick={() => setAdminView('settings')} style={sideStyle(adminView === 'settings')}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>
            Settings
          </button>
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
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#3a425a', fontWeight: 600, padding: 8, width: '100%', marginTop: 4 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '26px 36px', borderBottom: '1px solid #e7eaf3', background: '#fff' }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 800, color: '#16233f', margin: 0 }}>
            {adminView === 'candidates' && (candidateOpen ? candidateName : 'Candidates')}
            {adminView === 'session' && 'Live Session'}
            {adminView === 'documents' && 'Candidate Documents'}
            {adminView === 'settings' && 'Settings'}
          </h1>
          {sessionActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f7ea', border: '1px solid #c8dba8', borderRadius: 9, padding: '8px 16px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3a7d1e' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3a7d1e' }}>Session Active</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '30px 36px' }}>

          {/* ── CANDIDATES LIST ── */}
          {adminView === 'candidates' && !candidateOpen && (
            <div>
              {!sessionActive ? (
                <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#8a93a3', marginBottom: 8 }}>No active candidate session.</div>
                  <div style={{ fontSize: 13, color: '#b6bdcd' }}>Sign in as a candidate and start the advisor to see session data here.</div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 1fr 40px', gap: 0, padding: '10px 20px', borderBottom: '1px solid #f0f2f7', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3' }}>
                    <span>CANDIDATE</span><span>SCORE</span><span>STEP</span><span>TOP INSIGHT</span><span></span>
                  </div>
                  <button onClick={() => setCandidateOpen(true)} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 1fr 40px', gap: 0, padding: '18px 20px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', alignItems: 'center', borderBottom: '1px solid #f8f9fb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{initials}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{candidateName}</div>
                        <div style={{ fontSize: 12, color: '#8a93a3' }}>{candidateSub}</div>
                      </div>
                    </div>
                    <div>
                      {scores ? (
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: scores.overall >= 70 ? '#2d7d46' : scores.overall >= 50 ? '#b8902f' : '#d64545' }}>{scores.overall}</span>
                      ) : <span style={{ fontSize: 13, color: '#b6bdcd' }}>—</span>}
                    </div>
                    <div>
                      <span style={{ background: '#f6e2a8', color: '#7a5d12', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7 }}>{stepLabel}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#5d6577', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {strengths?.[0] || (profile ? `${profile.degree || ''} candidate` : 'Session in progress')}
                    </div>
                    <div style={{ color: '#b8902f', fontSize: 18, fontWeight: 700 }}>→</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CANDIDATE DETAIL ── */}
          {adminView === 'candidates' && candidateOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
              <div>
                <button onClick={() => setCandidateOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#8a93a3', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', padding: '0 0 20px', marginLeft: -4 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                  All Candidates
                </button>

                {/* Candidate card */}
                <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{initials}</span>
                    <div style={{ flex: 1 }}>
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

                {/* School portfolio */}
                {programs && programs.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 22 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 14 }}>SCHOOL PORTFOLIO — {programs.length} schools</div>

                    {/* Tier counts */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                      {[{ key: 'stretch', label: 'STRETCH', color: '#d64545', bg: '#fff5f5' },
                        { key: 'possible', label: 'POSSIBLE', color: '#b8902f', bg: '#fffbf0' },
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
                            const tierColor = p.tier === 'stretch' ? '#d64545' : p.tier === 'safe' ? '#2d7d46' : '#b8902f';
                            const tierBg = p.tier === 'stretch' ? '#fff5f5' : p.tier === 'safe' ? '#f0fdf4' : '#fffbf0';
                            const tierBorder = p.tier === 'stretch' ? '#fecaca' : p.tier === 'safe' ? '#86efac' : '#fde68a';
                            return (
                              <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tierBg, border: `1.5px solid ${tierBorder}`, borderRadius: 9, padding: '9px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#b8902f', fontSize: 13 }}>★</span>
                                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#16233f' }}>{p.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: tierColor, letterSpacing: '.5px', textTransform: 'uppercase' }}>{p.tier}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: tierColor }}>{p.fit}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ height: 1, background: '#eaedf4', margin: '14px 0 10px' }} />
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 8 }}>FULL PORTFOLIO</div>
                      </div>
                    )}

                    {/* All schools list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {programs.slice(0, 6).map(p => {
                        const isChosen = chosenPrograms.some(c => c.name === p.name);
                        return (
                          <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f6fa' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.tier === 'stretch' ? '#d64545' : p.tier === 'safe' ? '#2d7d46' : '#b8902f' }} />
                              <span style={{ fontSize: 13.5, fontWeight: isChosen ? 700 : 600, color: '#16233f' }}>{p.name}</span>
                              {isChosen && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '.3px' }}>CHOSEN</span>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#b8902f' }}>{p.fit}%</span>
                          </div>
                        );
                      })}
                      {programs.length > 6 && <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 4 }}>+{programs.length - 6} more schools in full portfolio</div>}
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
                      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#2a3447', whiteSpace: 'pre-wrap', background: '#fafbfd', borderRadius: 10, padding: '14px 16px', border: '1px solid #eaedf4' }}>{summary}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Consultant controls panel */}
              <div style={{ background: '#fbfcfe', border: '1px solid #eaedf4', borderRadius: 16, padding: 24, alignSelf: 'start', position: 'sticky', top: 0 }}>
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

          {/* ── LIVE SESSION FEED ── */}
          {adminView === 'session' && (
            <div style={{ maxWidth: 800 }}>
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
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2a3447', whiteSpace: 'pre-wrap' }}>{summary}</div>
                </div>
              )}

              {/* Full chat log */}
              {!sessionActive ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#8a93a3', border: '1px solid #eaedf4' }}>No session data. Have a candidate log in and start the advisor.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {chat.map((m, i) => (
                    <div key={i} style={{
                      borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      padding: '12px 16px', maxWidth: '88%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      background: m.role === 'ai' ? '#eef3fb' : '#16233f',
                      border: m.role === 'ai' ? '1px solid #d7e1f2' : 'none',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: m.role === 'ai' ? '#8a93a3' : '#9bb0d8', marginBottom: 4 }}>
                        {m.role === 'ai' ? 'AI ADVISOR' : candidateName.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: m.role === 'ai' ? '#2a3447' : '#e5ebf6', whiteSpace: 'pre-wrap' }}>
                        {m.role === 'user' && m.text.startsWith('Here is my CV') ? '📄 [CV submitted for analysis]' : m.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {adminView === 'documents' && (
            <div style={{ maxWidth: 680 }}>
              {!cvText ? (
                <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#8a93a3' }}>No documents uploaded yet in this session.</div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 14, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 8, background: '#eef1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16233f' }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                      </span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#16233f' }}>CV / Resume</div>
                        <div style={{ fontSize: 12, color: '#8a93a3' }}>{cvText.trim().split(/\s+/).length} words</div>
                      </div>
                    </div>
                    <button onClick={() => { const b = new Blob([cvText], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'candidate_cv.txt'; a.click(); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa3b5' }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
                    </button>
                  </div>
                  <div style={{ background: '#f6f7fb', borderRadius: 8, padding: '14px 16px', fontSize: 13, lineHeight: 1.7, color: '#5d6577', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
                    {cvText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {adminView === 'settings' && (
            <div style={{ maxWidth: 500 }}>
              <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 28 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: '0 0 18px' }}>Portal Settings</h3>
                <div style={{ fontSize: 14, color: '#7a8295', lineHeight: 1.6, marginBottom: 18 }}>
                  This admin panel shows live session data from the active candidate. In a production deployment, this would connect to a database with historical sessions and multi-consultant features.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#8a93a3' }}>
                  <div>• Session persistence: localStorage (single device)</div>
                  <div>• AI model: claude-haiku-4-5-20251001</div>
                  <div>• API: Anthropic Claude via /api/chat</div>
                  <div>• Email: /api/contact (requires EMAIL_USER + EMAIL_PASS)</div>
                  <div>• PDF parse: /api/parse-file (Anthropic document API)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
