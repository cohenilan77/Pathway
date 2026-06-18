import React, { useState } from 'react';
import '../styles/editorial-base.css';
import '../styles/editorial-auth.css';

export default function Register({ go, register, authError, authBusy }) {
  const [name, setName] = useState('');
  const [residency, setResidency] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => register({ name, residency, email, age, password });
  const onKeyDown = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="auth">
      <div className="auth__form-side" style={{ order: 1 }}>
        <div className="auth__form-box auth__form-box--wide">
          <button className="auth__back" onClick={() => go('landing')}>
            <span>←</span> Back to home
          </button>
          <h1 className="serif auth__title">Request Your Access</h1>
          <p className="auth__sub">A few details to set up your private office.</p>

          {authError && <p className="auth__error">{authError}</p>}

          <label className="auth__label">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jane Doe"
            className="auth__input"
          />

          <label className="auth__label">Residency</label>
          <input
            value={residency}
            onChange={(e) => setResidency(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Country of residence"
            className="auth__input"
          />

          <label className="auth__label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="you@example.com"
            className="auth__input"
          />

          <label className="auth__label">Age</label>
          <input
            type="number"
            min="1"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="27"
            className="auth__input"
          />

          <label className="auth__label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="At least 6 characters"
            className="auth__input auth__input--tight"
          />

          <button onClick={submit} disabled={authBusy} className="pw-cta auth__submit auth__submit--copper">
            {authBusy ? 'Creating your office…' : 'Create My Office'}
            <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          <p className="auth__switch">
            Already a member?{' '}
            <button className="auth__switch-link" onClick={() => go('login')}>Sign In</button>
          </p>
        </div>
      </div>

      <div className="auth__brand auth__brand--copper" style={{ order: 2 }}>
        <div className="auth__brand-glow auth__brand-glow--copper" />
        <button className="auth__logo" onClick={() => go('landing')} title="Back to home">
          <span className="auth__logo-dot auth__logo-dot--forest" />
          <span className="serif auth__logo-text">Pathway</span>
        </button>
        <div className="auth__pitch-wrap">
          <h2 className="serif auth__pitch-title">
            Join 180+ students building their path with AI — and people when it counts.
          </h2>
          <div className="auth__pitch-list">
            <div className="auth__pitch-item">
              <span className="auth__pitch-check">✓</span>Your AI guide, free to start
            </div>
            <div className="auth__pitch-item">
              <span className="auth__pitch-check">✓</span>A senior strategist when you want one
            </div>
            <div className="auth__pitch-item">
              <span className="auth__pitch-check">✓</span>Support before, during &amp; after university
            </div>
          </div>
        </div>
        <div className="auth__copy auth__copy--copper">© 2026 Pathway Admissions</div>
      </div>
    </div>
  );
}
