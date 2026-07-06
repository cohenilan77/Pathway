/*
 * Undergrad Tracker / Calendar tab (Undergraduate candidates only). Shows the
 * stored tasks, calendar events, and active reminders from the Undergrad engine,
 * plus the mini-calendar summary. Students can complete tasks and acknowledge
 * reminders; every action is stored + logged by the engine.
 */
import React from 'react';
import { miniCalendar, activeReminders } from '../../../lib/undergrad/candidate-view.js';

function fmt(date) {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const OPEN = new Set(['todo', 'in-progress', 'blocked', 'overdue']);
const TYPE_LABEL = {
  due_date: 'Due', reminder_date: 'Reminder', application_deadline: 'App deadline',
  test_date: 'Test', consultant_review_date: 'Consultant review', consultant_check_in: 'Check-in',
  milestone: 'Milestone', follow_up_date: 'Follow-up',
};

function Stat({ label, value, tone }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: '#fff', border: '1px solid #e8ecf6', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: tone || '#141b34', marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function UndergradTracker({ undergrad, setUndergradTaskStatus, acknowledgeReminder }) {
  const state = undergrad || {};
  const mini = miniCalendar(state, Date.now());
  const reminders = activeReminders(state).filter(r => r.status === 'sent');
  const tasks = (state.tasks || []).slice().sort((a, b) => (new Date(a.deadline || 0)) - (new Date(b.deadline || 0)));
  const events = (state.calendar || [])
    .filter(e => e.visibility !== 'consultant' && e.date && new Date(e.date).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 40);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px' }}>
      <div style={{ fontFamily: "'Newsreader',serif", fontSize: 24, fontWeight: 700, color: '#141b34', marginBottom: 14 }}>Tracker &amp; Calendar</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <Stat label="Today" value={mini.counts.today} />
        <Stat label="This week" value={mini.counts.thisWeek} />
        <Stat label="Overdue" value={mini.counts.overdue} tone={mini.counts.overdue ? '#e0556b' : '#141b34'} />
        <Stat label="Next deadline" value={mini.nextDeadline ? `${fmt(mini.nextDeadline.date)} · ${mini.nextDeadline.title}` : 'None'} />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18 }} className="pw-ug-tracker-grid">
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', textTransform: 'uppercase', marginBottom: 8 }}>Tasks</div>
          {tasks.length === 0 && <div style={{ fontSize: 13, color: '#9098b5' }}>No tasks yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {tasks.map(t => {
              const isDone = t.status === 'done';
              const overdue = OPEN.has(t.status) && t.deadline && new Date(t.deadline).getTime() < Date.now();
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff', border: `1px solid ${overdue ? '#eccfd9' : '#e8ecf6'}`, borderRadius: 11, padding: '10px 12px' }}>
                  <button onClick={() => setUndergradTaskStatus?.(t.id, isDone ? 'todo' : 'done', 'task')} aria-label="toggle"
                    style={{ marginTop: 1, width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', border: isDone ? 'none' : '1px solid #cbbfea', background: isDone ? '#141b34' : '#fff' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div title={t.description || t.title} style={{ fontSize: 13.5, fontWeight: 600, color: isDone ? '#9098b5' : '#2a3447', textDecoration: isDone ? 'line-through' : 'none' }}>{t.header || t.title}</div>
                    <div style={{ fontSize: 11.5, color: overdue ? '#e0556b' : '#9098b5', marginTop: 2 }}>{t.area} · due {fmt(t.deadline)}{overdue ? ' · overdue' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', textTransform: 'uppercase', marginBottom: 8 }}>Upcoming calendar</div>
          {events.length === 0 && <div style={{ fontSize: 13, color: '#9098b5' }}>No events yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {events.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e8ecf6', borderRadius: 11, padding: '10px 12px' }}>
                <div style={{ width: 46, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#141b34' }}>{fmt(e.date)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div title={e.title} style={{ fontSize: 13.5, fontWeight: 600, color: '#2a3447', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: '#9098b5', marginTop: 2 }}>{TYPE_LABEL[e.type] || e.type} · {e.area}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
