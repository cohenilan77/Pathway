import React from 'react';

export default function Login({ role, setRole, showPw, setShowPw, remember, setRemember, enter, go, forgot, noop }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Hero panel */}
      <div style={{ position: 'relative', width: '44%', minHeight: '100vh', overflow: 'hidden', background: '#1a1410' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #1a2540 0%, #0d1520 50%, #1a1410 100%)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,10,8,.42),rgba(12,10,8,.8))', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 56px', color: '#fff', pointerEvents: 'none' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 800, letterSpacing: '.5px' }}>Pathway</div>
          <div style={{ width: 54, height: 3, background: '#d8a83a', margin: '12px 0 46px' }} />
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 54, lineHeight: 1.08, fontWeight: 800, margin: '0 0 22px', maxWidth: '9ch' }}>
            Navigating the World's Elite Institutions.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', maxWidth: '34ch', margin: 0 }}>
            Experience a personalized, high-touch admissions journey powered by strategic AI and global human expertise.
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
            Welcome Back to Your Private Office
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 30px' }}>Access your strategic admissions dashboard.</p>

          {/* Role toggle */}
          <div style={{ display: 'flex', background: '#e0e6f6', borderRadius: 12, padding: 5, marginBottom: 26 }}>
            <button
              onClick={() => setRole('candidate')}
              style={{
                flex: 1, padding: 11, border: 'none', borderRadius: 8,
                background: role === 'candidate' ? '#fff' : 'transparent',
                color: role === 'candidate' ? '#b8902f' : '#6b7280',
                fontWeight: role === 'candidate' ? 700 : 600, fontSize: 14, cursor: 'pointer',
                boxShadow: role === 'candidate' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                fontFamily: 'inherit',
              }}
            >Candidate</button>
            <button
              onClick={() => setRole('consultant')}
              style={{
                flex: 1, padding: 11, border: 'none', borderRadius: 8,
                background: role === 'consultant' ? '#fff' : 'transparent',
                color: role === 'consultant' ? '#b8902f' : '#6b7280',
                fontWeight: role === 'consultant' ? 700 : 600, fontSize: 14, cursor: 'pointer',
                boxShadow: role === 'consultant' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                fontFamily: 'inherit',
              }}
            >Consultant</button>
          </div>

          {/* Email */}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1c2433', marginBottom: 8 }}>Academic Email</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #d7ddec', borderRadius: 10, padding: '0 14px', marginBottom: 20 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: '#9aa3b5', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
              <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
            </svg>
            <input type="email" placeholder="name@university.edu" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', padding: '14px 0', fontSize: 15, color: '#1c2433', fontFamily: 'inherit' }} />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1c2433' }}>Security Key</label>
            <button onClick={forgot} style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Forgot Password?
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #d7ddec', borderRadius: 10, padding: '0 14px', marginBottom: 22 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: '#9aa3b5', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
              <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <input type={showPw ? 'text' : 'password'} placeholder="Enter your security key" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', padding: '14px 0', fontSize: 15, color: '#1c2433', fontFamily: 'inherit' }} />
            <button onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa3b5', display: 'flex', padding: 0 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          {/* Remember */}
          <button onClick={() => setRemember(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 26, padding: 0 }}>
            {remember ? (
              <span style={{ width: 18, height: 18, borderRadius: 5, background: '#16233f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="m5 12 5 5 9-11" />
                </svg>
              </span>
            ) : (
              <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #c4cbdb', background: '#fff' }} />
            )}
            <span style={{ fontSize: 14, color: '#1c2433' }}>Secure this station for 30 days</span>
          </button>

          {/* Enter button */}
          <button onClick={enter} style={{ width: '100%', background: '#0f1a30', color: '#fff', border: 'none', borderRadius: 10, padding: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Enter Office
            <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          <div style={{ textAlign: 'center', margin: '22px 0', fontSize: 14, color: '#1c2433' }}>
            New to the circle?{' '}
            <button onClick={() => go('landing')} style={{ background: 'none', border: 'none', color: '#b8902f', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              Request Access
            </button>
          </div>

          <div style={{ height: 1, background: '#dde3f0', margin: '8px 0 18px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 12, color: '#9aa3b5', gap: 16 }}>
            <span style={{ maxWidth: '50%' }}>© 2024 Pathway Strategic Advising. All rights reserved.</span>
            <span style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
              <button onClick={noop} style={{ background: 'none', border: 'none', color: '#9aa3b5', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Terms of Service</button>
              <button onClick={noop} style={{ background: 'none', border: 'none', color: '#9aa3b5', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Privacy Policy</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
