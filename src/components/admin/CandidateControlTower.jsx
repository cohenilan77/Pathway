/*
 * Candidate Control Tower — a premium, single-candidate command center for
 * admins/consultants. Pick a candidate from the dropdown, then the whole screen
 * scopes to them: a hero with stage / risk / next best action, big KPI cards,
 * a real month calendar, and a smart task rail. All aggregation is done by the
 * pure lib/undergrad/control-tower + calendar-view engines; this only renders.
 */
import React, { useMemo } from 'react';
import { buildCandidateCommandCenter } from '../../../lib/undergrad/control-tower.js';
import { toCalendarEntries, groupSmartTasks } from '../../../lib/undergrad/calendar-view.js';
import CalendarBoard from '../shared/CalendarBoard.jsx';
import SmartTaskRail from '../shared/SmartTaskRail.jsx';

const RISK_TONE = {
  critical: { bg: '#fff1f4', color: '#e0556b', label: 'Critical risk' },
  high: { bg: '#fff8ea', color: '#c08a1a', label: 'High risk' },
  medium: { bg: '#eef1ff', color: '#5b46e0', label: 'Medium risk' },
  low: { bg: '#eafdf6', color: '#119467', label: 'On track' },
};

function fmt(date) {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function ago(ms) {
  if (!ms) return 'No activity yet';
  const days = Math.floor((Date.now() - ms) / 86400000);
  return days <= 0 ? 'Active today' : `${days} day${days === 1 ? '' : 's'} ago`;
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 18, padding: 18, boxShadow: '0 10px 26px rgba(22,35,63,.05)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: '#9098b5', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: tone || '#141b34', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9098b5', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function CandidateControlTower({ candidates = [], selectedId, onSelect, detail, loading, now = Date.now() }) {
  const cc = useMemo(() => {
    if (!detail?.data) return null;
    const d = detail.data;
    return buildCandidateCommandCenter({
      id: selectedId,
      name: detail.user?.name || detail.user?.email || 'Candidate',
      category: d.profile?.category || detail.user?.category || 'Undergraduate',
      scores: d.scores || null,
      undergrad: d.undergrad || null,
      stage: d.stage || null,
      nextAction: d.nextAction || null,
      lastActiveAt: detail.user?.lastActiveAt || detail.user?.lastLoginAt || null,
    }, { now });
  }, [detail, selectedId, now]);

  const entries = useMemo(() => cc ? toCalendarEntries({ tasks: cc.tasks, calendar: cc.calendar }, { includeConsultant: true }) : [], [cc]);
  const groups = useMemo(() => cc ? groupSmartTasks(cc.tasks, now) : null, [cc, now]);

  const risk = RISK_TONE[cc?.riskLevel] || RISK_TONE.low;
  const progress = cc ? (cc.overallScore != null ? `${cc.overallScore}` : `${cc.roadmapProgress}%`) : '—';
  const progressSub = cc ? (cc.overallScore != null ? 'Readiness score' : `${cc.roadmapTotal} roadmap items`) : '';

  return (
    <div style={{ padding: '4px 4px 40px' }}>
      {/* Candidate picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#9098b5', textTransform: 'uppercase' }}>Candidate</div>
        <select value={selectedId || ''} onChange={e => onSelect?.(e.target.value || null)}
          style={{ minWidth: 280, border: '1.5px solid #e7dcc7', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 600, color: '#141b34', background: '#fffdf7', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">Choose a candidate…</option>
          {candidates.map(c => <option key={c.id} value={c.id}>{c.name}{c.category ? ` — ${c.category}` : ''}</option>)}
        </select>
        {loading && <span style={{ fontSize: 13, color: '#9098b5' }}>Loading…</span>}
      </div>

      {!selectedId && (
        <div style={{ background: '#fffdf7', border: '2px dashed #e7dcc7', borderRadius: 22, padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#94b3fb,#b899fb)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="26" height="26" style={{ fill: 'none', stroke: '#fff', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 6 }}>Choose a candidate to open their command center</div>
          <div style={{ fontSize: 13.5, color: '#9098b5', maxWidth: 420, margin: '0 auto' }}>You'll see their risk, progress, next best action, live calendar, and urgent tasks — all in one place.</div>
        </div>
      )}

      {selectedId && loading && !cc && (
        <div style={{ background: '#fffdf7', border: '1px dashed #e7dcc7', borderRadius: 20, padding: 48, textAlign: 'center', color: '#9098b5', fontSize: 14 }}>Loading candidate…</div>
      )}

      {selectedId && cc && (
        <>
          {/* Hero */}
          <div style={{ background: 'linear-gradient(135deg,#eef1ff,#f7f0ff)', border: '1px solid #e6e0f6', borderRadius: 22, padding: '22px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 700, color: '#141b34' }}>{cc.name}</div>
                <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 11px', borderRadius: 9, background: risk.bg, color: risk.color }}>{risk.label}</span>
                {cc.stage && <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 9, background: '#fff', color: '#5b46e0', border: '1px solid #e0d9ef' }}>{cc.stage}</span>}
              </div>
              <div style={{ fontSize: 13.5, color: '#5f6885', fontWeight: 600 }}>Next best action · {cc.nextAction}</div>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 18 }}>
            <Kpi label="Risk" value={risk.label.replace(' risk', '')} tone={risk.color} sub={cc.overdueCount ? `${cc.overdueCount} overdue` : 'No overdue tasks'} />
            <Kpi label="Progress" value={progress} sub={progressSub} />
            <Kpi label="Urgent tasks" value={cc.urgentCount} tone={cc.urgentCount ? '#c08a1a' : '#141b34'} sub={cc.nextDeadline ? `Next · ${fmt(cc.nextDeadline.date)}` : 'No deadlines soon'} />
            <Kpi label="Last activity" value={ago(cc.lastActiveAt)} sub={cc.openTaskCount ? `${cc.openTaskCount} open tasks` : 'All tasks clear'} />
          </div>

          {/* Calendar + smart rail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(260px,1fr)', gap: 18, alignItems: 'start' }} className="pw-tower-grid">
            <div>
              {entries.length ? (
                <CalendarBoard entries={entries} now={now} />
              ) : (
                <div style={{ background: '#fffdf7', border: '2px dashed #e7dcc7', borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#6b7392', marginBottom: 6 }}>No calendar items yet</div>
                  <div style={{ fontSize: 13, color: '#9098b5' }}>Deadlines, tests, and reviews will appear here once this candidate's roadmap is built.</div>
                </div>
              )}
            </div>
            <div style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 20, boxShadow: '0 12px 30px rgba(22,35,63,.06)', padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#141b34', marginBottom: 14 }}>Urgent tasks</div>
              <SmartTaskRail groups={groups} now={now} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
