// ConsultantAlertAgent — escalates candidate risks to the consultant/admin as
// structured, stored alerts (general: works for any candidate type, though the
// undergrad engine is the primary caller).

import { makeAlert } from '../schemas.js';
import { addAlert } from '../store.js';

// Create + store one alert. De-duplicated by content-addressed id so the same
// risk does not pile up duplicate open alerts.
export function raiseAlert(state, { candidateId, candidateName, candidateType = 'Undergraduate', reason, severity = 'medium', recommendedAction = '', taskId = null }, now = Date.now()) {
  const existingOpen = (state?.alerts || []).some(a => a.reason === reason && a.relatedTaskId === (taskId || null) && a.status === 'open');
  const alert = makeAlert({ candidateId, candidateName, candidateType, reason, severity, recommendedAction, taskId }, now);
  if (existingOpen) return { state, alert: null };
  return { state: addAlert(state, alert, now), alert };
}

export function setAlertStatus(state, alertId, status, { snoozeUntil = null, now = Date.now() } = {}) {
  const alerts = (state?.alerts || []).map(a => (a.id === alertId
    ? { ...a, status, snoozedUntil: status === 'snoozed' ? snoozeUntil : null, updatedAt: now }
    : a));
  return { ...state, alerts };
}
