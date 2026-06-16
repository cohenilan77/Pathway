import React from 'react';

function ScoreDial({ score, stroke, title, desc }) {
  const dashArray = `${score * 3.14} 314`;
  return (
    <div style={{ background: '#fffdf7', borderRadius: 16, padding: '30px 22px', textAlign: 'center', border: '1px solid #efe7d4' }}>
      <svg width="108" height="108" viewBox="0 0 120 120" style={{ display: 'block', margin: '0 auto 8px' }}>
        <circle cx="60" cy="60" r="50" style={{ fill: 'none', stroke: '#efe7d2', strokeWidth: 7 }} />
        <circle cx="60" cy="60" r="50" transform="rotate(-90 60 60)" style={{ fill: 'none', stroke: stroke, strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: dashArray }} />
        <text x="60" y="58" textAnchor="middle" style={{ fontFamily: "'Playfair Display',serif", fontSize: '30px', fontWeight: 700, fill: '#16233f' }}>{score}</text>
        <text x="60" y="74" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', fill: '#9aa3b5' }}>PRC</text>
      </svg>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: '#16233f', margin: '8px 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: '#7a8295', margin: 0 }}>{desc}</p>
    </div>
  );
}

export default function Analysis({ setCandTab, noop }) {
  return (
    <div style={{ flex: 1, minHeight: '100vh', background: '#faf6ec', overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '44px 44px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>CANDIDATE OVERVIEW</div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 46, lineHeight: 1.05, fontWeight: 800, color: '#16233f', margin: 0 }}>
              Admissions<br />Competitiveness
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setCandTab('documents')} style={{ background: '#fff', border: '1px solid #d3c9a8', borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit' }}>
              Strengthen My CV
            </button>
            <button onClick={() => setCandTab('advisor')} style={{ background: '#16233f', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ask Advisor
            </button>
          </div>
        </div>

        {/* Score dials */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 24 }}>
          <ScoreDial score={40} stroke="#c2962f" title="Academic" desc="Exemplary GMAT and GPA metrics across target institutions." />
          <ScoreDial score={34} stroke="#16233f" title="Leadership" desc="Strong professional progression with emerging team management." />
          <ScoreDial score={42} stroke="#c2962f" title="Narrative" desc="Highly cohesive personal brand and unique industry perspective." />
        </div>

        {/* Strengths / Growth */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 48 }}>
          <div style={{ background: '#fffdf7', borderRadius: 16, padding: 30, border: '1px solid #efe7d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efe7d2', paddingBottom: 14, marginBottom: 18 }}>
              <span style={{ color: '#c2962f', fontSize: 18 }}>★</span>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#16233f', margin: 0 }}>Core Strengths</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { title: 'Quantitative Precision', desc: 'Top 2% scoring in logic and mathematical reasoning modules.' },
                { title: 'Social Impact Track', desc: 'Significant contributions to education non-profits over 4 years.' },
                { title: 'Global Versatility', desc: 'Work experience across 3 continents with fluent multi-lingual skills.' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c2962f', marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: '#7a8295', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fffdf7', borderRadius: 16, padding: 30, border: '1px solid #efe7d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efe7d2', paddingBottom: 14, marginBottom: 18 }}>
              <span style={{ color: '#d64545', fontSize: 18 }}>◷</span>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#16233f', margin: 0 }}>Growth Areas</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { title: 'Extracurricular Depth', desc: 'Current activities lack deep long-term leadership commitment.' },
                { title: 'Strategic Networking', desc: 'Alumni engagement at target schools is currently below benchmark.' },
                { title: 'Essay Specificity', desc: "Narrative requires more granular focus on 'Why Us' sections." },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d64545', marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#16233f' }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: '#7a8295', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* School match */}
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>PORTFOLIO OPTIMIZATION</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 800, color: '#16233f', margin: '0 0 28px' }}>Strategic School Match</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
          {/* Harvard card */}
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 420, border: '2px solid #c2962f', background: 'linear-gradient(135deg, #1a2f50 0%, #0d1a2f 100%)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,26,48,.05),rgba(15,26,48,.82))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 22, bottom: 22, right: 22, color: '#fff', pointerEvents: 'none' }}>
              <span style={{ display: 'inline-block', background: '#c2962f', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, marginBottom: 10 }}>Reach</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700 }}>Harvard</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, opacity: .85, marginTop: 4 }}>◍ Cambridge, MA</div>
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#f3d27e' }}>74% Fit</div>
              </div>
            </div>
          </div>
          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', flex: '1.3', minHeight: 200, background: 'linear-gradient(135deg, #2a4870 0%, #1a2f50 100%)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,26,48,.04),rgba(15,26,48,.78))', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: 18, bottom: 18, right: 18, color: '#fff', pointerEvents: 'none' }}>
                <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.22)', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 6, marginBottom: 8 }}>Target</span>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700 }}>Stanford GSB</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: 12, opacity: .85 }}>◍ Palo Alto, CA</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f3d27e' }}>89% Fit</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, flex: 1 }}>
              {[
                { name: 'Columbia', location: 'New York, NY', fit: '94%' },
                { name: 'INSEAD', location: 'Fontainebleau', fit: '91%' },
              ].map(school => (
                <div key={school.name} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 160, background: 'linear-gradient(135deg, #1f3560 0%, #0d1a2f 100%)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,26,48,.06),rgba(15,26,48,.8))', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: 14, bottom: 14, right: 14, color: '#fff', pointerEvents: 'none' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.22)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, marginBottom: 7 }}>Safety</span>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700 }}>{school.name}</div>
                    <div style={{ fontSize: 12, color: '#f3d27e', fontWeight: 700, marginTop: 2 }}>{school.fit} Fit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e7ddc4', marginTop: 40, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, fontSize: 13, color: '#9a8f74' }}>
          <span>© 2024 Pathway Admissions Strategic Advisors. All rights reserved.</span>
          <span style={{ display: 'flex', gap: 24 }}>
            {['Methodology', 'Terms of Service', 'Contact'].map(item => (
              <button key={item} onClick={noop} style={{ background: 'none', border: 'none', color: '#9a8f74', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{item}</button>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
