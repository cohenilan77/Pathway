import React, { useState } from 'react';

const fieldWrap = { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #d7ddec', borderRadius: 10, padding: '0 14px', marginBottom: 18 };
const fieldInput = { flex: 1, border: 'none', outline: 'none', background: 'none', padding: '14px 0', fontSize: 15, color: '#1c2433', fontFamily: 'inherit', width: '100%' };
const fieldLabel = { display: 'block', fontSize: 13, fontWeight: 700, color: '#1c2433', marginBottom: 8 };

export default function Register({ go, register, authError, authBusy }) {
  const [name, setName] = useState('');
  const [residency, setResidency] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => register({ name, residency, email, age, password });
  const onKeyDown = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Hero panel */}
      <div style={{ position: 'relative', width: '44%', minHeight: '100vh', overflow: 'hidden', background: '#1a1410' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a2540 0%, #0d1520 50%, #1a1410 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,10,8,.42),rgba(12,10,8,.8))', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 56px', color: '#fff', pointerEvents: 'none' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 800, letterSpacing: '.5px' }}>Pathway</div>
          <div style={{ width: 54, height: 3, background: '#d8a83a', margin: '12px 0 46px' }} />
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 54, lineHeight: 1.08, fontWeight: 800, margin: '0 0 22px', maxWidth: '9ch' }}>
            Your Seat at the Table Awaits.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', maxWidth: '34ch', margin: 0 }}>
            Create your private office and begin building a strategy tailored to your ambitions.
          </p>
        </div>
        <div style={{ position: 'absolute', left: 56, bottom: 40, fontSize: 12, letterSpacing: '1.5px', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
          EST. MMXXIV &nbsp;&nbsp;|&nbsp;&nbsp; HIGH-TOUCH ADMISSIONS ADVISOR
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, background: '#eef1fc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, lineHeight: 1.12, fontWeight: 800, color: '#16233f', margin: '0 0 10px' }}>
            Request Your Access
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 30px' }}>A few details to set up your private office.</p>

          {authError && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', color: '#b42318', fontSize: 13, fontWeight: 600, borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}>
              {authError}
            </div>
          )}

          <label style={fieldLabel}>Full Name</label>
          <div style={fieldWrap}>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={onKeyDown} placeholder="Jane Doe" style={fieldInput} />
          </div>

          <label style={fieldLabel}>Residency</label>
          <div style={fieldWrap}>
            <input value={residency} onChange={e => setResidency(e.target.value)} onKeyDown={onKeyDown} placeholder="Country of residence" style={fieldInput} />
          </div>

          <label style={fieldLabel}>Email</label>
          <div style={fieldWrap}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKeyDown} placeholder="you@example.com" style={fieldInput} />
          </div>

          <label style={fieldLabel}>Age</label>
          <div style={fieldWrap}>
            <input type="number" min="1" value={age} onChange={e => setAge(e.target.value)} onKeyDown={onKeyDown} placeholder="27" style={fieldInput} />
          </div>

          <label style={fieldLabel}>Password</label>
          <div style={fieldWrap}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown} placeholder="At least 6 characters" style={fieldInput} />
          </div>

          <button onClick={submit} disabled={authBusy} style={{ width: '100%', background: '#0f1a30', color: '#fff', border: 'none', borderRadius: 10, padding: 16, fontSize: 15, fontWeight: 700, cursor: authBusy ? 'not-allowed' : 'pointer', opacity: authBusy ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            {authBusy ? 'Creating your office…' : 'Create My Office'}
            <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          <div style={{ textAlign: 'center', margin: '22px 0 0', fontSize: 14, color: '#1c2433' }}>
            Already a member?{' '}
            <button onClick={() => go('login')} style={{ background: 'none', border: 'none', color: '#b8902f', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
