/*
 * Candidate Control Tower — ONE general admin/consultant tab across all candidate
 * types (Undergraduate, Graduate, PhD, Personal Development). All aggregation is
 * done by the pure lib/undergrad/control-tower engine; this component only
 * renders. Undergraduate candidates contribute their full roadmap/task/calendar
 * engine state; other types contribute journey stage + pending next action.
 */
import React, { useMemo, useState } from 'react';
import { buildControlTower, candidateMonthlyReport } from '../../../lib/undergrad/control-tower.js';

const SEV_COLOR = { critical: '#e0556b', high: '#c0392b', medium: '#c08a1a', low: '#5b46e0', info: '#6b7392' };
const RISK_COLOR = { critical: '#e0556b', high: '#c08a1a', medium: '#5b46e0', low: '#19c08a' };

function fmt(date) {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function ago(ms) {
  if (!ms) return 'never';
  const days = Math.floor((Date.now() - ms) / 86400000);
  return days <= 0 ? 'today' : `${days}d ago`;
}

function Section({ title, count, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f1eadd', borderRadius: 16, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#141b34', margin: 0 }}>{title}</h3>
        {count != null && <span style={{ fontSize: 12, fontWeight: 800, color: '#5b46e0', background: '#f0edff', borderRadius: 8, padding: '2px 8px' }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ children, color }) {
  return <span style={{ fontSize: 11.5, fontWeight: 800, color: color || '#6b7392', background: '#f6f1e8', borderRadius: 7, padding: '2px 8px' }}>{children}</span>;
}

function Empty({ children }) {
  return <div style={{ fontSize: 12.5, color: '#9098b5' }}>{children}</div>;
}

export default function CandidateControlTower({ candidates = [], viewer = { role: 'admin' }, onAlertAction }) {
  const now = Date.now();
  const tower = useMemo(() => buildControlTower(candidates, { viewer, now }), [candidates, viewer]);
  const [reportFor, setReportFor] = useState(null);

  const report = useMemo(() => {
    if (!reportFor) return null;
    const cand = candidates.find(c => c.id === reportFor);
    return cand ? candidateMonthlyReport(cand, { now }) : null;
  }, [reportFor, candidates]);

  const tp = tower.todaysPriorities;

  return (
    <div style={{ padding: '8px 4px 40px' }}>
      <div style={{ fontSize: 13, color: '#6b7392', marginBottom: 14 }}>
        Tracking <b>{tower.candidateCount}</b> candidate{tower.candidateCount === 1 ? '' : 's'} across all tracks · {viewer.role === 'admin' ? 'all candidates' : 'your assigned candidates'}.
      </div>

      {/* 1 — Today's Priorities */}
      <Section title="Today’s Priorities">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          {[
            ['Overdue tasks', tp.overdueTasks, t => `${t.candidateName}: ${t.title}`],
            ['Inactive candidates', tp.inactiveCandidates, t => `${t.candidateName} · ${ago(t.lastActiveAt)}`],
            ['Urgent deadlines', tp.urgentDeadlines, t => `${t.candidateName}: ${t.title} (${fmt(t.date)})`],
            ['Consultant reviews', tp.consultantReviews, t => `${t.candidateName}: ${t.title}`],
            ['Ignored reminders', tp.ignoredReminders, t => `${t.candidateName}: ${t.title}`],
          ].map(([label, list, render]) => (
            <div key={label} style={{ background: '#faf7f2', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.4px', color: '#9098b5', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: list.length ? '#e0556b' : '#19c08a' }}>{list.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {list.slice(0, 4).map((t, i) => <div key={i} style={{ fontSize: 12, color: '#3c4564' }}>{render(t)}</div>)}
                {list.length === 0 && <Empty>All clear.</Empty>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 2 — Candidate Risk Table */}
      <Section title="Candidate Risk Table" count={tower.riskTable.length}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#9098b5' }}>
                {['Candidate', 'Type', 'Stage', 'Risk', 'Last active', 'Overdue', 'Next deadline', 'Weakest area', 'Recommended action'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tower.riskTable.map(r => (
                <tr key={r.candidateId} style={{ borderTop: '1px solid #f1eadd' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#141b34' }}>{r.candidateName}</td>
                  <td style={{ padding: '8px 10px' }}>{r.candidateType}</td>
                  <td style={{ padding: '8px 10px' }}>{r.stage || '—'}</td>
                  <td style={{ padding: '8px 10px' }}><Chip color={RISK_COLOR[r.riskLevel]}>{r.riskLevel}</Chip></td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{ago(r.lastActiveAt)}</td>
                  <td style={{ padding: '8px 10px', color: r.overdueTaskCount ? '#e0556b' : '#3c4564' }}>{r.overdueTaskCount}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.nextDeadline ? `${fmt(r.nextDeadline.date)}` : '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{r.weakestArea || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b7392' }}>{r.recommendedAction}</td>
                </tr>
              ))}
              {tower.riskTable.length === 0 && <tr><td colSpan={9} style={{ padding: 12 }}><Empty>No candidates.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 3 — Roadmap / Journey Monitor */}
      <Section title="Roadmap / Journey Monitor" count={tower.journeyMonitor.length}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {tower.journeyMonitor.map(j => (
            <div key={j.candidateId} style={{ background: '#faf7f2', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>{j.candidateName} <Chip>{j.candidateType}</Chip></div>
              {j.kind === 'roadmap' ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 6, background: '#eee7d8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${j.roadmapProgress}%`, height: '100%', background: 'linear-gradient(90deg,#94b3fb,#b899fb)' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7392', marginTop: 5 }}>Roadmap {j.roadmapProgress}% · {j.roadmapTotal} items</div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#6b7392', marginTop: 8 }}>Stage: <b>{j.stage || '—'}</b><br />Next: {j.pendingNextAction || '—'}</div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 4 — Task + Calendar Tracker */}
      <Section title="Task + Calendar Tracker" count={tower.taskCalendar.length}>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {tower.taskCalendar.slice(0, 120).map((e, i) => (
            <div key={`${e.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderTop: i ? '1px solid #f6f1e8' : 'none', fontSize: 12.5 }}>
              <span style={{ width: 52, flexShrink: 0, fontWeight: 800, color: '#141b34' }}>{fmt(e.date)}</span>
              <Chip>{e.candidateType}</Chip>
              <span style={{ flex: 1, color: '#3c4564' }}>{e.candidateName}: {e.title}</span>
              <Chip>{e.type || e.status || e.source}</Chip>
            </div>
          ))}
          {tower.taskCalendar.length === 0 && <Empty>No tasks or events yet.</Empty>}
        </div>
      </Section>

      {/* 5 — Nagger Alerts */}
      <Section title="Nagger Alerts" count={tower.alerts.filter(a => a.status === 'open').length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tower.alerts.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#faf7f2', borderRadius: 11, padding: '10px 12px', opacity: a.status === 'open' ? 1 : 0.55 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[a.severity], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>{a.candidateName} · {a.reason}</div>
                <div style={{ fontSize: 12, color: '#6b7392' }}>{a.recommendedAction} · <Chip>{a.candidateType}</Chip> <Chip color={SEV_COLOR[a.severity]}>{a.severity}</Chip> {a.status !== 'open' && <Chip>{a.status}</Chip>}</div>
              </div>
              {a.status === 'open' && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {['dismiss', 'snooze', 'resolve'].map(action => (
                    <button key={action} onClick={() => onAlertAction?.(a, action)} style={{ background: '#fff', border: '1px solid #e7dcc7', borderRadius: 8, padding: '5px 9px', fontSize: 11.5, fontWeight: 700, color: '#3c4564', cursor: 'pointer', fontFamily: 'inherit' }}>{action}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tower.alerts.length === 0 && <Empty>No alerts.</Empty>}
        </div>
      </Section>

      {/* 6 — Profile Progress */}
      <Section title="Profile Progress" count={tower.profileProgress.filter(p => Object.keys(p.latest || {}).length).length}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {tower.profileProgress.filter(p => Object.keys(p.latest || {}).length).map(p => (
            <div key={p.candidateId} style={{ background: '#faf7f2', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34', marginBottom: 6 }}>{p.candidateName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {Object.entries(p.latest).filter(([k]) => k !== 'overall').slice(0, 8).map(([k, v]) => (
                  <Chip key={k}>{k}: {v}</Chip>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: '#9098b5', marginTop: 6 }}>{p.history.length} snapshot{p.history.length === 1 ? '' : 's'}</div>
            </div>
          ))}
          {tower.profileProgress.every(p => !Object.keys(p.latest || {}).length) && <Empty>No score history yet.</Empty>}
        </div>
      </Section>

      {/* 7 — Consultant Notes + Follow-ups */}
      <Section title="Consultant Notes + Follow-ups" count={tower.notes.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tower.notes.slice(0, 40).map((n, i) => (
            <div key={`${n.id}-${i}`} style={{ background: '#faf7f2', borderRadius: 11, padding: '10px 12px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#141b34' }}>{n.candidateName} · <Chip>{n.kind}</Chip></div>
              {n.body && <div style={{ fontSize: 12, color: '#3c4564', marginTop: 3 }}>{n.body}</div>}
              {n.nextAction && <div style={{ fontSize: 12, color: '#5b46e0', marginTop: 3 }}>Next: {n.nextAction}{n.followUpDate ? ` · ${fmt(n.followUpDate)}` : ''}</div>}
            </div>
          ))}
          {tower.notes.length === 0 && <Empty>No notes yet.</Empty>}
        </div>
      </Section>

      {/* 8 — Monthly Report Generator */}
      <Section title="Monthly Report Generator">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: report ? 14 : 0 }}>
          <select value={reportFor || ''} onChange={e => setReportFor(e.target.value || null)} style={{ border: '1.5px solid #f1eadd', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: '#f6f1e8', color: '#3c4564' }}>
            <option value="">Choose a candidate…</option>
            {tower.riskTable.map(r => <option key={r.candidateId} value={r.candidateId}>{r.candidateName} ({r.candidateType})</option>)}
          </select>
        </div>
        {report && (
          <div style={{ background: '#faf7f2', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#141b34', marginBottom: 8 }}>{report.candidateName} — Monthly Progress</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
              <Chip>Roadmap {report.roadmapProgress}%</Chip>
              <Chip>Completed {report.completedCount}</Chip>
              <Chip color={report.overdueCount ? '#e0556b' : undefined}>Overdue {report.overdueCount}</Chip>
              <Chip>Notes {report.consultantNotes.length}</Chip>
            </div>
            {Object.keys(report.scoreChanges).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#9098b5', textTransform: 'uppercase', marginBottom: 4 }}>Score changes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(report.scoreChanges).map(([k, c]) => <Chip key={k} color={c.delta >= 0 ? '#19c08a' : '#e0556b'}>{k} {c.delta >= 0 ? '+' : ''}{c.delta}</Chip>)}
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 800, color: '#9098b5', textTransform: 'uppercase', marginBottom: 4 }}>Next month priorities</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#3c4564' }}>
              {report.nextMonthPriorities.map((p, i) => <li key={i}>{p.title} <span style={{ color: '#9098b5' }}>({p.area})</span></li>)}
              {report.nextMonthPriorities.length === 0 && <li>On track — routine check-in.</li>}
            </ul>
          </div>
        )}
      </Section>
    </div>
  );
}
