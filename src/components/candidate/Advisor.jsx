import React from 'react';
import AdvisorConversational from './AdvisorConversational.jsx';

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, sendIdleCheckin, busy, scores, profile, programs, setShowCvModal, setCandTab, narrative, setNarrative, tasks, completedTasks, setCompletedTasks, authUser, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, cvText }) {
  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 999999,
        background: 'red',
        color: 'white',
        fontSize: 18,
        fontWeight: 800,
        padding: '10px 16px'
      }}>
        ACTIVE NEW ADVISOR UI - STAGING
      </div>

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
        chosenSchools={chosenSchools}
        setChosenSchools={setChosenSchools}
        confirmTargetSchools={confirmTargetSchools}
        authUser={authUser}
      />
    </>
  );
}
