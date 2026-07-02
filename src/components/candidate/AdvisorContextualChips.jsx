import React, { useMemo } from 'react';

export default function AdvisorContextualChips({
  journeyStage = 'profile',
  scores = null,
  programs = [],
  essays = {},
  interviews = {},
  onChipClick = () => {},
  disabled = false,
}) {
  const chips = useMemo(() => {
    const suggestions = [];

    // Profile stage: ask about next steps
    if (journeyStage === 'profile') {
      suggestions.push(
        { label: '📋 Show me my profile score', msg: 'What is my overall profile score?' },
        { label: '🎯 Start school search', msg: 'Help me find schools that match my profile.' },
      );
    }

    // Analysis stage: portfolio or narrative
    if (journeyStage === 'analysis') {
      suggestions.push(
        { label: '📊 Build my portfolio', msg: 'Build a portfolio of schools for me.' },
        { label: '🔍 Refine my search', msg: 'Help me refine my school search.' },
      );
    }

    // Portfolio stage: next steps
    if (journeyStage === 'portfolio' && programs.length > 0) {
      suggestions.push(
        { label: '📝 Choose narrative', msg: 'Help me choose my narrative strategy.' },
        { label: '💼 Optimize my CV', msg: 'How can I optimize my CV for these schools?' },
      );
    }

    // Narrative stage
    if (journeyStage === 'narrative') {
      suggestions.push(
        { label: '📄 Start writing essays', msg: 'What essays do I need to write?' },
        { label: '✏️ Get essay guidance', msg: 'Help me with my essays.' },
      );
    }

    // Essay stage
    if (journeyStage === 'essays') {
      suggestions.push(
        { label: '🎤 Practice interview', msg: 'Can we do a mock interview?' },
        { label: '📋 Review my essays', msg: 'Can you review my essays?' },
      );
    }

    // Interview stage or final
    if (journeyStage === 'interview' || journeyStage === 'cv') {
      suggestions.push(
        { label: '📊 What are my odds?', msg: 'What are my chances of admission?' },
        { label: '🔄 Start over', msg: 'I want to reset and start fresh.' },
      );
    }

    // Default/fallback: general engagement
    if (suggestions.length === 0) {
      suggestions.push(
        { label: '💬 Ask me anything', msg: 'What would you like help with?' },
        { label: '📚 Learn more', msg: 'Tell me more about the process.' },
      );
    }

    // Limit to 3 chips
    return suggestions.slice(0, 3);
  }, [journeyStage, programs.length, scores, essays, interviews]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 42 }}>
      {chips.map(({ label, msg }) => (
        <button
          key={msg}
          onClick={() => onChipClick(msg)}
          disabled={disabled}
          style={{
            background: '#faf7f2',
            border: '1.5px solid #d8cdb4',
            borderRadius: 14,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            color: '#33405e',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s',
            opacity: disabled ? 0.6 : 1,
          }}
          onMouseEnter={e => {
            if (!disabled) {
              e.currentTarget.style.background = '#f0ebff';
              e.currentTarget.style.borderColor = '#b899fb';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#faf7f2';
            e.currentTarget.style.borderColor = '#d8cdb4';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
