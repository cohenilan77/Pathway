/*
 * Undergrad Roadmap tab (Undergraduate candidates only). Renders the structured,
 * stored roadmap grouped by the six sections and lets the student mark roadmap
 * items / linked tasks done. Data comes from the Undergrad engine state
 * (candidateState.undergrad), never a mockup.
 */
import React from 'react';
import { roadmapBySection } from '../../../lib/undergrad/candidate-view.js';
import { ROADMAP_SECTIONS } from '../../../lib/undergrad/constants.js';

const PRIORITY_COLOR = { urgent: '#e0556b', high: '#c08a1a', medium: '#5b46e0', low: '#6b7392' };

function fmt(date) {
  if (!date) return '';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function UndergradRoadmap({ undergrad, setUndergradTaskStatus, regenerateRoadmap, busy }) {
  const grouped = roadmapBySection(undergrad || {});
  const total = ROADMAP_SECTIONS.reduce((n, s) => n + (grouped[s]?.length || 0), 0);
  const done = ROADMAP_SECTIONS.reduce((n, s) => n + (grouped[s] || []).filter(i => i.status === 'done').length, 0);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 24, fontWeight: 700, color: '#141b34' }}>Your Undergrad Roadmap</div>
          <div style={{ fontSize: 13, color: '#6b7392', marginTop: 3 }}>{done} of {total} milestones complete · built from your profile and goals.</div>
        </div>
        <button onClick={() => regenerateRoadmap?.()} disabled={busy}
          style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {busy ? 'Updating…' : 'Rebuild roadmap'}
        </button>
      </div>

      {total === 0 && (
        <div style={{ background: '#fff', border: '1px dashed #e7dcc7', borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: '#9098b5' }}>
          Your roadmap will appear here as you chat with your advisor. Tap “Rebuild roadmap” to generate it now.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {ROADMAP_SECTIONS.map(section => {
          const items = grouped[section] || [];
          if (!items.length) return null;
          return (
            <div key={section}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.7px', color: '#5b46e0', textTransform: 'uppercase', marginBottom: 8 }}>{section}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => {
                  const isDone = item.status === 'done';
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', border: `1px solid ${isDone ? '#d9e3d5' : '#e8ecf6'}`, borderLeft: `4px solid ${PRIORITY_COLOR[item.priority] || '#5b46e0'}`, borderRadius: 12, padding: '12px 14px' }}>
                      <button onClick={() => setUndergradTaskStatus?.(item.id, isDone ? 'todo' : 'done', 'roadmap')}
                        aria-label={isDone ? 'Mark not done' : 'Mark done'}
                        style={{ marginTop: 1, width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', border: isDone ? 'none' : '1px solid #cbbfea', background: isDone ? '#141b34' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isDone && <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34', textDecoration: isDone ? 'line-through' : 'none' }}>{item.title}</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: '#6b7392' }}>
                          <span style={{ fontWeight: 700, color: PRIORITY_COLOR[item.priority] }}>{item.priority}</span>
                          <span>· {item.area}</span>
                          {item.deadline && <span>· due {fmt(item.deadline)}</span>}
                          {item.expectedImpact && <span>· {item.expectedImpact}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
