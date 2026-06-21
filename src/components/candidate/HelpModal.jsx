import React, { useEffect, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';

export default function HelpModal({ onClose }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch('/api/help', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.text) setText(data.text);
        else setError(true);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,26,48,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, maxWidth: 560, width: '100%',
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
          boxShadow: '0 24px 80px rgba(40,30,90,0.28), 0 4px 16px rgba(40,30,90,0.12)',
          overflow: 'hidden',
        }}
      >
        <div style={{ background: 'linear-gradient(135deg,#2a2f5b,#4733a8)', padding: '26px 32px', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#c5c9f5', fontSize: 22, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
          >
            ×
          </button>
          <h2 style={{ position: 'relative', fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-.4px' }}>
            Quick-Start Guide
          </h2>
          <p style={{ position: 'relative', fontSize: 13.5, color: '#c5c9f5', margin: '6px 0 0' }}>How the process and tabs work, in short.</p>
        </div>

        <div style={{ padding: '26px 32px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ fontSize: 14, color: '#9098b5', fontStyle: 'italic' }}>Putting your guide together…</div>
          )}
          {!loading && error && (
            <div style={{ fontSize: 14, color: '#e0457a' }}>Couldn't generate the guide right now — please try again.</div>
          )}
          {!loading && !error && (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#33405e' }}>
              {renderFormattedText(text)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
