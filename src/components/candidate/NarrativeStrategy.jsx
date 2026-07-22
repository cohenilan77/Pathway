import React from 'react';

export default function NarrativeStrategy({ narrative, setNarrative, setCandTab, send, noop }) {
  const narrCard = (kind) => {
    const on = narrative === kind;
    const accent = kind === 'pivot' ? '#ffcaa6' : '#6d8cff';
    const gradient = kind === 'pivot' ? 'linear-gradient(135deg,#ffcaa6,#ffd0dc)' : 'linear-gradient(135deg,#3a63ff,#6d8cff)';
    return {
      card: {
        position: 'relative', background: '#f2f6ff',
        border: on ? `2px solid ${accent}` : '1.5px solid #dbe4f7',
        borderRadius: 22, padding: 30, cursor: 'pointer', transition: 'all .15s',
        boxShadow: on ? `0 18px 40px ${kind === 'pivot' ? 'rgba(255,138,76,.22)' : 'rgba(58,99,255,.24)'}` : '0 18px 40px rgba(30,45,90,.06)',
      },
      badge: {
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
        fontWeight: 800, letterSpacing: '.5px', padding: '6px 12px', borderRadius: 9,
        background: kind === 'pivot' ? '#fff1e8' : '#dbe4f7',
        color: kind === 'pivot' ? '#ff8a4c' : '#6d8cff',
      },
      check: {
        width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: on ? gradient : '#f2f6ff',
        boxShadow: on ? `0 6px 14px ${kind === 'pivot' ? 'rgba(255,138,76,.36)' : 'rgba(58,99,255,.36)'}` : 'none',
        border: on ? 'none' : '1.5px solid #e3ebfa', flexShrink: 0,
      },
      iconBg: kind === 'pivot' ? '#fff1e8' : '#dbe4f7',
      iconColor: kind === 'pivot' ? '#ff8a4c' : '#6d8cff',
      gradient,
      accent,
      on,
    };
  };

  const upgrade = narrCard('upgrade');
  const pivot = narrCard('pivot');

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 34px 64px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: '#3a63ff', marginBottom: 10 }}>STEP 5 · BEFORE YOU WRITE</div>
        <h1 style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 800, color: '#111a33', margin: '0 0 14px', letterSpacing: '-.6px' }}>
          Choose Your Narrative
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: '#5a6a8f', margin: '0 0 32px', maxWidth: '64ch', fontWeight: 500 }}>
          Now that we have your programs and fit, we engineer the <em>story</em> that ties your resume, profile, grades and target program together. Admissions boards do not read achievements — they read <strong style={{ color: '#111a33' }}>narratives</strong>. Every candidate's arc bends toward one of two strategic postures.
        </p>

        <div className="pw-narrative-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
          {/* Upgrade card */}
          <div onClick={() => { setNarrative('upgrade'); send && send("I've chosen the Upgrade narrative. Please craft my complete narrative strategy now for my chosen schools."); setCandTab('advisor'); }} style={upgrade.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <span style={upgrade.badge}>
                <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
                LOWER RISK
              </span>
              <span style={upgrade.check}>
                {upgrade.on && (
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: '#f2f6ff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="m5 12 5 5 9-11" />
                  </svg>
                )}
              </span>
            </div>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: upgrade.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: upgrade.iconColor, marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111a33', margin: '0 0 8px', letterSpacing: '-.4px' }}>The Upgrade</h2>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: '#5a6a8f', margin: '0 0 20px' }}>
              "I am already on a strong track — I need this program to give me the tools and credentials to rise faster within my field." You deepen an existing trajectory rather than redirect it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderTop: '1px solid #dbe4f7', paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#38456b' }}>
                <span style={{ color: '#3a63ff' }}>▲</span>Continuity of industry &amp; function — a coherent, low-doubt story
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#38456b' }}>
                <span style={{ color: '#3a63ff' }}>▲</span>Easy to evidence with promotions &amp; metrics
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#8b97b8' }}>
                <span style={{ color: '#97a3c0' }}>▽</span>Risk: reads as <em>safe</em> — boards see it often
              </div>
            </div>
          </div>

          {/* Pivot card */}
          <div onClick={() => { setNarrative('pivot'); send && send("I've chosen the Pivot narrative. Please craft my complete narrative strategy now for my chosen schools."); setCandTab('advisor'); }} style={pivot.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <span style={pivot.badge}>
                <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
                </svg>
                HIGHER REWARD
              </span>
              <span style={pivot.check}>
                {pivot.on && (
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: '#f2f6ff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="m5 12 5 5 9-11" />
                  </svg>
                )}
              </span>
            </div>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: pivot.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pivot.iconColor, marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
              </svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111a33', margin: '0 0 8px', letterSpacing: '-.4px' }}>The Pivot</h2>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: '#5a6a8f', margin: '0 0 20px' }}>
              "I am changing my career, my sector, or stepping out to build something of my own." A transformation story — you reframe past experience as the launchpad for a bold new direction.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderTop: '1px solid #fff1e8', paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#38456b' }}>
                <span style={{ color: '#ff8a4c' }}>▲</span>Memorable, distinctive — boards reward conviction
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#38456b' }}>
                <span style={{ color: '#ff8a4c' }}>▲</span>Career-changer &amp; entrepreneur arcs signal ambition
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#8b97b8' }}>
                <span style={{ color: '#97a3c0' }}>▽</span>Risk: must justify the "why now" rigorously
              </div>
            </div>
          </div>
        </div>

        {/* Locked narrative banner */}
        {narrative && (
          <div className="pw-narrative-locked-banner" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#111a33,#3a63ff)', borderRadius: 20, padding: '28px 32px', marginTop: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', animation: 'pwFade .3s ease', boxShadow: '0 16px 30px rgba(30,45,90,.28)' }}>
            <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div className="pw-narrative-locked-copy" style={{ flex: 1, minWidth: 280, position: 'relative' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: '#f2a63b', marginBottom: 8 }}>NARRATIVE LOCKED</div>
              {narrative === 'upgrade' ? (
                <>
                  <h3 style={{ fontSize: 21, fontWeight: 800, color: '#f2f6ff', margin: '0 0 6px', letterSpacing: '-.3px' }}>Upgrade · Deepen the Trajectory</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#dbe4f7', margin: 0 }}>
                    Your CV and essays will emphasize momentum, mastery of your craft, and the specific tools this program adds to an already-rising career.
                  </p>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 21, fontWeight: 800, color: '#f2f6ff', margin: '0 0 6px', letterSpacing: '-.3px' }}>Pivot · Engineer the Transformation</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#dbe4f7', margin: 0 }}>
                    Your CV and essays will reframe past experience as deliberate preparation for a bold change in career, sector, or venture.
                  </p>
                </>
              )}
            </div>
            <button onClick={() => setCandTab('documents')} style={{ position: 'relative', background: '#f2f6ff', color: '#3a63ff', border: 'none', borderRadius: 13, padding: '15px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, boxShadow: '0 10px 20px rgba(0,0,0,.18)' }}>
              Continue to CV &amp; Essays
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Strategist note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#f2f6ff', border: '1px solid #dbe4f7', borderRadius: 18, padding: '20px 22px', marginTop: 24, boxShadow: '0 18px 40px rgba(30,45,90,.06)' }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(140deg,#3a63ff,#6d8cff)', color: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0, boxShadow: '0 8px 16px rgba(58,99,255,.32)' }}>LS</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111a33', marginBottom: 4 }}>Strategist's note</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#5a6a8f', margin: 0 }}>
              There is no wrong answer — only the story we can defend most convincingly to your target boards. Once you choose, I will tailor every CV bullet and essay prompt to that posture.{' '}
              <button onClick={() => setCandTab('advisor')} style={{ background: 'none', border: 'none', color: '#3a63ff', fontWeight: 700, cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', padding: 0 }}>
                Discuss with your advisor →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
