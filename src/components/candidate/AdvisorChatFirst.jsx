/* cosmetic pass — see commit for scope */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import LongRunningAdvisorStatus from './LongRunningAdvisorStatus.jsx';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';
import { getTrackConfig } from '../../trackConfig.js';
import { getCandidateKpiDisplayItems } from '../../../lib/candidate-kpi-schemas.js';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';
import NarrativeModal from './AdvisorNarrativeModal.jsx';

const OPTIONS_PATTERN = /→\s*(.+)$/;
const TARGET_SELECTION_LOOP = /(?:lock in|choose|name|which)\s+(?:your\s+)?(?:3\s*[–-]\s*5\s+)?(?:target\s+)?schools|which\s+3\s*[–-]\s*5\s+schools/i;
const NARRATIVE_START = "Your targets are locked in. Now let's shape your story. What's the specific moment or experience that convinced you this is the right path?";

function parseOptions(text) {
  const match = OPTIONS_PATTERN.exec(text || '');
  if (!match) return null;
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return null;
  return { mainText: text.slice(0, match.index).trim(), options };
}

const AiAvatar = () => (
  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#16233f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px rgba(22,35,63,.28)' }}>
    <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
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
    <div onClick={() => setOpen(v => !v)} style={{ borderBottom: '1px solid #e7eaf3', background: '#fff', padding: '11px 24px', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16233f', boxShadow: '0 0 8px rgba(22,35,63,.4)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#16233f' }}>
          Stage {Math.min(stepIdx, STEPS.length - 1) + 1} of {STEPS.length} · {stage}
          {matched > 0 && <span style={{ color: '#b8902f', fontWeight: 700 }}> · {matched} program{matched === 1 ? '' : 's'} matched</span>}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9aa3b5' }}>{open ? 'Hide journey' : 'View journey'}</span>
        <Chevron open={open} />
      </div>
      <div className="pw-progress-track" style={{ marginTop: 9 }}>
        <div className="pw-progress-fill" style={{ width: `${Math.min(((Math.min(stepIdx, STEPS.length - 1) + 1) / STEPS.length) * 100, 100)}%` }} />
      </div>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e7eaf3' }}>
          {STEPS.map((label, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <span key={label} style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: active ? 800 : 600, whiteSpace: 'nowrap',
                background: active ? '#16233f' : done ? '#fffaf0' : '#f4f6fb',
                color: active ? '#fff' : done ? '#b8902f' : '#9aa3b5',
                border: active ? 'none' : done ? '1px solid #ecd9a8' : '1px solid #e2e7f2',
                boxShadow: active ? '0 4px 12px rgba(22,35,63,.24)' : 'none',
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

function CardShell({ label, labelColor = '#b8902f', children }) {
  return (
    <div style={{ marginLeft: 42, maxWidth: 640, background: '#fff', border: '1px solid #e8ecf6', borderRadius: 16, padding: '16px 18px', boxShadow: '0 10px 26px rgba(22,35,63,.07)', animation: 'pwFade .3s ease' }}>
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
  const dims = getCandidateKpiDisplayItems(scores, profile)
    .map(item => ({ ...item, title: item.label }));
  const shown = open ? dims : dims.slice(0, 3);
  return (
    <CardShell label="READINESS SNAPSHOT">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: dims.length ? 12 : 0 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: '#16233f', lineHeight: 1 }}>
          {scores?.overall ?? 0}<span style={{ fontFamily: "'Public Sans',system-ui,sans-serif", fontSize: 14, fontWeight: 600, color: '#9aa3b5' }}>/100</span>
        </div>
        <div style={{ fontSize: 12.5, color: '#7a8295', fontWeight: 600, lineHeight: 1.45 }}>
          {trackConfig.scoreLabel || 'Competitiveness'} based on everything you have shared so far.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(d => (
          <div key={d.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2a3447' }}>{d.title}</span>
              <span style={{ fontSize: d.status === 'incomplete' ? 10.5 : 11.5, fontWeight: 800, color: d.status === 'incomplete' ? '#9aa3b5' : '#16233f' }}>{d.status === 'incomplete' ? 'Incomplete' : d.value}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#eef1f7', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${d.status === 'incomplete' ? 0 : Math.max(0, Math.min(100, d.value))}%`, borderRadius: 3, background: 'linear-gradient(90deg,#16233f,#b8902f)', transition: 'width .4s ease' }} />
            </div>
          </div>
        ))}
      </div>
      {dims.length > 3 && (
        <button onClick={() => setOpen(v => !v)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#b8902f', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
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
              style={{ padding: '12px 13px', borderRadius: 13, cursor: 'pointer', border: `1.5px solid ${isPicked ? '#c2962f' : meta.border}`, background: isPicked ? '#fffaf0' : meta.bg }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <span className="pw-card-check-badge" style={{
                  width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(isPicked ? { background: '#16233f', boxShadow: '0 3px 8px rgba(22,35,63,.3)', transform: 'scale(1.05)' } : { background: '#fff', border: `1.5px solid ${meta.border}` }),
                }}>
                  {isPicked && (
                    <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 13l4 4L19 7" /></svg>
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#16233f' }}>{program.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#ffffffb8', color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
                    {program.selectivityLabel && (
                      <span style={{ fontSize: 10, color: '#7a8295', fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#ffffff9c', border: '1px solid #d7ddec' }}>{program.selectivityLabel}</span>
                    )}
                  </div>
                  {(program.fitExplanation || program.notes) && (
                    <div style={{ fontSize: 11.5, color: '#5f6885', lineHeight: 1.45, marginTop: 5 }}>{program.fitExplanation || program.notes}</div>
                  )}
                </div>
                {Number.isFinite(Number(program.fitIndex ?? program.fit)) && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{Math.round(Number(program.fitIndex ?? program.fit))}%</div>
                    <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.45px', color: '#9098b5', marginTop: 3 }}>FIT INDEX</div>
                  </div>
                )}
              </div>
              {(drivers.length || risks.length || gaps.length || actions.length) > 0 && (
                <div style={{ marginLeft: 31, marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                  {drivers.length > 0 && <div style={{ fontSize: 10.5, color: '#16875c', lineHeight: 1.4 }}><b>Drivers:</b> {drivers.join(' · ')}</div>}
                  {risks.length > 0 && <div style={{ fontSize: 10.5, color: '#b44b57', lineHeight: 1.4 }}><b>Risks:</b> {risks.join(' · ')}</div>}
                  {gaps.length > 0 && <div style={{ fontSize: 10.5, color: '#8a6717', lineHeight: 1.4 }}><b>Evidence gaps:</b> {gaps.join(' · ')}</div>}
                  {actions.length > 0 && <div style={{ fontSize: 10.5, color: '#16233f', lineHeight: 1.4 }}><b>Next actions:</b> {actions.join(' · ')}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        {hidden > 0 && (
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#b8902f', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Show all {list.length} programs
          </button>
        )}
        {open && list.length > 8 && (
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#b8902f', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Show less
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={confirm} disabled={!selected.length || busy}
          style={{
            background: selected.length && !busy ? '#16233f' : '#e2e7f2',
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

export default function AdvisorChatFirst({
  STEPS, stepIdx, chat, input, setInput, send, busy, scores, profile, programs,
  setShowCvModal, narrative, setNarrative, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, authUser,
}) {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [showNarrativeModal, setShowNarrativeModal] = useState(false);
  const reduceMotion = useReducedMotion();

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
  const latestUserText = visibleChat.filter(m => m.role === 'user').slice(-1)[0]?.text || '';
  const showNarrativeCTA = !busy && !narrative && lastAiText.includes('Narrative Strategy tab');
  const lastParsed = !busy ? parseOptions(lastAiText) : null;
  const chips = !busy && !lastParsed ? contextualChips({ scores, programs, chosenSchools, narrative }) : [];

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
  const showPrograms = hasPrograms && (!chosenSchools?.length || needsSelectionRecovery);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px' }}>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 16, border: '1px solid #e7eaf3', boxShadow: '0 20px 50px rgba(22,35,63,.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', position: 'relative' }}>

        {/* ambient status bar (replaces the full stepper) */}
        <StatusBar STEPS={STEPS} stepIdx={stepIdx} programs={programs} />

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 24px', borderBottom: '1px solid #eef1f6', background: '#fff', flexShrink: 0 }}>
          <AiAvatar />
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: '#16233f' }}>
              {profile?.name ? `${profile.name}'s Advisor` : 'AI Advisor'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2fa876', boxShadow: '0 0 8px rgba(47,168,118,.6)', display: 'inline-block' }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2fa876' }}>Online · Smart AI</span>
            </div>
          </div>
        </div>

        {/* single-column conversation */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px 8px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleChat.map((m, i) => {
              if (m.role === 'ai') {
                const isLast = i === visibleChat.length - 1;
                const visibleText = isLast && chosenSchools?.length && TARGET_SELECTION_LOOP.test(m.text || '') && !needsSelectionRecovery ? NARRATIVE_START : m.text;
                const parsed = parseOptions(visibleText);
                const showChipsHere = parsed && (!isLast || busy);
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
                            style={{ background: '#fff', border: '1px solid #d7ddec', borderRadius: 9, padding: '9px 17px', fontSize: 13.5, fontWeight: 600, color: '#16233f', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
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
                  style={{ alignSelf: 'flex-end', background: '#16233f', color: '#eef2fa', borderRadius: '16px 16px 4px 16px', padding: '13px 18px', fontSize: 14.5, lineHeight: 1.6, maxWidth: '72%', whiteSpace: 'pre-wrap', boxShadow: '0 8px 20px rgba(22,35,63,.22)' }}
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
              <div style={{ marginLeft: 42, maxWidth: 640, background: '#16233f', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, animation: 'pwFade .3s ease' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: '#f5c94c', marginBottom: 3 }}>NEXT STEP</div>
                  <span style={{ fontSize: 13.5, color: '#c6d2ea', fontWeight: 600 }}>Choose your narrative strategy</span>
                </div>
                <button onClick={() => setShowNarrativeModal(true)} style={{ background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Choose →</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* quick replies required by the current question */}
        {lastParsed && !busy && (
          <div style={{ padding: '10px 24px 0', borderTop: '1px solid #eef1f6', background: '#fff', flexShrink: 0 }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', color: '#b8902f', marginBottom: 8 }}>QUICK REPLY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {lastParsed.options.map(opt => (
                  <button key={opt} className="pw-chip" onClick={() => handleChip(opt)} disabled={busy}
                    style={{ background: '#f4f6fb', border: '1px solid #d7ddec', borderRadius: 9, padding: '9px 17px', fontSize: 13.5, fontWeight: 600, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#16233f'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#16233f'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f4f6fb'; e.currentTarget.style.color = '#16233f'; e.currentTarget.style.borderColor = '#d7ddec'; }}>
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
            <div className="pw-composer-shell" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#f4f6fb', border: '1px solid #e2e7f2', borderRadius: 12, padding: '6px 6px 6px 12px', boxShadow: '0 2px 12px rgba(22,35,63,.04)' }}>
              <button onClick={() => setShowCvModal(true)} title="Upload CV"
                style={{ background: '#eef1f7', border: 'none', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                className="pw-composer-textarea"
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={busy}
                placeholder={busy ? 'Advisor is analyzing…' : lastParsed ? 'Or type your own answer…' : 'Ask anything or type your answer…'}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, padding: '10px 4px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500, maxHeight: 120 }}
              />
              <button onClick={() => send()} disabled={busy || !input.trim()}
                style={{ background: input.trim() ? '#16233f' : '#e2e7f2', border: 'none', borderRadius: 9, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: input.trim() ? '#fff' : '#9aa3b5', flexShrink: 0, transition: 'all .2s', boxShadow: input.trim() ? '0 6px 16px rgba(22,35,63,.26)' : 'none' }}>
                {busy ? (
                  <svg className="pw-send-spinner" viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }}>
                    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.85" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
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
                    style={{ background: '#fff', border: '1px solid #d7ddec', borderRadius: 9, padding: '8px 15px', fontSize: 12, fontWeight: 600, color: '#3a425a', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                    onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = '#16233f'; e.currentTarget.style.color = '#16233f'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d7ddec'; e.currentTarget.style.color = '#3a425a'; }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ margin: '8px 0 10px', textAlign: 'center', fontSize: 11, color: '#9aa3b5', fontWeight: 500 }}>
              Confidential consultation active. End-to-end encrypted.
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
