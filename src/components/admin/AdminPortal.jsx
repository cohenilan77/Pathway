import React from 'react';

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

const stepBadgeStyles = {
  gold: { background: '#f6e2a8', color: '#7a5d12' },
  soft: { background: '#dfe6f7', color: '#3a4b6e' },
  navy: { background: '#1f2d4d', color: '#fff' },
  red: { background: '#fbe0e0', color: '#b5403a' },
};

export default function AdminPortal({ CANDIDATES, sel, setSel, override, setOverride, adminTab, setAdminTab, signOut, noop }) {
  const selected = CANDIDATES[sel];

  const handleOverride = (delta) => {
    setOverride(prev => Math.max(0, Math.min(100, prev + delta)));
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
          <button style={sideStyle(true)}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>
            Analysis
          </button>
          <button onClick={noop} style={sideStyle(false)}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>
            Admissions Advisor
          </button>
          <button onClick={noop} style={sideStyle(false)}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
            Documents
          </button>
          <button onClick={noop} style={sideStyle(false)}>
            <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>
            Settings
          </button>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 1, background: '#dde3f4', marginBottom: 14 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: '#16233f', color: '#f5c94c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f' }}>Admin Panel</div>
              <div style={{ fontSize: 11, color: '#8a93a3', letterSpacing: '.5px' }}>IVY ADMISSIONS</div>
            </div>
          </div>
          <button onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#3a425a', fontWeight: 600, padding: 8, width: '100%', marginTop: 8 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            Help
          </button>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#3a425a', fontWeight: 600, padding: 8, width: '100%' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '26px 36px', borderBottom: '1px solid #e7eaf3', background: '#fff' }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 800, color: '#16233f', margin: 0 }}>Candidate Management</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f1f3fa', border: '1px solid #e2e7f2', borderRadius: 9, padding: '9px 14px', width: 280 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: '#9aa3b5', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input placeholder="Search candidates..." style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, fontFamily: 'inherit', color: '#1c2433' }} />
            </div>
            <button onClick={noop} style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + New Candidate
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 388px', gap: 0 }}>
          {/* Table */}
          <div style={{ padding: '30px 36px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3' }}>ACTIVE CANDIDATES</span>
              <div style={{ display: 'flex', gap: 14, color: '#9aa3b5' }}>
                <button onClick={noop} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 6h18M6 12h12M10 18h4" /></svg>
                </button>
                <button onClick={noop} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 7h12M3 12h9M3 17h6M18 8v9l3-3M18 17l-3-3" /></svg>
                </button>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.2fr 1fr 0.9fr 24px', gap: 14, padding: '15px 22px', borderBottom: '1px solid #eef1f6', fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5' }}>
                <span>Candidate Name</span><span>Pipeline Step</span><span>Score</span><span>Activity</span><span />
              </div>
              {CANDIDATES.map((c, i) => {
                const selected = i === sel;
                const badgeStyle = stepBadgeStyles[c.stepKind];
                const barColor = c.score >= 50 ? '#9a7b1f' : '#d64545';
                return (
                  <div key={c.name} onClick={() => { setSel(i); setOverride(c.score); }} style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.2fr 1fr 0.9fr 24px', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: '1px solid #eef1f6', cursor: 'pointer', background: selected ? '#f4f6fc' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span style={{ width: 40, height: 40, borderRadius: '50%', background: c.avatar, color: c.avatarFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{c.mono}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#16233f' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#8a93a3' }}>{c.sub}</div>
                      </div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, lineHeight: 1.25, ...badgeStyle }}>{c.step}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 54, height: 6, borderRadius: 3, background: '#eef1f6', overflow: 'hidden', display: 'inline-block' }}>
                        <span style={{ display: 'block', height: '100%', width: `${c.score}%`, background: barColor }} />
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#16233f' }}>{c.score}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#8a93a3' }}>{c.activity}</div>
                    <div style={{ color: '#c4cbdb', display: 'flex', justifyContent: 'flex-end' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="m9 6 6 6-6 6" /></svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consultant control */}
          <div style={{ background: '#fbfcfe', borderLeft: '1px solid #eef1f6', padding: '30px 26px', overflowY: 'auto' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginBottom: 16 }}>CONSULTANT CONTROL</div>
            {/* Selected candidate card */}
            <div style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
              <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eef1f7', color: '#16233f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#16233f' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#8a93a3' }}>{selected.sub}</div>
              </div>
              <button onClick={noop} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa3b5' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid #e7eaf3', marginBottom: 18 }}>
              {[['feed', 'Live Feed'], ['analytics', 'Analytics'], ['history', 'History']].map(([key, label]) => (
                <button key={key} onClick={() => setAdminTab(key)} style={tabStyle(adminTab === key)}>{label}</button>
              ))}
            </div>

            {/* Feed tab */}
            {adminTab === 'feed' && (
              <div>
                <div style={{ background: '#eef3fb', borderRadius: '4px 12px 12px 12px', padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 6 }}>AI CONCIERGE</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#2a3447' }}>How does your work at the NGO align with the "Social Leadership" pillar of the Wharton MBA or other top-tier graduate programs?</div>
                </div>
                <div style={{ background: '#16233f', borderRadius: '12px 12px 4px 12px', padding: '14px 16px', marginBottom: 18, marginLeft: 32 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9bb0d8', marginBottom: 6 }}>{selected.name}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#e5ebf6' }}>I led a team of 15 to secure $2M in funding. I think that demonstrates the scale of leadership they look for.</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#b8902f', marginBottom: 14 }}>— OVERRIDE ACTIVE —</div>
                <div style={{ background: '#f5c94c', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#5a4410', marginBottom: 6 }}>CONSULTANT NOTE</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#3f2f08' }}>{selected.name.split(' ')[0]} is missing the 'Emotional Intelligence' angle. Steer the narrative toward mentorship outcomes, not just dollars raised.</div>
                </div>
              </div>
            )}

            {/* Analytics tab */}
            {adminTab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Pipeline completion', value: '68%', bar: '68%' },
                  { label: 'Avg. fit index', value: '82%', bar: null },
                  { label: 'Sessions this week', value: '24', bar: null },
                ].map(item => (
                  <div key={item.label} style={{ background: '#fff', border: '1px solid #eaedf4', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#8a93a3', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 26, fontFamily: "'Playfair Display',serif", fontWeight: 700, color: '#16233f' }}>{item.value}</div>
                    {item.bar && (
                      <div style={{ height: 6, background: '#eef1f6', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ width: item.bar, height: '100%', background: '#16233f' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* History tab */}
            {adminTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { dot: '#16233f', title: 'Fit Analysis completed', time: 'Today, 10:42 AM' },
                  { dot: '#c2962f', title: 'Score override applied', time: 'Yesterday, 4:15 PM' },
                  { dot: '#aebde6', title: 'CV uploaded', time: 'Oct 12, 9:00 AM' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid #f0f2f7' : 'none' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#8a93a3' }}>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Score override + message */}
            <div style={{ borderTop: '1px solid #eef1f6', marginTop: 20, paddingTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>Score Override</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => handleOverride(-1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d7ddec', background: '#f1f3fa', color: '#16233f', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>–</button>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#16233f', minWidth: 28, textAlign: 'center' }}>{override}</span>
                  <button onClick={() => handleOverride(1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d7ddec', background: '#f1f3fa', color: '#16233f', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>+</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#fff', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 14px', marginBottom: 18 }}>
                <textarea placeholder="Send direct consultant message..." rows={2} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', resize: 'none', fontSize: 14, fontFamily: 'inherit', color: '#1c2433', padding: '8px 0' }} />
                <button onClick={noop} style={{ background: '#16233f', border: 'none', borderRadius: 9, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M22 2 11 13M22 2 15 22l-4-9-9-4Z" /></svg>
                </button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8a93a3', marginBottom: 12 }}>RELEVANT DOCUMENTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['CV_Final_v2.pdf', 'Personal_Statement_Draft.docx'].map(doc => (
                  <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #eaedf4', borderRadius: 10, padding: '11px 14px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: '#16233f', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#16233f' }}>{doc}</span>
                    <button onClick={noop} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa3b5' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
