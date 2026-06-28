import React, { useMemo, useState } from 'react';

function disabledReason(candidate) {
  if (!candidate?.whatsappNumber) return 'Candidate has no WhatsApp number';
  if (candidate.whatsappOptIn !== true) return 'Candidate has not opted in to WhatsApp';
  if (candidate.whatsappOptOut === true) return 'Candidate opted out of WhatsApp';
  if (candidate.whatsappAiAdvisorTemplateConfigured === false) return 'WhatsApp advisor kickoff template is not configured';
  return '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function WhatsAppAiAdvisorToggle({ candidate, headers, onChanged, notify }) {
  const [busy, setBusy] = useState(false);
  const reason = useMemo(() => disabledReason(candidate), [candidate]);
  const active = !!candidate?.whatsappAiAdvisorSessionActive;

  const setActive = async (nextActive) => {
    if (!candidate?.id || busy || (nextActive && reason)) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidate.id)}/whatsapp-ai-advisor-toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ active: nextActive, candidateId: candidate.id }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update WhatsApp AI Advisor.');
      onChanged?.(data.candidate);
      notify?.(data.message);
    } catch (error) {
      notify?.(error.message || 'Could not update WhatsApp AI Advisor.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 14, padding: 14, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: '#9098b5' }}>AI WHATSAPP ADVISOR</div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: active ? '#19c08a' : '#6b7392' }}>
            {active ? 'ON' : 'OFF'}
          </div>
        </div>
        <button
          type="button"
          disabled={busy || (!active && !!reason)}
          onClick={() => setActive(!active)}
          style={{
            border: 'none', borderRadius: 10, padding: '9px 12px', fontWeight: 800,
            color: '#fff', background: active ? '#e384a5' : 'linear-gradient(135deg,#25D366,#128C7E)',
            cursor: busy || (!active && reason) ? 'not-allowed' : 'pointer',
            opacity: busy || (!active && reason) ? 0.55 : 1,
          }}
        >
          {busy ? 'Updating…' : active ? 'Pause AI Advisor' : 'Start AI Advisor on WhatsApp'}
        </button>
      </div>
      {reason && !active && <div style={{ marginTop: 9, fontSize: 11.5, color: '#e0457a' }}>{reason}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 12, fontSize: 11.5, color: '#6b7392' }}>
        <span>Last template: {formatDate(candidate?.whatsappAiAdvisorLastTemplateSentAt)}</span>
        <span>Last inbound: {formatDate(candidate?.whatsappLastInboundAt)}</span>
        <span>Started at: {formatDate(candidate?.whatsappAiAdvisorSessionStartedAt)}</span>
        <span>Started by: {candidate?.whatsappAiAdvisorSessionStartedBy || '—'}</span>
      </div>
    </div>
  );
}
