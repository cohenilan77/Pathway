import React from 'react';
import { miniCalendar } from '../../../lib/undergrad/candidate-view.js';
import UndergradKpiPanel from './UndergradKpiPanel.jsx';

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

// ── Undergraduate journey dashboard ─────────────────────────────────────────
// Undergrad gets a trajectory-first shell: a horizontal stage map as the hero, a
// "where you are -> projected" score, and grade-driven milestones. Graduate and
// every other track keep the score-ring layout in Dashboard() untouched.

function gradeNumber(profile) {
  const m = String(profile?.grade || profile?.currentGrade || '').match(/\d{1,2}/);
  return m ? Number(m[0]) : null;
}

// Milestones are keyed off the student's grade, so a 9th-grader and a 12th-grader
// see a different, stage-appropriate set instead of the same static placeholders.
function undergradMilestones(profile) {
  const grade = gradeNumber(profile);
  if (grade != null && grade <= 9) {
    return [
      { title: 'Build strong Grade 9 habits', detail: 'Your GPA starts now — aim for consistency across every core subject.' },
      { title: 'Sample 2–3 activities', detail: 'Try clubs, sports, or projects to find what genuinely interests you.' },
      { title: 'Start a curiosity log', detail: 'Collect the moments and interests that become essays later.' },
    ];
  }
  if (grade === 10) {
    return [
      { title: 'Go deeper on one or two activities', detail: 'Shift from trying things to committing and taking initiative.' },
      { title: 'Get familiar with the PSAT', detail: 'Learn the test format early so junior year stays calm.' },
      { title: 'Add academic rigor', detail: 'Pick a stretch course to show an upward trajectory.' },
    ];
  }
  if (grade === 11) {
    return [
      { title: 'Lock your SAT / ACT plan', detail: 'Sit your first official test and set a target score.' },
      { title: 'Draft your university shortlist', detail: 'Build a balanced reach, target, and likely list.' },
      { title: 'Step into a leadership role', detail: 'Turn participation into ownership with real impact.' },
    ];
  }
  if (grade != null && grade >= 12) {
    return [
      { title: 'Finalize your university list', detail: 'Confirm where you are applying and lock every deadline.' },
      { title: 'Polish your essays', detail: 'Complete your personal statement and each supplement.' },
      { title: 'Submit on time', detail: 'Track required documents and hit every application deadline.' },
    ];
  }
  return [
    { title: 'Tell us your grade', detail: 'Share where you are in school so milestones match your year.' },
    { title: 'Explore your interests', detail: 'Note the subjects and activities you enjoy most right now.' },
    { title: 'Start your profile', detail: 'A quick analysis unlocks your personalized roadmap.' },
  ];
}

function JourneyMap({ steps, currentIdx, setCandTab }) {
  return (
    <Card style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg,#eef1ff,#f7f0ff)', border: '1px solid #e6e0f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#7c6ef7', textTransform: 'uppercase' }}>Your journey</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 700, color: '#141b34', marginTop: 6 }}>Foundation → Applications</div>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5b46e0' }}>Stage {Math.min(currentIdx + 1, steps.length)} of {steps.length}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 }}>
        {steps.map((label, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'locked';
          const dot = state === 'done'
            ? { background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#fff', border: '2px solid transparent' }
            : state === 'current'
              ? { background: '#fff', color: '#5b46e0', border: '2px solid #5b46e0' }
              : { background: '#eef1f7', color: '#9098b5', border: '2px solid #eef1f7' };
          return (
            <div key={label} style={{ flex: 1, minWidth: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', top: 16, right: '50%', width: '100%', height: 3, background: i <= currentIdx ? 'linear-gradient(90deg,#94b3fb,#b899fb)' : '#eef1f7' }} />}
              <button onClick={() => setCandTab?.('ugRoadmap')} title={label} style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', ...dot }}>
                {state === 'done' ? '✓' : i + 1}
              </button>
              <div style={{ fontSize: 11.5, fontWeight: state === 'current' ? 800 : 600, color: state === 'locked' ? '#9098b5' : '#33405e', marginTop: 8, lineHeight: 1.25 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TrajectoryScore({ scoreLabel, overall, profile }) {
  const grade = gradeNumber(profile);
  const yearsLeft = grade ? Math.max(0, 12 - grade) : 0;
  // Illustrative trajectory: more runway (younger grades) closes more of the gap to 100.
  const projected = overall == null ? null : Math.min(100, Math.round(overall + (100 - overall) * Math.min(1, yearsLeft / 4) * 0.6));
  return (
    <Card>
      <CardLabel>{scoreLabel}</CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9098b5', letterSpacing: '.5px', textTransform: 'uppercase' }}>Where you are</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 34, fontWeight: 700, color: '#141b34', lineHeight: 1 }}>{overall != null ? overall : '–'}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#b899fb' }}>→</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c6ef7', letterSpacing: '.5px', textTransform: 'uppercase' }}>Projected by senior year</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 34, fontWeight: 700, color: '#5b46e0', lineHeight: 1 }}>{projected != null ? projected : '–'}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: '#6b7392', lineHeight: 1.55, marginTop: 12 }}>
        {overall == null
          ? 'Start your profile analysis to see your trajectory.'
          : grade
            ? `Grade ${grade} today — this is where focused work can take you by senior year.`
            : 'This is where focused work can take you by senior year.'}
      </div>
    </Card>
  );
}

function MilestonesCard({ profile }) {
  const grade = gradeNumber(profile);
  const items = undergradMilestones(profile);
  return (
    <Card>
      <CardLabel>{grade ? `Grade ${grade} milestones` : 'Milestones'}</CardLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: '#eef1f7', color: '#5b46e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34' }}>{m.title}</div>
              <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.45, marginTop: 2 }}>{m.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function UndergradJourneyDashboard({ steps, currentIdx, scores, scoreLabel, move, setCandTab, profile, strengths, weaknesses, tasks, undergrad }) {
  const overall = scores?.overall;
  return (
    <div className="pw-dashboard-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 28px 36px' }}>
      <div className="pw-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, maxWidth: 1000, margin: '0 auto' }}>

        <JourneyMap steps={steps} currentIdx={currentIdx} setCandTab={setCandTab} />

        <TrajectoryScore scoreLabel={scoreLabel} overall={overall} profile={profile} />

        <Card style={{ background: 'linear-gradient(135deg,#eef1ff,#f7f0ff)', border: '1px solid #e6e0f6' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#7c6ef7', textTransform: 'uppercase' }}>Your next best move</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 20, fontWeight: 700, color: '#141b34', margin: '8px 0 14px', lineHeight: 1.3 }}>{move.text}</div>
          <button onClick={() => setCandTab(move.tab)} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(148,153,251,.4)' }}>{move.cta} →</button>
        </Card>

        <MilestonesCard profile={profile} />

        <UndergradMiniCalendar undergrad={undergrad} setCandTab={setCandTab} />

        <div style={{ gridColumn: '1 / -1' }}><UndergradKpiPanel scores={scores || {}} /></div>

        {[
          ['Top strengths', (strengths || []).slice(0, 3), '#2f9e78'],
          ['Current risks', (weaknesses || []).slice(0, 3), '#e0556b'],
          ['Next tasks', (tasks || []).slice(0, 3), '#5b46e0'],
        ].map(([label, items, color]) => (
          <Card key={label}>
            <CardLabel>{label}</CardLabel>
            {items.length ? items.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#33405e', lineHeight: 1.45, marginBottom: 9 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                <span>{typeof item === 'string' ? item : item?.header || item?.title}</span>
              </div>
            )) : <div style={{ fontSize: 13, color: '#9098b5' }}>Needs update</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ scores, currentConfig, STEPS, stepIdx, tasks, setCandTab, resetSession, requiresOAuthDetails, profile, strengths, weaknesses, undergrad, currentTrack }) {
  const overall = scores?.overall;
  const scoreLabel = currentConfig?.scoreLabel || 'Competitiveness Score';
  const steps = STEPS || [];
  const safeStepIdx = Math.min(stepIdx ?? 0, Math.max(steps.length - 1, 0));
  const isUndergrad = currentTrack === 'Undergraduate' || profile?.category === 'Undergraduate';
  const move = nextBestMove({ tasks, weaknesses, overall, isUndergrad });
  const focusItems = (weaknesses || []).slice(0, 3);

  // Undergraduate gets a distinct journey-first shell; every other track falls
  // through to the score-ring layout below, which stays completely untouched.
  if (isUndergrad) {
    return (
      <UndergradJourneyDashboard
        steps={steps} currentIdx={safeStepIdx} scores={scores} scoreLabel={scoreLabel}
        move={move} setCandTab={setCandTab} profile={profile}
        strengths={strengths} weaknesses={weaknesses} tasks={tasks} undergrad={undergrad}
      />
    );
  }

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
          <CardLabel>Current Progress</CardLabel>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#141b34', marginBottom: 4 }}>Step {safeStepIdx + 1} of {steps.length || '–'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#5b46e0' }}>{steps[safeStepIdx] || '—'}</div>
          <div style={{ height: 8, background: '#eef1f7', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ width: `${steps.length ? ((safeStepIdx + 1) / steps.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#94b3fb,#b899fb)' }} />
          </div>
        </Card>

        {/* Smart focus */}
        {!isUndergrad && <Card style={{ gridColumn: '1 / -1' }}>
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
        </Card>}
      </div>
    </div>
  );
}
