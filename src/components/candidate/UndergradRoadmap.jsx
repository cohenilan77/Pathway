/*
 * Undergrad Roadmap tab (Undergraduate candidates only). A macro progress
 * tracker — six big journey stages (Profile → Applications), each with progress,
 * status, and one next action. Expand a stage for its next step. Data comes from
 * the Undergrad engine state + scores/programs/documents, never a mockup.
 */
import React, { useMemo, useState } from 'react';
import { journeyStages } from '../../../lib/undergrad/candidate-view.js';
import { undergradProfileStage } from '../../../lib/undergrad-profile.js';

const STATUS_TONE = {
  Complete: { bg: '#eafdf6', color: '#119467' },
  'On track': { bg: '#eef1ff', color: '#5b46e0' },
  'In progress': { bg: '#fff8ea', color: '#b27620' },
  'Getting started': { bg: '#fff8ea', color: '#c08a1a' },
  'Not started': { bg: '#f1eadd', color: '#9098b5' },
};

function StageCard({ stage, index, expanded, onToggle }) {
  const tone = STATUS_TONE[stage.status] || STATUS_TONE['Not started'];
  return (
    <div style={{ background: '#fffdf7', borderRadius: 18, border: '1px solid #efe7d4', boxShadow: '0 12px 30px rgba(22,35,63,.06)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#141b34' }}>{stage.label}</div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.3px', padding: '3px 9px', borderRadius: 8, background: tone.bg, color: tone.color }}>{stage.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, height: 8, background: '#eef1f7', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${stage.progress}%`, height: '100%', background: 'linear-gradient(90deg,#94b3fb,#b899fb)' }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#141b34', minWidth: 38, textAlign: 'right' }}>{stage.progress}%</span>
          </div>
        </div>
        <button onClick={onToggle} aria-label="Toggle details" style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid #eee3d0', background: '#faf7f2', color: '#5b46e0', cursor: 'pointer', fontSize: 13, flexShrink: 0, fontFamily: 'inherit' }}>{expanded ? '▲' : '▼'}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f4eede' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.4px', color: '#9098b5', textTransform: 'uppercase', flexShrink: 0, marginTop: 2 }}>Next</span>
        <span style={{ fontSize: 13.5, color: '#33405e', fontWeight: 600, lineHeight: 1.45 }}>{stage.nextAction}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#6b7392' }}>
          {stage.openCount > 0 ? `${stage.openCount} open item${stage.openCount === 1 ? '' : 's'} in this stage.` : 'No open items — you are on top of this stage.'}
        </div>
      )}
    </div>
  );
}

export default function UndergradRoadmap({ undergrad, scores, profile, programs, documents, weaknesses, regenerateRoadmap, busy }) {
  const stages = useMemo(() => journeyStages({ undergrad, scores, profile, programs, documents }), [undergrad, scores, profile, programs, documents]);
  const [expanded, setExpanded] = useState(null);
  const overall = Math.round(stages.reduce((sum, s) => sum + s.progress, 0) / (stages.length || 1));
  const currentStage = stages.find(s => s.progress < 100) || stages[stages.length - 1];
  const profileStage = undergradProfileStage(profile || {});

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px 36px' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#eef1ff,#f7f0ff)', borderRadius: 22, border: '1px solid #e6e0f6', padding: '22px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#7c6ef7', textTransform: 'uppercase' }}>{profileStage} profile · living roadmap</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 700, color: '#141b34', margin: '4px 0 6px' }}>You're in {currentStage?.label}</div>
          <div style={{ fontSize: 13.5, color: '#5f6885', fontWeight: 600 }}>Next · {currentStage?.nextAction}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#5b46e0', lineHeight: 1 }}>{overall}%</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: '#9098b5', marginTop: 4 }}>OVERALL</div>
        </div>
        <button onClick={() => regenerateRoadmap?.()} disabled={busy}
          style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Updating…' : 'Rebuild roadmap'}
        </button>
      </div>

      {(weaknesses || []).length > 0 && (
        <div style={{ background: '#fff8ea', border: '1px solid #f1ddae', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#a97510', textTransform: 'uppercase', letterSpacing: '.5px' }}>Roadmap priorities from current risks</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
            {(weaknesses || []).slice(0, 3).map((item, index) => <span key={index} style={{ background: '#fff', borderRadius: 999, padding: '7px 11px', fontSize: 12.5, color: '#6b5317' }}>{typeof item === 'string' ? item : item?.title || item?.name}</span>)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stages.map((stage, i) => (
          <StageCard key={stage.key} stage={stage} index={i} expanded={expanded === stage.key} onToggle={() => setExpanded(e => e === stage.key ? null : stage.key)} />
        ))}
      </div>
    </div>
  );
}
