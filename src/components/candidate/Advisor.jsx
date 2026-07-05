import React, { useEffect, useRef } from 'react';
import AdvisorConversational from './AdvisorConversational.jsx';
import { visibleCandidateChat } from '../../lib/candidateChat.js';

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, sendIdleCheckin, busy, scores, profile, programs, setShowCvModal, setCandTab, narrative, setNarrative, tasks, completedTasks, setCompletedTasks, authUser, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, cvText }) {
  const idleTimerRef = useRef(null);
  const idleCountRef = useRef(0);
  const MAX_IDLE_FIRES = 2;

  const visibleChat = visibleCandidateChat(chat, {
    whatsapp: authUser?.whatsappOptIn === true,
    telegram: authUser?.telegramOptIn === true,
  });

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

  return (
    <AdvisorConversational
      STEPS={STEPS}
      stepIdx={stepIdx}
      chat={chat}
      input={input}
      setInput={setInput}
      send={send}
      busy={busy}
      scores={scores}
      profile={profile}
      programs={programs}
      setShowCvModal={setShowCvModal}
      cvText={cvText}
      narrative={narrative}
      chosenSchools={chosenSchools}
      setChosenSchools={setChosenSchools}
      confirmTargetSchools={confirmTargetSchools}
      authUser={authUser}
    />
  );
}
