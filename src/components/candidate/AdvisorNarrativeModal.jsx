import React from 'react';

export default function NarrativeModal({ onClose, onChoose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,27,52,.58)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 16, maxWidth: 640, width: '100%', padding: 32, boxShadow: '0 30px 60px rgba(20,27,52,.35)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} title="Close" style={{ position: 'absolute', top: 20, right: 20, width: 34, height: 34, borderRadius: 10, border: 'none', background: '#eef1f7', color: '#5a6478', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#b8902f', marginBottom: 8 }}>STEP 5 · BEFORE YOU WRITE</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#16233f', margin: '0 0 10px' }}>Choose your narrative</h2>
        <p style={{ fontSize: 14, color: '#7a8295', lineHeight: 1.6, margin: '0 0 24px' }}>
          Every strong application is anchored by a clear narrative posture. Pick the one that best reflects how you want to be seen by admissions committees.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
          <div style={{ background: '#fff', border: '1px solid #e8ecf6', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#16875c', background: '#e9f9f1', padding: '4px 9px', borderRadius: 7 }}>LOWER RISK</span>
            <span style={{ fontSize: 22 }}>📈</span>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: '#16233f', margin: 0 }}>The Upgrade</h3>
            <p style={{ fontSize: 13, color: '#7a8295', lineHeight: 1.55, margin: 0, flex: 1 }}>Build on your current trajectory and frame your experience as a natural step up.</p>
            <button onClick={() => onChoose('upgrade')} style={{ width: '100%', background: '#16233f', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px rgba(22,35,63,.26)' }}>Choose the Upgrade</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8ecf6', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#e0556b', background: '#fdeaf0', padding: '4px 9px', borderRadius: 7 }}>HIGHER REWARD</span>
            <span style={{ fontSize: 22 }}>🔄</span>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: '#16233f', margin: 0 }}>The Pivot</h3>
            <p style={{ fontSize: 13, color: '#7a8295', lineHeight: 1.55, margin: 0, flex: 1 }}>Reframe your story around a deliberate change in direction.</p>
            <button onClick={() => onChoose('pivot')} style={{ width: '100%', background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px rgba(194,150,47,.3)' }}>Choose the Pivot</button>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9aa3b5', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Not ready yet, go back to the chat</button>
        </div>
      </div>
    </div>
  );
}
