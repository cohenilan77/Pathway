import React from 'react';
import { miniCalendar } from '../../../lib/undergrad/candidate-view.js';

function fmtDay(date) {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ScoreRing({ value }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 100 100" width="104" height="104" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f7" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="url(#dashGrad)" strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94b3fb" />
          <stop offset="100%" stopColor="#b899fb" />
        </linearGradient>
      </defs>
      <text x="50" y="54" textAnchor="middle" fontSize="24" fontWeight="800" fill="#141b34" fontFamily="inherit">{value != null ? value : '–'}</text>
      <text x="50" y="70" textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing="1" fill="#9aa3b5" fontFamily="inherit">READINESS</text>
    </svg>
  );
}

// Undergrad Dashboard mini calendar insight. Reads the stored engine state and
// opens the full Tracker on click. Undergraduate candidates only.
function UndergradMiniCalendar({ undergrad, setCandTab }) {
  const mini = miniCalendar(undergrad || {}, Date.now());
  const cells = [
    ['Today', mini.counts.today],
    ['This week', mini.counts.thisWeek],
    ['Overdue', mini.counts.overdue, mini.counts.overdue ? '#e0556b' : '#141b34'],
  ];
  return (
    <Card style={{ cursor: 'pointer' }}>
      <div onClick={() => setCandTab?.('ugTracker')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setCandTab?.('ugTracker'); }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', textTransform: 'uppercase' }}>Calendar</div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5b46e0' }}>Open →</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {cells.map(([label, value, tone]) => (
            <div key={label} style={{ flex: 1, background: '#faf7f2', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: tone || '#141b34' }}>{value}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', color: '#9098b5', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: '#6b7392', marginTop: 12 }}>Next deadline · {mini.nextDeadline ? `${fmtDay(mini.nextDeadline.date)} — ${mini.nextDeadline.title}` : 'None yet'}</div>
      </div>
    </Card>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 22, border: '1px solid #f1eadd', boxShadow: '0 1px 2px rgba(20,27,52,.04),0 10px 30px rgba(20,27,52,.05)', padding: 24, ...style }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', marginBottom: 14, textTransform: 'uppercase' }}>{children}</div>;
}

// The single most useful next move, derived from real data only.
function nextBestMove({ tasks, weaknesses, overall, isUndergrad }) {
  if (tasks && tasks.length) return { text: tasks[0], tab: isUndergrad ? 'ugTracker' : 'advisor', cta: 'Open tracker' };
  if (overall == null) return { text: 'Start your profile analysis with the advisor.', tab: isUndergrad ? 'studentProfile' : 'advisor', cta: 'Talk to advisor' };
  if (weaknesses && weaknesses.length) return { text: `Close a key gap: ${weaknesses[0]}`, tab: isUndergrad ? 'studentProfile' : 'advisor', cta: 'Work on it' };
  return { text: 'Keep building — review your roadmap and next steps.', tab: isUndergrad ? 'ugRoadmap' : 'advisor', cta: 'Open roadmap' };
}

export default function Dashboard({ scores, currentConfig, STEPS, stepIdx, tasks, setCandTab, resetSession, requiresOAuthDetails, profile, strengths, weaknesses, undergrad }) {
  const overall = scores?.overall;
  const scoreLabel = currentConfig?.scoreLabel || 'Competitiveness Score';
  const steps = STEPS || [];
  const safeStepIdx = Math.min(stepIdx ?? 0, Math.max(steps.length - 1, 0));
  const isUndergrad = profile?.category === 'Undergraduate';
  const move = nextBestMove({ tasks, weaknesses, overall, isUndergrad });
  const focusItems = (weaknesses || []).slice(0, 3);

  return (
    <div className="pw-dashboard-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 28px 36px' }}>
      <div className="pw-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, maxWidth: 1000, margin: '0 auto' }}>

        {/* Hero — Your next best move */}
        <Card style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg,#eef1ff,#f7f0ff)', border: '1px solid #e6e0f6', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#7c6ef7', textTransform: 'uppercase' }}>Your next best move</div>
            <div style={{ fontFamily: "'Newsreader',serif", fontSize: 24, fontWeight: 700, color: '#141b34', margin: '8px 0 14px', lineHeight: 1.3 }}>{move.text}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setCandTab(move.tab)} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(148,153,251,.4)' }}>{move.cta} →</button>
              <button onClick={resetSession} disabled={requiresOAuthDetails} style={{ background: '#fff', color: '#33405e', border: '1px solid #e0d9ef', borderRadius: 999, padding: '11px 18px', fontSize: 13.5, fontWeight: 600, cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>New session</button>
            </div>
          </div>
          <ScoreRing value={overall} />
        </Card>

        {/* Readiness detail */}
        <Card>
          <CardLabel>{scoreLabel}</CardLabel>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 600, color: '#141b34', marginBottom: 6 }}>
            {overall != null ? `${overall} / 100` : 'Not analyzed yet'}
          </div>
          <div style={{ fontSize: 13, color: '#6b7392', lineHeight: 1.55 }}>
            Built from your full profile — uploaded files, chat context, and saved facts.
          </div>
        </Card>

        {/* Current progress */}
        <Card>
          <CardLabel>{isUndergrad ? 'Current Journey Stage' : 'Current Progress'}</CardLabel>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#141b34', marginBottom: 4 }}>Step {safeStepIdx + 1} of {steps.length || '–'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#5b46e0' }}>{steps[safeStepIdx] || '—'}</div>
          <div style={{ height: 8, background: '#eef1f7', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ width: `${steps.length ? ((safeStepIdx + 1) / steps.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#94b3fb,#b899fb)' }} />
          </div>
        </Card>

        {/* Calendar insight (undergrad) */}
        {isUndergrad && <UndergradMiniCalendar undergrad={undergrad} setCandTab={setCandTab} />}

        {/* Smart focus */}
        <Card style={isUndergrad ? {} : { gridColumn: '1 / -1' }}>
          <CardLabel>Smart focus</CardLabel>
          {focusItems.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {focusItems.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#33405e', lineHeight: 1.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e0556b', marginTop: 6, flexShrink: 0 }} />
                  {w}
                </div>
              ))}
            </div>
          ) : strengths && strengths.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {strengths.slice(0, 3).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#33405e', lineHeight: 1.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f9e78', marginTop: 6, flexShrink: 0 }} />
                  {s}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: '#9098b5' }}>Your focus areas appear here after your first analysis.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
