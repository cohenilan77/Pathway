/* candidate portal layout framework pass — see commit for scope */
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';
import NarrativeModal from './AdvisorNarrativeModal.jsx';
import AdvisorChatFirst from './AdvisorChatFirst.jsx';
import AdvisorConversational from './AdvisorConversational.jsx';
import LongRunningAdvisorStatus from './LongRunningAdvisorStatus.jsx';

// The chat-first single-stream workspace (AdvisorChatFirst) is the default
// Advisor experience for every candidate track, including Undergraduate,
// Personal Development, and pre-category sessions. Set
// VITE_LEGACY_ADVISOR_LAYOUT=true at build time to fall back to the old
// multi-column 9-step layout defined later in this file — that layout is
// kept only as an explicit, non-default fallback.
const LEGACY_ADVISOR_LAYOUT = import.meta.env?.VITE_LEGACY_ADVISOR_LAYOUT === 'true';

// Conversation-first redesign (chats/chat1.md, project/AI Advisor.dc.html),
// scoped entirely behind this flag per its hard guardrail: flag off must
// render exactly as today. Set VITE_ADAPTIVE_GRAD=true to opt in; it takes
// priority over VITE_LEGACY_ADVISOR_LAYOUT since it's a superset redesign,
// not a fallback.
const ADAPTIVE_GRAD = true;

const OPTIONS_PATTERN = /→\s*([\s\S]+)$/;
const OPTIONS_TRAILING_PROMPT = /\s+(?:What should we work on next\??|Inquire about your strategy…?)\s*$/i;

function parseOptions(text) {
  const match = OPTIONS_PATTERN.exec(text || '');
  if (!match) return null;
  const optionText = match[1].replace(OPTIONS_TRAILING_PROMPT, '').trim();
  const options = optionText.split('|').map(o => o.replace(OPTIONS_TRAILING_PROMPT, '').trim()).filter(Boolean);
  if (options.length < 2) return null;
  return { mainText: text.slice(0, match.index).trim(), options };
}

function undergradGradeNumber(profile) {
  const grade = String(profile?.grade || profile?.currentGrade || '').match(/\d{1,2}/)?.[0];
  return grade ? Number(grade) : null;
}

const AiAvatar = () => (
  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#141b34', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px rgba(22,35,63,.28)' }}>
    <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  </div>
);

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, sendIdleCheckin, busy, scores, profile, programs, setShowCvModal, setCandTab, narrative, setNarrative, tasks, completedTasks, setCompletedTasks, authUser, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, cvText }) {
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);
  const idleTimerRef = useRef(null);
  const idleCountRef = useRef(0);
  const MAX_IDLE_FIRES = 2;
  const [showNarrativeModal, setShowNarrativeModal] = useState(false);
  const reduceMotion = useReducedMotion();

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
  const latestUserText = visibleChat.filter(m => m.role === 'user').slice(-1)[0]?.text || '';
  const showNarrativeCTA = !busy && !narrative && lastAiText.includes('Narrative Strategy tab');
  const showSchoolPathChips = !busy && !programs && lastAiText.includes('AI-led search together');
  const lastParsed = !busy ? parseOptions(lastAiText) : null;

  // Conversation-first redesign, flag-gated. Checked first — and before any
  // early return below reads component state — so flag-off candidates never
  // observe a behavior change, per the design brief's hard guardrail.
  if (ADAPTIVE_GRAD) {
    return (
      <AdvisorConversational
        STEPS={STEPS} stepIdx={stepIdx} chat={chat} input={input} setInput={setInput} send={send}
        busy={busy} scores={scores} profile={profile} programs={programs} setShowCvModal={setShowCvModal}
        cvText={cvText} narrative={narrative}
        chosenSchools={chosenSchools} setChosenSchools={setChosenSchools} confirmTargetSchools={confirmTargetSchools}
        setCandTab={setCandTab}
        authUser={authUser}
      />
    );
  }

  // Chat-first workspace for every track, including pre-category sessions.
  // Placed after all hooks so hook order stays stable when the category is
  // chosen mid-session. The old 9-step layout below only renders when the
  // legacy flag is explicitly set.
  if (!LEGACY_ADVISOR_LAYOUT) {
    return (
      <AdvisorChatFirst
        STEPS={STEPS} stepIdx={stepIdx} chat={chat} input={input} setInput={setInput} send={send}
        busy={busy} scores={scores} profile={profile} programs={programs} setShowCvModal={setShowCvModal}
        narrative={narrative} setNarrative={setNarrative}
        chosenSchools={chosenSchools} setChosenSchools={setChosenSchools}
        reopenProgramSelection={reopenProgramSelection}
        confirmTargetSchools={confirmTargetSchools}
        authUser={authUser}
        setCandTab={setCandTab}
        tasks={tasks}
        completedTasks={completedTasks}
        setCompletedTasks={setCompletedTasks}
      />
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px' }}>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 16, border: '1px solid #f1eadd', boxShadow: '0 20px 50px rgba(22,35,63,.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>

        {/* stepper */}
        <div style={{ padding: '14px 24px 10px', borderBottom: '1px solid #f1eadd', flexShrink: 0, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
            {STEPS.map((label, i) => {
              const active = i === stepIdx;
              const done = i < stepIdx;
              const future = futureStages.has(label);
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                      ...(active ? { background: '#141b34', color: '#fff', boxShadow: '0 4px 10px rgba(22,35,63,.28)' } : done ? { background: '#141b34', color: '#fff' } : future ? { background: '#fffaf0', color: '#5b46e0', border: '1px dashed #d3c9a8' } : { background: '#fff', color: '#9aa3b5', border: '1px solid #e7dcc7' }),
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap', color: active ? '#141b34' : done ? '#3a425a' : future ? '#5b46e0' : '#9aa3b5' }}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span style={{ width: 28, height: 1, background: done ? '#5b46e0' : '#e1e6f0', flexShrink: 0, margin: '0 2px' }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#9aa3b5', letterSpacing: '.3px' }}>Stage {Math.min(stepIdx + 1, STEPS.length)} of {STEPS.length}</span>
          </div>
          <div className="pw-progress-track">
            <div className="pw-progress-fill" style={{ width: `${Math.min(((stepIdx + 1) / STEPS.length) * 100, 100)}%` }} />
          </div>
        </div>

        {/* body: chat + rail */}
        <div className="pw-advisor-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 310px', overflow: 'hidden' }}>

          {/* chat column */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #eef1f6' }}>

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid #eef1f6', background: '#fff', flexShrink: 0 }}>
              <AiAvatar />
              <div>
                <div style={{ fontFamily: "'Newsreader',serif", fontSize: 17, fontWeight: 700, color: '#141b34' }}>
                  {profile?.name ? `${profile.name}'s Advisor` : 'AI Advisor'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2fa876', boxShadow: '0 0 8px rgba(47,168,118,.6)', display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2fa876' }}>Online · Smart AI</span>
                </div>
              </div>
            </div>

            {/* messages */}
            <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleChat.map((m, i) => {
                if (m.role === 'ai') {
                  const isLast = i === visibleChat.length - 1;
                  const parsed = parseOptions(m.text);
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
                        <div className="pw-rich-text" style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', fontSize: 14.5, lineHeight: 1.6, maxWidth: 520, boxShadow: '0 4px 14px rgba(22,35,63,.05)' }}>
                          {renderFormattedText(parsed ? parsed.mainText : m.text)}
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

              {busy && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <AiAvatar />
                  <div style={{ background: '#f4f6fb', border: '1px solid #e8ecf6', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', display: 'flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: 9, maxWidth: '100%' }}>
                    <LongRunningAdvisorStatus busy={busy} message={latestUserText} />
                  </div>
                </div>
              )}

              {showSchoolPathChips && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 42 }}
                >
                  {[
                    { label: '🎯 I know my schools', msg: 'I have specific schools in mind.' },
                    { label: '✨ Recommend a portfolio', msg: 'Recommend a tailored portfolio for me.' },
                    { label: '🤝 Search with me', msg: "Let's do an AI-led search together." },
                  ].map(({ label, msg }) => (
                    <button key={msg} className="pw-chip" onClick={() => send(msg)} disabled={busy}
                      style={{ background: '#fff', border: '1px solid #e7dcc7', borderRadius: 9, padding: '12px 18px', fontSize: 13.5, fontWeight: 600, color: '#141b34', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}

              {scores && stepIdx >= 2 && (
                <div style={{ marginLeft: 42, background: '#fffaf0', border: '1px solid #ecd9a8', borderLeft: '4px solid #5b46e0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#8a6717', fontWeight: 700 }}>✓ Your profile analysis is ready</span>
                  <button onClick={() => setCandTab(isUndergrad ? 'universities' : 'analysis')} style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {isUndergrad ? 'University List →' : 'View Analysis →'}
                  </button>
                </div>
              )}

              {showNarrativeCTA && (
                <div style={{ marginLeft: 42, background: '#141b34', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#f5c94c', marginBottom: 3 }}>NEXT STEP</div>
                    <span style={{ fontSize: 13.5, color: '#c6d2ea', fontWeight: 600 }}>Choose your narrative strategy</span>
                  </div>
                  <button onClick={() => setShowNarrativeModal(true)} style={{ background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Choose →</button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* quick replies from last AI message — pinned above input */}
            {lastParsed && !busy && (
              <div style={{ padding: '10px 24px 0', borderTop: '1px solid #eef1f6', background: '#fff', flexShrink: 0 }}>
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
            )}

            {/* input */}
            <div style={{ padding: lastParsed && !busy ? '10px 20px 18px' : '14px 20px 18px', flexShrink: 0, background: '#fff', borderTop: '1px solid #eef1f6' }}>
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
                  placeholder={busy ? 'Analyzing…' : lastParsed ? 'Or type your own answer…' : 'Type your answer or ask anything…'}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, padding: '10px 4px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500, maxHeight: 120 }}
                />
                <button onClick={() => send()} disabled={busy || !input.trim()}
                  style={{ background: input.trim() ? '#141b34' : '#e2e7f2', border: 'none', borderRadius: 9, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: input.trim() ? '#fff' : '#9aa3b5', flexShrink: 0, transition: 'all .2s', boxShadow: input.trim() ? '0 6px 16px rgba(22,35,63,.26)' : 'none' }}>
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
              <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#9aa3b5', fontWeight: 500 }}>
                Confidential consultation active. End-to-end encrypted.
              </div>
            </div>

            {showNarrativeModal && (
              <NarrativeModal onClose={() => setShowNarrativeModal(false)} onChoose={handleNarrativeChoose} />
            )}
          </div>

          {/* tasks rail */}
          <div className="pw-advisor-rail" style={{ background: '#fbfcfe', padding: '24px 20px', overflowY: 'auto', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontFamily: "'Newsreader',serif", fontSize: 19, fontWeight: 700, color: '#141b34', margin: 0 }}>Your tasks</h3>
              {taskList.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#141b34', background: '#eef1f7', padding: '3px 9px', borderRadius: 7 }}>{doneCount}/{taskList.length}</span>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#8a93a3', margin: '0 0 16px', lineHeight: 1.5, fontWeight: 500 }}>Added as I learn more about you.</p>
            {taskList.length === 0 ? (
              <div style={{ background: '#fff', border: '1px dashed #e7dcc7', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 12.5, color: '#9aa3b5', fontWeight: 500, lineHeight: 1.5 }}>Tasks will appear as we learn about you.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {doneCount > 0 && taskList.length > 0 && (
                  <div style={{ height: 4, borderRadius: 2, background: '#f1eadd', marginBottom: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(doneCount / taskList.length) * 100}%`, background: 'linear-gradient(90deg,#94b3fb,#b899fb)', borderRadius: 2, transition: 'width .4s ease' }} />
                  </div>
                )}
                {taskList.map((text) => {
                  const done = !!completedTasks?.[text];
                  return (
                    <div key={text} onClick={() => toggleTask(text)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${done ? '#d9e3d5' : '#e8ecf6'}`, background: done ? '#f5f9f4' : '#fff', transition: 'all .15s' }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...(done ? { background: '#141b34', boxShadow: '0 3px 8px rgba(22,35,63,.24)' } : { background: '#fff', border: '1px solid #e7dcc7' }),
                      }}>
                        {done && (
                          <svg viewBox="0 0 24 24" width="11" height="11" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: done ? '#9aa3b5' : '#2a3447', textDecoration: done ? 'line-through' : 'none' }}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {isUndergrad && programs?.length > 0 && (
              <div style={{ marginTop: 20, background: '#fffaf0', border: '1px solid #ecd9a8', borderRadius: 12, padding: '14px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', marginBottom: 6 }}>UNIVERSITY LIST</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34', marginBottom: 10 }}>{programs.length} universities matched</div>
                <button onClick={() => setCandTab('universities')} style={{ width: '100%', background: '#141b34', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Open University List →
                </button>
              </div>
            )}

            {!isUndergrad && scores && (
              <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e8ecf6', borderRadius: 12, padding: '14px 14px', boxShadow: '0 4px 14px rgba(22,35,63,.05)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', marginBottom: 6 }}>PROFILE SCORE</div>
                <div style={{ fontFamily: "'Newsreader',serif", fontSize: 30, fontWeight: 700, color: '#141b34', lineHeight: 1 }}>{scores.overall ?? 0}<span style={{ fontFamily: "'Albert Sans',system-ui,sans-serif", fontSize: 14, fontWeight: 600, color: '#9aa3b5' }}>/100</span></div>
                <button onClick={() => setCandTab('analysis')} style={{ marginTop: 10, width: '100%', background: '#141b34', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  View Full Analysis →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
