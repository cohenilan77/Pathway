import React from 'react';

const panel = { background: '#f2f6ff', border: '1px solid #dbe4f7', borderRadius: 18, padding: 22, marginTop: 18 };

export default function NarrativeStrategy({ strategy, narrativeCoaching, setCandTab, send }) {
  const current = strategy || narrativeCoaching?.strategy || null;
  const confirmed = current?.confirmationStatus === 'confirmed';
  const start = () => { send?.('Start my Narrative Strategy review using my existing evidence.', { action: 'start_narrative_strategy' }); setCandTab?.('advisor'); };
  const respond = (message, action) => { send?.(message, { action }); setCandTab?.('advisor'); };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 34px 64px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: '#3a63ff' }}>STRATEGY &amp; NARRATIVE</div>
        <h1 style={{ fontSize: 36, color: '#111a33', margin: '10px 0' }}>Build the admissions investment case</h1>
        <p style={{ color: '#5a6a8f', lineHeight: 1.65, maxWidth: 720 }}>
          Your advisor reads the evidence first, asks only critical missing questions, compares credible directions, and recommends the strongest strategy you can defend. The strategy is confirmed before any essay is written.
        </p>

        {!current && (
          <div style={panel}>
            <h2 style={{ marginTop: 0, color: '#111a33' }}>Ready for synthesis</h2>
            <p style={{ color: '#5a6a8f' }}>You do not need to choose “Pivot” or “Upgrade.” The advisor will determine whether the evidence supports an upgrade, adjacent move, or pivot.</p>
            <button onClick={start} style={{ border: 0, borderRadius: 12, padding: '13px 20px', background: '#3a63ff', color: 'white', fontWeight: 750, cursor: 'pointer' }}>Start strategy review</button>
          </div>
        )}

        {current && (
          <>
            <div style={panel}>
              <div style={{ fontSize: 12, fontWeight: 800, color: confirmed ? '#0ca678' : '#c2410c' }}>{confirmed ? 'CONFIRMED' : 'AWAITING CONFIRMATION'}</div>
              <h2 style={{ color: '#111a33' }}>{current.transition?.type || 'Strategy in progress'}{current.transition?.archetype ? ` · ${current.transition.archetype}` : ''}</h2>
              <p style={{ color: '#38456b', lineHeight: 1.65 }}>{current.admissionsProposition || current.recommendedStrategy?.thesis || 'Your advisor is still testing the evidence.'}</p>
              {current.transition?.riskLevel && <p><strong>Accepted risk:</strong> {current.transition.riskLevel}</p>}
              {current.memoryTag && <p><strong>Memory tag:</strong> {current.memoryTag}</p>}
            </div>

            {!!current.alternatives?.length && <div style={panel}><h3>Alternatives considered</h3>{current.alternatives.map((item, i) => <p key={i}>{item.name || item.label || item.summary || String(item)}</p>)}</div>}
            {current.emphasisMap && <div style={panel}><h3>Emphasis map</h3><p><strong>Amplify:</strong> {(current.emphasisMap.amplify || []).join(', ') || '—'}</p><p><strong>Quiet:</strong> {(current.emphasisMap.quiet || []).join(', ') || '—'}</p><p><strong>Pre-empt:</strong> {(current.emphasisMap.preempt || []).map(x => x.label || x.risk || String(x)).join(', ') || '—'}</p></div>}

            {!confirmed && <div style={{ ...panel, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => respond('This feels true and accurately reflects my goals and evidence; nothing material is missing. I confirm this strategy.', 'confirm_strategy')} style={{ border: 0, borderRadius: 10, padding: '12px 16px', background: '#0ca678', color: 'white', fontWeight: 700 }}>Confirm strategy</button>
              <button onClick={() => respond('I want to revise the strategy.', 'revise_strategy')} style={{ border: '1px solid #dbe4f7', borderRadius: 10, padding: '12px 16px', background: 'white', color: '#3a63ff', fontWeight: 700 }}>Revise</button>
              <button onClick={() => respond('Something material is missing from this strategy.', 'strategy_feedback')} style={{ border: '1px solid #dbe4f7', borderRadius: 10, padding: '12px 16px', background: 'white', color: '#3a63ff', fontWeight: 700 }}>Something is missing</button>
            </div>}
          </>
        )}
      </div>
    </div>
  );
}
