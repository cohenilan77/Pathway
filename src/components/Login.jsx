import React, { useState } from 'react';
import '../styles/editorial-base.css';
import '../styles/editorial-auth.css';
import useIsMobile from '../hooks/useIsMobile.js';

export default function Login({ role, setRole, showPw, setShowPw, remember, setRemember, go, forgot, noop, login, adminAuth, authError, authBusy }) {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (role === 'candidate') login(email, password);
    else adminAuth(password);
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="auth">
      {!isMobile && (
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
      )}

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
          </div>

          {authError && <p className="auth__error">{authError}</p>}

          {role === 'candidate' && (
            <>
              <label className="auth__label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="you@example.com"
                className="auth__input"
              />
            </>
          )}

          <div className="auth__label-row">
            <label className="auth__label">{role === 'candidate' ? 'Password' : 'Access Code'}</label>
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
              placeholder={role === 'candidate' ? 'Enter your password' : 'Enter the consultant access code'}
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
                <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="m5 12 5 5 9-11" />
                </svg>
              )}
            </span>
            <span className="auth__remember-label">Secure this station for 30 days</span>
          </button>

          <button onClick={submit} disabled={authBusy} className="pw-cta auth__submit auth__submit--forest">
            {authBusy ? 'Please wait…' : 'Enter Office'}
            <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          {role === 'candidate' && (
            <p className="auth__switch">
              New to the circle?{' '}
              <button className="auth__switch-link" onClick={() => go('register')}>Request Access</button>
            </p>
          )}

          <div className="auth__hr" />
          <div className="auth__legal-row">
            <span style={{ maxWidth: '50%' }}>© 2024 Pathway Strategic Advising. All rights reserved.</span>
            <span style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
              <button className="auth__legal-link" onClick={noop}>Terms of Service</button>
              <button className="auth__legal-link" onClick={noop}>Privacy Policy</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
