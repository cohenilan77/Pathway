import React from 'react';

const MILESTONE_PLACEHOLDERS = ['Document review', 'Essay deadline', 'Interview prep', 'Application target'];

function ScoreRing({ value }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 100 100" width="104" height="104" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f7" strokeWidth="9" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke="url(#dashGrad)" strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#16233f" />
          <stop offset="100%" stopColor="#b8902f" />
        </linearGradient>
      </defs>
      <text x="50" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill="#16233f" fontFamily="inherit">
        {value != null ? value : '–'}
      </text>
      <text x="50" y="70" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1" fill="#9aa3b5" fontFamily="inherit">
        READINESS
      </text>
    </svg>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fffdf7', borderRadius: 16, border: '1px solid #efe7d4', boxShadow: '0 12px 30px rgba(22,35,63,.06)', padding: 24, ...style }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', marginBottom: 14, textTransform: 'uppercase' }}>{children}</div>;
}

function bucketPrograms(programs = []) {
  return {
    Reach: programs.filter(p => p.tier === 'stretch' || (p.fit ?? 0) < 50),
    Target: programs.filter(p => p.tier === 'possible' || ((p.fit ?? 0) >= 50 && (p.fit ?? 0) <= 80)),
    Likely: programs.filter(p => p.tier === 'safe' || (p.fit ?? 0) > 80),
  };
}

export default function Dashboard({ scores, currentConfig, STEPS, stepIdx, tasks, setCandTab, resetSession, requiresOAuthDetails, profile, strengths, weaknesses, programs }) {
  const overall = scores?.overall;
  const scoreLabel = currentConfig?.scoreLabel || 'Competitiveness Score';
  const steps = STEPS || [];
  const safeStepIdx = Math.min(stepIdx ?? 0, Math.max(steps.length - 1, 0));
  const visibleTasks = (tasks || []).slice(0, 3);
  const isUndergrad = profile?.category === 'Undergraduate';
  const buckets = bucketPrograms(programs || []);

  return (
    <div className="pw-dashboard-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px 28px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto 18px', padding: '20px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#ffffff,#fff8ea)', border: '1px solid #efe7d4', boxShadow: '0 16px 32px rgba(22,35,63,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', color: '#b8902f', marginBottom: 6 }}>CANDIDATE DASHBOARD</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 800, color: '#16233f', lineHeight: 1.08 }}>Your private office, at a glance.</div>
        <div style={{ marginTop: 7, fontSize: 13.5, color: '#6b7392', lineHeight: 1.55 }}>A quick read on your current readiness, latest tasks, and where your portfolio is headed next.</div>
      </div>
      <div className="pw-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, maxWidth: 980 }}>

        {/* Score card */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 22, gridColumn: '1 / -1', background: 'linear-gradient(135deg,#fffdf7,#f9f4e6)' }}>
          <ScoreRing value={overall} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#b8902f', textTransform: 'uppercase', marginBottom: 6 }}>{scoreLabel}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 800, color: '#16233f', marginBottom: 10 }}>
              {overall != null ? `${overall} / 100` : 'Not analyzed yet'}
            </div>
            <div style={{ fontSize: 13.5, color: '#6b7392', lineHeight: 1.55, maxWidth: 620 }}>
              Your score is built from the full candidate facts layer, including uploaded files, chat context, and saved profile data.
            </div>
            <div className="pw-dashboard-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setCandTab(isUndergrad ? 'studentProfile' : 'advisor')}
                style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(22,35,63,.22)' }}>
                {isUndergrad ? 'Open Counselor →' : 'Go to Advisor →'}
              </button>
              <button className="pw-dashboard-new-session" onClick={resetSession} disabled={requiresOAuthDetails}
                style={{ background: '#fff', color: '#16233f', border: '1px solid #d7ddec', borderRadius: 11, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>
                New session
              </button>
            </div>
          </div>
        </Card>

        {isUndergrad && (
          <Card style={{ gridColumn: '1 / -1', background: '#fff8ea' }}>
            <CardLabel>Starting Point</CardLabel>
            <div style={{ fontSize: 15, lineHeight: 1.55, color: '#33405e', fontWeight: 650 }}>
              This is your starting point today. During the next few years we'll work together to move universities from Reach into Target, and from Target into Likely.
            </div>
          </Card>
        )}

        {/* Current step card */}
        <Card>
          <CardLabel>{isUndergrad ? 'Current Journey Stage' : 'Current Progress'}</CardLabel>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#16233f', marginBottom: 8 }}>
            Step {safeStepIdx + 1} of {steps.length || '–'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#b8902f' }}>{steps[safeStepIdx] || '—'}</div>
          <div style={{ height: 8, background: '#eef1f7', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ width: `${steps.length ? ((safeStepIdx + 1) / steps.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#16233f,#b8902f)' }} />
          </div>
        </Card>

        {isUndergrad && (
          <>
            <Card>
              <CardLabel>Academic Progress</CardLabel>
              <div style={{ fontSize: 14, color: '#33405e', lineHeight: 1.55 }}>
                <strong>{profile?.grade || 'Grade not set'}</strong>{profile?.school ? ` · ${profile.school}` : ''}
                <br />{profile?.curriculum || profile?.grades || profile?.gpa || 'Transcript, curriculum, and grade trend will appear here.'}
              </div>
            </Card>
            <Card>
              <CardLabel>Activity Progress</CardLabel>
              <div style={{ fontSize: 14, color: '#33405e', lineHeight: 1.55 }}>
                {profile?.activities || profile?.strongestActivity || 'Activities will appear as the counselor learns more.'}
              </div>
            </Card>
            <Card>
              <CardLabel>Leadership</CardLabel>
              <div style={{ fontSize: 14, color: '#33405e', lineHeight: 1.55 }}>
                {profile?.leadership || (strengths || []).find(s => /lead|captain|founder|council|club/i.test(s)) || 'Leadership roles and opportunities will appear here.'}
              </div>
            </Card>
            <Card>
              <CardLabel>Current Strengths</CardLabel>
              {(strengths || []).slice(0, 4).length ? (strengths || []).slice(0, 4).map((s, i) => (
                <div key={i} style={{ fontSize: 13.5, color: '#33405e', marginBottom: 8, lineHeight: 1.45 }}>{s}</div>
              )) : <div style={{ fontSize: 13.5, color: '#9098b5' }}>Strengths will appear after discovery.</div>}
            </Card>
            <Card>
              <CardLabel>Current Gaps</CardLabel>
              {(weaknesses || []).slice(0, 4).length ? (weaknesses || []).slice(0, 4).map((w, i) => (
                <div key={i} style={{ fontSize: 13.5, color: '#33405e', marginBottom: 8, lineHeight: 1.45 }}>{w}</div>
              )) : <div style={{ fontSize: 13.5, color: '#9098b5' }}>Gaps will appear after discovery.</div>}
            </Card>
            <Card style={{ gridColumn: '1 / -1' }}>
              <CardLabel>University Movement · Reach → Target → Likely</CardLabel>
              <div className="pw-undergrad-buckets" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {Object.entries(buckets).map(([label, schools]) => (
                  <div key={label} style={{ background: '#f4f6fb', border: '1px solid #e7eaf3', borderRadius: 13, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#16233f', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.45 }}>
                      {schools.length ? schools.slice(0, 3).map(s => s.name).join(', ') : 'Will populate after the starting snapshot.'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Tasks card */}
        <Card>
          <CardLabel>Tasks</CardLabel>
          {visibleTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleTasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#33405e', lineHeight: 1.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b8902f', marginTop: 5, flexShrink: 0 }} />
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
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f6fb', border: '1px solid #e7eaf3', borderRadius: 11, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#5f6885' }}>
                {m} <span style={{ color: '#b2bad2', fontWeight: 500 }}>· No dates added yet</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
