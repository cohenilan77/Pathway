import React, { useState } from 'react';

export default function AdvisorProgramCard({ programs = [], onProgramAction = () => {} }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  if (!programs || programs.length === 0) return null;

  const displayCount = expanded ? programs.length : Math.min(3, programs.length);
  const visiblePrograms = programs.slice(0, displayCount);
  const hiddenCount = programs.length - displayCount;

  const getTierColor = (tier) => {
    switch (tier) {
      case 'target':
        return { bg: '#d1f5e6', border: '#b7ecd4', text: '#16875c', label: 'Target' };
      case 'stretch':
        return { bg: '#fde4e8', border: '#f8c4d1', text: '#c02d3e', label: 'Stretch' };
      case 'safety':
        return { bg: '#fef3cd', border: '#fde9a5', text: '#856404', label: 'Safety' };
      default:
        return { bg: '#f6f1e8', border: '#e7dcc7', text: '#6b7392', label: 'Explore' };
    }
  };

  const handleSelection = (program, action) => {
    onProgramAction({
      school: program.name,
      action,
      timestamp: Date.now(),
    });
    setSelectedProgram(null);
  };

  return (
    <div
      style={{
        marginLeft: 42,
        marginTop: 10,
        marginBottom: 10,
        background: '#f6f1e8',
        border: '1.5px solid #e7dcc7',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', marginBottom: 12 }}>
        YOUR SCHOOL PORTFOLIO · {programs.length} SCHOOLS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visiblePrograms.map((program, idx) => {
          const tierColors = getTierColor(program.tier);
          const isSelected = selectedProgram === program.name;

          return (
            <div
              key={program.name}
              onClick={() => setSelectedProgram(isSelected ? null : program.name)}
              style={{
                background: '#fff',
                border: `1.5px solid ${tierColors.border}`,
                borderRadius: 12,
                padding: 14,
                cursor: 'pointer',
                transition: 'all .15s',
                opacity: isSelected ? 1 : 0.85,
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34', marginBottom: 4 }}>
                    {program.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: tierColors.bg,
                        color: tierColors.text,
                        border: `1px solid ${tierColors.border}`,
                      }}
                    >
                      {tierColors.label}
                    </span>
                    {program.fit !== null && (
                      <span style={{ fontSize: 11, color: '#6b7392', fontWeight: 600 }}>
                        {Math.round(program.fit)}% fit
                      </span>
                    )}
                    {program.riskFlags && program.riskFlags.length > 0 && (
                      <span style={{ fontSize: 11, color: '#c02d3e', fontWeight: 600 }}>
                        ⚠ {program.riskFlags.length} risk{program.riskFlags.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  style={{
                    fill: 'none',
                    stroke: '#9098b5',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s',
                    flexShrink: 0,
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {isSelected && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1eadd' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7392', marginBottom: 8 }}>
                    ACTIONS
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleSelection(program, 'mark_target')}
                      style={{
                        flex: 1,
                        minWidth: 100,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: '#d1f5e6',
                        border: '1px solid #b7ecd4',
                        color: '#16875c',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ✓ Mark as target
                    </button>
                    <button
                      onClick={() => handleSelection(program, 'mark_favorite')}
                      style={{
                        flex: 1,
                        minWidth: 100,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: '#fff3cd',
                        border: '1px solid #fde9a5',
                        color: '#856404',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ★ Mark as favorite
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            background: '#faf7f2',
            border: '1.5px dashed #d8cdb4',
            color: '#5b46e0',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Show {hiddenCount} more school{hiddenCount !== 1 ? 's' : ''}
        </button>
      )}

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            background: '#faf7f2',
            border: '1.5px dashed #d8cdb4',
            color: '#5b46e0',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Show less
        </button>
      )}
    </div>
  );
}
