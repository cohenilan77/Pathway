import React, { useState } from 'react';

const docNavStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? '#fbf1d6' : 'transparent', color: active ? '#16233f' : '#3a425a',
});

export default function Documents({ docTab, setDocTab, cvText, setCvText, essayText, setEssayText, essaySchool, setEssaySchool, insights, rewriteEssay, analyzeEssay, busy, setShowCvModal, setCandTab, showToast, narrative }) {
  const [editingCv, setEditingCv] = useState(false);
  const [cvEdit, setCvEdit] = useState('');

  const wordCount = essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : 0;
  const essayPct = Math.min(100, Math.round((wordCount / 1000) * 100));

  const subNavItems = [
    { key: 'editor', label: 'Essay Editor', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg> },
    { key: 'documents', label: 'My CV', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg> },
    { key: 'insights', label: 'AI Insights', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /></svg> },
  ];

  return (
    <div style={{ flex: 1, minHeight: '100vh', display: 'grid', gridTemplateColumns: '280px 1fr 300px', background: '#fff' }}>
      {/* Left nav */}
      <div style={{ borderRight: '1px solid #eef1f6', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 18px 16px', borderBottom: '1px solid #eef1f6' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {subNavItems.map(item => (
              <button key={item.key} onClick={() => setDocTab(item.key)} style={docNavStyle(docTab === item.key)}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </div>
        {/* Status panel */}
        <div style={{ padding: 18, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#8a93a3', marginBottom: 14 }}>STATUS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: cvText ? '#f0f7ea' : '#faf6ec', border: `1px solid ${cvText ? '#c8dba8' : '#efe7d4'}` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cvText ? '#3a7d1e' : '#d3c9a8', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f' }}>CV / Resume</div>
                <div style={{ fontSize: 11, color: '#8a93a3' }}>{cvText ? `${cvText.trim().split(/\s+/).length} words` : 'Not uploaded'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: essayText ? '#f0f7ea' : '#faf6ec', border: `1px solid ${essayText ? '#c8dba8' : '#efe7d4'}` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: essayText ? '#3a7d1e' : '#d3c9a8', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f' }}>Personal Essay</div>
                <div style={{ fontSize: 11, color: '#8a93a3' }}>{essayText ? `${wordCount} words` : 'Not started'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: insights ? '#f0f7ea' : '#faf6ec', border: `1px solid ${insights ? '#c8dba8' : '#efe7d4'}` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: insights ? '#3a7d1e' : '#d3c9a8', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f' }}>AI Insights</div>
                <div style={{ fontSize: 11, color: '#8a93a3' }}>{insights ? `${insights.length} suggestions` : 'Submit essay to unlock'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ background: '#f6f7fb', padding: 40, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {docTab === 'editor' && (
          <div style={{ background: '#fff', maxWidth: 580, width: '100%', borderRadius: 8, boxShadow: '0 10px 40px rgba(15,26,48,.08)', padding: '48px 52px', minHeight: 600 }}>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#b6bdcd', marginBottom: 28 }}>Pathway Strategist Review Mode</div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#8a93a3', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>TARGET SCHOOL</label>
              <input
                value={essaySchool}
                onChange={e => setEssaySchool(e.target.value)}
                placeholder="e.g. Harvard Business School"
                style={{ width: '100%', border: '1px solid #e2e7f2', borderRadius: 9, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1c2433', boxSizing: 'border-box' }}
              />
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, lineHeight: 1.2, fontWeight: 700, color: '#16233f', margin: '0 0 24px' }}>
              Personal Statement{essaySchool ? `: ${essaySchool}` : ''}
            </h1>
            {essayText ? (
              <textarea
                value={essayText}
                onChange={e => setEssayText(e.target.value)}
                style={{ width: '100%', minHeight: 380, border: '1px solid #e8ecf6', borderRadius: 8, padding: '16px', fontSize: 15.5, lineHeight: 1.9, color: '#33405a', fontFamily: "'Playfair Display',serif", resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <div style={{ minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e7f2', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 15, color: '#9aa3b5', marginBottom: 18, lineHeight: 1.6 }}>
                  Paste your personal statement or essay draft here to unlock AI analysis and rewriting.
                </div>
                <button
                  onClick={() => {
                    setEssayText('Write your personal statement here. Start with why you are pursuing this program and what you hope to achieve. Our AI will analyze your draft and suggest improvements.');
                  }}
                  style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Start Writing →
                </button>
              </div>
            )}
          </div>
        )}

        {docTab === 'documents' && (
          <div style={{ width: '100%', maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#16233f', margin: 0 }}>My CV</h2>
              {cvText ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  {!editingCv ? (
                    <button onClick={() => { setEditingCv(true); setCvEdit(cvText); }}
                      style={{ background: '#fff', border: '1px solid #d7ddec', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Edit
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setEditingCv(false)}
                        style={{ background: 'none', border: '1px solid #d7ddec', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                      <button onClick={() => { setCvText(cvEdit); setEditingCv(false); showToast('CV saved.'); }}
                        style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Save
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowCvModal(true)}
                  style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Upload CV
                </button>
              )}
            </div>
            {cvText ? (
              editingCv ? (
                <textarea
                  value={cvEdit}
                  onChange={e => setCvEdit(e.target.value)}
                  style={{ width: '100%', minHeight: 500, border: '1px solid #d7ddec', borderRadius: 10, padding: '20px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, color: '#1c2433', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              ) : (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eaedf4', padding: '28px 32px', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, color: '#33405a', fontFamily: 'inherit', minHeight: 400 }}>
                  {cvText}
                </div>
              )
            ) : (
              <div style={{ background: '#fff', borderRadius: 10, border: '2px dashed #d7ddec', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 15, color: '#8a93a3', marginBottom: 18, lineHeight: 1.6 }}>
                  No CV uploaded yet. Paste your CV to unlock profile analysis and personalized strategy.
                </div>
                <button onClick={() => setShowCvModal(true)}
                  style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Paste My CV →
                </button>
              </div>
            )}
          </div>
        )}

        {docTab === 'insights' && (
          <div style={{ width: '100%', maxWidth: 580 }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#16233f', margin: '0 0 24px' }}>AI Insights</h2>
            {insights && insights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {insights.map((item, i) => (
                  <div key={i} style={{
                    background: item.type === 'strength' ? '#f0f7ea' : '#fffaf0',
                    border: `1px solid ${item.type === 'strength' ? '#c8dba8' : '#ecd9a8'}`,
                    borderRadius: 12, padding: '16px 18px',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: item.type === 'strength' ? '#3a7d1e' : '#7a5d12', marginBottom: 6, textTransform: 'uppercase' }}>
                      {item.type === 'strength' ? '✓ Strength' : '→ Suggestion'}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: '#2a3447' }}>{item.text}</div>
                  </div>
                ))}
                <button onClick={() => analyzeEssay()} disabled={busy}
                  style={{ marginTop: 8, background: '#16233f', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
                  Re-analyze Essay
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 10, border: '2px dashed #d7ddec', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 15, color: '#8a93a3', marginBottom: 18, lineHeight: 1.6 }}>
                  Paste your essay in the Essay Editor, then click "Analyze with AI" to get specific, actionable feedback.
                </div>
                <button onClick={() => setDocTab('editor')}
                  style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Go to Essay Editor →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right insights panel */}
      <div style={{ borderLeft: '1px solid #eef1f6', background: '#fbfcfe', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#eef1fc', padding: 20, borderBottom: '1px solid #e1e6f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#b8902f' }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.5px', color: '#16233f' }}>STRATEGIST TOOLS</span>
          </div>
        </div>
        <div style={{ padding: '20px 20px', flex: 1 }}>
          {docTab === 'editor' && essayText && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#16233f', marginBottom: 8 }}>
                WORD COUNT <span style={{ color: wordCount > 1000 ? '#d64545' : '#7a8295' }}>{wordCount} / 1000</span>
              </div>
              <div style={{ height: 6, background: '#e7eaf3', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(essayPct, 100)}%`, height: '100%', background: wordCount > 1000 ? '#d64545' : '#16233f' }} />
              </div>
            </>
          )}

          {insights && insights.slice(0, 2).map((item, i) => (
            <div key={i} style={{
              background: item.type === 'strength' ? '#f0f7ea' : '#fffaf0',
              border: `1px solid ${item.type === 'strength' ? '#c8dba8' : '#ecd9a8'}`,
              borderRadius: 12, padding: 14, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: item.type === 'strength' ? '#3a7d1e' : '#7a5d12', marginBottom: 5, textTransform: 'uppercase' }}>
                {item.type === 'strength' ? '✓ Strength' : '→ Improve'}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: '#5d6577' }}>{item.text}</div>
            </div>
          ))}

          {!insights && essayText && (
            <div style={{ background: '#fffaf0', border: '1px solid #ecd9a8', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#7a8295', lineHeight: 1.5 }}>Click "Analyze with AI" to get specific feedback on your essay.</div>
            </div>
          )}
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {essayText && (
            <>
              <button onClick={() => analyzeEssay()} disabled={busy}
                style={{ width: '100%', background: 'none', border: '1px solid #16233f', color: '#16233f', borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}>
                ✦ Analyze with AI
              </button>
              <button onClick={() => rewriteEssay()} disabled={busy}
                style={{ width: '100%', background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}>
                {busy ? 'Rewriting...' : '✦ Rewrite with AI'}
              </button>
            </>
          )}
          {!cvText && (
            <button onClick={() => setShowCvModal(true)}
              style={{ width: '100%', background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Upload CV →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
