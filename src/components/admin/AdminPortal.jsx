import React, { useState } from 'react';

const sideStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? '#16233f' : 'transparent', color: active ? '#fff' : '#3a425a',
});

const tabStyle = (active) => ({
  padding: '10px 2px', fontSize: 14, fontWeight: active ? 700 : 600,
  color: active ? '#16233f' : '#8a93a3',
  borderBottom: active ? '2px solid #16233f' : '2px solid transparent',
  cursor: 'pointer', background: 'none', border: 'none', borderRadius: 0, fontFamily: 'inherit',
});

export default function AdminPortal({ adminTab, setAdminTab, signOut, override, setOverride, setScores, showToast,
  chat, setChat, scores, profile, programs, strengths, weaknesses, stepIdx, STEPS, narrative, cvText }) {
  const [adminView, setAdminView] = useState('dashboard');
  const [msgInput, setMsgInput] = useState('');

  const sessionActive = chat && chat.length > 1;
  const stepLabel = STEPS[stepIdx] || 'Profile';
  const candidateName = profile?.name || 'Active Candidate';
  const candidateSub = profile ? [profile.degree, profile.industry].filter(Boolean).join(' · ') : 'Session in progress';

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f7fb' }}>
      {/* Sidebar */}
      <div style={{ width: 258, flexShrink: 0, background: '#eef1fc', borderRight: '1px solid #e1e6f5', display: 'flex', flexDirection: 'column', padding: '26px 18px', minHeight: '100vh' }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 25, fontWeight: 800, color: '#16233f' }}>Pathway</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginTop: 2 }}>ADMIN PORTAL</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 26 }}>
          <button onClick={() => setAdminView('dashboard')} style={sideStyle(adminView === 'dashboard')}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>
            Dashboard
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '26px 36px', borderBottom: '1px solid #e7eaf3', background: '#fff' }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 800, color: '#16233f', margin: 0 }}>
            {adminView === 'dashboard' && 'Session Overview'}
            {adminView === 'session' && 'Live Session Monitor'}
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

          {/* DASHBOARD VIEW */}
          {adminView === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
              <div>
                {!sessionActive ? (
                  <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 15, color: '#8a93a3', marginBottom: 8 }}>No active candidate session.</div>
                    <div style={{ fontSize: 13, color: '#b6bdcd' }}>Sign in as a candidate and start the advisor conversation to see live session data here.</div>
                  </div>
                ) : (
                  <>
                    {/* Candidate card */}
                    <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbe3f5', color: '#2b3c63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                          {candidateName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: '#16233f' }}>{candidateName}</div>
                          <div style={{ fontSize: 13, color: '#8a93a3' }}>{candidateSub}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 4 }}>PIPELINE STEP</div>
                          <span style={{ background: '#f6e2a8', color: '#7a5d12', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8 }}>{stepLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score overview */}
                    {scores && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                        {Object.entries(scores).filter(([k]) => k !== 'overall').map(([key, val]) => (
                          <div key={key} style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#16233f' }}>{val}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', textTransform: 'uppercase', marginTop: 3 }}>{key}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Programs summary */}
                    {programs && programs.length > 0 && (
                      <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 14 }}>RECOMMENDED SCHOOLS ({programs.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {programs.map(p => (
                            <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize',
                                  background: p.tier === 'stretch' ? '#fee2e2' : p.tier === 'possible' ? '#fef9c3' : p.tier === 'safe' ? '#dcfce7' : '#f1f3f9',
                                  color: p.tier === 'stretch' ? '#d64545' : p.tier === 'possible' ? '#92620a' : p.tier === 'safe' ? '#2d7d46' : '#4a5568',
                                }}>{p.tier}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#16233f' }}>{p.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {(p.avgGMAT || p.avgGPA) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {p.avgGMAT && (
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#16233f', lineHeight: 1 }}>{p.avgGMAT}</div>
                                        <div style={{ fontSize: 9, fontWeight: 600, color: '#8a93a3', letterSpacing: '.4px', marginTop: 2 }}>GMAT</div>
                                      </div>
                                    )}
                                    {p.avgGPA && (
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#16233f', lineHeight: 1 }}>{p.avgGPA}</div>
                                        <div style={{ fontSize: 9, fontWeight: 600, color: '#8a93a3', letterSpacing: '.4px', marginTop: 2 }}>GPA</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#b8902f' }}>{p.fit}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right panel — score override + consultant controls */}
              {sessionActive && (
                <div style={{ background: '#fbfcfe', border: '1px solid #eaedf4', borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginBottom: 16 }}>CONSULTANT CONTROL</div>
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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

                  {/* Narrative */}
                  {narrative && (
                    <div style={{ background: '#f4f6fc', border: '1px solid #d7ddec', borderRadius: 12, padding: 14, marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 5 }}>NARRATIVE STRATEGY</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#16233f', textTransform: 'capitalize' }}>{narrative}</div>
                      <div style={{ fontSize: 13, color: '#7a8295', marginTop: 3 }}>
                        {narrative === 'upgrade' ? 'Deepening existing trajectory' : 'Pivoting to new direction'}
                      </div>
                    </div>
                  )}

                  {/* Send consultant note */}
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 10 }}>CONSULTANT NOTE</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#fff', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 14px', marginBottom: 16 }}>
                    <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Send a note to this candidate's session..." rows="2"
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'none', resize: 'none', fontSize: 13, fontFamily: 'inherit', color: '#1c2433', padding: '8px 0' }} />
                    <button onClick={sendConsultantNote}
                      style={{ background: '#16233f', border: 'none', borderRadius: 9, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M22 2 11 13M22 2 15 22l-4-9-9-4Z" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SESSION LIVE FEED */}
          {adminView === 'session' && (
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid #e7eaf3', marginBottom: 24 }}>
                {['feed', 'analytics', 'history'].map(t => (
                  <button key={t} onClick={() => setAdminTab(t)} style={{ ...tabStyle(adminTab === t), textTransform: 'capitalize' }}>{t}</button>
                ))}
              </div>

              {adminTab === 'feed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!sessionActive ? (
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#8a93a3', border: '1px solid #eaedf4' }}>No session data yet. Have a candidate log in and start the advisor.</div>
                  ) : (
                    chat.slice(-8).map((m, i) => (
                      <div key={i} style={{
                        borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                        padding: '14px 16px', maxWidth: '88%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        background: m.role === 'ai' ? '#eef3fb' : '#16233f',
                        border: m.role === 'ai' ? '1px solid #d7e1f2' : 'none',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: m.role === 'ai' ? '#8a93a3' : '#9bb0d8', marginBottom: 5 }}>
                          {m.role === 'ai' ? 'AI CONCIERGE' : candidateName.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: m.role === 'ai' ? '#2a3447' : '#e5ebf6', whiteSpace: 'pre-wrap' }}>
                          {m.role === 'user' && m.text.startsWith('Here is my CV') ? '📄 [CV submitted for analysis]' : m.text.slice(0, 300) + (m.text.length > 300 ? '...' : '')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Pipeline progress', value: `Step ${stepIdx + 1} / ${STEPS.length}`, sub: stepLabel, pct: Math.round(((stepIdx + 1) / STEPS.length) * 100) },
                    { label: 'Overall score', value: scores ? `${scores.overall || override}` : '—', sub: 'Out of 100', pct: scores?.overall || 0 },
                    { label: 'Messages exchanged', value: String(chat.length), sub: 'Total turns', pct: Math.min(100, chat.length * 5) },
                    { label: 'Schools recommended', value: String(programs?.length || 0), sub: 'Across tiers', pct: Math.min(100, (programs?.length || 0) * 16) },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 12, padding: 18 }}>
                      <div style={{ fontSize: 12, color: '#8a93a3', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#16233f' }}>{item.value}</div>
                      <div style={{ fontSize: 12, color: '#b6bdcd', marginBottom: 8 }}>{item.sub}</div>
                      <div style={{ height: 6, background: '#eef1f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, height: '100%', background: '#16233f', transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {adminTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {STEPS.slice(0, stepIdx + 1).map((step, i) => (
                    <div key={step} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < stepIdx ? '1px solid #f0f2f7' : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: i < stepIdx ? '#3a7d1e' : '#16233f', marginTop: 4, flexShrink: 0 }} />
                        {i < stepIdx && <span style={{ width: 1, flex: 1, background: '#e7eaf3', marginTop: 4 }} />}
                      </div>
                      <div style={{ paddingBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>
                          {step} {i < stepIdx ? '✓' : '← current'}
                        </div>
                        <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 2 }}>
                          {i < stepIdx ? 'Completed' : 'In progress'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS VIEW */}
          {adminView === 'documents' && (
            <div style={{ maxWidth: 680 }}>
              {!cvText ? (
                <div style={{ background: '#fff', border: '1px dashed #d7ddec', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#8a93a3' }}>No documents uploaded yet in this session.</div>
                </div>
              ) : (
                <>
                  <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 14, padding: 22, marginBottom: 18 }}>
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
                    <div style={{ background: '#f6f7fb', borderRadius: 8, padding: '14px 16px', fontSize: 13, lineHeight: 1.7, color: '#5d6577', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                      {cvText.slice(0, 600)}{cvText.length > 600 ? '...' : ''}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {adminView === 'settings' && (
            <div style={{ maxWidth: 500 }}>
              <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, padding: 28 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#16233f', margin: '0 0 18px' }}>Portal Settings</h3>
                <div style={{ fontSize: 14, color: '#7a8295', lineHeight: 1.6, marginBottom: 18 }}>
                  This admin panel shows live session data from the active candidate. In a production deployment, this would connect to a database with all historical sessions, candidate records, and multi-consultant features.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#8a93a3' }}>
                  <div>• Session persistence: localStorage (single device)</div>
                  <div>• AI model: claude-haiku-4-5-20251001</div>
                  <div>• API: Anthropic Claude via /api/chat</div>
                  <div>• Essay rewrite: /api/rewrite</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
