/*
 * Conversation-first AI Advisor — design-to-code implementation of the
 * "Pathway AI Advisor" mockup. Numbered stage stepper across the top, a
 * conversation column with the "Strategic Profile Initiation" header, and a
 * right-hand "Real-time Analysis" rail whose circular gauges + Fit Index are
 * driven entirely by real scores/programs state (nothing mocked). Program tier
 * colors/labels and admit-rate provenance come from lib/program-normalizer.js.
 * Marking/choosing a school writes through setChosenSchools / confirmTargetSchools,
 * the exact state Analysis and the Universities tab read.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';

const OPTIONS_PATTERN = /→\s*(.+)$/;

function parseOptions(text) {
  const match = OPTIONS_PATTERN.exec(text || '');
  if (!match) return null;
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return null;
  return { mainText: text.slice(0, match.index).trim(), options };
}

const CREAM = '#faf7f2';
const CREAM_2 = '#f6f1e8';
const BORDER = '#f1eadd';
const BORDER_2 = '#e7dcc7';
const INK = '#141b34';
const BODY = '#33405e';
const MUTED = '#6b7392';
const MUTED_2 = '#9098b5';
const VIOLET = '#5b46e0';
const GOLD = '#b8902f';
const PERI = 'linear-gradient(135deg,#94b3fb,#b899fb)';
const HAIRLINE = 'linear-gradient(180deg,#94b3fb,#b899fb)';

const TIER_COLORS = {
  red: { fg: '#e0556b', bg: '#fdeaf0', bar: '#e0556b' },
  yellow: { fg: '#c08a1a', bg: '#fff8ea', bar: '#e0a72a' },
  green: { fg: '#19c08a', bg: '#e9f9f1', bar: '#19c08a' },
  grey: { fg: MUTED_2, bg: BORDER, bar: '#c9c0ae' },
};

function undergradGradeNumber(profile) {
  const grade = String(profile?.grade || profile?.currentGrade || '').match(/\d{1,2}/)?.[0];
  return grade ? Number(grade) : null;
}

// Same state-driven suggestion logic already used by AdvisorChatFirst — keyed
// off structured stage state (scores/programs/chosenSchools/narrative), never
// off substring matching of the last AI message.
function contextualChips({ scores, programs, chosenSchools, narrative }) {
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

// Numbered stage stepper — mirrors the mockup's "1 Profile · 2 Recommender · …"
// header. Purely reflects real stepIdx/STEPS state; nothing here drives it.
function Stepper({ STEPS, stepIdx, futureStages }) {
  return (
    <div className="pw-adv2-stepper" style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '2px 2px 4px' }}>
      {STEPS.map((label, i) => {
        const active = i === stepIdx;
        const done = i < stepIdx;
        const future = futureStages.has(label);
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flexShrink: 0,
                ...(active
                  ? { background: INK, color: '#fff', boxShadow: '0 4px 10px rgba(20,27,52,.28)' }
                  : done
                  ? { background: INK, color: '#fff' }
                  : future
                  ? { background: '#fff8ea', color: GOLD, border: '1px dashed #e2cf9a' }
                  : { background: '#fff', color: MUTED_2, border: `1px solid ${BORDER_2}` }),
              }}>
                {done ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap', color: active ? INK : done ? BODY : future ? GOLD : MUTED_2 }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span style={{ width: 30, height: 1, background: done ? '#d8c9a0' : BORDER_2, flexShrink: 0, margin: '0 10px' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Circular score gauge for the Real-time Analysis rail. Shows the real score
// when it exists; before the profile is scored it renders a calm calibrating
// ring with a dash instead of a fabricated number.
function ScoreRing({ value, label, sublabel, color, size = 116 }) {
  const has = Number.isFinite(value);
  const pct = has ? Math.max(0, Math.min(100, value)) : 0;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const center = size / 2;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={r} stroke="#ece5d8" strokeWidth={stroke} fill="none" />
          {has && (
            <circle
              cx={center} cy={center} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }}
            />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Newsreader',serif", fontSize: 36, fontWeight: 600, color: has ? INK : MUTED_2 }}>
          {has ? Math.round(pct) : '—'}
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.09em', color: INK, marginTop: 11, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{sublabel}</div>
    </div>
  );
}

// Live tool-status line — animated dots and a short status on one row.
function shortStatusLabel(message, elapsed) {
  if (elapsed >= 60) return 'Almost done';
  const text = String(message || '');
  if (/\b(cv|resume|résumé|file|document|transcript|upload)\b/i.test(text)) return 'Reading CV';
  if (/\b(school|schools|program|programs|university|universities|portfolio|match)\b/i.test(text)) return 'Checking schools';
  if (/\b(score|scores|fit|profile|readiness|competitive)\b/i.test(text)) return 'Scoring profile';
  if (elapsed >= 30) return 'Reviewing fit';
  return 'Still working';
}

function ToolStatusLine({ busy, message }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) { setElapsed(0); return undefined; }
    const startedAt = Date.now();
    setElapsed(0);
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [busy]);
  if (!busy) return null;
  const label = shortStatusLabel(message, elapsed);
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 18, whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ display: 'inline-flex', gap: 3, flexShrink: 0 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: PERI, animation: 'adv2Pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      <span style={{ fontSize: 13, background: `linear-gradient(90deg,${MUTED} 35%,#b899fb 50%,${MUTED} 65%)`, backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'adv2Shimmer 1.8s linear infinite' }}>{label}</span>
    </div>
  );
}

function ProvenanceChip({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: MUTED, background: 'rgba(255,255,255,.9)', border: `1px solid ${BORDER_2}`, borderRadius: 999, padding: '4px 10px' }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.2 10 2.8v3c0 2.6-1.7 4.3-4 5-2.3-.7-4-2.4-4-5v-3L6 1.2Z" stroke="#19c08a" strokeWidth="1.2" strokeLinejoin="round" /><path d="M4.2 6.1 5.5 7.4l2.3-2.8" stroke="#19c08a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {children}
    </span>
  );
}

// Lead Admissions Strategist avatar — echoes the mockup's advisor portrait with
// a periwinkle ring around a navy monogram badge.
function AdvisorAvatar({ size = 46 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: PERI, padding: 2, flexShrink: 0, boxShadow: '0 6px 16px rgba(91,70,224,.24)' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width={size * 0.42} height={size * 0.42} style={{ fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </div>
    </div>
  );
}

// School card — collapsed row shows the headline conclusion; expanded reveals
// fit index, provenance, and risk drivers. Same write-through choose action.
function ProgramCard({ program, pickIndex, showRank, pending, onChoose, chosen }) {
  const [open, setOpen] = useState(false);
  const c = TIER_COLORS[program.tierColor] || TIER_COLORS.red;
  const locked = program.tier === 'locked';
  const isChosen = chosen;
  const fit = Number.isFinite(Number(program.fitIndex ?? program.fit)) ? Math.round(Number(program.fitIndex ?? program.fit)) : null;
  const hasAdmitRate = Number.isFinite(Number(program.admitRate));
  const drivers = Array.isArray(program.fitDrivers) ? program.fitDrivers : [];
  const risks = Array.isArray(program.riskFlags) ? program.riskFlags : [];
  const gaps = Array.isArray(program.evidenceGaps) ? program.evidenceGaps : [];

  const chooseLabel = locked ? `${program.name} is locked` : isChosen ? `Remove ${program.name} from your targets` : `Choose ${program.name}`;

  return (
    <div style={{ display: 'flex', background: '#fff', border: `1px solid ${isChosen ? '#b899fb' : BORDER}`, borderLeft: `4px solid ${c.bar}`, borderRadius: 18, boxShadow: '0 1px 2px rgba(20,27,52,.04),0 8px 24px rgba(20,27,52,.05)', overflow: 'hidden', opacity: locked ? 0.72 : 1 }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-start', padding: '15px 0 15px 14px' }}>
        <button
          className="pw-adv2-btn"
          onClick={() => !locked && onChoose(program.name)}
          aria-pressed={isChosen}
          aria-label={chooseLabel}
          title={chooseLabel}
          disabled={locked}
          style={{
            flex: 'none', width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: 'inherit', fontSize: 12, fontWeight: 800, padding: 0,
            cursor: locked ? 'not-allowed' : 'pointer',
            ...(locked
              ? { border: '1.5px solid #d8cfbe', background: BORDER, color: '#b3aa96' }
              : isChosen
              ? { border: 'none', background: PERI, color: '#fff', boxShadow: '0 2px 7px rgba(148,153,251,.45)', animation: 'adv2Pop .4s ease' }
              : { border: '1.5px solid #cbbfea', background: '#fff', color: '#b899fb' }),
          }}
        >
          {isChosen
            ? (showRank ? pickIndex + 1 : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>)
            : locked
            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" /><path d="M4.2 5V3.8a1.8 1.8 0 0 1 3.6 0V5" stroke="currentColor" strokeWidth="1.4" /></svg>
            : <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>}
        </button>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          className="pw-adv2-btn"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: '14px 16px 14px 12px', cursor: 'pointer', font: 'inherit', textAlign: 'left', minHeight: 44 }}
        >
          <span style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{program.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', borderRadius: 999, padding: '3px 9px', color: c.fg, background: c.bg }}>{program.tierLabel}</span>
          {fit != null && <span style={{ fontSize: 13, color: MUTED }}>Fit index {fit}%</span>}
          <span style={{ flex: 1 }} />
          {chosen && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: VIOLET, animation: pending ? 'adv2Pop .45s ease' : 'none' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill={VIOLET} /><path d="M4.4 7.2 6.2 9l3.2-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              In portfolio
            </span>
          )}
          <span style={{ display: 'inline-flex', transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .25s ease' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke={MUTED_2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>
        {open && (
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: 16, animation: 'adv2In .25s ease both' }}>
            {(fit != null || hasAdmitRate || program.selectivityLabel) && (
              <div className="pw-adv2-stats-grid" style={{ marginBottom: 12 }}>
                {fit != null && (
                  <div style={{ background: CREAM, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', color: MUTED_2, textTransform: 'uppercase' }}>Fit score</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 3 }}>{fit}%</div>
                  </div>
                )}
                {hasAdmitRate && (
                  <div style={{ background: CREAM, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', color: MUTED_2, textTransform: 'uppercase' }}>Admit rate</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 3 }}>~{Math.round(program.admitRate)}%</div>
                  </div>
                )}
                {program.selectivityLabel && (
                  <div style={{ background: CREAM, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', color: MUTED_2, textTransform: 'uppercase' }}>Selectivity</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 3 }}>{program.selectivityLabel}</div>
                  </div>
                )}
              </div>
            )}
            {(program.fitExplanation || program.notes) && (
              <div style={{ fontSize: 13, lineHeight: 1.55, color: BODY, marginBottom: 12 }}>{program.fitExplanation || program.notes}</div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {program.selectivityLabel && <ProvenanceChip>{program.selectivityLabel} selectivity</ProvenanceChip>}
              {hasAdmitRate && <ProvenanceChip>Admit rate ~{Math.round(program.admitRate)}% · {program.admitRateSource}</ProvenanceChip>}
            </div>
            {(drivers.length > 0 || risks.length > 0 || gaps.length > 0) && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', color: MUTED_2, textTransform: 'uppercase', marginBottom: 7 }}>
                  {risks.length > 0 ? 'Risk drivers' : 'Fit drivers'}
                </div>
                {[...risks, ...(risks.length ? [] : drivers), ...gaps].map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.55, marginBottom: 5 }}>
                    <span style={{ flex: 'none', width: 5, height: 5, borderRadius: '50%', background: risks.length ? '#e0556b' : '#19c08a', marginTop: 7 }} />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
            {locked && (
              <div style={{ marginTop: 14, fontSize: 13, color: MUTED, lineHeight: 1.55 }}>Upload your CV to unlock a verified estimate for this school.</div>
            )}
            {!locked && (
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button
                  className="pw-adv2-btn"
                  onClick={() => onChoose(program.name, { note: true })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '9px 16px', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 38,
                    ...(isChosen
                      ? { border: 'none', background: PERI, color: '#fff', boxShadow: '0 3px 10px rgba(148,153,251,.4)', animation: 'adv2Pop .45s ease' }
                      : { border: '1px solid #b899fb', background: '#fff', color: VIOLET }),
                  }}
                >
                  {isChosen && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 5 9l4.5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  {isChosen ? 'Marked as target' : 'Mark as target'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function pickScore(scores, keys) {
  for (const k of keys) {
    const v = Number(scores?.[k]);
    if (Number.isFinite(v)) return Math.round(v);
  }
  return null;
}

// Right-hand Real-time Analysis rail — circular gauges + Fit Index, all wired
// to real scores/programs state.
function AnalysisRail({ scores, gauges, fitIndex, hasScores }) {
  return (
    <aside className="pw-advisor-rail" style={{ background: 'rgba(255,255,255,.55)', borderLeft: `1px solid ${BORDER}`, padding: '26px 24px', overflowY: 'auto', minHeight: 0 }}>
      <div style={{ fontFamily: "'Newsreader',serif", fontSize: 25, fontWeight: 600, color: INK, letterSpacing: '-.01em', lineHeight: 1.15 }}>Real-time<br />Analysis</div>
      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>Live profile calibration based on dialogue.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 26 }}>
        {gauges.map(g => (
          <ScoreRing key={g.label} value={g.value} label={g.label} sublabel={g.sublabel} color={g.color} />
        ))}
      </div>

      <div style={{ marginTop: 26, borderTop: `1px solid ${BORDER}`, paddingTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, letterSpacing: '.06em', color: GOLD, textTransform: 'uppercase' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1 8.8 4.7 13 5.3 10 8.2 10.7 12.3 7 10.4 3.3 12.3 4 8.2 1 5.3 5.2 4.7 7 1Z" fill={GOLD} /></svg>
          Fit Index
        </span>
        <span style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 600, color: fitIndex != null ? INK : MUTED_2 }}>{fitIndex != null ? `${fitIndex}%` : '—'}</span>
      </div>
      {!hasScores && (
        <div style={{ fontSize: 12, color: MUTED_2, marginTop: 10, lineHeight: 1.5 }}>
          Scores calibrate as you share your background. Upload your CV to sharpen every estimate.
        </div>
      )}
    </aside>
  );
}

const STAGE_TITLES = {
  Profile: 'Strategic Profile Initiation',
  Recommender: 'Recommender Strategy',
  Analysis: 'Profile Analysis',
  Programs: 'Program Portfolio',
  Fit: 'Fit Calibration',
  CV: 'CV Optimization',
  Narrative: 'Narrative Strategy',
  Essays: 'Essay Studio',
  Applications: 'Application Room',
  Testing: 'Testing Strategy',
  Activities: 'Activities Strategy',
};

export default function AdvisorConversational({
  STEPS, stepIdx, chat, input, setInput, send, busy, scores, profile, programs,
  setShowCvModal, cvText, narrative, chosenSchools, setChosenSchools, confirmTargetSchools, authUser,
}) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const visibleChat = visibleCandidateChat(chat, {
    whatsapp: authUser?.whatsappOptIn === true,
    telegram: authUser?.telegramOptIn === true,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' }), 80);
    return () => clearTimeout(t);
  }, [chat, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const isUndergrad = profile?.category === 'Undergraduate';
  const gradeNumber = undergradGradeNumber(profile);
  const futureStages = isUndergrad && gradeNumber && gradeNumber <= 10 ? new Set(['Essays', 'Applications']) : new Set();
  const stageLabel = STEPS[Math.min(stepIdx, STEPS.length - 1)] || 'Profile';
  const headerTitle = STAGE_TITLES[stageLabel] || `${stageLabel} Strategy`;

  const normalizedPrograms = useMemo(() => normalizeProgramList(programs) || [], [programs]);
  const hasPrograms = normalizedPrograms.length > 0;

  // Real-time gauges — mapped from the live scores object across every track.
  const hasScores = !!scores && Object.keys(scores).some(k => Number.isFinite(Number(scores[k])));
  const gauges = [
    { label: 'Academic', sublabel: 'Academic strength', color: INK, value: pickScore(scores, ['academic']) },
    {
      label: isUndergrad ? 'Activities' : 'Professional',
      sublabel: isUndergrad ? 'Activities & impact' : 'Experience & impact',
      color: GOLD,
      value: pickScore(scores, isUndergrad ? ['activities', 'leadership', 'awards'] : ['professional', 'research', 'achievementsImpact', 'careerProgression']),
    },
    { label: 'Strategy', sublabel: 'Narrative & goals', color: '#94b3fb', value: pickScore(scores, ['narrative', 'goalClarity', 'potential']) },
  ];

  const fitValues = normalizedPrograms.map(p => Number(p.fitIndex ?? p.fit)).filter(Number.isFinite);
  const fitIndex = chosenSchools?.length && fitValues.length
    ? Math.round(fitValues.reduce((a, b) => a + b, 0) / fitValues.length)
    : Number.isFinite(Number(scores?.overall)) ? Math.round(Number(scores.overall)) : null;

  // Pre-confirmation: local numbered pick order, batch-confirmed via the
  // existing confirmTargetSchools flow. Post-confirmation: choosing directly
  // toggles the real chosenSchools array — same write-through, no new state.
  const [picks, setPicks] = useState([]);
  const [justMarked, setJustMarked] = useState(null);
  const [markNotes, setMarkNotes] = useState([]);
  const isConfirmed = !!chosenSchools?.length;

  const pushMarkNote = (name, markedNames) => {
    const byName = new Map(normalizedPrograms.map(p => [p.name, p]));
    const counts = { target: 0, safe: 0, reach: 0 };
    markedNames.forEach(n => {
      const color = byName.get(n)?.tierColor;
      if (color === 'yellow') counts.target += 1;
      else if (color === 'green') counts.safe += 1;
      else counts.reach += 1;
    });
    const label = (n, singular, plural) => (n === 1 ? `one ${singular}` : n === 2 ? `two ${plural}` : `${n} ${plural}`);
    const parts = [];
    if (counts.target) parts.push(label(counts.target, 'target', 'targets'));
    if (counts.safe) parts.push(label(counts.safe, 'safe', 'safes'));
    if (counts.reach) parts.push(label(counts.reach, 'reach', 'reaches'));
    const shape = parts.join(', ').replace(/, ([^,]*)$/, ' and $1');
    const coda = counts.target >= 1 && counts.reach >= 1 && counts.safe >= 1
      ? ' That’s the balanced shape we were aiming for.'
      : counts.target === 0
        ? ' Balance it with a target next.'
        : counts.reach === 0
          ? ' A reach alongside would round it out.'
          : '';
    setMarkNotes(notes => [...notes, { id: `mark-${Date.now()}`, text: `${name} marked as a target — that gives you ${shape} in your portfolio.${coda}` }]);
  };

  const handleChoose = (name, { note = false } = {}) => {
    if (isConfirmed) {
      const adding = !chosenSchools.includes(name);
      const next = adding ? [...chosenSchools, name] : chosenSchools.filter(n => n !== name);
      setChosenSchools(next);
      setJustMarked(name);
      if (note && adding) pushMarkNote(name, next);
      return;
    }
    const adding = !picks.includes(name);
    const next = adding ? [...picks, name] : picks.filter(n => n !== name);
    setPicks(next);
    if (note && adding) pushMarkNote(name, next);
  };

  const confirmPicks = () => {
    if (!picks.length || busy) return;
    confirmTargetSchools(picks);
    setPicks([]);
  };

  // Milestone lines — one quiet centered moment per real state transition.
  const [milestones, setMilestones] = useState([]);
  const prevCv = useRef(!!cvText);
  const prevChosen = useRef(chosenSchools?.length || 0);
  useEffect(() => {
    if (!!cvText && !prevCv.current) {
      setMilestones(m => [...m, { id: `cv-${Date.now()}`, anchor: visibleChat.length, text: 'CV received — estimates are sharper' }]);
    }
    prevCv.current = !!cvText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvText]);
  useEffect(() => {
    const count = chosenSchools?.length || 0;
    if (count > 0 && prevChosen.current === 0) {
      setMilestones(m => [...m, { id: `targets-${Date.now()}`, anchor: visibleChat.length, text: `Targets confirmed — ${count} school${count === 1 ? '' : 's'} in your portfolio` }]);
    }
    prevChosen.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenSchools]);

  const chips = !busy ? contextualChips({ scores, programs: normalizedPrograms, chosenSchools, narrative: narrative ?? profile?.narrative }) : [];
  const [chipLog, setChipLog] = useState([]);
  const handleChip = (label, msg) => {
    setChipLog(log => [...log, { id: `chip-${Date.now()}`, anchor: visibleChat.length, options: chips.map(c => c.label), picked: label }]);
    send(msg);
    inputRef.current?.focus();
  };

  const handleKey = (e) => { if (e.key === 'Enter' && input.trim()) send(); };

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg,${CREAM} 0%,${CREAM_2} 100%)`, fontFamily: "'Albert Sans','Public Sans',system-ui,sans-serif", color: BODY }}>

      {/* Numbered stage stepper */}
      <div style={{ flex: 'none', padding: '16px 28px 12px', borderBottom: `1px solid ${BORDER}`, background: 'rgba(255,255,255,.5)' }}>
        <Stepper STEPS={STEPS} stepIdx={stepIdx} futureStages={futureStages} />
      </div>

      {/* Two-column: conversation + Real-time Analysis rail */}
      <div className="pw-advisor-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', overflow: 'hidden' }}>

        {/* Conversation column */}
        <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Header — advisor avatar + stage title */}
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px 6px' }}>
            <AdvisorAvatar />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 600, color: INK, letterSpacing: '-.01em', lineHeight: 1.15 }}>{headerTitle}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#19c08a', boxShadow: '0 0 8px rgba(25,192,138,.6)' }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#19c08a' }}>Lead Admissions Strategist · Online</span>
              </div>
            </div>
          </div>

          {/* Message stream */}
          <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 28px 12px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {visibleChat.map((m, i) => {
              const isAi = m.role === 'ai';
              const ghost = chipLog.find(g => g.anchor === i + 1);
              const milestone = milestones.find(ms => ms.anchor === i + 1);
              const parsed = isAi ? parseOptions(m.text) : null;
              return (
                <React.Fragment key={i}>
                  <div style={{ animation: reduceMotion ? 'none' : 'adv2In .3s ease both' }}>
                    {isAi ? (
                      <div style={{ position: 'relative', maxWidth: 640, padding: '2px 0 2px 18px' }}>
                        <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, borderRadius: 2, background: HAIRLINE }} />
                        <div style={{ fontSize: 15, lineHeight: 1.65, color: BODY }}>{renderFormattedText(parsed ? parsed.mainText : m.text)}</div>
                        {parsed && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                            {parsed.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => send(opt)}
                                disabled={busy}
                                className="pw-adv2-btn"
                                style={{ background: '#fff', border: '1.5px solid #d8cdb4', borderRadius: 12, padding: '9px 18px', fontSize: 14, fontWeight: 700, color: INK, cursor: busy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ maxWidth: '78%', background: PERI, color: '#fff', fontSize: 14.5, lineHeight: 1.55, padding: '11px 16px', borderRadius: '18px 18px 5px 18px', boxShadow: '0 4px 14px rgba(148,153,251,.3)', whiteSpace: 'pre-wrap' }}>
                          {m.text.startsWith('Here is my CV') ? '📄 CV submitted for analysis' : m.text}
                        </div>
                      </div>
                    )}
                  </div>
                  {milestone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,#d9cfff)' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: VIOLET, whiteSpace: 'nowrap' }}>{milestone.text}</span>
                      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,#d9cfff,transparent)' }} />
                    </div>
                  )}
                  {ghost && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-end', opacity: .55, pointerEvents: 'none' }} aria-hidden="true">
                      {ghost.options.map(label => (
                        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, border: `1px solid ${label === ghost.picked ? '#b899fb' : BORDER_2}`, background: label === ghost.picked ? 'rgba(148,179,251,.14)' : 'none', color: label === ghost.picked ? VIOLET : MUTED_2 }}>
                          {label === ghost.picked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 5 9l4.5-6" stroke={VIOLET} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {hasPrograms && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {normalizedPrograms.map(program => {
                  const pickIndex = isConfirmed ? -1 : picks.indexOf(program.name);
                  const chosen = isConfirmed ? chosenSchools.includes(program.name) : pickIndex >= 0;
                  return (
                    <ProgramCard
                      key={program.name}
                      program={program}
                      pickIndex={pickIndex}
                      showRank={!isConfirmed}
                      chosen={chosen}
                      pending={justMarked === program.name}
                      onChoose={handleChoose}
                    />
                  );
                })}
                {!isConfirmed && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="pw-adv2-btn"
                      onClick={confirmPicks}
                      disabled={!picks.length || busy}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '9px 16px', font: 'inherit', fontSize: 13, fontWeight: 700, minHeight: 38,
                        border: 'none', cursor: picks.length && !busy ? 'pointer' : 'not-allowed',
                        background: picks.length && !busy ? PERI : BORDER, color: picks.length && !busy ? '#fff' : MUTED_2,
                        boxShadow: picks.length && !busy ? '0 3px 10px rgba(148,153,251,.4)' : 'none',
                      }}
                    >
                      {picks.length ? `Confirm ${picks.length} target${picks.length === 1 ? '' : 's'}` : 'Choose schools to confirm'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {markNotes.map(note => (
              <div key={note.id} style={{ position: 'relative', maxWidth: 640, padding: '2px 0 2px 18px', animation: reduceMotion ? 'none' : 'adv2In .3s ease both' }}>
                <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, borderRadius: 2, background: HAIRLINE }} />
                <div style={{ fontSize: 15, lineHeight: 1.65, color: BODY }}>{note.text}</div>
              </div>
            ))}

            <ToolStatusLine busy={busy} message={visibleChat.filter(m => m.role === 'user').slice(-1)[0]?.text} />
          </div>

          {/* Composer */}
          <div style={{ flex: 'none', padding: '6px 28px 18px' }}>
            <div className="pw-composer-shell" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${BORDER_2}`, borderRadius: 20, padding: '8px 8px 8px 18px', boxShadow: '0 2px 6px rgba(20,27,52,.05),0 12px 32px rgba(20,27,52,.06)' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={busy}
                placeholder="Inquire about your strategy…"
                aria-label="Message your advisor"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', font: 'inherit', fontSize: 14.5, color: INK, minWidth: 60 }}
              />
              {cvText ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#e9f9f1', borderRadius: 999, padding: '9px 15px', fontSize: 13, fontWeight: 600, color: '#19c08a', whiteSpace: 'nowrap' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 5 9l4.5-6" stroke="#19c08a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  CV received
                </span>
              ) : (
                <button
                  className="pw-adv2-btn"
                  onClick={() => setShowCvModal(true)}
                  title="Upload CV"
                  aria-label="Upload CV"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: CREAM, border: `1px solid ${BORDER_2}`, borderRadius: 999, width: 38, height: 38, cursor: 'pointer', flexShrink: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M9.5 4 5.2 8.3a1.5 1.5 0 0 0 2.1 2.1l4.6-4.6a2.8 2.8 0 1 0-4-4L3.4 6.4a4.1 4.1 0 0 0 5.8 5.8l3.3-3.3" stroke={VIOLET} strokeWidth="1.3" strokeLinecap="round" /></svg>
                </button>
              )}
              <button
                className="pw-adv2-btn"
                onClick={() => send()}
                disabled={busy || !input.trim()}
                aria-label="Send message"
                style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: INK, cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(20,27,52,.28)', opacity: busy || !input.trim() ? 0.55 : 1, flexShrink: 0 }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            {chips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10, animation: reduceMotion ? 'none' : 'adv2In .3s ease both' }}>
                {chips.map((c, i) => (
                  <button
                    key={c.msg}
                    className="pw-adv2-btn"
                    onClick={() => handleChip(c.label, c.msg)}
                    disabled={busy}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '9px 15px', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', minHeight: 38,
                      border: i === 0 ? '1px solid #b899fb' : `1px solid ${BORDER_2}`,
                      background: i === 0 ? '#fff' : 'rgba(255,255,255,.7)',
                      color: i === 0 ? VIOLET : BODY,
                      boxShadow: i === 0 ? '0 2px 8px rgba(148,153,251,.22)' : 'none',
                    }}
                  >
                    {i === 0 && <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke={VIOLET} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: 12, color: MUTED_2, marginTop: 10 }}>Confidential consultation active · End-to-end encrypted</div>
          </div>
        </section>

        {/* Real-time Analysis rail */}
        <AnalysisRail scores={scores} gauges={gauges} fitIndex={fitIndex} hasScores={hasScores} />
      </div>
    </div>
  );
}
