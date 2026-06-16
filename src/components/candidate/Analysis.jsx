import React from 'react';

function ScoreDial({ score, stroke, title, desc }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  return (
    <div style={{ background: '#fffdf7', borderRadius: 16, padding: '30px 22px', textAlign: 'center', border: '1px solid #efe7d4' }}>
      <svg width="108" height="108" viewBox="0 0 120 120" style={{ display: 'block', margin: '0 auto 8px' }}>
        <circle cx="60" cy="60" r="50" style={{ fill: 'none', stroke: '#efe7d2', strokeWidth: 7 }} />
        <circle cx="60" cy="60" r="50" transform="rotate(-90 60 60)"
          style={{ fill: 'none', stroke: stroke, strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: `${pct * 3.14} 314` }} />
        <text x="60" y="58" textAnchor="middle" style={{ fontFamily: "'Playfair Display',serif", fontSize: '30px', fontWeight: 700, fill: '#16233f' }}>{pct}</text>
        <text x="60" y="74" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', fill: '#9aa3b5' }}>/ 100</text>
      </svg>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#16233f', margin: '8px 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: '#7a8295', margin: 0 }}>{desc}</p>
    </div>
  );
}

const TIER_COLORS = { reach: '#c2962f', target: 'rgba(255,255,255,.22)', safety: 'rgba(255,255,255,.22)' };
const SCHOOL_GRADIENTS = [
  'linear-gradient(135deg,#1a2f50 0%,#0d1a2f 100%)',
  'linear-gradient(135deg,#2a4870 0%,#1a2f50 100%)',
  'linear-gradient(135deg,#1f3560 0%,#0d1a2f 100%)',
  'linear-gradient(135deg,#162844 0%,#0a1520 100%)',
  'linear-gradient(135deg,#243560 0%,#111e3a 100%)',
  'linear-gradient(135deg,#1c3050 0%,#0c1825 100%)',
];

export default function Analysis({ setCandTab, scores, strengths, weaknesses, programs, profile }) {
  const hasData = !!scores;

  if (!hasData) {
    return (
      <div style={{ flex: 1, minHeight: '100vh', background: '#faf6ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 24px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0e8d4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" style={{ fill: 'none', stroke: '#b8902f', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: '#16233f', margin: '0 0 14px' }}>Analysis Not Yet Available</h2>
          <p style={{ fontSize: 15, color: '#7a8295', lineHeight: 1.65, margin: '0 0 28px' }}>
            Your competitiveness analysis will appear here once the advisor has enough information about your profile. Paste your CV or answer a few questions to get started.
          </p>
          <button onClick={() => setCandTab('advisor')}
            style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Go to Advisor →
          </button>
        </div>
      </div>
    );
  }

  const scoreItems = [
    { key: 'academic', title: 'Academic', stroke: '#c2962f', desc: 'GPA, test scores, and quantitative aptitude relative to program benchmarks.' },
    { key: 'professional', title: 'Professional', stroke: '#16233f', desc: 'Career trajectory, impact, and industry positioning.' },
    { key: 'leadership', title: 'Leadership', stroke: '#c2962f', desc: 'Team leadership, initiative, and influence track record.' },
    { key: 'narrative', title: 'Narrative', stroke: '#16233f', desc: 'Cohesion of personal brand and clarity of purpose.' },
    { key: 'potential', title: 'Potential', stroke: '#c2962f', desc: 'Long-term upside and fit with program outcomes.' },
  ].filter(item => scores[item.key] != null);

  const displayStrengths = strengths || [];
  const displayWeaknesses = weaknesses || [];
  const displayPrograms = programs || [];

  return (
    <div style={{ flex: 1, minHeight: '100vh', background: '#faf6ec', overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '44px 44px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>CANDIDATE OVERVIEW</div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 46, lineHeight: 1.05, fontWeight: 800, color: '#16233f', margin: 0 }}>
              {profile?.name ? `${profile.name}'s` : 'Your'}<br />Competitiveness
            </h1>
            {profile && (
              <div style={{ marginTop: 12, fontSize: 14, color: '#7a8295' }}>
                {[profile.degree, profile.gpa && `GPA ${profile.gpa}`, profile.gmat && `GMAT ${profile.gmat}`, profile.experience].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setCandTab('documents')}
              style={{ background: '#fff', border: '1px solid #d3c9a8', borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#16233f', cursor: 'pointer', fontFamily: 'inherit' }}>
              Strengthen My CV
            </button>
            <button onClick={() => setCandTab('advisor')}
              style={{ background: '#16233f', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ask Advisor
            </button>
          </div>
        </div>

        {/* Overall score banner */}
        {scores.overall && (
          <div style={{ background: '#16233f', borderRadius: 16, padding: '22px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#9bb0d8', marginBottom: 4 }}>OVERALL COMPETITIVENESS SCORE</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 800, color: '#fff' }}>{scores.overall}<span style={{ fontSize: 20, color: '#9bb0d8' }}>/100</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {scoreItems.map(item => (
                <div key={item.key} style={{ background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{scores[item.key]}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9bb0d8' }}>{item.title.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score dials */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(scoreItems.length, 3)}, 1fr)`, gap: 18, marginBottom: 24 }}>
          {scoreItems.slice(0, 3).map(item => (
            <ScoreDial key={item.key} score={scores[item.key]} stroke={item.stroke} title={item.title} desc={item.desc} />
          ))}
        </div>

        {/* Strengths / Growth areas */}
        {(displayStrengths.length > 0 || displayWeaknesses.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 48 }}>
            {displayStrengths.length > 0 && (
              <div style={{ background: '#fffdf7', borderRadius: 16, padding: 30, border: '1px solid #efe7d4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efe7d2', paddingBottom: 14, marginBottom: 18 }}>
                  <span style={{ color: '#c2962f', fontSize: 18 }}>★</span>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#16233f', margin: 0 }}>Core Strengths</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {displayStrengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c2962f', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 14, color: '#2a3447', lineHeight: 1.5 }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {displayWeaknesses.length > 0 && (
              <div style={{ background: '#fffdf7', borderRadius: 16, padding: 30, border: '1px solid #efe7d4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efe7d2', paddingBottom: 14, marginBottom: 18 }}>
                  <span style={{ color: '#d64545', fontSize: 18 }}>◷</span>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#16233f', margin: 0 }}>Growth Areas</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {displayWeaknesses.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d64545', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 14, color: '#2a3447', lineHeight: 1.5 }}>{w}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* School match */}
        {displayPrograms.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>PORTFOLIO OPTIMIZATION</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 800, color: '#16233f', margin: '0 0 28px' }}>Strategic School Match</h2>
            <div style={{ display: 'grid', gridTemplateColumns: displayPrograms.length > 1 ? '1.3fr 1fr' : '1fr', gap: 18 }}>
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 420, border: '2px solid #c2962f', background: SCHOOL_GRADIENTS[0] }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,26,48,.05),rgba(15,26,48,.82))', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 22, bottom: 22, right: 22, color: '#fff' }}>
                  <span style={{ display: 'inline-block', background: '#c2962f', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, marginBottom: 10, textTransform: 'capitalize' }}>{displayPrograms[0].tier}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700 }}>{displayPrograms[0].name}</div>
                      {displayPrograms[0].location && <div style={{ fontSize: 13, opacity: .85, marginTop: 4 }}>◍ {displayPrograms[0].location}</div>}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: '#f3d27e' }}>{displayPrograms[0].fit}% Fit</div>
                  </div>
                </div>
              </div>
              {displayPrograms.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {displayPrograms.slice(1, 4).map((p, i) => (
                    <div key={p.name} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', flex: i === 0 ? '1.3' : '1', minHeight: i === 0 ? 200 : 140, background: SCHOOL_GRADIENTS[i + 1] || SCHOOL_GRADIENTS[0] }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,26,48,.04),rgba(15,26,48,.78))', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', left: 18, bottom: 18, right: 18, color: '#fff' }}>
                        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.22)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, marginBottom: 7, textTransform: 'capitalize' }}>{p.tier}</span>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: i === 0 ? 24 : 20, fontWeight: 700 }}>{p.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                          {p.location && <span style={{ fontSize: 12, opacity: .85 }}>◍ {p.location}</span>}
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#f3d27e' }}>{p.fit}% Fit</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!displayPrograms.length && scores && (
          <div style={{ background: '#fff', border: '1px dashed #d3c9a8', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 15, color: '#7a8295', marginBottom: 16 }}>School recommendations will appear here after your advisor completes the Programs step.</div>
            <button onClick={() => setCandTab('advisor')}
              style={{ background: '#16233f', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Continue with Advisor →
            </button>
          </div>
        )}

        <div style={{ borderTop: '1px solid #e7ddc4', marginTop: 40, paddingTop: 24, fontSize: 13, color: '#9a8f74', textAlign: 'center' }}>
          © 2024 Pathway Admissions Strategic Advisors. All rights reserved.
        </div>
      </div>
    </div>
  );
}
