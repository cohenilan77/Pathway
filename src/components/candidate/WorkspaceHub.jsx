import React from 'react';

// Undergraduate "Workspace" tab shell — the home for every saved-work/output
// page (Analysis, Schools, Roadmap, Activities, Testing, Essays, Documents,
// Applications). It is purely presentational: CandidatePortal still owns all
// routing/data (candTab stays the source of truth for which sub-page is
// active), this just renders the horizontal sub-nav and a content slot so the
// old pages don't need to be rebuilt or lose their existing wiring.
export default function WorkspaceHub({ tabs, activeKey, onSelect, children }) {
  return (
    <div className="pw-workspace-hub" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="pw-workspace-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 28px 14px', borderBottom: '1px solid #f1eadd', flexShrink: 0 }}>
        {tabs.map(([key, label]) => {
          const active = activeKey === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: active ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : 'transparent',
                color: active ? '#fff' : '#6b7392',
                boxShadow: active ? '0 3px 10px rgba(148,153,251,.35)' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}
