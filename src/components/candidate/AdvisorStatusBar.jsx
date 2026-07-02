import React, { useState } from 'react';

// Maps journey stage to position in journey (0-indexed)
const STAGE_POSITIONS = {
  profile: 0,
  analysis: 1,
  portfolio: 2,
  narrative: 3,
  cv: 4,
  essays: 5,
  interview: 6,
};

const STAGE_LABELS = {
  profile: 'Profile',
  analysis: 'Analysis',
  portfolio: 'Portfolio',
  narrative: 'Narrative',
  cv: 'CV',
  essays: 'Essays',
  interview: 'Interview',
};

const TOTAL_STAGES = 7;

export default function AdvisorStatusBar({ journeyStage = 'profile', programs = [], onExpand, isExpanded = false }) {
  const stagePos = STAGE_POSITIONS[journeyStage] || 0;
  const currentStageNum = stagePos + 1;
  const verifiedCount = Array.isArray(programs) ? programs.filter(p => p.confidence === 'high').length : 0;

  const statusText = `Stage ${currentStageNum} of ${TOTAL_STAGES} · ${STAGE_LABELS[journeyStage] || 'Profile'}${verifiedCount > 0 ? ` · ${verifiedCount} school${verifiedCount !== 1 ? 's' : ''} verified` : ''}`;

  return (
    <div
      onClick={onExpand}
      style={{
        background: '#faf7f2',
        borderBottom: '1px solid #f1eadd',
        padding: '10px 24px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all .2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#33405e', flex: 1 }}>
          {statusText}
        </span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          style={{
            fill: 'none',
            stroke: '#9098b5',
            strokeWidth: 2.2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isExpanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1eadd', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(STAGE_LABELS).map(([key, label]) => {
            const pos = STAGE_POSITIONS[key];
            const done = pos < stagePos;
            const current = pos === stagePos;
            return (
              <div
                key={key}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: current ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : done ? '#eafff6' : '#f6f1e8',
                  color: current ? '#fff' : done ? '#16875c' : '#9098b5',
                  border: current ? 'none' : done ? '1px solid #b7ecd4' : '1px solid #e7dcc7',
                }}
              >
                {done ? '✓ ' : current ? '● ' : ''}{label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
