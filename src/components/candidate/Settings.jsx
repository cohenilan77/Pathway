import React, { useState } from 'react';

const PLAN_DETAILS = [
  {
    key: 'free',
    label: 'Free',
    description: 'Chat through profile, analysis, and program selection.',
  },
  {
    key: 'pathwayAI',
    label: 'Pathway AI',
    description: 'The full AI-guided process — narrative, CV, essays, and mock interviews.',
  },
  {
    key: 'aiStrategist',
    label: 'AI + Strategist',
    description: 'Everything in Pathway AI, plus 1:1 access to a human admissions consultant.',
  },
];

export default function Settings({ profile, plan, setPlan, setShowContactModal, resetSession, signOut, showToast }) {
  const [notifStrategist, setNotifStrategist] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name || '',
    degree: profile?.degree || '',
    gpa: profile?.gpa || '',
    gmat: profile?.gmat || '',
  });

  const handleSave = () => {
    try {
      const prefs = JSON.parse(localStorage.getItem('pathway_prefs') || '{}');
      localStorage.setItem('pathway_prefs', JSON.stringify({ ...prefs, profile: form, notifStrategist, notifDigest }));
      showToast('Preferences saved.');
    } catch {
      showToast('Could not save preferences.');
    }
  };

  const handleSelectPlan = (key) => {
    if (key === plan) return;
    setPlan(key);
    const label = PLAN_DETAILS.find(p => p.key === key)?.label || key;
    if (key === 'aiStrategist') {
      showToast('AI + Strategist selected — connecting you with a consultant.');
      setShowContactModal(true);
    } else {
      showToast(`Plan updated to ${label}.`);
    }
  };

  const Toggle = ({ on, onToggle }) => (
    <span onClick={onToggle} style={{ width: 42, height: 24, borderRadius: 12, background: on ? 'linear-gradient(135deg,#1d3b32,#1d3b32)' : '#e7dcc7', position: 'relative', flexShrink: 0, cursor: 'pointer', display: 'inline-block', transition: 'background .2s', boxShadow: on ? '0 4px 10px rgba(105,91,255,.32)' : 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#faf7f2', transition: 'left .2s' }} />
    </span>
  );

  const inputStyle = { width: '100%', border: '1.5px solid #f1eadd', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1a2420', background: '#f6f1e8' };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 34px 64px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a2420', margin: '0 0 8px', letterSpacing: '-.5px' }}>Settings</h1>
        <p style={{ fontSize: 14.5, color: '#5d6b63', margin: '0 0 28px', fontWeight: 500 }}>Manage your private office preferences.</p>

        {/* Plan */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a2420', margin: '0 0 6px', letterSpacing: '-.3px' }}>Plan</h3>
          <p style={{ fontSize: 13, color: '#5d6b63', margin: '0 0 18px' }}>Choose how much of the process you want to unlock.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            {PLAN_DETAILS.map(p => {
              const active = plan === p.key;
              return (
                <div key={p.key} style={{
                  display: 'flex', flexDirection: 'column',
                  border: active ? '2px solid #1d3b32' : '1.5px solid #f1eadd',
                  background: active ? '#f6f1e8' : '#faf7f2',
                  borderRadius: 16, padding: '20px 18px',
                }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1a2420', marginBottom: 8 }}>{p.label}</div>
                  <div style={{ fontSize: 12.5, color: '#5d6b63', lineHeight: 1.5, marginBottom: 18, flex: 1 }}>{p.description}</div>
                  <button onClick={() => handleSelectPlan(p.key)} disabled={active} style={{
                    background: active ? 'none' : 'linear-gradient(135deg,#1d3b32,#1d3b32)',
                    color: active ? '#5d6b63' : '#faf7f2',
                    border: active ? '1.5px solid #f1eadd' : 'none',
                    borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 700,
                    cursor: active ? 'default' : 'pointer', fontFamily: 'inherit',
                    boxShadow: active ? 'none' : '0 8px 16px rgba(105,91,255,.3)',
                  }}>
                    {active ? 'Current Plan' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a2420', margin: '0 0 6px', letterSpacing: '-.3px' }}>Profile</h3>
          <p style={{ fontSize: 13, color: '#5d6b63', margin: '0 0 18px' }}>Auto-filled from your advisor conversation. Override manually here.</p>
          <div className="pw-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#2c3833', marginBottom: 7 }}>Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#2c3833', marginBottom: 7 }}>Target Degree</label>
              <input value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} placeholder="MBA, Masters, PhD..." style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#2c3833', marginBottom: 7 }}>GPA</label>
              <input value={form.gpa} onChange={e => setForm(f => ({ ...f, gpa: e.target.value }))} placeholder="e.g. 3.7" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#2c3833', marginBottom: 7 }}>GMAT / GRE</label>
              <input value={form.gmat} onChange={e => setForm(f => ({ ...f, gmat: e.target.value }))} placeholder="e.g. 720" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28, marginBottom: 24, boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a2420', margin: '0 0 6px', letterSpacing: '-.3px' }}>Notifications</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1eadd' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2420' }}>Strategist updates</div>
              <div style={{ fontSize: 12.5, color: '#5d6b63', marginTop: 2 }}>Get notified when your advisor reviews a document.</div>
            </div>
            <Toggle on={notifStrategist} onToggle={() => setNotifStrategist(v => !v)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2420' }}>Weekly score digest</div>
              <div style={{ fontSize: 12.5, color: '#5d6b63', marginTop: 2 }}>A summary of your competitiveness metrics.</div>
            </div>
            <Toggle on={notifDigest} onToggle={() => setNotifDigest(v => !v)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={handleSave} style={{ background: 'linear-gradient(135deg,#1d3b32,#1d3b32)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
            Save Changes
          </button>
          <button onClick={resetSession} style={{ background: 'none', color: '#a8453f', border: '1.5px solid #f3e3df', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear Session Data
          </button>
          <button onClick={signOut} style={{ background: 'none', color: '#5d6b63', border: '1.5px solid #f1eadd', borderRadius: 13, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
