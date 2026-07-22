import React from 'react';

export default function NarrativeModal({ onClose, onChoose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(30,45,90,.58)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="pw-narrative-modal-shell" onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 16, maxWidth: 640, width: '100%', padding: 32, boxShadow: '0 30px 60px rgba(30,45,90,.35)' }}>
        <button onClick={onClose} title="Close" style={{ position: 'absolute', top: 20, right: 20, width: 34, height: 34, borderRadius: 10, border: 'none', background: '#f2f6ff', cursor: 'pointer' }}>×</button>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#3a63ff', marginBottom: 8 }}>STEP 5 · BEFORE YOU WRITE</div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 27, color: '#111a33', margin: '0 0 10px' }}>Build your admissions strategy</h2>
        <p style={{ fontSize: 14, color: '#5a6a8f', lineHeight: 1.65 }}>You do not need to choose a Pivot or Upgrade. Your advisor will review the evidence, test the goal, compare credible directions, and recommend the strongest strategy you can genuinely defend.</p>
        <div style={{ background: '#ffffff', border: '1px solid #e3ebfa', borderRadius: 12, padding: 16, margin: '20px 0' }}>
          <strong style={{ color: '#111a33' }}>What happens next</strong>
          <p style={{ color: '#5a6a8f', lineHeight: 1.55, margin: '7px 0 0' }}>One short question at a time, only for material gaps. Essays remain locked until you confirm the final strategy.</p>
        </div>
        <button onClick={() => onChoose('start')} style={{ width: '100%', background: '#111a33', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 750, cursor: 'pointer' }}>Start strategy review</button>
      </div>
    </div>
  );
}
