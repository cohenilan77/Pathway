import React from 'react';
import Chat from './Chat.jsx';
import { PLAN_DETAILS } from './Settings.jsx';

// Undergraduate "Live Chat" tab — the human-support hub. Reuses the existing,
// fully-wired Chat.jsx thread (real /api/chat/send + /api/chat/messages
// polling) and keeps the plan/package cards visually below it, per the brief.
// Reuses the same PLAN_DETAILS + upgrade wiring Settings.jsx already uses
// (setPlan / setShowContactModal / showToast are already threaded through
// CandidatePortal's props spread), so there is no second source of truth for
// pricing or the upgrade flow.
function PackagesPanel({ plan, setPlan, setShowContactModal, showToast }) {
  const handleSelectPlan = (key) => {
    if (key === plan) return;
    setPlan(key);
    const label = PLAN_DETAILS.find(p => p.key === key)?.label || key;
    if (key === 'ai_strategy') {
      showToast('AI + Strategy selected — connecting you with a consultant.');
      setShowContactModal(true);
    } else {
      showToast(`Plan updated to ${label}.`);
    }
  };

  return (
    <div className="pw-livechat-packages" style={{ padding: '18px 28px 28px', borderTop: '1px solid #dbe4f7', flexShrink: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#8b97b8', textTransform: 'uppercase', marginBottom: 12 }}>Plans &amp; packages</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {PLAN_DETAILS.map(p => {
          const active = plan === p.key;
          return (
            <div key={p.key} style={{ background: '#ffffff', border: active ? '2px solid #3a63ff' : '1px solid #e3ebfa', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111a33' }}>{p.label}</div>
                {active && <span style={{ fontSize: 11, fontWeight: 800, color: '#3a63ff', background: '#eef1ff', borderRadius: 999, padding: '3px 9px' }}>Current</span>}
              </div>
              <div style={{ fontSize: 12.5, color: '#5a6a8f', lineHeight: 1.5, marginBottom: 14 }}>{p.description}</div>
              <button
                onClick={() => handleSelectPlan(p.key)}
                disabled={active}
                style={{
                  width: '100%', border: 'none', borderRadius: 999, padding: '9px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  color: active ? '#8b97b8' : '#fff',
                  background: active ? '#dbe4f7' : 'linear-gradient(135deg,#3a63ff,#6d8cff)',
                  cursor: active ? 'default' : 'pointer',
                }}
              >
                {active ? 'Current plan' : p.key === 'ai_strategy' ? 'Talk to a consultant' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LiveChatHub(props) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Chat {...props} />
      </div>
      <PackagesPanel plan={props.plan} setPlan={props.setPlan} setShowContactModal={props.setShowContactModal} showToast={props.showToast} />
    </div>
  );
}
