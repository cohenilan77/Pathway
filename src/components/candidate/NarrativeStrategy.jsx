import React from 'react';

export default function NarrativeStrategy({ narrative, setNarrative, setCandTab, send, noop }) {
  const narrCard = (kind) => {
    const on = narrative === kind;
    const accent = kind === 'pivot' ? '#c2962f' : '#16233f';
    return {
      card: {
        position: 'relative', background: '#fff',
        border: on ? `2px solid ${accent}` : '1.5px solid #e6e9f2',
        borderRadius: 18, padding: 30, cursor: 'pointer', transition: 'all .15s',
        boxShadow: on ? '0 18px 44px rgba(15,26,48,.14)' : '0 2px 10px rgba(15,26,48,.04)',
      },
      badge: {
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
        fontWeight: 700, letterSpacing: '.5px', padding: '6px 12px', borderRadius: 7,
        background: kind === 'pivot' ? '#faf0d6' : '#eef1fc',
        color: kind === 'pivot' ? '#7a5d12' : '#2b3c63',
      },
      check: {
        width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: on ? accent : '#fff',
        border: on ? 'none' : '1.5px solid #d7ddec', flexShrink: 0,
      },
      on,
    };
  };

  const upgrade = narrCard('upgrade');
  const pivot = narrCard('pivot');

  return (
    <div style={{ flex: 1, minHeight: '100vh', background: '#faf6ec', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '44px 44px 64px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>STEP 5 · BEFORE YOU WRITE</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 46, lineHeight: 1.06, fontWeight: 800, color: '#16233f', margin: '0 0 14px' }}>
          Choose Your Narrative
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: '#5d6577', margin: '0 0 36px', maxWidth: '64ch' }}>
          Now that we have your programs and fit, we engineer the <em>story</em> that ties your resume, profile, grades and target program together. Admissions boards do not read achievements — they read <strong>narratives</strong>. Every candidate's arc bends toward one of two strategic postures.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 14 }}>
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
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="m5 12 5 5 9-11" />
                  </svg>
                )}
              </span>
            </div>
            <div style={{ width: 50, height: 50, borderRadius: 13, background: '#eef1fc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16233f', marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: '#16233f', margin: '0 0 8px' }}>The Upgrade</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5d6577', margin: '0 0 20px' }}>
              "I am already on a strong track — I need this program to give me the tools and credentials to rise faster within my field." You deepen an existing trajectory rather than redirect it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderTop: '1px solid #eef0f5', paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#2a3447' }}>
                <span style={{ color: '#16233f' }}>▲</span>Continuity of industry &amp; function — a coherent, low-doubt story
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#2a3447' }}>
                <span style={{ color: '#16233f' }}>▲</span>Easy to evidence with promotions &amp; metrics
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#8a93a3' }}>
                <span style={{ color: '#9aa3b5' }}>▽</span>Risk: reads as <em>safe</em> — boards see it often
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
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="m5 12 5 5 9-11" />
                  </svg>
                )}
              </span>
            </div>
            <div style={{ width: 50, height: 50, borderRadius: 13, background: '#faf0d6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8902f', marginBottom: 18 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: '#16233f', margin: '0 0 8px' }}>The Pivot</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5d6577', margin: '0 0 20px' }}>
              "I am changing my career, my sector, or stepping out to build something of my own." A transformation story — you reframe past experience as the launchpad for a bold new direction.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderTop: '1px solid #f0e9d6', paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#2a3447' }}>
                <span style={{ color: '#b8902f' }}>▲</span>Memorable, distinctive — boards reward conviction
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#2a3447' }}>
                <span style={{ color: '#b8902f' }}>▲</span>Career-changer &amp; entrepreneur arcs signal ambition
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#8a93a3' }}>
                <span style={{ color: '#9aa3b5' }}>▽</span>Risk: must justify the "why now" rigorously
              </div>
            </div>
          </div>
        </div>

        {/* Locked narrative banner */}
        {narrative && (
          <div style={{ background: '#16233f', borderRadius: 18, padding: '30px 34px', marginTop: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', animation: 'pwFade .3s ease' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#f5c94c', marginBottom: 8 }}>NARRATIVE LOCKED</div>
              {narrative === 'upgrade' ? (
                <>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Upgrade · Deepen the Trajectory</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: '#aab6cf', margin: 0 }}>
                    Your CV and essays will emphasize momentum, mastery of your craft, and the specific tools this program adds to an already-rising career.
                  </p>
                </>
              ) : (
                <>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Pivot · Engineer the Transformation</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: '#aab6cf', margin: 0 }}>
                    Your CV and essays will reframe past experience as deliberate preparation for a bold change in career, sector, or venture.
                  </p>
                </>
              )}
            </div>
            <button onClick={() => setCandTab('documents')} style={{ background: '#f5c94c', color: '#42320a', border: 'none', borderRadius: 10, padding: '15px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              Continue to CV &amp; Essays
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Strategist note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 14, padding: '20px 22px', marginTop: 24 }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#16233f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>LS</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16233f', marginBottom: 4 }}>Strategist's note</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5d6577', margin: 0 }}>
              There is no wrong answer — only the story we can defend most convincingly to your target boards. Once you choose, I will tailor every CV bullet and essay prompt to that posture.{' '}
              <button onClick={() => setCandTab('advisor')} style={{ background: 'none', border: 'none', color: '#b8902f', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', padding: 0 }}>
                Discuss with your advisor →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
