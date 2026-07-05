import React, { useEffect, useMemo, useState } from 'react';

const defaultButtonStyle = {
  width: 42,
  height: 42,
  borderRadius: 13,
  border: '1.5px solid #f1eadd',
  background: '#faf7f2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#6b7392',
  position: 'relative',
};

function priorityColor(priority) {
  if (priority === 'high') return '#e0457a';
  if (priority === 'medium') return '#eaa129';
  return '#5b46e0';
}

export default function NotificationBell({ alerts = [], storageKey = 'pathway_alerts', title = 'Alerts', buttonStyle }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify([...readIds])); }
    catch {}
  }, [readIds, storageKey]);

  const items = useMemo(() => alerts
    .filter(Boolean)
    .map((alert, index) => ({
      id: alert.id || `${alert.title || alert.message || 'alert'}-${index}`,
      title: alert.title || 'Update',
      message: alert.message || '',
      priority: alert.priority || 'low',
      createdAt: alert.createdAt || null,
    }))
    .slice(0, 20), [alerts]);

  const unreadCount = items.filter(item => !readIds.has(item.id)).length;
  const markRead = (id) => setReadIds(prev => {
    const next = new Set(prev);
    next.add(id);
    return next;
  });
  const markAllRead = () => setReadIds(new Set(items.map(item => item.id)));

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title={title} style={{ ...defaultButtonStyle, ...(buttonStyle || {}) }}>
        <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 7, right: 8, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 999, background: '#e0457a', color: '#fff', border: '2px solid #faf7f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 50, width: 340, maxWidth: 'calc(100vw - 32px)',
          background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 18,
          boxShadow: '0 24px 70px rgba(40,30,90,.18)', zIndex: 80, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f1eadd' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#141b34' }}>{title}</div>
              <div style={{ fontSize: 12, color: '#9098b5', marginTop: 2 }}>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</div>
            </div>
            {!!items.length && (
              <button onClick={markAllRead} style={{ border: 'none', background: '#f6f1e8', color: '#5b46e0', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
            {!items.length ? (
              <div style={{ padding: 22, textAlign: 'center', color: '#9098b5', fontSize: 13 }}>No alerts yet.</div>
            ) : items.map(item => {
              const unread = !readIds.has(item.id);
              return (
                <button key={item.id} onClick={() => markRead(item.id)} style={{
                  width: '100%', border: 'none', background: unread ? '#fff8ea' : 'transparent',
                  borderRadius: 12, padding: '11px 12px', display: 'flex', gap: 10, textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: unread ? priorityColor(item.priority) : '#d8dfeb', flexShrink: 0, marginTop: 6 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#141b34', lineHeight: 1.25 }}>{item.title}</span>
                    {item.message && <span style={{ display: 'block', fontSize: 12.5, color: '#6b7392', lineHeight: 1.45, marginTop: 3 }}>{item.message}</span>}
                    {item.createdAt && <span style={{ display: 'block', fontSize: 12, color: '#aab2cc', marginTop: 5 }}>{new Date(item.createdAt).toLocaleString()}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
