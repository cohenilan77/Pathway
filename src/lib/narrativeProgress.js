// N1-N4: the narrative Q&A the advisor walks through before it can present the
// Upgrade/Pivot frameworks. There's no separate counter persisted anywhere, so
// derive progress from how many user replies followed the narrativeStartText turn.
export const NARRATIVE_QUESTIONS_REQUIRED = 4;

export function deriveNarrativeProgress(visibleChat, narrativeStartText) {
  const chat = Array.isArray(visibleChat) ? visibleChat : [];
  const narrativeStartIdx = chat.findIndex(m => m.role === 'ai' && m.text === narrativeStartText);
  const narrativeAnswerCount = narrativeStartIdx === -1
    ? 0
    : chat.slice(narrativeStartIdx + 1).filter(m => m.role === 'user').length;
  return { narrativeAnswerCount, narrativeQnAComplete: narrativeAnswerCount >= NARRATIVE_QUESTIONS_REQUIRED };
}
