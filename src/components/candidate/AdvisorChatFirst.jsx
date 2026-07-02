import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';
import { getTrackConfig } from '../../trackConfig.js';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';
import NarrativeModal from './AdvisorNarrativeModal.jsx';

const OPTIONS_PATTERN = /→\s*(.+)$/;

function parseOptions(text) {
  const match = OPTIONS_PATTERN.exec(text || '');
  if (!match) return null;
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return null;
  return { mainText: text.slice(0, match.index).trim(), options };
}

const AiAvatar = () => (
  <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(140deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px rgba(105,91,255,.32)' }}>
    <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  </div>
);

const Chevron = ({ open }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: '#9098b5', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Ambient stage bar. Replaces the full stepper for grad tracks: one quiet line
// that expands into the full journey on click.
function StatusBar({ STEPS, stepIdx, programs }) {
  const [open, setOpen] = useState(false);
  const stage = STEPS[Math.min(stepIdx, STEPS.length - 1)] || STEPS[0];
  const matched = programs?.length || 0;
  return (
    <div onClick={() => setOpen(v => !v)} style={{ borderBottom: '1px solid #f1eadd', background: '#faf7f2', padding: '11px 24px', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 0 8px rgba(148,131,251,.65)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#33405e' }}>
          Stage {Math.min(stepIdx, STEPS.length - 1) + 1} of {STEPS.length} · {stage}
          {matched > 0 && <span style={{ color: '#16875c', fontWeight: 700 }}> · {matched} program{matched === 1 ? '' : 's'} matched</span>}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#c0c8e0' }}>{open ? 'Hide journey' : 'View journey'}</span>
        <Chevron open={open} />
      </div>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1eadd' }}>
          {STEPS.map((label, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <span key={label} style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: active ? 800 : 600, whiteSpace: 'nowrap',
                background: active ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : done ? '#eafff6' : '#f6f1e8',
                color: active ? '#faf7f2' : done ? '#16875c' : '#9098b5',
                border: active ? 'none' : done ? '1px solid #b7ecd4' : '1px solid #e7dcc7',
                boxShadow: active ? '0 4px 12px rgba(105,91,255,.30)' : 'none',
              }}>
                {done ? '✓ ' : ''}{label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Live "thinking" state shown while the agent works.
function ThinkingLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, animation: 'pwFade .3s ease' }}>
      <AiAvatar />
      <div style={{ background: '#f0ebff', border: '1px solid #e2d9f8', borderRadius: '4px 18px 18px 18px', padding: '12px 17px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#b899fb', display: 'inline-block', animation: `pwPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7392' }}>Advisor is analyzing…</span>
      </div>
    </div>
  );
}

function CardShell({ label, labelColor = '#5b46e0', children }) {
  return (
    <div style={{ marginLeft: 42, maxWidth: 640, background: '#fff', border: '1px solid #ece6f8', borderRadius: 18, padding: '16px 18px', boxShadow: '0 10px 26px rgba(60,72,130,.08)', animation: 'pwFade .3s ease' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: labelColor, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

// Readiness snapshot: overall score plus the per-dimension KPI bars, inline in
// the stream instead of hidden in a side rail.
function ReadinessCard({ scores, profile }) {
  const [open, setOpen] = useState(false);
  const trackConfig = getTrackConfig(profile || {});
  const dims = (trackConfig.kpis || [])
    .map(([key, title]) => ({ key, title, value: scores?.[key] }))
    .filter(d => typeof d.value === 'number');
  const shown = open ? dims : dims.slice(0, 3);
  return (
    <CardShell label="READINESS SNAPSHOT">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: dims.length ? 12 : 0 }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#5b46e0', lineHeight: 1 }}>
          {scores?.overall ?? 0}<span style={{ fontSize: 14, fontWeight: 600, color: '#9098b5' }}>/100</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#6b7392', fontWeight: 600, lineHeight: 1.45 }}>
          {trackConfig.scoreLabel || 'Competitiveness'} based on everything you have shared so far.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(d => (
          <div key={d.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#33405e' }}>{d.title}</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#5b46e0' }}>{d.value}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#f1eadd', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, d.value))}%`, borderRadius: 3, background: 'linear-gradient(90deg,#94b3fb,#b899fb)', transition: 'width .4s ease' }} />
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
  const fit = Number(program?.fit);
  if (tier === 'locked') return { label: 'Not Eligible', color: '#9098b5', bg: '#f6f1e8', border: '#e7dcc7' };
  if (tier === 'safe' || fit > 80) return { label: 'Strong Fit', color: '#16875c', bg: '#e9f9f1', border: '#b7ecd4' };
  if (tier === 'possible' || fit >= 50) return { label: 'Competitive', color: '#b58522', bg: '#fff8e8', border: '#f3e3b6' };
  return { label: 'Reach', color: '#c02d5e', bg: '#fdeaf0', border: '#f8c4d1' };
}

// University list as a first-class chat artifact. Selection writes through
// setChosenSchools, the exact state the Analysis tab reads, so both views stay
// in sync with no extra plumbing.
function ProgramsCard({ programs, chosenSchools, setChosenSchools, send, busy }) {
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
    setChosenSchools && setChosenSchools(selected);
    send(`I'd like to move forward with: ${selected.join(' | ')}. Take me to the next step of my journey.`);
  };

  return (
    <CardShell label={`RECOMMENDED PROGRAMS · ${list.length}`} labelColor="#16875c">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(program => {
          const meta = tierMeta(program);
          const isPicked = selected.includes(program.name);
          return (
            <div key={program.name} onClick={() => toggle(program.name)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 13, cursor: 'pointer', transition: 'all .15s', border: `1.5px solid ${isPicked ? '#b899fb' : '#f1eadd'}`, background: isPicked ? '#f7f3ff' : '#faf7f2' }}>
              <span style={{
                width: 20, height: 20, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                ...(isPicked ? { background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 3px 8px rgba(105,91,255,.3)' } : { background: '#fff', border: '1.5px solid #d8cdb4' }),
              }}>
                {isPicked && (
                  <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 13l4 4L19 7" /></svg>
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{program.name}</div>
                {program.selectivityLabel && (
                  <div style={{ fontSize: 11, color: '#9098b5', fontWeight: 600, marginTop: 1 }}>{program.selectivityLabel}</div>
                )}
              </div>
              {Number.isFinite(Number(program.fit)) && (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#5b46e0', flexShrink: 0 }}>{Math.round(Number(program.fit))}%</span>
              )}
              <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 7, flexShrink: 0, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                {meta.label}
              </span>
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
            background: selected.length && !busy ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : '#e7dcc7',
            color: selected.length && !busy ? '#faf7f2' : '#9098b5',
            border: 'none', borderRadius: 11, padding: '9px 16px', fontSize: 12.5, fontWeight: 800,
            cursor: selected.length && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            boxShadow: selected.length && !busy ? '0 6px 16px rgba(105,91,255,.3)' : 'none', transition: 'all .2s',
          }}>
          {selected.length ? `Confirm ${selected.length} target${selected.length === 1 ? '' : 's'}` : 'Select targets'}
        </button>
      </div>
    </CardShell>
  );
}

// Stage-aware suggestions under the input. Chips only inject a user message;
// they never navigate or mutate state directly.
function contextualChips({ scores, programs, chosenSchools, narrative }) {
  if (!scores) {
    return [
      { label: 'Continue analysis', msg: 'Continue my analysis.' },
      { label: 'What is missing from my profile?', msg: 'What is missing from my profile?' },
    ];
  }
  if (!programs?.length) {
    return [
      { label: 'Recommend programs for me', msg: 'Recommend a tailored portfolio of programs for me.' },
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
      { label: 'Choose my narrative', msg: 'Help me choose my narrative strategy.' },
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
  setShowCvModal, narrative, setNarrative, chosenSchools, setChosenSchools, authUser,
}) {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [showNarrativeModal, setShowNarrativeModal] = useState(false);

  const visibleChat = visibleCandidateChat(chat, {
    whatsapp: authUser?.whatsappOptIn === true,
    telegram: authUser?.telegramOptIn === true,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, busy]);

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
  const showNarrativeCTA = !busy && !narrative && lastAiText.includes('Narrative Strategy tab');
  const lastParsed = !busy ? parseOptions(lastAiText) : null;
  const chips = !busy && !lastParsed ? contextualChips({ scores, programs, chosenSchools, narrative }) : [];

  const showReadiness = !!scores && stepIdx >= 2;
  const hasPrograms = Array.isArray(programs) && programs.length > 0;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px' }}>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 24, border: '1px solid #ece6f8', boxShadow: '0 20px 50px rgba(60,72,130,.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf7f2', position: 'relative' }}>

        {/* ambient status bar (replaces the full stepper) */}
        <StatusBar STEPS={STEPS} stepIdx={stepIdx} programs={programs} />

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 24px', borderBottom: '1px solid #f1eadd', background: '#faf7f2', flexShrink: 0 }}>
          <AiAvatar />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#141b34' }}>
              {profile?.name ? `${profile.name}'s Advisor` : 'AI Advisor'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3fdca9', boxShadow: '0 0 8px rgba(63,220,169,.7)', display: 'inline-block' }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3fdca9' }}>Online · Smart AI</span>
            </div>
          </div>
        </div>

        {/* single-column conversation */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px 8px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleChat.map((m, i) => {
              if (m.role === 'ai') {
                const isLast = i === visibleChat.length - 1;
                const parsed = parseOptions(m.text);
                const showChipsHere = parsed && (!isLast || busy);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', animation: 'pwFade .3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <AiAvatar />
                      <div style={{ background: '#f0ebff', border: '1px solid #e2d9f8', borderRadius: '4px 18px 18px 18px', padding: '13px 17px', fontSize: 14, lineHeight: 1.65, color: '#33405e', maxWidth: 640, boxShadow: '0 4px 14px rgba(105,91,255,.07)' }}>
                        {renderFormattedText(parsed ? parsed.mainText : m.text)}
                      </div>
                    </div>
                    {showChipsHere && (
                      <div style={{ marginLeft: 42, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {parsed.options.map(opt => (
                          <button key={opt} onClick={() => handleChip(opt)} disabled={busy}
                            style={{ background: '#fff', border: '1.5px solid #d8cdb4', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#5b46e0', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                            onMouseEnter={e => { if (!busy) { e.target.style.background = '#f0ebff'; e.target.style.borderColor = '#b899fb'; } }}
                            onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#d8cdb4'; }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div key={i} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#7c6ef5,#b899fb)', color: '#faf7f2', borderRadius: '18px 18px 4px 18px', padding: '12px 17px', fontSize: 14, lineHeight: 1.55, maxWidth: '76%', whiteSpace: 'pre-wrap', boxShadow: '0 8px 20px rgba(105,91,255,.26)', animation: 'pwFade .3s ease' }}>
                  {m.text.startsWith('Here is my CV') ? '📄 CV submitted for analysis' : m.text}
                </div>
              );
            })}

            {busy && <ThinkingLine />}

            {/* inline artifacts: readiness and program list */}
            {showReadiness && <ReadinessCard scores={scores} profile={profile} />}
            {hasPrograms && (
              <ProgramsCard programs={programs} chosenSchools={chosenSchools} setChosenSchools={setChosenSchools} send={send} busy={busy} />
            )}

            {showNarrativeCTA && (
              <div style={{ marginLeft: 42, maxWidth: 640, background: 'linear-gradient(135deg,#474d80,#6d5cc2)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, animation: 'pwFade .3s ease' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: '#ffd76a', marginBottom: 3 }}>NEXT STEP</div>
                  <span style={{ fontSize: 13.5, color: '#e7dcc7', fontWeight: 600 }}>Choose your narrative strategy</span>
                </div>
                <button onClick={() => setShowNarrativeModal(true)} style={{ background: '#faf7f2', color: '#5b46e0', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Choose →</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* quick replies required by the current question */}
        {lastParsed && !busy && (
          <div style={{ padding: '10px 24px 0', borderTop: '1px solid #f1eadd', background: '#faf7f2', flexShrink: 0 }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', marginBottom: 8 }}>QUICK REPLY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {lastParsed.options.map(opt => (
                  <button key={opt} onClick={() => handleChip(opt)} disabled={busy}
                    style={{ background: 'linear-gradient(135deg,#f0ebff,#ece6f8)', border: '1.5px solid #d4c4f8', borderRadius: 999, padding: '7px 15px', fontSize: 13, fontWeight: 700, color: '#5b46e0', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#94b3fb,#b899fb)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#b899fb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#f0ebff,#ece6f8)'; e.currentTarget.style.color = '#5b46e0'; e.currentTarget.style.borderColor = '#d4c4f8'; }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* input */}
        <div style={{ padding: lastParsed && !busy ? '10px 20px 8px' : '14px 20px 8px', flexShrink: 0, background: '#faf7f2' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f6f1e8', border: '1.5px solid #e2d9f8', borderRadius: 18, padding: '6px 6px 6px 10px', boxShadow: '0 2px 12px rgba(105,91,255,.06)' }}>
              <button onClick={() => setShowCvModal(true)} title="Upload CV"
                style={{ background: '#faf7f2', border: 'none', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b46e0', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                </svg>
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={busy}
                placeholder={busy ? 'Advisor is analyzing…' : lastParsed ? 'Or type your own answer…' : 'Ask anything or type your answer…'}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, padding: '10px 4px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500 }}
              />
              <button onClick={() => send()} disabled={busy || !input.trim()}
                style={{ background: input.trim() ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : '#e7dcc7', border: 'none', borderRadius: 13, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: input.trim() ? '#faf7f2' : '#9098b5', flexShrink: 0, transition: 'all .2s', boxShadow: input.trim() ? '0 6px 16px rgba(105,91,255,.32)' : 'none' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                </svg>
              </button>
            </div>

            {/* contextual suggestions under the input */}
            {chips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
                {chips.map(({ label, msg }) => (
                  <button key={msg} onClick={() => handleChip(msg)} disabled={busy}
                    style={{ background: '#faf7f2', border: '1.5px solid #e7dcc7', borderRadius: 999, padding: '6px 13px', fontSize: 12, fontWeight: 700, color: '#6b7392', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                    onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = '#b899fb'; e.currentTarget.style.color = '#5b46e0'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7dcc7'; e.currentTarget.style.color = '#6b7392'; }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ margin: '7px 0 10px', paddingLeft: 4, fontSize: 11, color: '#c0c8e0', fontWeight: 500 }}>
              Confidential · AI guidance
            </div>
          </div>
        </div>

        {showNarrativeModal && (
          <NarrativeModal onClose={() => setShowNarrativeModal(false)} onChoose={handleNarrativeChoose} />
        )}
      </div>
    </div>
  );
}
