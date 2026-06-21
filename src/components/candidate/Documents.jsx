import React, { useState } from 'react';

const docNavStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
  fontSize: 13.5, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? 'linear-gradient(135deg,#1d3b32,#1d3b32)' : 'transparent',
  color: active ? '#faf7f2' : '#5d6b63',
  boxShadow: active ? '0 10px 20px rgba(105,91,255,.32)' : 'none',
});

export default function Documents({ docTab, setDocTab, cvText, setCvText, cvFile, essayText, setEssayText, essaySchool, setEssaySchool, essayQuestion, setEssayQuestion, essays, interviews, selectEssaySchool, chosenSchools, insights, rewriteEssay, analyzeEssay, busy, setShowCvModal, setCandTab, send, showToast, narrative, authToken }) {
  const [editingCv, setEditingCv] = useState(false);
  const [cvEdit, setCvEdit] = useState('');

  const wordCount = essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : 0;
  const essayPct = Math.min(100, Math.round((wordCount / 1000) * 100));
  const savedSchools = Array.from(new Set([...(chosenSchools || []), ...Object.keys(essays || {})]));
  const interviewSchools = Array.from(new Set([...(chosenSchools || []), ...Object.keys(interviews || {})]));

  const startInterview = (school) => {
    setCandTab('advisor');
    send(`I'd like to do my mock interview for ${school}.`);
  };

  const downloadOriginalCv = async () => {
    if (!cvFile || !authToken) return;
    try {
      const res = await fetch('/api/download-file', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cvFile.name || 'candidate-cv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Could not download the original file.');
    }
  };

  const subNavItems = [
    { key: 'editor', label: 'Essay Editor', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg> },
    { key: 'documents', label: 'My CV', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg> },
    { key: 'interview', label: 'Mock Interview', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg> },
    { key: 'insights', label: 'AI Insights', icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /></svg> },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '24px 28px 28px' }}>
      <div className="pw-doc-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '270px 1fr 290px', background: '#faf7f2', borderRadius: 24, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', overflow: 'hidden' }}>
        {/* Left nav */}
        <div style={{ borderRight: '1px solid #f1eadd', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #f1eadd' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {subNavItems.map(item => (
                <button key={item.key} onClick={() => setDocTab(item.key)} style={docNavStyle(docTab === item.key)}>
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          </div>
          {/* Status panel */}
          <div style={{ padding: 18, flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '1.2px', color: '#9a8a72', marginBottom: 14 }}>STATUS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 13, background: cvText ? '#cdd8d1' : '#f6f1e8', border: `1px solid ${cvText ? '#bcccc4' : '#f1eadd'}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cvText ? '#2f6b4f' : '#d9cbb3', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2420' }}>CV / Resume</div>
                  <div style={{ fontSize: 11, color: '#5d6b63' }}>{cvText ? `${cvText.trim().split(/\s+/).length} words${cvFile ? ' + original file' : ''}` : 'Not uploaded'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 13, background: essayText ? '#cdd8d1' : '#f6f1e8', border: `1px solid ${essayText ? '#bcccc4' : '#f1eadd'}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: essayText ? '#2f6b4f' : '#d9cbb3', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2420' }}>Personal Essay</div>
                  <div style={{ fontSize: 11, color: '#5d6b63' }}>{essayText ? `${wordCount} words` : 'Not started'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 13, background: insights ? '#cdd8d1' : '#f6f1e8', border: `1px solid ${insights ? '#bcccc4' : '#f1eadd'}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: insights ? '#2f6b4f' : '#d9cbb3', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2420' }}>AI Insights</div>
                  <div style={{ fontSize: 11, color: '#5d6b63' }}>{insights ? `${insights.length} suggestions` : 'Submit essay to unlock'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ background: '#f6f1e8', padding: 40, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          {docTab === 'editor' && (
            <div style={{ background: '#faf7f2', maxWidth: 580, width: '100%', borderRadius: 20, boxShadow: '0 18px 40px rgba(60,72,130,.08)', padding: '44px 48px', minHeight: 600, border: '1px solid #f1eadd' }}>
              <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, letterSpacing: '.5px', color: '#6b7872', marginBottom: 28 }}>PATHWAY STRATEGIST REVIEW MODE</div>

              {savedSchools.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#5d6b63', letterSpacing: '.6px', display: 'block', marginBottom: 8 }}>YOUR SCHOOLS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {savedSchools.map(school => (
                      <button key={school} onClick={() => selectEssaySchool(school)}
                        style={{
                          background: essaySchool === school ? 'linear-gradient(135deg,#1d3b32,#1d3b32)' : '#faf7f2',
                          color: essaySchool === school ? '#faf7f2' : '#1a2420',
                          border: essaySchool === school ? 'none' : '1.5px solid #f1eadd', borderRadius: 12, padding: '7px 14px',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          boxShadow: essaySchool === school ? '0 8px 16px rgba(105,91,255,.3)' : 'none',
                        }}>
                        {school}{essays?.[school]?.text ? ' ✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#5d6b63', letterSpacing: '.6px', display: 'block', marginBottom: 8 }}>TARGET SCHOOL</label>
                <input
                  value={essaySchool}
                  onChange={e => setEssaySchool(e.target.value)}
                  placeholder="e.g. Harvard Business School"
                  style={{ width: '100%', border: '1.5px solid #f1eadd', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1a2420', boxSizing: 'border-box', background: '#f6f1e8' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#5d6b63', letterSpacing: '.6px', display: 'block', marginBottom: 8 }}>ESSAY QUESTION</label>
                <textarea
                  value={essayQuestion}
                  onChange={e => setEssayQuestion(e.target.value)}
                  placeholder="Paste the exact essay prompt/question for this school…"
                  style={{ width: '100%', minHeight: 60, border: '1.5px solid #f1eadd', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1a2420', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, background: '#f6f1e8' }}
                />
              </div>

              <h1 style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 800, color: '#1a2420', margin: '0 0 24px', letterSpacing: '-.4px' }}>
                Personal Statement{essaySchool ? `: ${essaySchool}` : ''}
              </h1>
              {essayText ? (
                <textarea
                  value={essayText}
                  onChange={e => setEssayText(e.target.value)}
                  style={{ width: '100%', minHeight: 380, border: '1.5px solid #f1eadd', borderRadius: 14, padding: '16px', fontSize: 15, lineHeight: 1.8, color: '#2c3833', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#f6f1e8' }}
                />
              ) : (
                <div style={{ minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e7dcc7', borderRadius: 14, padding: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 14.5, color: '#5d6b63', marginBottom: 18, lineHeight: 1.6 }}>
                    Paste your personal statement or essay draft here to unlock AI analysis and rewriting.
                  </div>
                  <button
                    onClick={() => setEssayText(' ')}
                    style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                    Start Writing →
                  </button>
                </div>
              )}
            </div>
          )}

          {docTab === 'documents' && (
            <div style={{ width: '100%', maxWidth: 680 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a2420', margin: 0, letterSpacing: '-.4px' }}>My CV</h2>
                  {cvFile && <div style={{ fontSize: 12, color: '#5d6b63', marginTop: 4 }}>Original file saved: {cvFile.name}</div>}
                </div>
                {cvText ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {cvFile && (
                      <button onClick={downloadOriginalCv}
                        style={{ background: '#faf7f2', border: '1.5px solid #f1eadd', borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#1a2420', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Original
                      </button>
                    )}
                    {!editingCv ? (
                      <button onClick={() => { setEditingCv(true); setCvEdit(cvText); }}
                        style={{ background: '#faf7f2', border: '1.5px solid #f1eadd', borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#1a2420', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Edit
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setEditingCv(false)}
                          style={{ background: 'none', border: '1.5px solid #f1eadd', borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#5d6b63', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Cancel
                        </button>
                        <button onClick={() => { setCvText(cvEdit); setEditingCv(false); showToast('CV saved.'); }}
                          style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 16px rgba(105,91,255,.3)' }}>
                          Save
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <button onClick={() => setShowCvModal(true)}
                    style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 16px rgba(105,91,255,.3)' }}>
                    + Upload CV
                  </button>
                )}
              </div>
              {cvText ? (
                editingCv ? (
                  <textarea
                    value={cvEdit}
                    onChange={e => setCvEdit(e.target.value)}
                    style={{ width: '100%', minHeight: 500, border: '1.5px solid #f1eadd', borderRadius: 14, padding: '20px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, color: '#1a2420', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#f6f1e8' }}
                  />
                ) : (
                  <div style={{ background: '#faf7f2', borderRadius: 16, border: '1px solid #f1eadd', padding: '28px 32px', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, color: '#2c3833', fontFamily: 'inherit', minHeight: 400, boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
                    {cvText}
                  </div>
                )
              ) : (
                <div style={{ background: '#faf7f2', borderRadius: 16, border: '2px dashed #e7dcc7', padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 14.5, color: '#5d6b63', marginBottom: 18, lineHeight: 1.6 }}>
                    No CV uploaded yet. Paste your CV to unlock profile analysis and personalized strategy.
                  </div>
                  <button onClick={() => setShowCvModal(true)}
                    style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '13px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                    Paste My CV →
                  </button>
                </div>
              )}
            </div>
          )}

          {docTab === 'interview' && (
            <div style={{ width: '100%', maxWidth: 680 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a2420', margin: '0 0 8px', letterSpacing: '-.4px' }}>Mock Interview</h2>
              <p style={{ fontSize: 13.5, color: '#5d6b63', margin: '0 0 24px', lineHeight: 1.55, fontWeight: 500 }}>
                Run a realistic ~10-minute admissions interview in chat, school by school. Each one ends with a rating, feedback, and next steps.
              </p>

              {interviewSchools.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {interviewSchools.map(school => {
                    const result = interviews?.[school];
                    return (
                      <div key={school} style={{ background: '#faf7f2', borderRadius: 16, border: '1px solid #f1eadd', padding: '20px 22px', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: result ? 10 : 4 }}>
                          <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1a2420' }}>{school}</div>
                          {result?.rating != null && (
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#1d3b32' }}>{result.rating}/10</div>
                          )}
                        </div>
                        {result ? (
                          <>
                            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#2c3833', marginBottom: result.nextSteps?.length ? 12 : 0 }}>{result.feedback}</div>
                            {result.nextSteps?.length > 0 && (
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: '#5d6b63' }}>
                                {result.nextSteps.map((step, i) => <li key={i}>{step}</li>)}
                              </ul>
                            )}
                            <button onClick={() => startInterview(school)}
                              style={{ marginTop: 14, background: 'none', border: '1.5px solid #f1eadd', color: '#1d3b32', borderRadius: 12, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Redo Interview →
                            </button>
                          </>
                        ) : (
                          <button onClick={() => startInterview(school)}
                            style={{ marginTop: 6, background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 16px rgba(105,91,255,.3)' }}>
                            Start Mock Interview →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#faf7f2', borderRadius: 16, border: '2px dashed #e7dcc7', padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 14.5, color: '#5d6b63', marginBottom: 18, lineHeight: 1.6 }}>
                    Choose your target schools in the chat first, then come back here to start a mock interview for each one.
                  </div>
                  <button onClick={() => setCandTab('advisor')}
                    style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '13px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                    Go to Chat →
                  </button>
                </div>
              )}
            </div>
          )}

          {docTab === 'insights' && (
            <div style={{ width: '100%', maxWidth: 580 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a2420', margin: '0 0 24px', letterSpacing: '-.4px' }}>AI Insights</h2>
              {insights && insights.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {insights.map((item, i) => (
                    <div key={i} style={{
                      background: item.type === 'strength' ? '#cdd8d1' : '#e9c79a',
                      border: `1px solid ${item.type === 'strength' ? '#bcccc4' : '#e9c79a'}`,
                      borderRadius: 14, padding: '16px 18px',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: item.type === 'strength' ? '#2f6b4f' : '#c0844a', marginBottom: 6, textTransform: 'uppercase' }}>
                        {item.type === 'strength' ? '✓ Strength' : '→ Suggestion'}
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#2c3833' }}>{item.text}</div>
                    </div>
                  ))}
                  <button onClick={() => analyzeEssay()} disabled={busy}
                    style={{ marginTop: 8, background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1, boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                    Re-analyze Essay
                  </button>
                </div>
              ) : (
                <div style={{ background: '#faf7f2', borderRadius: 16, border: '2px dashed #e7dcc7', padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 14.5, color: '#5d6b63', marginBottom: 18, lineHeight: 1.6 }}>
                    Paste your essay in the Essay Editor, then click "Analyze with AI" to get specific, actionable feedback.
                  </div>
                  <button onClick={() => setDocTab('editor')}
                    style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '13px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                    Go to Essay Editor →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right insights panel */}
        <div style={{ borderLeft: '1px solid #f1eadd', background: '#f6f1e8', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#f1eadd', padding: 20, borderBottom: '1px solid #f1eadd' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ color: '#1d3b32' }}>✦</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.5px', color: '#1a2420' }}>STRATEGIST TOOLS</span>
            </div>
          </div>
          <div style={{ padding: '20px 20px', flex: 1 }}>
            {docTab === 'editor' && essayText && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#1a2420', marginBottom: 8 }}>
                  WORD COUNT <span style={{ color: wordCount > 1000 ? '#a8453f' : '#5d6b63' }}>{wordCount} / 1000</span>
                </div>
                <div style={{ height: 6, background: '#f1eadd', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(essayPct, 100)}%`, height: '100%', background: wordCount > 1000 ? '#a8453f' : 'linear-gradient(90deg,#1d3b32,#1d3b32)' }} />
                </div>
              </>
            )}

            {insights && insights.slice(0, 2).map((item, i) => (
              <div key={i} style={{
                background: item.type === 'strength' ? '#cdd8d1' : '#e9c79a',
                border: `1px solid ${item.type === 'strength' ? '#bcccc4' : '#e9c79a'}`,
                borderRadius: 14, padding: 14, marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: item.type === 'strength' ? '#2f6b4f' : '#c0844a', marginBottom: 5, textTransform: 'uppercase' }}>
                  {item.type === 'strength' ? '✓ Strength' : '→ Improve'}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#5d6b63' }}>{item.text}</div>
              </div>
            ))}

            {!insights && essayText && (
              <div style={{ background: '#e9c79a', border: '1px solid #e9c79a', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#5d6b63', lineHeight: 1.5 }}>Click "Analyze with AI" to get specific feedback on your essay.</div>
              </div>
            )}
          </div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {essayText && (
              <>
                <button onClick={() => analyzeEssay()} disabled={busy}
                  style={{ width: '100%', background: 'none', border: '1.5px solid #f1eadd', color: '#1d3b32', borderRadius: 13, padding: 13, fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}>
                  ✦ Analyze with AI
                </button>
                <button onClick={() => rewriteEssay()} disabled={busy}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: 13, fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1, boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                  {busy ? 'Rewriting...' : '✦ Rewrite with AI'}
                </button>
              </>
            )}
            {!cvText && (
              <button onClick={() => setShowCvModal(true)}
                style={{ width: '100%', background: 'linear-gradient(135deg,#c0844a,#a8453f)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: 13, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(255,122,156,.32)' }}>
                Upload CV →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
