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
          background: '#fff', borderRadius: 20, maxWidth: 560, width: '100%',
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(15,26,48,0.32), 0 4px 16px rgba(15,26,48,0.12)',
          overflow: 'hidden',
        }}
      >
        <div style={{ background: '#16233f', padding: '26px 32px', position: 'relative', flexShrink: 0 }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#9bb0d8', fontSize: 22, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
          >
            ×
          </button>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
            Quick-Start Guide
          </h2>
          <p style={{ fontSize: 13.5, color: '#9bb0d8', margin: '6px 0 0' }}>How the process and tabs work, in short.</p>
        </div>

        <div style={{ padding: '26px 32px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ fontSize: 14, color: '#8a93a3', fontStyle: 'italic' }}>Putting your guide together…</div>
          )}
          {!loading && error && (
            <div style={{ fontSize: 14, color: '#d64545' }}>Couldn't generate the guide right now — please try again.</div>
          )}
          {!loading && !error && (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2a3447' }}>
              {renderFormattedText(text)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
