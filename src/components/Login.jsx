import React, { useState } from 'react';
import '../styles/editorial-base.css';
import '../styles/editorial-auth.css';

export default function Login({ role, setRole, showPw, setShowPw, remember, setRemember, go, forgot, login, adminAuth, authError, authBusy }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if ((role === 'admin' || role === 'consultant') && !email.trim()) adminAuth(password);
    else login(email, password);
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="auth">
      <div className="auth__brand auth__brand--forest">
        <div className="auth__brand-glow" />
        <button className="auth__logo" onClick={() => go('landing')} title="Back to home">
          <span className="auth__logo-dot auth__logo-dot--gold" />
          <span className="serif auth__logo-text">Pathway</span>
        </button>
        <div className="auth__quote-wrap">
          <div className="serif auth__quote-mark">&ldquo;</div>
          <blockquote className="serif auth__quote">
            Navigating the world's elite institutions feels different when you have a strategist
            and an AI co-pilot in your corner.
          </blockquote>
          <div className="auth__quote-person">
            <span className="auth__quote-avatar" />
            <div>
              <div className="auth__quote-name">Daniel K.</div>
              <div className="auth__quote-meta">Admitted to Stanford GSB</div>
            </div>
          </div>
        </div>
        <div className="auth__copy">© 2026 Pathway Admissions</div>
      </div>

      <div className="auth__form-side">
        <div className="auth__form-box">
          <button className="auth__back" onClick={() => go('landing')}>
            <span>←</span> Back to home
          </button>
          <h1 className="serif auth__title">Welcome Back</h1>
          <p className="auth__sub">Access your strategic admissions dashboard.</p>

          <div className="auth__role-toggle">
            <button
              className={`auth__role-btn${role === 'candidate' ? ' auth__role-btn--active' : ''}`}
              onClick={() => setRole('candidate')}
            >Candidate</button>
            <button
              className={`auth__role-btn${role === 'consultant' ? ' auth__role-btn--active' : ''}`}
              onClick={() => setRole('consultant')}
            >Consultant</button>
            <button
              className={`auth__role-btn${role === 'admin' ? ' auth__role-btn--active' : ''}`}
              onClick={() => setRole('admin')}
            >Admin</button>
          </div>

          {authError && <p className="auth__error">{authError}</p>}

          {role === 'candidate' && (
            <>
              <div className="auth__oauth-row">
                <button
                  type="button"
                  className="auth__oauth-btn"
                  onClick={() => { window.location.href = '/api/oauth-start?provider=google'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.85 2.07-1.81 2.71v2.26h2.92c1.71-1.57 2.69-3.89 2.69-6.61z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.55-1.85.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z" />
                    <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A8.96 8.96 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                  </svg>
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="auth__oauth-btn"
                  onClick={() => { window.location.href = '/api/oauth-start?provider=microsoft'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <rect x="0" y="2" width="18" height="14" rx="2" fill="#0078D4" />
                    <path fill="#fff" d="M5 6.2 9 9l4-2.8v6.4L9 12 5 12.6Z" opacity="0.001" />
                    <path fill="#fff" d="M2.5 5.2 9 9.6l6.5-4.4v7.6c0 .55-.45 1-1 1H3.5c-.55 0-1-.45-1-1Z" />
                  </svg>
                  Continue with Outlook
                </button>
              </div>
              <div className="auth__divider">or continue with email</div>
            </>
          )}

          <label className="auth__label">{role === 'candidate' ? 'Email' : 'Email or username'}</label>
          <input
            type={role === 'candidate' ? 'email' : 'text'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={role === 'candidate' ? 'you@example.com' : 'email or username'}
            className="auth__input"
          />

          <div className="auth__label-row">
            <label className="auth__label">Password</label>
            {role === 'candidate' && (
              <button className="auth__forgot" onClick={forgot}>Forgot Password?</button>
            )}
          </div>
          <div className="auth__input-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={(role === 'admin' || role === 'consultant') ? 'Enter your password or legacy access code' : 'Enter your password'}
              className="auth__input"
            />
            <button className="auth__eye-btn" onClick={() => setShowPw((p) => !p)}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          <button className="auth__remember" onClick={() => setRemember((r) => !r)}>
            <span className={`auth__remember-box${remember ? ' auth__remember-box--checked' : ''}`}>
              {remember && (
                <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="m5 12 5 5 9-11" />
                </svg>
              )}
            </span>
            <span className="auth__remember-label">Secure this station for 30 days</span>
          </button>

          <button onClick={submit} disabled={authBusy} className="pw-cta auth__submit auth__submit--forest">
            {authBusy ? 'Please wait…' : 'Enter'}
            <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          {role === 'candidate' && (
            <p className="auth__switch">
              <button className="auth__switch-link" onClick={() => go('register')}>Sign up</button>
            </p>
          )}

          <div className="auth__hr" />
          <div className="auth__legal-row">
            <span style={{ maxWidth: '50%' }}>© 2024 Pathway Strategic Advising. All rights reserved.</span>
            <span style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
              <button className="auth__legal-link" onClick={() => go('terms')}>Terms of Service</button>
              <button className="auth__legal-link" onClick={() => go('privacy')}>Privacy Policy</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
