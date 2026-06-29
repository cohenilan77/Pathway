import React, { useEffect, useMemo, useState } from 'react';

function candidateWhatsAppNumber(candidate) {
  return String(candidate?.whatsappNumber || candidate?.phone || '').trim();
}

function disabledReason(candidate) {
  if (!candidateWhatsAppNumber(candidate)) return 'Candidate has no saved WhatsApp number';
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
  const [refreshing, setRefreshing] = useState(false);
  const reason = useMemo(() => disabledReason(candidate), [candidate]);
  const active = !!candidate?.whatsappAiAdvisorSessionActive;
  const blocked = busy || refreshing || (!active && !!reason);

  const refreshCandidate = async ({ quiet = false } = {}) => {
    if (!candidate?.id || refreshing) return;
    setRefreshing(true);
    try {
      const response = await fetch(
        `/api/admin-session?userId=${encodeURIComponent(candidate.id)}`,
        { headers }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) throw new Error(data.error || 'Could not refresh candidate settings.');
      onChanged?.(data.user);
      if (!quiet) notify?.('Candidate WhatsApp settings refreshed.');
    } catch (error) {
      if (!quiet) notify?.(error.message || 'Could not refresh candidate settings.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!candidate?.id) return undefined;
    setRefreshing(true);
    fetch(`/api/admin-session?userId=${encodeURIComponent(candidate.id)}`, { headers })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.user) throw new Error(data.error || 'Could not refresh candidate settings.');
        if (!cancelled) onChanged?.(data.user);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRefreshing(false); });
    return () => { cancelled = true; };
  }, [candidate?.id]);

  const setActive = async (nextActive) => {
    if (!candidate?.id || busy || refreshing || (nextActive && reason)) return;
    setBusy(true);
    try {
      const response = await fetch(
        '/api/whatsapp-ai-advisor-toggle',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ active: nextActive, candidateId: candidate.id }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Could not update WhatsApp AI Advisor (HTTP ${response.status}).`);
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
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: active ? '#128C7E' : '#6b7392' }}>
            {active ? 'ON — WhatsApp AI chat allowed' : 'OFF — website chat is the default'}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="WhatsApp AI Advisor"
          disabled={blocked}
          onClick={() => setActive(!active)}
          style={{
            position: 'relative',
            width: 66,
            height: 34,
            flexShrink: 0,
            border: 'none',
            borderRadius: 999,
            padding: 3,
            background: active ? '#25D366' : '#c8cbd5',
            cursor: blocked ? 'not-allowed' : 'pointer',
            opacity: blocked ? 0.55 : 1,
            transition: 'background .2s ease',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: active ? 35 : 3,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 7px rgba(0,0,0,.2)',
            transition: 'left .2s ease',
          }} />
          <span style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: active ? 8 : 31,
            display: 'flex',
            alignItems: 'center',
            color: '#fff',
            fontSize: 9,
            fontWeight: 900,
          }}>
            {busy || refreshing ? '…' : active ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
      {reason && !active && (
        <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: '#e0457a' }}>{reason}</span>
          <button
            type="button"
            onClick={() => refreshCandidate()}
            disabled={refreshing}
            style={{ border: '1px solid #d8dfeb', borderRadius: 8, padding: '5px 8px', background: '#fff', color: '#5b46e0', fontSize: 10.5, fontWeight: 800, cursor: refreshing ? 'wait' : 'pointer' }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh settings'}
          </button>
        </div>
      )}
      <div style={{ marginTop: 9, fontSize: 11.5, color: '#6b7392' }}>
        {active
          ? 'Candidate replies are handled by the AI Advisor on WhatsApp. Switch OFF to stop WhatsApp AI replies.'
          : 'Switch ON to send the approved kickoff template and begin after the candidate replies.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 12, fontSize: 11.5, color: '#6b7392' }}>
        <span>WhatsApp: {candidateWhatsAppNumber(candidate) || '—'}</span>
        <span>Last inbound: {formatDate(candidate?.whatsappLastInboundAt)}</span>
        <span>Last template: {formatDate(candidate?.whatsappAiAdvisorLastTemplateSentAt)}</span>
        <span>Started at: {formatDate(candidate?.whatsappAiAdvisorSessionStartedAt)}</span>
        <span>Started by: {candidate?.whatsappAiAdvisorSessionStartedBy || '—'}</span>
      </div>
    </div>
  );
}
