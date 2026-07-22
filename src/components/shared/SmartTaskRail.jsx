/*
 * Shared smart task rail: Due now / This week / Important later / Completed
 * (collapsed). Compact task rows inside a fixed scroll box; click a task to
 * open the full details modal. Used by the candidate Tracker and admin Control Tower.
 */
import React, { useState } from 'react';

function fmt(date) {
  if (!date) return '';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function compactLabel(task) {
  return task.header || task.shortTitle || task.label || task.title || 'Task';
}

function detailText(task) {
  return task.description || task.message || task.notes || task.detail || task.body || task.expectedImpact || task.summary || '';
}

function TaskRow({ task, tone, onToggle, onOpen, now }) {
  const isDone = task.status === 'done';
  const overdue = !isDone && task.deadline && new Date(task.deadline).getTime() < now;
  return (
    <div style={{ background: '#fff', border: `1px solid ${overdue ? '#ffd0dc' : '#f2f6ff'}`, borderLeft: `3px solid ${tone}`, borderRadius: 11, padding: '9px 11px', minHeight: 58, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onToggle && (
          <button onClick={() => onToggle(task.id, isDone ? 'todo' : 'done')} aria-label="toggle"
            style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', border: isDone ? 'none' : '1px solid #c6d2ea', background: isDone ? '#111a33' : '#fff' }} />
        )}
        <button onClick={() => onOpen(task)} title={task.title || compactLabel(task)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? '#8b97b8' : '#22304f', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{compactLabel(task)}</div>
          <div style={{ fontSize: 11, color: overdue ? '#e8476b' : '#8b97b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.deadline ? fmt(task.deadline) : 'No date'}{overdue ? ' · overdue' : ''}{task.priority ? ` · ${task.priority}` : ''}{task.area ? ` · ${task.area}` : ''}
          </div>
        </button>
      </div>
    </div>
  );
}

function Group({ label, tasks, tone, onToggle, onOpen, now, empty }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px', color: tone, textTransform: 'uppercase' }}>{label}</div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: tasks.length ? tone : '#dbe4f7' }}>{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#97a3c0', marginBottom: 14 }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {tasks.map(t => <TaskRow key={t.id} task={t} tone={tone} onToggle={onToggle} onOpen={onOpen} now={now} />)}
        </div>
      )}
    </div>
  );
}

function TaskDetailsModal({ task, onClose, now }) {
  if (!task) return null;
  const isDone = task.status === 'done';
  const overdue = !isDone && task.deadline && new Date(task.deadline).getTime() < now;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,26,51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 20, padding: 24, width: 460, maxWidth: '100%', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(30,45,90,.28)' }}>
        <div style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', color: '#fff', background: overdue ? '#e8476b' : '#3a63ff', borderRadius: 7, padding: '3px 9px', marginBottom: 12, textTransform: 'uppercase' }}>
          {overdue ? 'Overdue task' : 'Task'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111a33', marginBottom: 8, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{task.title || compactLabel(task)}</div>
        <div style={{ fontSize: 13, color: '#5a6a8f', marginBottom: 4 }}>{task.deadline ? `Due · ${fmt(task.deadline)}` : 'No date'}</div>
        {task.priority && <div style={{ fontSize: 13, color: '#5a6a8f', marginTop: 4, textTransform: 'capitalize' }}>Priority · {task.priority}</div>}
        {task.status && <div style={{ fontSize: 13, color: '#5a6a8f', marginTop: 4, textTransform: 'capitalize' }}>Status · {task.status}</div>}
        {task.area && <div style={{ fontSize: 13, color: '#5a6a8f', marginTop: 4 }}>Area · {task.area}</div>}
        {detailText(task) && <div style={{ fontSize: 13.5, color: '#38456b', lineHeight: 1.55, marginTop: 14, background: '#f2f6ff', border: '1px solid #e3ebfa', borderRadius: 12, padding: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detailText(task)}</div>}
        <button onClick={onClose} style={{ marginTop: 18, width: '100%', background: '#111a33', color: '#fff', border: 'none', borderRadius: 11, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>
    </div>
  );
}

export default function SmartTaskRail({ groups, onToggle, now = Date.now() }) {
  const [showDone, setShowDone] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { dueNow = [], thisWeek = [], importantLater = [], completed = [] } = groups || {};

  return (
    <>
      <div style={{ maxHeight: 360, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Group label="Due now" tasks={dueNow} tone="#e8476b" onToggle={onToggle} onOpen={setSelectedTask} now={now} empty="Nothing due right now." />
        <Group label="This week" tasks={thisWeek} tone="#e08600" onToggle={onToggle} onOpen={setSelectedTask} now={now} empty="Clear for the week." />
        <Group label="Important later" tasks={importantLater} tone="#3a63ff" onToggle={onToggle} onOpen={setSelectedTask} now={now} empty="No later tasks." />
        {completed.length > 0 && (
          <div>
            <button onClick={() => setShowDone(s => !s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.5px', color: '#0ca678', textTransform: 'uppercase' }}>Completed</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0ca678' }}>{completed.length} {showDone ? '▲' : '▼'}</span>
            </button>
            {showDone && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                {completed.map(t => <TaskRow key={t.id} task={t} tone="#0ca678" onToggle={onToggle} onOpen={setSelectedTask} now={now} />)}
              </div>
            )}
          </div>
        )}
      </div>
      <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} now={now} />
    </>
  );
}
