/*
 * Undergrad Roadmap tab (Undergraduate candidates only). A macro progress
 * tracker — six big journey stages (Profile → Applications), each with progress,
 * status, and one next action. Expand a stage for its next step. Data comes from
 * the Undergrad engine state + scores/programs/documents, never a mockup.
 */
import React, { useMemo, useState } from 'react';
import { journeyStages } from '../../../lib/undergrad/candidate-view.js';
import { undergradProfileStage } from '../../../lib/undergrad-profile.js';
import { DAY_MS } from '../../../lib/undergrad/constants.js';

// Buckets open tasks into the time windows the Workplace spec asks for
// (this week / next 30 days / this semester), separate from the six macro
// journey stages below, which track breadth of progress rather than timing.
function bucketByWindow(tasks = [], now = Date.now()) {
  const weekEnd = now + 7 * DAY_MS;
  const monthEnd = now + 30 * DAY_MS;
  const thisWeek = [];
  const next30Days = [];
  const thisSemester = [];
  for (const t of (tasks || [])) {
    if (!t || t.status === 'done' || t.status === 'cancelled') continue;
    const dl = t.deadline ? new Date(t.deadline).getTime() : null;
    if (dl != null && !Number.isNaN(dl) && dl <= weekEnd) thisWeek.push(t);
    else if (dl != null && !Number.isNaN(dl) && dl <= monthEnd) next30Days.push(t);
    else thisSemester.push(t);
  }
  return { thisWeek, next30Days, thisSemester };
}

function TaskRow({ task }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#38456b', lineHeight: 1.45, marginBottom: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3a63ff', marginTop: 6, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{task.header || task.title}</span>
      {task.deadline && <span style={{ fontSize: 11.5, color: '#8b97b8', fontWeight: 700, flexShrink: 0 }}>{task.deadline}</span>}
    </div>
  );
}

function TimeWindowCard({ title, tasks, empty }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e3ebfa', borderRadius: 18, boxShadow: '0 12px 30px rgba(30,45,90,.06)', padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#3a63ff', textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {tasks.length ? tasks.slice(0, 6).map(t => <TaskRow key={t.id} task={t} />) : <div style={{ fontSize: 13, color: '#8b97b8' }}>{empty}</div>}
    </div>
  );
}

const STATUS_TONE = {
  Complete: { bg: '#e6faf3', color: '#0ca678' },
  'On track': { bg: '#eef1ff', color: '#3a63ff' },
  'In progress': { bg: '#ffffff', color: '#b45309' },
  'Getting started': { bg: '#ffffff', color: '#e08600' },
  'Not started': { bg: '#dbe4f7', color: '#8b97b8' },
};

function StageCard({ stage, index, expanded, onToggle }) {
  const tone = STATUS_TONE[stage.status] || STATUS_TONE['Not started'];
  return (
    <div style={{ background: '#ffffff', borderRadius: 18, border: '1px solid #e3ebfa', boxShadow: '0 12px 30px rgba(30,45,90,.06)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111a33' }}>{stage.label}</div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.3px', padding: '3px 9px', borderRadius: 8, background: tone.bg, color: tone.color }}>{stage.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, height: 8, background: '#f2f6ff', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${stage.progress}%`, height: '100%', background: 'linear-gradient(90deg,#3a63ff,#6d8cff)' }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#111a33', minWidth: 38, textAlign: 'right' }}>{stage.progress}%</span>
          </div>
        </div>
        <button onClick={onToggle} aria-label="Toggle details" style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid #e3ebfa', background: '#f2f6ff', color: '#3a63ff', cursor: 'pointer', fontSize: 13, flexShrink: 0, fontFamily: 'inherit' }}>{expanded ? '▲' : '▼'}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f2f6ff' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.4px', color: '#8b97b8', textTransform: 'uppercase', flexShrink: 0, marginTop: 2 }}>Next</span>
        <span style={{ fontSize: 13.5, color: '#38456b', fontWeight: 600, lineHeight: 1.45 }}>{stage.nextAction}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#5a6a8f' }}>
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
  const windows = useMemo(() => bucketByWindow(undergrad?.tasks), [undergrad]);
  const nextBestAction = windows.thisWeek[0] || windows.next30Days[0] || windows.thisSemester[0] || null;
  const progressLog = (undergrad?.log || []).slice(-5).reverse();

  return (
    <div className="pw-undergrad-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px 36px' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#eef1ff,#f2f6ff)', borderRadius: 22, border: '1px solid #e8efff', padding: '22px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#6d8cff', textTransform: 'uppercase' }}>{profileStage} profile · living roadmap</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 26, fontWeight: 700, color: '#111a33', margin: '4px 0 6px' }}>You're in {currentStage?.label}</div>
          <div style={{ fontSize: 13.5, color: '#5a6a8f', fontWeight: 600 }}>Next · {currentStage?.nextAction}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#3a63ff', lineHeight: 1 }}>{overall}%</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginTop: 4 }}>OVERALL</div>
        </div>
        <button onClick={() => regenerateRoadmap?.()} disabled={busy}
          style={{ background: '#111a33', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Updating…' : 'Rebuild roadmap'}
        </button>
      </div>

      {(weaknesses || []).length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #fff4e2', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.5px' }}>Roadmap priorities from current risks</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
            {(weaknesses || []).slice(0, 3).map((item, index) => <span key={index} style={{ background: '#fff', borderRadius: 999, padding: '7px 11px', fontSize: 12.5, color: '#e08600' }}>{typeof item === 'string' ? item : item?.title || item?.name}</span>)}
          </div>
        </div>
      )}

      {nextBestAction && (
        <div style={{ background: 'linear-gradient(135deg,#eef1ff,#f2f6ff)', border: '1px solid #e8efff', borderRadius: 16, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#6d8cff', textTransform: 'uppercase', marginBottom: 4 }}>Next best action</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111a33' }}>{nextBestAction.header || nextBestAction.title}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 16 }}>
        <TimeWindowCard title="This week" tasks={windows.thisWeek} empty="Nothing due this week." />
        <TimeWindowCard title="Next 30 days" tasks={windows.next30Days} empty="Nothing due in the next 30 days." />
        <TimeWindowCard title="This semester" tasks={windows.thisSemester} empty="No open items further out." />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stages.map((stage, i) => (
          <StageCard key={stage.key} stage={stage} index={i} expanded={expanded === stage.key} onToggle={() => setExpanded(e => e === stage.key ? null : stage.key)} />
        ))}
      </div>

      {progressLog.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#8b97b8', textTransform: 'uppercase', marginBottom: 10 }}>Progress log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progressLog.map(entry => (
              <div key={entry.id} style={{ fontSize: 12.5, color: '#5a6a8f', display: 'flex', gap: 10 }}>
                <span style={{ color: '#8b97b8', flexShrink: 0 }}>{new Date(entry.at).toLocaleDateString()}</span>
                <span>{(entry.event || '').replace(/_/g, ' ')}{entry.payload?.title ? `: ${entry.payload.title}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
