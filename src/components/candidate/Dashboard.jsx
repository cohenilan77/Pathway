import React from 'react';

const MILESTONE_PLACEHOLDERS = ['Document review', 'Essay deadline', 'Interview prep', 'Application target'];

function ScoreRing({ value }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 100 100" width="92" height="92" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1eadd" strokeWidth="9" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke="url(#dashGrad)" strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94b3fb" />
          <stop offset="100%" stopColor="#b899fb" />
        </linearGradient>
      </defs>
      <text x="50" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill="#141b34" fontFamily="inherit">
        {value != null ? value : '–'}
      </text>
    </svg>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#faf7f2', borderRadius: 20, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', padding: 24, ...style }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', marginBottom: 14, textTransform: 'uppercase' }}>{children}</div>;
}

export default function Dashboard({ scores, currentConfig, STEPS, stepIdx, tasks, setCandTab, resetSession, requiresOAuthDetails }) {
  const overall = scores?.overall;
  const scoreLabel = currentConfig?.scoreLabel || 'Competitiveness Score';
  const steps = STEPS || [];
  const safeStepIdx = Math.min(stepIdx ?? 0, Math.max(steps.length - 1, 0));
  const visibleTasks = (tasks || []).slice(0, 3);

  return (
    <div className="pw-dashboard-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px 28px' }}>
      <div className="pw-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, maxWidth: 920 }}>

        {/* Score card */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 22, gridColumn: '1 / -1' }}>
          <ScoreRing value={overall} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', textTransform: 'uppercase', marginBottom: 6 }}>{scoreLabel}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#141b34', marginBottom: 14 }}>
              {overall != null ? `${overall} / 100` : 'Not analyzed yet'}
            </div>
            <div className="pw-dashboard-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setCandTab('advisor')}
                style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '11px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
                Go to Advisor →
              </button>
              <button className="pw-dashboard-new-session" onClick={resetSession} disabled={requiresOAuthDetails}
                style={{ background: '#faf7f2', color: '#5b46e0', border: '1.5px solid #e7dcc7', borderRadius: 13, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>
                New session
              </button>
            </div>
          </div>
        </Card>

        {/* Current step card */}
        <Card>
          <CardLabel>Current Progress</CardLabel>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#141b34', marginBottom: 8 }}>
            Step {safeStepIdx + 1} of {steps.length || '–'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#5b46e0' }}>{steps[safeStepIdx] || '—'}</div>
          <div style={{ height: 8, background: '#f1eadd', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ width: `${steps.length ? ((safeStepIdx + 1) / steps.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#94b3fb,#b899fb)' }} />
          </div>
        </Card>

        {/* Tasks card */}
        <Card>
          <CardLabel>Tasks</CardLabel>
          {visibleTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleTasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#33405e', lineHeight: 1.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b899fb', marginTop: 5, flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: '#9098b5' }}>No tasks yet</div>
          )}
        </Card>

        {/* Milestones card */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardLabel>Upcoming Milestones</CardLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {MILESTONE_PLACEHOLDERS.map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 12, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#6b7392' }}>
                {m} <span style={{ color: '#b2bad2', fontWeight: 500 }}>· No dates added yet</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
