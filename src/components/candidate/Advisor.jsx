import React, { useEffect, useRef, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';

const CATEGORY_CHIPS = [
  { label: 'Undergraduate', emoji: '🎓', text: 'Undergraduate' },
  { label: 'Graduate', emoji: '📚', text: 'Graduate' },
  { label: 'Postgraduate / Doctoral', emoji: '🔬', text: 'Postgraduate / Doctoral' },
  { label: 'Personal Development', emoji: '✨', text: 'Personal Development' },
];

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, busy, scores, profile, setShowCvModal, setCandTab, narrative, tasks, completedTasks, setCompletedTasks }) {
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, busy]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 200);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasScores = !!scores;
  const showChips = !busy && chat.every(m => m.role === 'ai');
  const lastAiText = chat.filter(m => m.role === 'ai').slice(-1)[0]?.text || '';
  const showNarrativeCTA = !busy && !narrative && lastAiText.includes('Narrative Strategy tab');

  const taskList = tasks || [];
  const toggleTask = (text) => setCompletedTasks(prev => ({ ...prev, [text]: !prev[text] }));
  const doneCount = taskList.filter(t => completedTasks?.[t]).length;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '24px 28px 28px' }}>
      <div style={{ flex: 1, minHeight: 0, background: '#faf7f2', borderRadius: 24, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '18px 28px', borderBottom: '1px solid #f1eadd', overflowX: 'auto', flexShrink: 0 }}>
          {STEPS.map((label, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx;
            const on = active || done;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                  ...(on
                    ? { background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', boxShadow: '0 6px 14px rgba(105,91,255,.3)' }
                    : { background: '#faf7f2', color: '#6b7872', border: '1.5px solid #e7dcc7' }),
                }}>
                  {done ? '✓' : i + 1}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: active ? 800 : 600, color: active ? '#1a2420' : '#6b7872', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <span style={{ width: 30, height: 2, borderRadius: 2, background: done ? '#1d3b32' : '#e7dcc7', margin: '0 2px' }} />}
              </div>
            );
          })}
        </div>

        {/* grid: chat + rail */}
        <div className="pw-advisor-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 322px', overflow: 'hidden' }}>

          {/* chat */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #f1eadd', position: 'relative' }}>
            {showScrollTop && (
              <button
                onClick={() => chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Scroll to top"
                style={{
                  position: 'absolute', bottom: 96, right: 24, zIndex: 5,
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 18px rgba(105,91,255,.36)',
                }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            )}

            <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 24 }}>
                <span style={{ width: 48, height: 48, borderRadius: 15, background: 'linear-gradient(140deg,#1d3b32,#1d3b32)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                </span>
                <div>
                  <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.4px', color: '#1a2420', margin: 0 }}>
                    {profile?.name ? `${profile.name}'s Strategic Profile` : 'Your Strategic Profile'}
                  </h2>
                  <div style={{ fontSize: 12.5, color: '#2f6b4f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f6b4f', boxShadow: '0 0 8px rgba(25,192,138,.7)' }} />
                    AI advisor · online
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
                {chat.map((m, i) => (
                  m.role === 'ai' ? (
                    <div key={i} style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 18px 18px 18px', padding: '16px 19px', fontSize: 14.5, lineHeight: 1.62, color: '#2c3833', whiteSpace: 'pre-wrap', animation: 'pwFade .35s ease', maxWidth: '90%' }}>
                      {renderFormattedText(m.text)}
                    </div>
                  ) : (
                    <div key={i} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', borderRadius: '18px 18px 6px 18px', padding: '14px 19px', fontSize: 14.5, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap', boxShadow: '0 10px 22px rgba(105,91,255,.28)', animation: 'pwFade .35s ease' }}>
                      {m.text.startsWith('Here is my CV') ? '📄 CV / background submitted for analysis' : m.text}
                    </div>
                  )
                ))}

                {busy && (
                  <div style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 18px 18px 18px', padding: '17px 20px' }}>
                    <span style={{ display: 'inline-flex', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a8a72', display: 'inline-block', animation: `pwPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </span>
                  </div>
                )}

                {showChips && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9a8a72', letterSpacing: '1px', marginBottom: 12 }}>CHOOSE YOUR PATH</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {CATEGORY_CHIPS.map(chip => (
                        <button key={chip.label} onClick={() => send(chip.text)} disabled={busy}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#faf7f2', border: '1.5px solid #e7dcc7', borderRadius: 14, padding: '11px 17px', fontSize: 13.5, fontWeight: 700, color: '#2c3833', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 16 }}>{chip.emoji}</span>{chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload CV prompt */}
                {!showChips && !hasScores && !busy && chat.some(m => m.role === 'user') && (
                  <div style={{ background: '#e9c79a', border: '1px solid #e9c79a', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, color: '#8a6a3e', fontWeight: 700 }}>📄 Upload your CV to skip ahead and get instant analysis</span>
                    <button onClick={() => setShowCvModal(true)} style={{ background: 'linear-gradient(135deg,#c0844a,#c0844a)', color: '#faf7f2', border: 'none', borderRadius: 11, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Upload CV →
                    </button>
                  </div>
                )}

                {/* Analysis ready banner */}
                {scores && stepIdx >= 2 && (
                  <div style={{ background: '#cdd8d1', border: '1px solid #cdd8d1', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, color: '#2f6b4f', fontWeight: 700 }}>✓ Your profile analysis is ready</span>
                    <button onClick={() => setCandTab('analysis')} style={{ background: 'linear-gradient(135deg,#2f6b4f,#2f6b4f)', color: '#faf7f2', border: 'none', borderRadius: 11, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      View Analysis →
                    </button>
                  </div>
                )}

                {/* Narrative choice CTA */}
                {showNarrativeCTA && (
                  <div style={{ background: 'linear-gradient(135deg,#122621,#122621)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#c0844a', marginBottom: 4 }}>NEXT STEP</div>
                      <span style={{ fontSize: 14, color: '#e7dcc7', fontWeight: 600 }}>Choose your narrative strategy</span>
                    </div>
                    <button onClick={() => setCandTab('strategy')} style={{ background: '#faf7f2', color: '#1d3b32', border: 'none', borderRadius: 11, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Choose Narrative →
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* input */}
            <div style={{ padding: '16px 24px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6f1e8', border: '1.5px solid #e7dcc7', borderRadius: 18, padding: '7px 7px 7px 8px' }}>
                <button onClick={() => setShowCvModal(true)} title="Upload or paste your CV / background info"
                  style={{ background: '#faf7f2', border: 'none', borderRadius: 13, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1d3b32', flexShrink: 0, boxShadow: '0 2px 6px rgba(60,72,130,.08)' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                  </svg>
                </button>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={busy}
                  placeholder={busy ? 'Analyzing…' : 'Type your answer or ask anything…'}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, padding: '11px 4px', color: '#0d1c18', fontFamily: 'inherit', fontWeight: 500 }}
                />
                <button onClick={() => send()} disabled={busy || !input.trim()}
                  style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', border: 'none', borderRadius: 13, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: '#faf7f2', flexShrink: 0, boxShadow: '0 8px 18px rgba(105,91,255,.36)', opacity: busy || !input.trim() ? 0.55 : 1 }}>
                  <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                  </svg>
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, paddingLeft: 6 }}>
                <span style={{ fontSize: 11.5, color: '#9a8a72', fontWeight: 500 }}>Confidential consultation · responses are AI-generated guidance</span>
              </div>
            </div>
          </div>

          {/* tasks rail */}
          <div className="pw-advisor-rail" style={{ background: '#f6f1e8', padding: '26px 22px', overflowY: 'auto', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.3px', color: '#1a2420', margin: 0 }}>Your tasks</h3>
              {taskList.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#1d3b32', background: '#f1eadd', padding: '4px 9px', borderRadius: 8 }}>{doneCount}/{taskList.length}</span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: '#5d6b63', margin: '0 0 20px', lineHeight: 1.5, fontWeight: 500 }}>Personalized steps, added as we learn about you.</p>

            {taskList.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9a8a72', fontWeight: 500 }}>Tasks will appear here as we learn more about you.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {taskList.map((text) => {
                  const done = !!completedTasks?.[text];
                  return (
                    <div key={text} onClick={() => toggleTask(text)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', borderRadius: 15, cursor: 'pointer', border: `1px solid ${done ? '#cdd8d1' : '#f1eadd'}`, background: done ? '#cdd8d1' : '#faf7f2' }}>
                      <span style={{
                        width: 23, height: 23, borderRadius: 8, flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...(done ? { background: '#2f6b4f', border: 'none', boxShadow: '0 4px 10px rgba(25,192,138,.32)' } : { background: '#faf7f2', border: '1.8px solid #e7dcc7' }),
                      }}>
                        {done && (
                          <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: done ? '#9a8a72' : '#2c3833', textDecoration: done ? 'line-through' : 'none' }}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
