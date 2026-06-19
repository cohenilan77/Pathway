import React, { useEffect, useRef, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';

function RadialDial({ score, stroke, label, sublabel }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="116" height="116" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#eef1f7" strokeWidth="9" />
        <circle cx="60" cy="60" r="50" transform="rotate(-90 60 60)" fill="none"
          stroke={stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${pct * 3.14} 314`} />
        <text x="60" y="70" textAnchor="middle"
          style={{ fontFamily: "'Playfair Display',serif", fontSize: '30px', fontWeight: 700, fill: '#16233f' }}>
          {pct}
        </text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#16233f', marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

const CATEGORY_CHIPS = [
  { label: 'Undergraduate', text: 'Undergraduate' },
  { label: 'Graduate', text: 'Graduate' },
  { label: 'Postgraduate / Doctoral', text: 'Postgraduate / Doctoral' },
  { label: 'Personal Development', text: 'Personal Development' },
];

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, busy, scores, profile, setShowCvModal, setCandTab, resetSession, narrative }) {
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
  // Show chips only before first user message
  const showChips = !busy && chat.every(m => m.role === 'ai');
  // Detect when AI has presented narrative choice (mentions "Narrative Strategy tab")
  const lastAiText = chat.filter(m => m.role === 'ai').slice(-1)[0]?.text || '';
  const showNarrativeCTA = !busy && !narrative && lastAiText.includes('Narrative Strategy tab');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '22px 36px', borderBottom: '1px solid #e7eaf3', background: '#fff', overflowX: 'auto', flexShrink: 0 }}>
        {STEPS.map((label, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          const on = active || done;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
                background: on ? '#16233f' : '#fff', color: on ? '#fff' : '#9aa3b5',
                border: on ? 'none' : '1.5px solid #e3e7f0',
              }}>
                {done ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: 14, fontWeight: active ? 700 : 600, color: active ? '#16233f' : '#9aa3b5', whiteSpace: 'nowrap' }}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span style={{ width: 34, height: 1, background: '#e1e6f0', margin: '0 4px' }} />}
            </div>
          );
        })}
      </div>

      {/* Chat + Right rail */}
      <div className="pw-advisor-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', background: '#fff', minHeight: 0, overflow: 'hidden' }}>
        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #eef1f6', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          {showScrollTop && (
            <button
              onClick={() => chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              title="Scroll to top"
              style={{
                position: 'fixed', bottom: 90, right: 32, zIndex: 100,
                width: 42, height: 42, borderRadius: '50%',
                background: '#16233f', color: '#fff', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(22,35,63,.32)',
              }}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
          <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '34px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#16233f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>LS</span>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#16233f', margin: 0 }}>
                  {profile?.name ? `${profile.name}'s Strategic Profile` : 'Strategic Profile'}
                </h2>
              </div>
              <button onClick={resetSession} style={{ background: 'none', border: '1px solid #e3e7f0', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#8a93a3', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                New Session
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
              {chat.map((m, i) => (
                m.role === 'ai' ? (
                  <div key={i} style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '18px 20px', fontSize: 15, lineHeight: 1.65, color: '#2a3447', whiteSpace: 'pre-wrap' }}>
                    {renderFormattedText(m.text)}
                  </div>
                ) : (
                  <div key={i} style={{ alignSelf: 'flex-end', background: '#16233f', color: '#eef2fa', borderRadius: '16px 16px 4px 16px', padding: '16px 20px', fontSize: 15, lineHeight: 1.6, maxWidth: '82%', whiteSpace: 'pre-wrap' }}>
                    {m.text.startsWith('Here is my CV') ? '📄 CV / background submitted for analysis' : m.text}
                  </div>
                )
              ))}

              {busy && (
                <div style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '18px 20px' }}>
                  <span style={{ display: 'inline-flex', gap: 5 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#9aa3b5', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </span>
                  <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
                </div>
              )}

              {/* Program type chips — shown only before first user message */}
              {showChips && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8a93a3', letterSpacing: '.5px', margin: '4px 0 12px' }}>SELECT YOUR PATH</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {CATEGORY_CHIPS.map(chip => (
                      <button key={chip.label} onClick={() => send(chip.text)} disabled={busy}
                        style={{ background: '#fff', border: '1.5px solid #d7ddec', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.3px' }}>
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload CV prompt — shown after program type selected but before CV submitted */}
              {!showChips && !hasScores && !busy && chat.some(m => m.role === 'user') && (
                <div style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: '#7a5d12', fontWeight: 600 }}>📄 Upload your CV to skip ahead and get instant analysis</span>
                  <button onClick={() => setShowCvModal(true)} style={{ background: '#b8902f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Upload CV →
                  </button>
                </div>
              )}

              {/* Analysis ready banner */}
              {scores && stepIdx >= 2 && (
                <div style={{ background: '#f0f5e8', border: '1px solid #c8dba8', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 14, color: '#3a5a1a', fontWeight: 600 }}>✓ Your profile analysis is ready</span>
                  <button onClick={() => setCandTab('analysis')} style={{ background: '#2a4a12', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    View Analysis →
                  </button>
                </div>
              )}

              {/* Narrative choice CTA */}
              {showNarrativeCTA && (
                <div style={{ background: '#16233f', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#f5c94c', marginBottom: 4 }}>NEXT STEP</div>
                    <span style={{ fontSize: 14, color: '#e5ebf6', fontWeight: 600 }}>Choose your narrative strategy</span>
                  </div>
                  <button onClick={() => setCandTab('strategy')} style={{ background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Choose Narrative →
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input bar */}
          <div style={{ padding: '18px 40px 18px', borderTop: '1px solid #eef1f6', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f4f6fb', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 18px' }}>
              {/* Upload / paste CV button */}
              <button onClick={() => setShowCvModal(true)}
                title="Upload or paste your CV / background info"
                style={{ background: '#eef1f7', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                </svg>
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={busy}
                placeholder={busy ? 'Analyzing...' : 'Type your answer or ask anything…'}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 15, padding: '10px 0', color: '#1c2433', fontFamily: 'inherit' }}
              />
              <button onClick={() => send()} disabled={busy || !input.trim()}
                style={{ background: '#16233f', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: '#fff', opacity: busy || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9aa3b5' }}>
              <span>Confidential consultation · <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowCvModal(true)}>Upload CV</span></span>
              <button onClick={() => chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: '1px solid #e2e7f2', borderRadius: 7, padding: '4px 10px', fontSize: 11, color: '#9aa3b5', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                Top
              </button>
            </div>
          </div>
        </div>

        {/* Right analysis rail */}
        <div className="pw-advisor-rail" style={{ background: '#fbfcfe', padding: '32px 26px', overflowY: 'auto', minHeight: 0 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: '#16233f', margin: '0 0 6px', lineHeight: 1.15 }}>Real-time Analysis</h3>
          <p style={{ fontSize: 13, color: '#8a93a3', margin: '0 0 30px', lineHeight: 1.5 }}>
            {hasScores ? 'Profile calibrated from your conversation.' : 'Share your background or paste your CV to unlock.'}
          </p>

          {!hasScores ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 20 }}>
              {['ACADEMIC', 'PROFESSIONAL', 'LEADERSHIP'].map(label => (
                <div key={label} style={{ textAlign: 'center', opacity: 0.4 }}>
                  <svg width="116" height="116" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#eef1f7" strokeWidth="9" />
                    <text x="60" y="70" textAnchor="middle" style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fill: '#9aa3b5' }}>—</text>
                  </svg>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#9aa3b5', marginTop: 8 }}>{label}</div>
                </div>
              ))}
              <button onClick={() => setShowCvModal(true)}
                style={{ marginTop: 12, background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                Upload CV to Unlock →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
              <RadialDial score={scores.academic || 0} stroke="#16233f" label="ACADEMIC" sublabel="Quantitative & Academic Baseline" />
              <RadialDial score={scores.professional || 0} stroke="#b8902f" label="PROFESSIONAL" sublabel="Career Trajectory & Impact" />
              <RadialDial score={scores.leadership || scores.potential || 0} stroke="#aebde6" label="LEADERSHIP" sublabel="Team & Influence Track Record" />
              {scores.overall != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b8902f', fontSize: 14, fontWeight: 700, borderTop: '1px solid #eef1f6', width: '100%', justifyContent: 'center', paddingTop: 22 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M12 2 9.2 8.6 2 9.2l5.5 4.8L5.8 21 12 17.3 18.2 21l-1.7-7L22 9.2l-7.2-.6Z" />
                  </svg>
                  Overall Score: {scores.overall}/100
                </div>
              )}
              <button onClick={() => setCandTab('analysis')} style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                View Full Analysis →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
