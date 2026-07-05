/*
 * Shared smart task rail: Due now / This week / Important later / Completed
 * (collapsed). Short chips, click to expand details — no long task text by
 * default. Used by the candidate Tracker and the admin Control Tower.
 */
import React, { useState } from 'react';

const PRIORITY_COLOR = { urgent: '#e0556b', high: '#c08a1a', medium: '#5b46e0', low: '#6b7392' };

function fmt(date) {
  if (!date) return '';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TaskRow({ task, tone, onToggle, now }) {
  const [open, setOpen] = useState(false);
  const isDone = task.status === 'done';
  const overdue = !isDone && task.deadline && new Date(task.deadline).getTime() < now;
  return (
    <div style={{ background: '#fff', border: `1px solid ${overdue ? '#eccfd9' : '#eef0f7'}`, borderLeft: `3px solid ${tone}`, borderRadius: 11, padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onToggle && (
          <button onClick={() => onToggle(task.id, isDone ? 'todo' : 'done')} aria-label="toggle"
            style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', border: isDone ? 'none' : '1px solid #cbbfea', background: isDone ? '#141b34' : '#fff' }} />
        )}
        <button onClick={() => setOpen(o => !o)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? '#9098b5' : '#2a3447', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>{task.title}</div>
          <div style={{ fontSize: 11, color: overdue ? '#e0556b' : '#9098b5', marginTop: 2 }}>
            {task.deadline ? fmt(task.deadline) : 'No date'}{overdue ? ' · overdue' : ''}{task.priority ? ` · ${task.priority}` : ''}
          </div>
        </button>
      </div>
      {open && (task.area || task.expectedImpact) && (
        <div style={{ fontSize: 12, color: '#6b7392', marginTop: 8, paddingLeft: onToggle ? 28 : 0, lineHeight: 1.5 }}>
          {task.area && <span>{task.area}</span>}{task.expectedImpact && <span> · {task.expectedImpact}</span>}
        </div>
      )}
    </div>
  );
}

function Group({ label, tasks, tone, onToggle, now, empty }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px', color: tone, textTransform: 'uppercase' }}>{label}</div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: tasks.length ? tone : '#c3c9db' }}>{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#aab2cc', marginBottom: 14 }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {tasks.map(t => <TaskRow key={t.id} task={t} tone={tone} onToggle={onToggle} now={now} />)}
        </div>
      )}
    </div>
  );
}

export default function SmartTaskRail({ groups, onToggle, now = Date.now() }) {
  const [showDone, setShowDone] = useState(false);
  const { dueNow = [], thisWeek = [], importantLater = [], completed = [] } = groups || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Group label="Due now" tasks={dueNow} tone="#e0556b" onToggle={onToggle} now={now} empty="Nothing due right now." />
      <Group label="This week" tasks={thisWeek} tone="#c08a1a" onToggle={onToggle} now={now} empty="Clear for the week." />
      <Group label="Important later" tasks={importantLater} tone="#5b46e0" onToggle={onToggle} now={now} empty="No later tasks." />
      {completed.length > 0 && (
        <div>
          <button onClick={() => setShowDone(s => !s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px', color: '#2f9e78', textTransform: 'uppercase' }}>Completed</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#2f9e78' }}>{completed.length} {showDone ? '▲' : '▼'}</span>
          </button>
          {showDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
              {completed.map(t => <TaskRow key={t.id} task={t} tone="#2f9e78" onToggle={onToggle} now={now} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
