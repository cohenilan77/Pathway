/*
 * AI Advisor workspace — design-to-code implementation of
 * "AI Advisor.dc.html" (Claude Design project, seeded at project/Pathway.dc.html).
 * Structure mapped from the design: full-width numbered stepper, circular
 * avatar + serif title header, chat stream, up-arrow composer, and the
 * right-side "Real-time Analysis" panel with three circular ring gauges +
 * Fit Index footer. Gauges/scores are fed from real KPI data, not mocked.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import LongRunningAdvisorStatus from './LongRunningAdvisorStatus.jsx';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';
import { getTrackConfig } from '../../trackConfig.js';
import { getCandidateKpiDisplayItems } from '../../../lib/candidate-kpi-schemas.js';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';
import NarrativeModal from './AdvisorNarrativeModal.jsx';
import { deriveNarrativeProgress } from '../../lib/narrativeProgress.js';

const OPTIONS_PATTERN = /→\s*([\s\S]+)$/;
const OPTIONS_TRAILING_PROMPT = /\s+(?:What should we work on next\??|Inquire about your strategy…?)\s*$/i;
const TARGET_SELECTION_LOOP = /(?:lock in|choose|name|which)\s+(?:your\s+)?(?:3\s*[–-]\s*5\s+)?(?:target\s+)?schools|which\s+3\s*[–-]\s*5\s+schools/i;
const NARRATIVE_START = "Your targets are locked in. Now let's shape your Narrative & Strategy. What's the specific moment or experience that convinced you this is the right path?";

// Ring circumference for r=50 (design uses 2·π·50 ≈ 314 for the dash array).
const RING_CIRC = 314;
// Ring accent colors, in the design's order: navy, gold, periwinkle.
const RING_COLORS = ['#141b34', '#5b46e0', '#aebde6'];

function parseOptions(text) {
  const match = OPTIONS_PATTERN.exec(text || '');
  if (!match) return null;
  const optionText = match[1].replace(OPTIONS_TRAILING_PROMPT, '').trim();
  const options = optionText
    .split('|')
    .map(o => o.replace(OPTIONS_TRAILING_PROMPT, '').trim())
    .filter(Boolean);
  if (options.length < 2) return null;
  return { mainText: text.slice(0, match.index).trim(), options };
}

function undergradGradeNumber(profile) {
  const grade = String(profile?.grade || profile?.currentGrade || '').match(/\d{1,2}/)?.[0];
  return grade ? Number(grade) : null;
}

const AiAvatar = ({ size = 34 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: '#141b34', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px rgba(22,35,63,.28)' }}>
    <svg viewBox="0 0 24 24" width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} style={{ fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  </div>
);

// Numbered stepper across the top of the workspace — mapped from the design's
// step row (numbered circles + hairline connectors). Uses the real STEPS array
// and stepIdx; undergrad future stages render dashed/gold like the legacy view.
function DesignStepper({ STEPS, stepIdx, futureStages }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 32px', borderBottom: '1px solid #f1eadd', background: '#fff', overflowX: 'auto', flexShrink: 0 }}>
      {STEPS.map((label, i) => {
        const active = i === stepIdx;
        const done = i < stepIdx;
        const future = futureStages?.has?.(label);
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
              ...(active
                ? { background: '#141b34', color: '#fff', boxShadow: '0 4px 10px rgba(22,35,63,.28)' }
                : done
                ? { background: '#141b34', color: '#fff' }
                : future
                ? { background: '#fffaf0', color: '#5b46e0', border: '1px dashed #d3c9a8' }
                : { background: '#fff', color: '#9aa3b5', border: '1px solid #e7dcc7' }),
            }}>
              {done ? '✓' : i + 1}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap', color: active ? '#141b34' : done ? '#3a425a' : future ? '#5b46e0' : '#9aa3b5' }}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span style={{ width: 34, height: 1, background: done ? '#5b46e0' : '#e1e6f0', margin: '0 4px', flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );
}

// Circular ring gauge from the design's "Real-time Analysis" panel. Value is a
// real KPI score (0–100); a null value renders an empty ring with an em dash.
function RingGauge({ value, color, label, caption }) {
  const has = Number.isFinite(value);
  const pct = has ? Math.max(0, Math.min(100, value)) : 0;
  const dash = (pct / 100) * RING_CIRC;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="116" height="116" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" style={{ fill: 'none', stroke: '#eef1f7', strokeWidth: 9 }} />
        <circle cx="60" cy="60" r="50" transform="rotate(-90 60 60)" style={{ fill: 'none', stroke: color, strokeWidth: 9, strokeLinecap: 'round', strokeDasharray: `${dash} ${RING_CIRC}`, transition: 'stroke-dasharray .6s ease' }} />
        <text x="60" y="70" textAnchor="middle" style={{ fontFamily: "'Newsreader',serif", fontSize: 30, fontWeight: 700, fill: '#141b34' }}>{has ? Math.round(value) : '—'}</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#141b34', marginTop: 8, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 2 }}>{caption}</div>
    </div>
  );
}

// Right-side "Real-time Analysis" panel — the signature element of the design.
// Renders the top three real KPI dimensions as ring gauges plus a Fit Index
// footer (real overall score). A compact task list and the analysis/university
// shortcut sit below a divider so existing behavior is preserved.
function RealtimeAnalysisPanel({ scores, profile, programs, isUndergrad, setCandTab, tasks, completedTasks, toggleTask }) {
  const dims = getCandidateKpiDisplayItems(scores, profile).slice(0, 3);
  const slots = [0, 1, 2].map(i => dims[i] || null);
  const fit = Number.isFinite(scores?.overall) ? Math.round(scores.overall) : null;
  const taskList = tasks || [];
  const doneCount = taskList.filter(t => completedTasks?.[t]).length;

  return (
    <div className="pw-advisor-rail" style={{ background: '#fbfcfe', padding: '32px 26px', overflowY: 'auto', minHeight: 0 }}>
      <h3 style={{ fontFamily: "'Newsreader',serif", fontSize: 24, fontWeight: 700, color: '#141b34', margin: '0 0 6px', lineHeight: 1.15 }}>Real-time Analysis</h3>
      <p style={{ fontSize: 13, color: '#8a93a3', margin: '0 0 30px', lineHeight: 1.5 }}>Live profile calibration based on dialogue.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
        {slots.map((d, i) => (
          <RingGauge
            key={d?.key || `slot-${i}`}
            value={d && d.status !== 'incomplete' ? d.value : null}
            color={RING_COLORS[i]}
            label={d?.label || 'Dimension'}
            caption={!d ? 'Awaiting analysis' : d.status === 'incomplete' ? 'Awaiting data' : 'Live estimate'}
          />
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5b46e0', fontSize: 14, fontWeight: 700, borderTop: '1px solid #eef1f6', width: '100%', justifyContent: 'center', paddingTop: 22 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 2 9.2 8.6 2 9.2l5.5 4.8L5.8 21 12 17.3 18.2 21l-1.7-7L22 9.2l-7.2-.6Z" /></svg>
          Fit Index: {fit != null ? `${fit}%` : '—'}
        </div>
      </div>

      {(isUndergrad && programs?.length > 0) && (
        <button onClick={() => setCandTab?.('universities')} style={{ marginTop: 26, width: '100%', background: '#141b34', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Open University List →
        </button>
      )}
      {(!isUndergrad && scores) && (
        <button onClick={() => setCandTab?.('analysis')} style={{ marginTop: 26, width: '100%', background: '#141b34', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          View Full Analysis →
        </button>
      )}

      {taskList.length > 0 && (
        <div style={{ marginTop: 26, borderTop: '1px solid #eef1f6', paddingTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#8a93a3' }}>YOUR TASKS</div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#141b34', background: '#eef1f7', padding: '3px 9px', borderRadius: 7 }}>{doneCount}/{taskList.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {taskList.map((text) => {
              const done = !!completedTasks?.[text];
              return (
                <div key={text} onClick={() => toggleTask(text)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${done ? '#d9e3d5' : '#e8ecf6'}`, background: done ? '#f5f9f4' : '#fff', transition: 'all .15s' }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...(done ? { background: '#141b34', boxShadow: '0 3px 8px rgba(22,35,63,.24)' } : { background: '#fff', border: '1px solid #e7dcc7' }),
                  }}>
                    {done && (
                      <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: done ? '#9aa3b5' : '#2a3447', textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Live "thinking" state shown while the agent works.
function ThinkingLine({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, animation: 'pwFade .3s ease' }}>
      <AiAvatar />
      <div style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '12px 17px', display: 'flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: 9, maxWidth: '100%' }}>
        <LongRunningAdvisorStatus busy message={message} />
      </div>
    </div>
  );
}

function CardShell({ label, labelColor = '#5b46e0', children }) {
  return (
    <div style={{ marginLeft: 42, maxWidth: 640, background: '#fff', border: '1px solid #e8ecf6', borderRadius: 16, padding: '16px 18px', boxShadow: '0 10px 26px rgba(22,35,63,.07)', animation: 'pwFade .3s ease' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.8px', color: labelColor, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

// Readiness snapshot: overall score plus the per-dimension KPI bars, inline in
// the stream instead of hidden in a side rail.
function ReadinessCard({ scores, profile }) {
  const [open, setOpen] = useState(false);
  const trackConfig = getTrackConfig(profile || {});
  const dims = getCandidateKpiDisplayItems(scores, profile)
    .map(item => ({ ...item, title: item.label }));
  const shown = open ? dims : dims.slice(0, 3);
  return (
    <CardShell label="READINESS SNAPSHOT">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: dims.length ? 12 : 0 }}>
        <div style={{ fontFamily: "'Newsreader',serif", fontSize: 36, fontWeight: 700, color: '#141b34', lineHeight: 1 }}>
          {scores?.overall ?? 0}<span style={{ fontFamily: "'Albert Sans',system-ui,sans-serif", fontSize: 14, fontWeight: 600, color: '#9aa3b5' }}>/100</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#7a8295', fontWeight: 600, lineHeight: 1.45 }}>
          {trackConfig.scoreLabel || 'Competitiveness'} based on everything you have shared so far.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(d => (
          <div key={d.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2a3447' }}>{d.title}</span>
              <span style={{ fontSize: d.status === 'incomplete' ? 10.5 : 11.5, fontWeight: 800, color: d.status === 'incomplete' ? '#9aa3b5' : '#141b34' }}>{d.status === 'incomplete' ? 'Incomplete' : d.value}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#eef1f7', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${d.status === 'incomplete' ? 0 : Math.max(0, Math.min(100, d.value))}%`, borderRadius: 3, background: 'linear-gradient(90deg,#94b3fb,#b899fb)', transition: 'width .4s ease' }} />
            </div>
          </div>
        ))}
      </div>
      {dims.length > 3 && (
        <button onClick={() => setOpen(v => !v)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#5b46e0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          {open ? 'Show less' : `Show all ${dims.length} dimensions`}
        </button>
      )}
    </CardShell>
  );
}

function tierMeta(program) {
  const tier = String(program?.tier || '').toLowerCase();
  if (tier === 'locked') return { label: 'Locked', color: '#747b91', bg: '#f4f4f2', border: '#d9d6cf' };
  if (tier === 'safe') return { label: 'Strong Fit', color: '#16875c', bg: '#f0f9f4', border: '#cfe8da' };
  if (tier === 'possible') return { label: 'Possible', color: '#a97510', bg: '#fffaf0', border: '#ecd9a8' };
  return { label: 'Stretch', color: '#b04a68', bg: '#fdf4f7', border: '#eccfd9' };
}

// University list as a first-class chat artifact. Selection writes through
// setChosenSchools, the exact state the Analysis tab reads, so both views stay
// in sync with no extra plumbing.
function ProgramsCard({ programs, chosenSchools, setChosenSchools, confirmTargetSchools, busy }) {
  const list = useMemo(() => normalizeProgramList(programs) || [], [programs]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => chosenSchools || []);
  useEffect(() => { setSelected(chosenSchools || []); }, [chosenSchools]);

  if (!list.length) return null;
  const shown = open ? list : list.slice(0, 8);
  const hidden = list.length - shown.length;

  const toggle = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };
  // Confirming targets also asks the advisor to move the journey forward, so
  // the candidate lands directly on the next stage instead of a dead end.
  const confirm = () => {
    if (!selected.length || busy) return;
    confirmTargetSchools?.(selected);
  };

  return (
    <CardShell label={`RECOMMENDED PROGRAMS · ${list.length}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(program => {
          const meta = tierMeta(program);
          const isPicked = selected.includes(program.name);
          const drivers = Array.isArray(program.fitDrivers) ? program.fitDrivers : [];
          const risks = Array.isArray(program.riskFlags) ? program.riskFlags : [];
          const gaps = Array.isArray(program.evidenceGaps) ? program.evidenceGaps : [];
          const actions = Array.isArray(program.missingActions) ? program.missingActions : [];
          return (
            <div key={program.name} className={`pw-card${isPicked ? ' is-selected' : ''}`} onClick={() => toggle(program.name)}
              style={{ padding: '12px 13px', borderRadius: 13, cursor: 'pointer', border: `1.5px solid ${isPicked ? '#5b46e0' : meta.border}`, background: isPicked ? '#fffaf0' : meta.bg }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <span className="pw-card-check-badge" style={{
                  width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(isPicked ? { background: '#141b34', boxShadow: '0 3px 8px rgba(22,35,63,.3)', transform: 'scale(1.05)' } : { background: '#fff', border: `1.5px solid ${meta.border}` }),
                }}>
                  {isPicked && (
                    <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 13l4 4L19 7" /></svg>
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#141b34' }}>{program.name}</div>
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#ffffffb8', color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
                    {program.selectivityLabel && (
                      <span style={{ fontSize: 12, color: '#7a8295', fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#ffffff9c', border: '1px solid #e7dcc7' }}>{program.selectivityLabel}</span>
                    )}
                  </div>
                  {(program.fitExplanation || program.notes) && (
                    <div style={{ fontSize: 12, color: '#5f6885', lineHeight: 1.45, marginTop: 5 }}>{program.fitExplanation || program.notes}</div>
                  )}
                </div>
                {Number.isFinite(Number(program.fitIndex ?? program.fit)) && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{Math.round(Number(program.fitIndex ?? program.fit))}%</div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.45px', color: '#9098b5', marginTop: 3 }}>FIT INDEX</div>
                  </div>
                )}
              </div>
              {(drivers.length || risks.length || gaps.length || actions.length) > 0 && (
                <div style={{ marginLeft: 31, marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                  {drivers.length > 0 && <div style={{ fontSize: 12, color: '#16875c', lineHeight: 1.4 }}><b>Drivers:</b> {drivers.join(' · ')}</div>}
                  {risks.length > 0 && <div style={{ fontSize: 12, color: '#b44b57', lineHeight: 1.4 }}><b>Risks:</b> {risks.join(' · ')}</div>}
                  {gaps.length > 0 && <div style={{ fontSize: 12, color: '#8a6717', lineHeight: 1.4 }}><b>Evidence gaps:</b> {gaps.join(' · ')}</div>}
                  {actions.length > 0 && <div style={{ fontSize: 12, color: '#141b34', lineHeight: 1.4 }}><b>Next actions:</b> {actions.join(' · ')}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        {hidden > 0 && (
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#5b46e0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Show all {list.length} programs
          </button>
        )}
        {open && list.length > 8 && (
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#5b46e0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Show less
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={confirm} disabled={!selected.length || busy}
          style={{
            background: selected.length && !busy ? '#141b34' : '#e2e7f2',
            color: selected.length && !busy ? '#fff' : '#9aa3b5',
            border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700,
            cursor: selected.length && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            boxShadow: selected.length && !busy ? '0 6px 16px rgba(22,35,63,.26)' : 'none', transition: 'all .2s',
          }}>
          {selected.length ? `Confirm ${selected.length} target${selected.length === 1 ? '' : 's'}` : 'Select targets'}
        </button>
      </div>
    </CardShell>
  );
}

// Stage-aware suggestions under the input. Chips only inject a user message;
// they never navigate or mutate state directly.
function contextualChips({ scores, programs, chosenSchools, narrative, narrativeQnAComplete }) {
  if (!scores) {
    return [
      { label: 'Continue analysis', msg: 'Continue my analysis.' },
      { label: 'What is missing from my profile?', msg: 'What is missing from my profile?' },
    ];
  }
  if (!programs?.length) {
    return [
      { label: 'Show my school list', msg: 'Generate my complete school list now. I cannot see any schools in Chat or Analysis.' },
      { label: 'What is missing from my profile?', msg: 'What is missing from my profile?' },
      { label: 'How competitive am I?', msg: 'Walk me through my readiness snapshot.' },
    ];
  }
  if (!chosenSchools?.length) {
    return [
      { label: 'Why do these fit me?', msg: 'Show me why these programs fit my profile.' },
      { label: 'Safer vs ambitious', msg: 'Compare my safer options against my ambitious options.' },
      { label: 'What should I do next?', msg: 'What should I do next?' },
    ];
  }
  if (!narrative) {
    // N1-N4 aren't answered yet: don't offer a chip that skips ahead to
    // "the next narrative question" before the candidate has answered this one.
    if (!narrativeQnAComplete) return [];
    return [
      { label: 'Continue narrative', msg: `Continue with the next narrative question using my confirmed target schools: ${(chosenSchools || []).join(' | ')}.` },
      { label: 'Improve my odds', msg: 'What would most improve my odds at my target schools?' },
    ];
  }
  return [
    { label: 'Work on my CV', msg: 'Help me optimize my CV for my target schools.' },
    { label: 'Start my essays', msg: 'What essays do I need, and where should I start?' },
    { label: 'What should I do next?', msg: 'What should I do next?' },
  ];
}

export default function AdvisorChatFirst({
  STEPS, stepIdx, chat, input, setInput, send, busy, scores, profile, programs,
  setShowCvModal, narrative, setNarrative, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, authUser,
  setCandTab, tasks, completedTasks, setCompletedTasks,
}) {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const [showNarrativeModal, setShowNarrativeModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const reduceMotion = useReducedMotion();

  const visibleChat = visibleCandidateChat(chat, {
    whatsapp: authUser?.whatsappOptIn === true,
    telegram: authUser?.telegramOptIn === true,
  });

  const updateScrollButtons = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    setShowScrollTop(el.scrollTop > 80);
    setShowScrollBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  };

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return undefined;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollButtons);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const t = setTimeout(updateScrollButtons, 350);
    return () => clearTimeout(t);
  }, [chat, busy]);

  const scrollChatToTop = () => chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollChatToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleChip = (opt) => {
    send(opt);
    inputRef.current?.focus();
  };

  const handleNarrativeChoose = (kind) => {
    setNarrative && setNarrative(kind);
    setShowNarrativeModal(false);
    send(`I've chosen the ${kind === 'upgrade' ? 'Upgrade' : 'Pivot'} narrative. Please craft my complete narrative strategy now for my chosen schools.`);
  };

  const lastAiMsg = visibleChat.filter(m => m.role === 'ai').slice(-1)[0];
  const lastAiText = lastAiMsg?.text || '';
  const latestUserText = visibleChat.filter(m => m.role === 'user').slice(-1)[0]?.text || '';
  // The deterministic message that opens N1 never contains the "Narrative
  // Strategy tab" phrase, so a plain string-match against it never fires.
  // Derive readiness from state instead: schools confirmed, no narrative
  // chosen yet, and the candidate has actually answered N1-N4.
  const { narrativeQnAComplete } = deriveNarrativeProgress(visibleChat, NARRATIVE_START);
  const showNarrativeCTA = !busy && !narrative && chosenSchools?.length > 0 && narrativeQnAComplete;
  const lastParsed = !busy ? parseOptions(lastAiText) : null;
  const chips = !busy && !lastParsed ? contextualChips({ scores, programs, chosenSchools, narrative, narrativeQnAComplete }) : [];

  const isUndergrad = profile?.category === 'Undergraduate';
  const gradeNumber = undergradGradeNumber(profile);
  const futureStages = isUndergrad && gradeNumber && gradeNumber <= 10 ? new Set(['Essays', 'Applications']) : new Set();
  const toggleTask = (text) => setCompletedTasks?.(prev => ({ ...prev, [text]: !prev[text] }));

  const hasPrograms = Array.isArray(programs) && programs.length > 0;
  // Artifacts are stage-specific. Keeping the large readiness/program cards
  // after targets are confirmed pushes the new Narrative question above them,
  // making the UI look frozen even though the state advanced successfully.
  const showReadiness = !!scores && stepIdx >= 2 && !hasPrograms;
  // Existing sessions created before the atomic-confirm fix may have saved
  // targets while their last advisor reply still asks them to choose schools.
  // Reopen the existing list in place, pre-checked, so they can recover without
  // restarting or losing profile/analysis data.
  const needsSelectionRecovery = hasPrograms && chosenSchools?.length > 0 && TARGET_SELECTION_LOOP.test(lastAiText);
  const showPrograms = hasPrograms && (!narrative || !chosenSchools?.length || needsSelectionRecovery);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px' }}>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 16, border: '1px solid #f1eadd', boxShadow: '0 20px 50px rgba(22,35,63,.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', position: 'relative' }}>

        {/* numbered stepper (design: step row) */}
        <DesignStepper STEPS={STEPS} stepIdx={stepIdx} futureStages={futureStages} />

        {/* workspace: conversation + Real-time Analysis panel (design grid 1fr 340px) */}
        <div className="pw-advisor-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>

        {/* chat column */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #eef1f6' }}>

        {/* header: circular avatar + serif title (design) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 32px 16px', flexShrink: 0 }}>
          <AiAvatar size={46} />
          <div>
            <h2 style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 700, color: '#141b34', margin: 0, lineHeight: 1.1 }}>
              {profile?.name ? `${String(profile.name).split(' ')[0]}'s Strategic Profile` : 'Strategic Profile Initiation'}
            </h2>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8a93a3', marginTop: 4 }}>
              Stage {Math.min(stepIdx + 1, STEPS.length)} of {STEPS.length} · {STEPS[Math.min(stepIdx, STEPS.length - 1)]}
            </div>
          </div>
        </div>

        {/* single-column conversation, with floating scroll controls */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div ref={chatScrollRef} style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 8px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleChat.map((m, i) => {
              if (m.role === 'ai') {
                const isLast = i === visibleChat.length - 1;
                const visibleText = isLast && chosenSchools?.length && TARGET_SELECTION_LOOP.test(m.text || '') && !needsSelectionRecovery ? NARRATIVE_START : m.text;
                const parsed = parseOptions(visibleText);
                const showChipsHere = parsed && !busy;
                const showAvatar = i === 0 || visibleChat[i - 1].role !== 'ai';
                const delay = Math.min(i * 0.03, 0.3);
                return (
                  <motion.div
                    key={i}
                    className="pw-msg-row"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay, ease: 'easeOut' }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      {showAvatar ? <AiAvatar /> : <span style={{ width: 34, flexShrink: 0 }} />}
                      <div className="pw-rich-text" style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', fontSize: 14.5, lineHeight: 1.65, maxWidth: 640, boxShadow: '0 4px 14px rgba(22,35,63,.05)' }}>
                        {renderFormattedText(parsed ? parsed.mainText : visibleText)}
                      </div>
                    </div>
                    {showChipsHere && (
                      <div style={{ marginLeft: 42, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {parsed.options.map(opt => (
                          <button key={opt} className="pw-chip" onClick={() => handleChip(opt)} disabled={busy}
                            style={{ background: '#fff', border: '1px solid #e7dcc7', borderRadius: 9, padding: '9px 17px', fontSize: 13.5, fontWeight: 600, color: '#141b34', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={i}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
                  style={{ alignSelf: 'flex-end', background: '#141b34', color: '#eef2fa', borderRadius: '16px 16px 4px 16px', padding: '13px 18px', fontSize: 14.5, lineHeight: 1.6, maxWidth: '72%', whiteSpace: 'pre-wrap', boxShadow: '0 8px 20px rgba(22,35,63,.22)' }}
                >
                  {m.text.startsWith('Here is my CV') ? '📄 CV submitted for analysis' : m.text}
                </motion.div>
              );
            })}

            {busy && <ThinkingLine message={latestUserText} />}

            {/* inline artifacts: readiness and program list */}
            {showReadiness && <ReadinessCard scores={scores} profile={profile} />}
            {showPrograms && (
              <ProgramsCard programs={programs} chosenSchools={chosenSchools} setChosenSchools={setChosenSchools} confirmTargetSchools={confirmTargetSchools} busy={busy} />
            )}

            {showNarrativeCTA && (
              <div style={{ marginLeft: 42, maxWidth: 640, background: '#141b34', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, animation: 'pwFade .3s ease' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#f5c94c', marginBottom: 3 }}>NEXT STEP</div>
                  <span style={{ fontSize: 13.5, color: '#c6d2ea', fontWeight: 600 }}>Choose your narrative strategy</span>
                </div>
                <button onClick={() => setShowNarrativeModal(true)} style={{ background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Choose →</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
        {showScrollTop && (
          <button
            onClick={scrollChatToTop}
            className="pw-scroll-btn"
            aria-label="Scroll to top of conversation"
            title="Scroll to top of conversation"
            style={{ top: 14, left: '50%', marginLeft: -18 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
        {showScrollBottom && (
          <button
            onClick={scrollChatToBottom}
            className="pw-scroll-btn"
            aria-label="Scroll to latest message"
            title="Scroll to latest message"
            style={{ bottom: 14, left: '50%', marginLeft: -18 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        )}
        </div>

        {/* quick replies required by the current question */}
        {lastParsed && !busy && (
          <div style={{ padding: '10px 24px 0', borderTop: '1px solid #eef1f6', background: '#fff', flexShrink: 0 }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', marginBottom: 8 }}>QUICK REPLY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {lastParsed.options.map(opt => (
                  <button key={opt} className="pw-chip" onClick={() => handleChip(opt)} disabled={busy}
                    style={{ background: '#f4f6fb', border: '1px solid #e7dcc7', borderRadius: 9, padding: '9px 17px', fontSize: 13.5, fontWeight: 600, color: '#141b34', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#141b34'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#141b34'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f4f6fb'; e.currentTarget.style.color = '#141b34'; e.currentTarget.style.borderColor = '#e7dcc7'; }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* input */}
        <div style={{ padding: lastParsed && !busy ? '10px 20px 8px' : '14px 20px 8px', flexShrink: 0, background: '#fff', borderTop: '1px solid #eef1f6' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="pw-composer-shell" style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#f4f6fb', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 18px', boxShadow: '0 2px 12px rgba(22,35,63,.04)' }}>
              <textarea
                ref={inputRef}
                className="pw-composer-textarea"
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={busy}
                placeholder={busy ? 'Advisor is analyzing…' : lastParsed ? 'Or type your own answer…' : 'Inquire about your strategy…'}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 15, padding: '10px 0', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500, maxHeight: 120 }}
              />
              <button onClick={() => setShowCvModal(true)} title="Upload CV / attach background"
                style={{ background: '#eef1f7', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49" />
                </svg>
              </button>
              <button onClick={() => send()} disabled={busy || !input.trim()}
                style={{ background: input.trim() ? '#141b34' : '#e2e7f2', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: input.trim() ? '#fff' : '#9aa3b5', flexShrink: 0, transition: 'all .2s', boxShadow: input.trim() ? '0 6px 16px rgba(22,35,63,.26)' : 'none' }}>
                {busy ? (
                  <svg className="pw-send-spinner" viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }}>
                    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.85" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                )}
              </button>
            </div>

            {/* contextual suggestions under the input */}
            {chips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
                {chosenSchools?.length > 0 && !narrative && (
                  <button className="pw-chip" onClick={reopenProgramSelection} disabled={busy}
                    style={{ background: '#fffaf0', border: '1px solid #d3c9a8', borderRadius: 9, padding: '8px 15px', fontSize: 12, fontWeight: 700, color: '#8a6717', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Change school selection
                  </button>
                )}
                {chips.map(({ label, msg }) => (
                  <button key={msg} className="pw-chip" onClick={() => handleChip(msg)} disabled={busy}
                    style={{ background: '#fff', border: '1px solid #e7dcc7', borderRadius: 9, padding: '8px 15px', fontSize: 12, fontWeight: 600, color: '#3a425a', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                    onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = '#141b34'; e.currentTarget.style.color = '#141b34'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7dcc7'; e.currentTarget.style.color = '#3a425a'; }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ margin: '8px 0 10px', textAlign: 'center', fontSize: 12, color: '#9aa3b5', fontWeight: 500 }}>
              Confidential consultation active. End-to-end encrypted.
            </div>
          </div>
        </div>

        </div>

        {/* right-side Real-time Analysis panel (design) */}
        <RealtimeAnalysisPanel
          scores={scores}
          profile={profile}
          programs={programs}
          isUndergrad={isUndergrad}
          setCandTab={setCandTab}
          tasks={tasks}
          completedTasks={completedTasks}
          toggleTask={toggleTask}
        />

        </div>

        {showNarrativeModal && (
          <NarrativeModal onClose={() => setShowNarrativeModal(false)} onChoose={handleNarrativeChoose} />
        )}
      </div>
    </div>
  );
}
