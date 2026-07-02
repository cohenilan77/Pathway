import { useState, useCallback } from 'react';

function getToken() {
  try {
    const parsed = JSON.parse(localStorage.getItem('pathway_auth') || '{}');
    return parsed.token || '';
  } catch { return ''; }
}

export function useAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const call = useCallback(async (message, { extra = {}, conversationHistory = [] } = {}) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, extra, conversationHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent request failed');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const match = useCallback((preferences) =>
    call('Find the best schools for my profile', { extra: { preferences } }), [call]);

  const scoreSchool = useCallback((school) =>
    call(`Score my fit for ${school}`, { extra: { preferences: { school } } }), [call]);

  const reviewEssay = useCallback((essay, prompt, school) =>
    call(`Review my essay for ${school}`, { extra: { essay, prompt, school } }), [call]);

  const draftEssay = useCallback((prompt, school, wordLimit) =>
    call(`Draft an essay for ${school}: ${prompt}`, { extra: { prompt, school, wordLimit } }), [call]);

  const predictOutcomes = useCallback((targetSchools) =>
    call('Predict my admission chances', { extra: { targetSchools } }), [call]);

  const whatIf = useCallback((changes) =>
    call('What if I improve my profile?', { extra: { hypotheticalChanges: changes } }), [call]);

  const getSchedule = useCallback((days = 30) =>
    call(`Show my next ${days} days`, { extra: { viewSchedule: true, days } }), [call]);

  const addEvent = useCallback((eventMessage) =>
    call(eventMessage), [call]);

  const findStudyPartners = useCallback(() =>
    call('Find study partners for me', { extra: { findPartners: true } }), [call]);

  const startMockInterview = useCallback((school, questionType) =>
    call(`Start a mock interview for ${school}`, { extra: { school, questionType } }), [call]);

  const evaluateInterviewAnswer = useCallback((answer, question, school) =>
    call(`Evaluate my interview answer for ${school}`, { extra: { answer, question, school } }), [call]);

  return {
    loading,
    error,
    call,
    match,
    scoreSchool,
    reviewEssay,
    draftEssay,
    predictOutcomes,
    whatIf,
    getSchedule,
    addEvent,
    findStudyPartners,
    startMockInterview,
    evaluateInterviewAnswer,
  };
}
