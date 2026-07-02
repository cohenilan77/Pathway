import React, { useEffect, useState } from 'react';

// Human-friendly descriptions of what tools are doing
const TOOL_DESCRIPTIONS = {
  read_state: 'Reading your journey state...',
  write_state: 'Saving your information...',
  parse_cv: 'Analyzing your CV...',
  score_profile: 'Calculating fit score for {school}...',
  build_portfolio: 'Building your school portfolio...',
  set_chosen_schools: 'Saving your school choices...',
  present_narrative_options: 'Preparing narrative choices...',
  craft_narrative: 'Crafting your narrative strategy...',
  optimize_cv: 'Optimizing your CV...',
  workshop_essay: 'Reviewing your essay...',
  run_mock_interview: 'Starting mock interview...',
  predict_odds: 'Predicting your odds...',
  advance_stage: 'Moving to next stage...',
  emit_ui: 'Updating interface...',
};

export default function AdvisorToolStatus({ toolCall = null, schoolContext = null }) {
  const [displayText, setDisplayText] = useState('');
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (!toolCall) return;

    const description = TOOL_DESCRIPTIONS[toolCall] || `Executing ${toolCall}...`;
    const fullText = description.replace('{school}', schoolContext || 'school');
    setDisplayText(fullText);

    const timer = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(timer);
  }, [toolCall, schoolContext]);

  if (!toolCall) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 42, marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: animationFrame === i ? '#b899fb' : '#e2d9f8',
              transition: 'background .3s ease',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12.5, color: '#6b7392', fontWeight: 500 }}>
        {displayText}
      </span>
    </div>
  );
}
