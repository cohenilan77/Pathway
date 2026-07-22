import React, { useState } from 'react';

// First-run track picker for new candidates. Replaces the old opening chat
// "Which path best describes you?" turn. Selecting a card simply feeds the
// existing send() pipeline the matching opening-path token, so category
// persistence, the Graduate degree sub-flow, tab switching, and server sync
// all run exactly as before — this is purely a nicer UI over that question.
// The send tokens map through lib/onboarding.js#resolveOpeningPathChoice:
//   'Undergraduate' -> Undergraduate
//   'Graduate'      -> Graduate
//   'PhD'           -> Postgraduate / Doctoral
//   'Personal Development' -> Personal Development
const TRACKS = [
  {
    key: 'graduate',
    icon: '🎓',
    title: 'Graduate Programs',
    desc: "MBA, MSc, LLM, and professional master's degrees",
    sendValue: 'Graduate',
  },
  {
    key: 'doctoral',
    icon: '🔬',
    title: 'Postgraduate / Doctoral',
    desc: 'PhD, DBA, and research-based doctoral programs',
    sendValue: 'PhD',
  },
  {
    key: 'undergraduate',
    icon: '📚',
    title: 'Undergraduate',
    desc: "Bachelor's applications and 4-year profile building",
    sendValue: 'Undergraduate',
  },
  {
    key: 'personalDev',
    icon: '🚀',
    title: 'Personal Development',
    desc: 'Career coaching and personal narrative clarity',
    sendValue: 'Personal Development',
  },
];

const HELP_MESSAGE = "I'm not sure which path fits me best — can you help me decide?";

export default function OnboardingModal({ send, busy, onDismiss }) {
  const [picking, setPicking] = useState(false);

  const choose = (value) => {
    if (busy || picking) return;
    setPicking(true);
    // send() sets profile.category via resolveOpeningPathChoice and drives the
    // rest of the opening flow. Once category is set the parent stops rendering
    // this modal, so no explicit close is needed.
    send(value);
  };

  const helpMeDecide = () => {
    if (busy || picking) return;
    setPicking(true);
    // No category yet — dismiss the gate for this session and let the advisor
    // guide them. Their eventual answer still resolves through send().
    if (onDismiss) onDismiss();
    send(HELP_MESSAGE);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose your track"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: 'rgba(17,26,51,.55)', backdropFilter: 'blur(4px)',
        animation: 'pwFade .2s ease',
      }}
    >
      <style>{`
        .pw-onb-card { transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease; }
        .pw-onb-card:hover:not(:disabled) { transform: translateY(-2px); border-color: #3a63ff; background: #f2f6ff; box-shadow: 0 10px 30px rgba(30,45,90,.08); }
        .pw-onb-help:hover:not(:disabled) { border-color: #3a63ff; color: #2f52e6; }
        .pw-onb-card:disabled, .pw-onb-help:disabled { opacity: .6; cursor: default; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 620, background: '#fff', borderRadius: 24,
        border: '1px solid #e3ebfa', boxShadow: '0 24px 60px rgba(30,45,90,.28)',
        padding: '30px 30px 26px', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', boxShadow: '0 6px 16px rgba(58,99,255,.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="19" height="19" viewBox="0 0 12 12" fill="none"><path d="M2 9.5 6 2.5 10 9.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 22, fontWeight: 700, color: '#111a33', letterSpacing: '-.015em' }}>
            Welcome to Pathway
          </div>
        </div>
        <div style={{ fontSize: 14, color: '#5a6a8f', lineHeight: 1.55, marginBottom: 22 }}>
          Which path best describes you? This tailors your advisor, roadmap, and scoring to your goals — you can change it later in Settings.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 }} className="pw-onb-grid">
          {TRACKS.map((t) => (
            <button
              key={t.key}
              className="pw-onb-card"
              disabled={busy || picking}
              onClick={() => choose(t.sendValue)}
              style={{
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                border: '2px solid #e3ebfa', borderRadius: 18, padding: 18, background: '#fff',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">{t.icon}</span>
              <span style={{ fontSize: 15.5, fontWeight: 800, color: '#111a33', marginTop: 4 }}>{t.title}</span>
              <span style={{ fontSize: 12.5, color: '#5a6a8f', lineHeight: 1.5 }}>{t.desc}</span>
            </button>
          ))}
        </div>

        <button
          className="pw-onb-help"
          disabled={busy || picking}
          onClick={helpMeDecide}
          style={{
            marginTop: 14, width: '100%', cursor: 'pointer', fontFamily: 'inherit',
            border: '1px solid #dbe4f7', borderRadius: 14, padding: '13px 16px', background: '#f2f6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 13.5, fontWeight: 700, color: '#38456b', transition: 'border-color 150ms ease, color 150ms ease',
          }}
        >
          <span aria-hidden="true">❓</span>
          Help me decide — talk it through with my advisor
        </button>
      </div>
    </div>
  );
}
