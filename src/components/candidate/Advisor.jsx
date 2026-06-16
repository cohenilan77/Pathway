import React, { useEffect, useRef } from 'react';

function RadialDial({ score, stroke, label, sublabel }) {
  const dashArray = `${score * 3.14} 314`;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="116" height="116" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#eef1f7" strokeWidth="9" />
        <circle cx="60" cy="60" r="50" transform="rotate(-90 60 60)" fill="none"
          stroke={stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={dashArray} />
        <text x="60" y="70" textAnchor="middle"
          style={{ fontFamily: "'Playfair Display',serif", fontSize: '30px', fontWeight: 700, fill: '#16233f' }}>
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#16233f', marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, busy, noop }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const chips = [
    { label: 'MBA', text: 'I am targeting an MBA at M7 schools.' },
    { label: 'Masters', text: 'I am pursuing a specialized Masters degree.' },
    { label: 'PhD', text: 'I am applying to PhD programs.' },
    { label: 'Undergrad', text: 'I am applying for undergraduate admission.' },
  ];

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '22px 36px', borderBottom: '1px solid #e7eaf3', background: '#fff', overflowX: 'auto' }}>
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
                {i + 1}
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
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', background: '#fff' }}>
        {/* Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #eef1f6' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '34px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
              <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#16233f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>LS</span>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: '#16233f', margin: 0 }}>Strategic Profile Initiation</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
              {chat.map((m, i) => (
                m.role === 'ai' ? (
                  <div key={i} style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '18px 20px', fontSize: 15, lineHeight: 1.6, color: '#2a3447' }}>
                    {m.text}
                  </div>
                ) : (
                  <div key={i} style={{ alignSelf: 'flex-end', background: '#16233f', color: '#eef2fa', borderRadius: '16px 16px 4px 16px', padding: '16px 20px', fontSize: 15, lineHeight: 1.6, maxWidth: '80%' }}>
                    {m.text}
                  </div>
                )
              ))}
              {busy && (
                <div style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '18px 20px', fontSize: 15, color: '#8a93a3', fontStyle: 'italic' }}>
                  Analyzing your profile...
                </div>
              )}
              {stepIdx === 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f', margin: '6px 0 12px' }}>What path are we formalizing today?</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {chips.map(chip => (
                      <button key={chip.label} onClick={() => send(chip.text)} style={{ background: '#fff', border: '1px solid #d7ddec', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input bar */}
          <div style={{ padding: '18px 40px 14px', borderTop: '1px solid #eef1f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f4f6fb', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 18px' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Inquire about your strategy..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 15, padding: '10px 0', color: '#1c2433', fontFamily: 'inherit' }}
              />
              <button onClick={noop} style={{ background: '#eef1f7', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49" />
                </svg>
              </button>
              <button onClick={() => send()} disabled={busy} style={{ background: '#16233f', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'not-allowed' : 'pointer', color: '#fff', opacity: busy ? 0.6 : 1 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#9aa3b5', marginTop: 10 }}>
              Confidential consultation active. End-to-end encrypted.
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{ background: '#fbfcfe', padding: '32px 26px', overflowY: 'auto' }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: '#16233f', margin: '0 0 6px', lineHeight: 1.15 }}>Real-time Analysis</h3>
          <p style={{ fontSize: 13, color: '#8a93a3', margin: '0 0 30px', lineHeight: 1.5 }}>Live profile calibration based on dialogue.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
            <RadialDial score={80} stroke="#16233f" label="ACADEMIC" sublabel="Tier 1 Quantitative Baseline" />
            <RadialDial score={95} stroke="#b8902f" label="PROFESSIONAL" sublabel="Elite Industry Positioning" />
            <RadialDial score={60} stroke="#aebde6" label="STRATEGY" sublabel="Narrative Under Development" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b8902f', fontSize: 14, fontWeight: 700, borderTop: '1px solid #eef1f6', width: '100%', justifyContent: 'center', paddingTop: 22 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M12 2 9.2 8.6 2 9.2l5.5 4.8L5.8 21 12 17.3 18.2 21l-1.7-7L22 9.2l-7.2-.6Z" />
              </svg>
              Fit Index: 82%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
