/*
 * Undergrad Tracker / Calendar tab (Undergraduate candidates only). A real
 * visual month calendar (events/tasks as chips on dates) plus a smart task rail
 * — Due now / This week / Important later / Completed. All data comes from the
 * stored Undergrad engine state; every action is stored + logged by the engine.
 */
import React, { useMemo } from 'react';
import { miniCalendar, activeReminders } from '../../../lib/undergrad/candidate-view.js';
import { toCalendarEntries, groupSmartTasks } from '../../../lib/undergrad/calendar-view.js';
import CalendarBoard from '../shared/CalendarBoard.jsx';
import SmartTaskRail from '../shared/SmartTaskRail.jsx';

function fmt(date) {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 14, padding: '13px 15px', boxShadow: '0 8px 20px rgba(22,35,63,.04)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: tone || '#141b34', marginTop: 5 }}>{value}</div>
    </div>
  );
}

export default function UndergradTracker({ undergrad, setUndergradTaskStatus, acknowledgeReminder }) {
  const state = undergrad || {};
  const now = Date.now();
  const mini = miniCalendar(state, now);
  const reminders = activeReminders(state).filter(r => r.status === 'sent');
  const tasks = state.tasks || [];

  const entries = useMemo(() => toCalendarEntries({ tasks, calendar: state.calendar || [] }, { includeConsultant: false }), [tasks, state.calendar]);
  const groups = useMemo(() => groupSmartTasks(tasks, now), [tasks, now]);
  const hasCalendar = entries.length > 0;

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px 36px' }}>
      <div style={{ fontFamily: "'Newsreader',serif", fontSize: 24, fontWeight: 700, color: '#141b34', marginBottom: 14 }}>Tracker &amp; Calendar</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <Stat label="Today" value={mini.counts.today} />
        <Stat label="This week" value={mini.counts.thisWeek} />
        <Stat label="Overdue" value={mini.counts.overdue} tone={mini.counts.overdue ? '#e0556b' : '#141b34'} />
        <Stat label="Next deadline" value={mini.nextDeadline ? fmt(mini.nextDeadline.date) : 'None'} />
        <Stat label="Next check-in" value={mini.nextConsultantCheckIn ? fmt(mini.nextConsultantCheckIn.date) : 'None'} />
      </div>

      {reminders.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', textTransform: 'uppercase', marginBottom: 8 }}>Reminders</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reminders.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fffaf0', border: '1px solid #ecd9a8', borderRadius: 11, padding: '11px 14px' }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 700, color: '#8a6717' }}>{r.title}</div>{r.message && <div style={{ fontSize: 12.5, color: '#6b7392', marginTop: 2 }}>{r.message}</div>}</div>
                <button onClick={() => acknowledgeReminder?.(r.id)} style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Got it</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(260px,1fr)', gap: 18, alignItems: 'start' }} className="pw-ug-tracker-grid">
        <div>
          {hasCalendar ? (
            <CalendarBoard entries={entries} now={now} />
          ) : (
            <div style={{ background: '#fffdf7', border: '2px dashed #e7dcc7', borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#6b7392', marginBottom: 6 }}>Your calendar is clear</div>
              <div style={{ fontSize: 13, color: '#9098b5' }}>Deadlines, test dates, and tasks will appear here as your advisor builds your roadmap.</div>
            </div>
          )}
        </div>
        <div style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 20, boxShadow: '0 12px 30px rgba(22,35,63,.06)', padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#141b34', marginBottom: 14 }}>Smart tasks</div>
          <SmartTaskRail groups={groups} now={now} onToggle={(id, status) => setUndergradTaskStatus?.(id, status, 'task')} />
        </div>
      </div>
    </div>
  );
}
