import React, { useEffect, useMemo, useState } from 'react';

function candidateWhatsAppNumber(candidate) {
  return String(candidate?.whatsappNumber || candidate?.phone || '').trim();
}

function activationDisabledReason(candidate, phone, consentConfirmed) {
  if (!String(phone || '').trim()) return 'Enter the candidate WhatsApp number below';
  if (!consentConfirmed) return 'Confirm the candidate agreed to receive WhatsApp messages';
  if (candidate?.whatsappOptOut === true) return 'Candidate opted out of WhatsApp';
  if (candidate?.whatsappAiAdvisorTemplateConfigured === false) return 'WhatsApp advisor kickoff template is not configured';
  return '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function WhatsAppAiAdvisorToggle({ candidate, headers, onChanged, notify }) {
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState(() => candidateWhatsAppNumber(candidate));
  const [consentConfirmed, setConsentConfirmed] = useState(() => candidate?.whatsappOptIn === true);
  const active = !!candidate?.whatsappAiAdvisorSessionActive;
  const reason = useMemo(
    () => activationDisabledReason(candidate, phone, consentConfirmed),
    [candidate, phone, consentConfirmed]
  );
  const blocked = busy || (!active && !!reason);

  useEffect(() => {
    setPhone(candidateWhatsAppNumber(candidate));
    setConsentConfirmed(candidate?.whatsappOptIn === true);
  }, [candidate?.id, candidate?.whatsappNumber, candidate?.phone, candidate?.whatsappOptIn]);

  const setActive = async (nextActive) => {
    if (!candidate?.id || busy || (nextActive && reason)) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidate.id)}/whatsapp-ai-advisor-toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            active: nextActive,
            candidateId: candidate.id,
            whatsappNumber: phone.trim(),
            whatsappOptIn: consentConfirmed,
          }),
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
            {busy ? '…' : active ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {!active && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#f6f1e8' }}>
          <label htmlFor={`whatsapp-number-${candidate?.id || 'candidate'}`} style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#33405e', marginBottom: 6 }}>
            Candidate WhatsApp number
          </label>
          <input
            id={`whatsapp-number-${candidate?.id || 'candidate'}`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+972501234567"
            inputMode="tel"
            autoComplete="tel"
            disabled={busy}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              border: '1.5px solid #d8dfeb',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              fontFamily: 'inherit',
              background: '#fff',
              color: '#141b34',
              outline: 'none',
            }}
          />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, fontSize: 11.5, lineHeight: 1.4, color: '#4d5775', cursor: busy ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={consentConfirmed}
              onChange={(event) => setConsentConfirmed(event.target.checked)}
              disabled={busy}
              style={{ marginTop: 2 }}
            />
            <span>Candidate explicitly agreed to receive Pathway WhatsApp messages.</span>
          </label>
        </div>
      )}

      {reason && !active && <div style={{ marginTop: 9, fontSize: 11.5, color: '#e0457a' }}>{reason}</div>}
      <div style={{ marginTop: 9, fontSize: 11.5, color: '#6b7392' }}>
        {active
          ? 'Candidate replies are handled by the AI Advisor on WhatsApp. Switch OFF to stop WhatsApp AI replies.'
          : 'Enter the number with country code, confirm consent, then switch ON to send the approved kickoff template.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 12, fontSize: 11.5, color: '#6b7392' }}>
        <span>WhatsApp: {candidateWhatsAppNumber(candidate) || phone || '—'}</span>
        <span>Last inbound: {formatDate(candidate?.whatsappLastInboundAt)}</span>
        <span>Last template: {formatDate(candidate?.whatsappAiAdvisorLastTemplateSentAt)}</span>
        <span>Started at: {formatDate(candidate?.whatsappAiAdvisorSessionStartedAt)}</span>
        <span>Started by: {candidate?.whatsappAiAdvisorSessionStartedBy || '—'}</span>
      </div>
    </div>
  );
}
