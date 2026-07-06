/*
 * Shared visual calendar + smart task rail. Used by the candidate Tracker /
 * Calendar tab and the admin Control Tower command center so both render the
 * same real, modern month calendar (events/tasks as compact chips on dates,
 * click for the full details modal). Pure presentation over the calendar-view model.
 */
import React, { useMemo, useState } from 'react';
import { monthMatrix, toneFor, isOverdue } from '../../../lib/undergrad/calendar-view.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TYPE_LABEL = {
  due_date: 'Due', reminder_date: 'Reminder', application_deadline: 'Application deadline',
  test_date: 'Test', consultant_review_date: 'Consultant review', consultant_check_in: 'Check-in',
  milestone: 'Milestone', follow_up_date: 'Follow-up', task: 'Task',
};

function fmtFull(date) {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function navBtn() {
  return { width: 34, height: 34, borderRadius: 10, border: '1px solid #eee3d0', background: '#fff', color: '#5b46e0', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' };
}

function itemType(item) {
  return TYPE_LABEL[item.kind === 'task' ? 'task' : item.type] || item.type || item.kind || 'Item';
}

function compactLabel(item) {
  return item.header || item.shortTitle || item.label || itemType(item);
}

function detailText(item) {
  return item.description || item.message || item.notes || item.detail || item.body || item.summary || '';
}

export default function CalendarBoard({ entries = [], now = Date.now() }) {
  const today = new Date(now);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(null);

  const weeks = useMemo(() => monthMatrix(view.year, view.month, entries, now), [view, entries, now]);
  const monthCount = useMemo(() => entries.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === view.year && d.getMonth() === view.month;
  }).length, [entries, view]);

  const step = (delta) => setView(v => {
    const d = new Date(v.year, v.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div style={{ background: '#fffdf7', borderRadius: 20, border: '1px solid #efe7d4', boxShadow: '0 12px 30px rgba(22,35,63,.06)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34' }}>{MONTHS[view.month]} {view.year}</div>
          <div style={{ fontSize: 12, color: '#9098b5', marginTop: 2 }}>{monthCount} scheduled item{monthCount === 1 ? '' : 's'} this month</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => step(-1)} style={navBtn()} aria-label="Previous month">‹</button>
          <button onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })} style={{ ...navBtn(), width: 'auto', padding: '0 12px', fontSize: 12.5, fontWeight: 700 }}>Today</button>
          <button onClick={() => step(1)} style={navBtn()} aria-label="Next month">›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6, alignItems: 'stretch' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', color: '#9098b5', textAlign: 'center', padding: '2px 0 6px', minWidth: 0 }}>{d.toUpperCase()}</div>
        ))}
        {weeks.flat().map((cell, i) => (
          <div key={i} style={{
            height: 92, minHeight: 92, maxHeight: 92, borderRadius: 12, padding: 6, boxSizing: 'border-box', overflow: 'hidden', minWidth: 0,
            background: cell.inMonth ? (cell.isToday ? '#f0edff' : '#faf7f2') : 'transparent',
            border: cell.isToday ? '1.5px solid #b899fb' : '1px solid #f1eadd',
            opacity: cell.inMonth ? 1 : 0.4,
          }}>
            <div style={{ fontSize: 11.5, fontWeight: cell.isToday ? 900 : 700, color: cell.isToday ? '#5b46e0' : '#6b7392', textAlign: 'right', marginBottom: 4 }}>{cell.day}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 64, overflow: 'hidden', minWidth: 0 }}>
              {cell.items.slice(0, 2).map(item => {
                const tone = toneFor(item);
                const overdue = item.kind === 'task' && isOverdue({ deadline: item.date, status: item.status }, now);
                return (
                  <button key={item.id} onClick={() => setSelected(item)} title={item.title}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${tone}33`, borderLeft: `3px solid ${overdue ? '#e0556b' : tone}`, borderRadius: 6, padding: '3px 5px', cursor: 'pointer', fontFamily: 'inherit', width: '100%', maxWidth: '100%', height: 23, minHeight: 23, textAlign: 'left', overflow: 'hidden', minWidth: 0 }}>
                    <span style={{ display: 'block', minWidth: 0, maxWidth: '100%', fontSize: 10.5, fontWeight: 800, color: '#33405e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{compactLabel(item)}</span>
                  </button>
                );
              })}
              {cell.items.length > 2 && (
                <button onClick={() => setSelected({ multi: cell.items, date: cell.date })} style={{ height: 16, lineHeight: '14px', fontSize: 10, fontWeight: 800, color: '#5b46e0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0 5px', fontFamily: 'inherit', overflow: 'hidden' }}>+{cell.items.length - 2} more</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fffdf7', borderRadius: 20, padding: 24, width: 460, maxWidth: '100%', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(40,30,90,.28)' }}>
            {selected.multi ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#141b34', marginBottom: 4 }}>{fmtFull(selected.date)}</div>
                <div style={{ fontSize: 12.5, color: '#9098b5', marginBottom: 14 }}>{selected.multi.length} scheduled items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.multi.map(item => (
                    <button key={item.id} onClick={() => setSelected(item)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#faf7f2', border: 'none', borderRadius: 11, borderLeft: `4px solid ${toneFor(item)}`, padding: '10px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#141b34', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: '#9098b5', marginTop: 2 }}>{itemType(item)}{item.area ? ` · ${item.area}` : ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', color: '#fff', background: toneFor(selected), borderRadius: 7, padding: '3px 9px', marginBottom: 12, textTransform: 'uppercase' }}>
                  {itemType(selected)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 8, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{selected.title}</div>
                <div style={{ fontSize: 13, color: '#6b7392', marginBottom: 4 }}>{fmtFull(selected.date)}</div>
                {selected.area && <div style={{ fontSize: 13, color: '#6b7392' }}>Area · {selected.area}</div>}
                {selected.status && <div style={{ fontSize: 13, color: '#6b7392', marginTop: 4, textTransform: 'capitalize' }}>Status · {selected.status}</div>}
                {detailText(selected) && <div style={{ fontSize: 13.5, color: '#33405e', lineHeight: 1.55, marginTop: 14, background: '#faf7f2', border: '1px solid #efe7d4', borderRadius: 12, padding: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detailText(selected)}</div>}
              </>
            )}
            <button onClick={() => setSelected(null)} style={{ marginTop: 18, width: '100%', background: '#141b34', color: '#fff', border: 'none', borderRadius: 11, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
