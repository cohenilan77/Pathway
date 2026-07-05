import React from 'react';
import AdvisorConversational from './AdvisorConversational.jsx';

export default function Advisor({ STEPS, stepIdx, chat, input, setInput, send, sendIdleCheckin, busy, scores, profile, programs, setShowCvModal, setCandTab, narrative, setNarrative, tasks, completedTasks, setCompletedTasks, authUser, chosenSchools, setChosenSchools, reopenProgramSelection, confirmTargetSchools, cvText }) {
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
