import React, { useEffect, useRef, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';

const OPTIONS_PATTERN = /(?:→|->)\s*(.+)$/;

function parseOptions(text) {
  const match = OPTIONS_PATTERN.exec(text || '');
  if (!match) return null;
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean);
  if (options.length < 2) return null;
  return { mainText: text.slice(0, match.index).trim(), options };
}

function undergradGradeNumber(profile) {
  const grade = String(profile?.grade || profile?.currentGrade || '').match(/\d{1,2}/)?.[0];
  return grade ? Number(grade) : null;
}

function NarrativeModal({ onClose, onChoose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,27,52,.58)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#faf7f2', borderRadius: 24, maxWidth: 640, width: '100%', padding: 32, boxShadow: '0 30px 60px rgba(20,27,52,.35)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} title="Close" style={{ position: 'absolute', top: 20, right: 20, width: 34, height: 34, borderRadius: 10, border: 'none', background: '#f1eadd', color: '#6b7392', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#5b46e0', marginBottom: 8 }}>STEP 5 · BEFORE YOU WRITE</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.4px', color: '#141b34', margin: '0 0 10px' }}>Choose your narrative</h2>
        <p style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, margin: '0 0 24px' }}>
          Every strong application is anchored by a clear narrative posture. Pick the one that best reflects how you want to be seen by admissions committees.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
          <div style={{ background: '#fff', border: '1px solid #f1eadd', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#19c08a', background: '#e9f9f1', padding: '4px 9px', borderRadius: 7 }}>LOWER RISK</span>
            <span style={{ fontSize: 22 }}>📈</span>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#141b34', margin: 0 }}>The Upgrade</h3>
            <p style={{ fontSize: 13, color: '#6b7392', lineHeight: 1.55, margin: 0, flex: 1 }}>Build on your current trajectory and frame your experience as a natural step up.</p>
            <button onClick={() => onChoose('upgrade')} style={{ width: '100%', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px rgba(105,91,255,.32)' }}>Choose the Upgrade</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid #f1eadd', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#e0556b', background: '#fdeaf0', padding: '4px 9px', borderRadius: 7 }}>HIGHER REWARD</span>
            <span style={{ fontSize: 22 }}>🔄</span>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#141b34', margin: 0 }}>The Pivot</h3>
            <p style={{ fontSize: 13, color: '#6b7392', lineHeight: 1.55, margin: 0, flex: 1 }}>Reframe your story around a deliberate change in direction.</p>
            <button onClick={() => onChoose('pivot')} style={{ width: '100%', background: 'linear-gradient(135deg,#fbc094,#fba2bb)', color: '#faf7f2', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 18px rgba(251,140,170,.32)' }}>Choose the Pivot</button>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9098b5', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Not ready yet, go back to the chat</button>
        </div>
      </div>
    </div>
  );
}

const AiAvatar = () => (
  <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(140deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px rgba(105,91,255,.32)' }}>
    <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  </div>
);

const JOURNEY_STAGES = ['profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'];
const STAGE_LABELS = { profile: 'Profile', analysis: 'Analysis', portfolio: 'Portfolio', narrative: 'Narrative', cv: 'CV', essays: 'Essays', interview: 'Interview' };

function isGradPhD(profile, chat = []) {
  const profileTrack = [profile?.category, profile?.degree, profile?.program]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/undergraduate|bachelor/.test(profileTrack)) return false;
  if (/personal development/.test(profileTrack)) return false;
  if (/graduate|postgraduate|post graduate|master|mba|phd|doctoral|doctorate/.test(profileTrack)) return true;

  const trackChoice = chat
    .filter(message => message?.role === 'user')
    .map(message => String(message?.text || '').trim().toLowerCase())
    .find(text => /^(graduate|postgraduate\s*\/\s*doctoral|postgraduate|doctoral|phd)$/.test(text));

  return !!trackChoice;
}

function JourneyRail({ journeyStage, send, busy, scores, programs, narrative, essays, interviews }) {
  const stageOrder = ['profile', 'analysis', 'portfolio', 'narrative', 'cv', 'essays', 'interview'];
  const currentIdx = stageOrder.indexOf(journeyStage || 'intake');

  const handleNext = () => {
    send('Move me to the next step.');
  };

  const handleStage = (stage) => {
    send(`Take me to ${STAGE_LABELS[stage]}.`);
  };

  const isDone = (stage) => {
    const idx = stageOrder.indexOf(stage);
    return idx < currentIdx;
  };
  const isCurrent = (stage) => stage === journeyStage;
  const isUnlocked = (stage) => stageOrder.indexOf(stage) <= currentIdx;

  return (
    <div className="pw-advisor-rail" style={{ background: '#f6f1e8', padding: '18px 16px', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={handleNext} disabled={busy}
        style={{ width: '100%', background: busy ? '#e7dcc7' : 'linear-gradient(135deg,#5b46e0,#b899fb)', color: busy ? '#9098b5' : '#fff', border: 'none', borderRadius: 12, padding: '11px 0', fontSize: 13.5, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: busy ? 'none' : '0 6px 18px rgba(91,70,224,.32)', marginBottom: 8 }}>
        Next
      </button>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', marginBottom: 2 }}>JOURNEY</div>
      {JOURNEY_STAGES.map((stage) => {
        const done = isDone(stage);
        const current = isCurrent(stage);
        const unlocked = isUnlocked(stage);
        return (
          <button key={stage} onClick={() => unlocked && handleStage(stage)} disabled={busy || !unlocked}
            style={{
              width: '100%', textAlign: 'left', borderRadius: 11, padding: '10px 13px', fontSize: 13, fontWeight: current ? 800 : 600, cursor: !unlocked || busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 9, transition: 'all .15s',
              background: current ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : done ? '#eafff6' : unlocked ? '#faf7f2' : '#f0ece6',
              color: current ? '#fff' : done ? '#16875c' : unlocked ? '#33405e' : '#c0c8e0',
              border: current ? 'none' : done ? '1px solid #b7ecd4' : '1px solid #e7dcc7',
            }}>
            <span style={{ width: 20, height: 20, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, background: current ? 'rgba(255,255,255,.25)' : done ? '#3fdca9' : 'transparent', color: current ? '#fff' : done ? '#fff' : '#c0c8e0' }}>
              {done ? '✓' : !unlocked ? '🔒' : null}
            </span>
            {STAGE_LABELS[stage]}
          </button>
        );
      })}
    </div>
  );
}

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, sendIdleCheckin, busy, scores, profile, programs, setShowCvModal, setCandTab, narrative, setNarrative, tasks, completedTasks, setCompletedTasks, authUser, journeyStage, adaptiveGradEnabled, advisorDirective }) {
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);
  const idleTimerRef = useRef(null);
  const idleCountRef = useRef(0);
  const MAX_IDLE_FIRES = 2;
  const [showNarrativeModal, setShowNarrativeModal] = useState(false);

  useEffect(() => {
    if (adaptiveGradEnabled && advisorDirective?.modal === 'upgradePivot') setShowNarrativeModal(true);
  }, [adaptiveGradEnabled, advisorDirective]);

  const visibleChat = visibleCandidateChat(chat, {
    whatsapp: authUser?.whatsappOptIn === true,
    telegram: authUser?.telegramOptIn === true,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, busy]);

  // Idle re-engagement: nudge up to MAX_IDLE_FIRES times per idle period.
  // Count resets when the user sends a new message. Each AI idle reply can
  // trigger one more nudge, but only up to the cap — no infinite loop.
  useEffect(() => {
    if (busy) {
      clearTimeout(idleTimerRef.current);
      return;
    }
    if (visibleChat.length === 0) return;
    const lastMsg = visibleChat[visibleChat.length - 1];
    if (lastMsg?.role === 'user') {
      idleCountRef.current = 0;
    } else if (idleCountRef.current >= MAX_IDLE_FIRES) {
      return;
    }
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!busy && typeof sendIdleCheckin === 'function' && idleCountRef.current < MAX_IDLE_FIRES) {
        idleCountRef.current += 1;
        sendIdleCheckin();
      }
    }, 60000);
    return () => clearTimeout(idleTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleChat.length, busy]);

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

  const isUndergrad = profile?.category === 'Undergraduate';
  const gradeNumber = undergradGradeNumber(profile);
  const futureStages = isUndergrad && gradeNumber && gradeNumber <= 10 ? new Set(['Essays', 'Applications']) : new Set();
  const taskList = tasks || [];
  const doneCount = taskList.filter(t => completedTasks?.[t]).length;
  const toggleTask = (text) => setCompletedTasks(prev => ({ ...prev, [text]: !prev[text] }));

  const lastAiMsg = visibleChat.filter(m => m.role === 'ai').slice(-1)[0];
  const lastAiText = lastAiMsg?.text || '';
  const showNarrativeCTA = !adaptiveGradEnabled && !busy && !narrative && lastAiText.includes('Narrative Strategy tab');
  const showSchoolPathChips = !busy && !programs && lastAiText.includes('AI-led search together');
  const lastParsed = !busy ? parseOptions(lastAiText) : null;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px' }}>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 24, border: '1px solid #ece6f8', boxShadow: '0 20px 50px rgba(60,72,130,.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf7f2' }}>

        {/* stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '14px 24px', borderBottom: '1px solid #f1eadd', overflowX: 'auto', flexShrink: 0, background: '#faf7f2' }}>
          {STEPS.map((label, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx;
            const future = futureStages.has(label);
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px 5px 7px', borderRadius: 999,
                  ...(future
                    ? { background: '#fff8e8', border: '1px dashed #dfcfaa' }
                    : active
                    ? { background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 4px 12px rgba(105,91,255,.30)' }
                    : done
                    ? { background: '#eafff6', border: '1px solid #b7ecd4' }
                    : { background: '#f6f1e8', border: '1px solid #e7dcc7' }),
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0,
                    ...(active ? { background: 'rgba(255,255,255,.25)', color: '#faf7f2' } : done ? { background: '#3fdca9', color: '#fff' } : future ? { background: '#fbe9c0', color: '#c08a1a' } : { background: '#e7dcc7', color: '#9098b5' }),
                  }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: active ? 800 : 600, whiteSpace: 'nowrap', color: active ? '#faf7f2' : done ? '#16875c' : future ? '#b58522' : '#9098b5' }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span style={{ width: 20, height: 2, borderRadius: 2, background: done ? 'linear-gradient(90deg,#b9a8ff,#d4c9ff)' : '#e7dcc7', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* body: chat + rail */}
        <div className="pw-advisor-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 310px', overflow: 'hidden' }}>

          {/* chat column */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #f1eadd' }}>

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid #f1eadd', background: '#faf7f2', flexShrink: 0 }}>
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

            {/* messages */}
            <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleChat.map((m, i) => {
                if (m.role === 'ai') {
                  const isLast = i === visibleChat.length - 1;
                  const parsed = parseOptions(m.text);
                  const showChipsHere = parsed && (!isLast || busy);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', animation: 'pwFade .3s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                        <AiAvatar />
                        <div style={{ background: '#f0ebff', border: '1px solid #e2d9f8', borderRadius: '4px 18px 18px 18px', padding: '13px 17px', fontSize: 14, lineHeight: 1.6, color: '#33405e', maxWidth: 520, boxShadow: '0 4px 14px rgba(105,91,255,.07)' }}>
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

              {busy && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <AiAvatar />
                  <div style={{ background: '#f0ebff', border: '1px solid #e2d9f8', borderRadius: '4px 18px 18px 18px', padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#b899fb', display: 'inline-block', animation: `pwPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {showSchoolPathChips && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 42 }}>
                  {[
                    { label: '🎯 I know my schools', msg: 'I have specific schools in mind.' },
                    { label: '✨ Recommend a portfolio', msg: 'Recommend a tailored portfolio for me.' },
                    { label: '🤝 Search with me', msg: "Let's do an AI-led search together." },
                  ].map(({ label, msg }) => (
                    <button key={msg} onClick={() => send(msg)} disabled={busy}
                      style={{ background: '#faf7f2', border: '1.5px solid #d8cdb4', borderRadius: 14, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#33405e', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {scores && stepIdx >= 2 && (
                <div style={{ marginLeft: 42, background: 'linear-gradient(135deg,#e9f9f1,#d1f5e6)', border: '1px solid #b7ecd4', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#119467', fontWeight: 700 }}>✓ Your profile analysis is ready</span>
                  <button onClick={() => setCandTab(isUndergrad ? 'universities' : 'analysis')} style={{ background: 'linear-gradient(135deg,#3fdca9,#80dbbf)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {isUndergrad ? 'University List →' : 'View Analysis →'}
                  </button>
                </div>
              )}

              {showNarrativeCTA && (
                <div style={{ marginLeft: 42, background: 'linear-gradient(135deg,#474d80,#6d5cc2)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: '#ffd76a', marginBottom: 3 }}>NEXT STEP</div>
                    <span style={{ fontSize: 13.5, color: '#e7dcc7', fontWeight: 600 }}>Choose your narrative strategy</span>
                  </div>
                  <button onClick={() => setShowNarrativeModal(true)} style={{ background: '#faf7f2', color: '#5b46e0', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Choose →</button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* quick replies from last AI message — pinned above input */}
            {lastParsed && !busy && (
              <div style={{ padding: '10px 24px 0', borderTop: '1px solid #f1eadd', background: '#faf7f2', flexShrink: 0 }}>
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
            )}

            {/* input */}
            <div style={{ padding: lastParsed && !busy ? '10px 20px 18px' : '14px 20px 18px', flexShrink: 0, background: '#faf7f2' }}>
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
                  placeholder={busy ? 'Analyzing…' : lastParsed ? 'Or type your own answer…' : 'Type your answer or ask anything…'}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, padding: '10px 4px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500 }}
                />
                <button onClick={() => send()} disabled={busy || !input.trim()}
                  style={{ background: input.trim() ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : '#e7dcc7', border: 'none', borderRadius: 13, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: input.trim() ? '#faf7f2' : '#9098b5', flexShrink: 0, transition: 'all .2s', boxShadow: input.trim() ? '0 6px 16px rgba(105,91,255,.32)' : 'none' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                  </svg>
                </button>
              </div>
              <div style={{ marginTop: 7, paddingLeft: 4, fontSize: 11, color: '#c0c8e0', fontWeight: 500 }}>
                Confidential · AI guidance
              </div>
            </div>

            {showNarrativeModal && (
              <NarrativeModal onClose={() => setShowNarrativeModal(false)} onChoose={handleNarrativeChoose} />
            )}
          </div>

          {/* right rail: journey buttons (ADAPTIVE_GRAD + grad/PhD) or tasks */}
          {adaptiveGradEnabled && isGradPhD(profile, chat) ? (
            <JourneyRail journeyStage={journeyStage} send={send} busy={busy} scores={scores} programs={programs} />
          ) : (
            <div className="pw-advisor-rail" style={{ background: '#f6f1e8', padding: '22px 18px', overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#141b34', margin: 0 }}>Your tasks</h3>
                {taskList.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#5b46e0', background: '#eee8ff', padding: '3px 9px', borderRadius: 8 }}>{doneCount}/{taskList.length}</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#9098b5', margin: '0 0 16px', lineHeight: 1.5, fontWeight: 500 }}>Added as I learn more about you.</p>
              {taskList.length === 0 ? (
                <div style={{ background: '#faf7f2', border: '1.5px dashed #e7dcc7', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
                  <div style={{ fontSize: 12.5, color: '#aeb6cf', fontWeight: 500, lineHeight: 1.5 }}>Tasks will appear as we learn about you.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {doneCount > 0 && taskList.length > 0 && (
                    <div style={{ height: 4, borderRadius: 2, background: '#e7dcc7', marginBottom: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(doneCount / taskList.length) * 100}%`, background: 'linear-gradient(90deg,#3fdca9,#94b3fb)', borderRadius: 2, transition: 'width .4s ease' }} />
                    </div>
                  )}
                  {taskList.map((text) => {
                    const done = !!completedTasks?.[text];
                    return (
                      <div key={text} onClick={() => toggleTask(text)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', borderRadius: 13, cursor: 'pointer', border: `1px solid ${done ? '#b7ecd4' : '#f1eadd'}`, background: done ? '#f0faf6' : '#faf7f2', transition: 'all .15s' }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          ...(done ? { background: '#3fdca9', boxShadow: '0 3px 8px rgba(25,192,138,.28)' } : { background: '#faf7f2', border: '1.5px solid #d8cdb4' }),
                        }}>
                          {done && (
                            <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: done ? '#9aa3bf' : '#33405e', textDecoration: done ? 'line-through' : 'none' }}>
                          {text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {isUndergrad && programs?.length > 0 && (
                <div style={{ marginTop: 20, background: 'linear-gradient(135deg,#e9f9f1,#d5f5e5)', border: '1px solid #b7ecd4', borderRadius: 14, padding: '14px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#16875c', marginBottom: 6 }}>UNIVERSITY LIST</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34', marginBottom: 10 }}>{programs.length} universities matched</div>
                  <button onClick={() => setCandTab('universities')} style={{ width: '100%', background: 'linear-gradient(135deg,#3fdca9,#5bbfa0)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 0', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Open University List →
                  </button>
                </div>
              )}

              {!isUndergrad && scores && (
                <div style={{ marginTop: 20, background: 'linear-gradient(135deg,#f0ebff,#e8e1ff)', border: '1px solid #d4c4f8', borderRadius: 14, padding: '14px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', marginBottom: 6 }}>PROFILE SCORE</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#5b46e0', lineHeight: 1 }}>{scores.overall ?? 0}<span style={{ fontSize: 14, fontWeight: 600, color: '#9098b5' }}>/100</span></div>
                  <button onClick={() => setCandTab('analysis')} style={{ marginTop: 10, width: '100%', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 0', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    View Full Analysis →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
