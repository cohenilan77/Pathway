import React, { useState } from 'react';

function ScoreBar({ score, stroke, title, last }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  return (
    <div style={{ marginBottom: last ? 0 : 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#16233f' }}>{title}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#16233f' }}>{pct}</span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: '#eee9da' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: stroke }} />
      </div>
    </div>
  );
}

const TIERS = [
  {
    key: 'stretch',
    label: 'STRETCH',
    accent: '#d64545',
    bg: '#fff5f5',
    border: '#fecaca',
  },
  {
    key: 'possible',
    label: 'POSSIBLE',
    accent: '#ca8a04',
    bg: '#fffbf0',
    border: '#fde68a',
  },
  {
    key: 'safe',
    label: 'SAFE',
    accent: '#2d7d46',
    bg: '#f0fdf4',
    border: '#86efac',
  },
];

export default function Analysis({ setCandTab, scores, strengths, weaknesses, programs, profile, send }) {
  const hasData = !!scores;
  const [selected, setSelected] = useState([]);

  const toggleSchool = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const confirmSelection = () => {
    if (!selected.length) return;
    const msg = `I'd like to move forward with: ${selected.join(', ')}.`;
    setCandTab('advisor');
    send(msg);
  };

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
    { key: 'testScore', title: 'Test Score', stroke: '#16233f', desc: 'Standardized test score gap relative to program medians.' },
    { key: 'professional', title: 'Professional', stroke: '#16233f', desc: 'Career trajectory, impact, and industry positioning.' },
    { key: 'leadership', title: 'Leadership', stroke: '#c2962f', desc: 'Team leadership, initiative, and influence track record.' },
    { key: 'volunteering', title: 'Volunteering', stroke: '#16233f', desc: 'Sustained community involvement and leadership in service.' },
    { key: 'uniqueness', title: 'Uniqueness', stroke: '#c2962f', desc: 'Non-linear path, rare achievements, and what sets you apart.' },
    { key: 'diversity', title: 'Diversity', stroke: '#16233f', desc: 'Nationality, languages, and background relative to the cohort.' },
    { key: 'goalClarity', title: 'Goal Clarity', stroke: '#c2962f', desc: 'Specificity of post-degree role, sector, and timeline.' },
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
        {scores.overall != null && (
          <div style={{ background: '#16233f', borderRadius: 16, padding: '22px 28px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#9bb0d8', marginBottom: 4 }}>OVERALL COMPETITIVENESS SCORE</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 800, color: '#fff' }}>{scores.overall}<span style={{ fontSize: 20, color: '#9bb0d8' }}>/100</span></div>
          </div>
        )}

        {/* Score breakdown */}
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>PROFILE BREAKDOWN</div>
        <div style={{ background: '#fffdf7', borderRadius: 16, padding: '30px 28px', border: '1px solid #efe7d4', marginBottom: 24 }}>
          {scoreItems.map((item, i) => (
            <ScoreBar key={item.key} score={scores[item.key]} stroke={item.stroke} title={item.title} last={i === scoreItems.length - 1} />
          ))}
        </div>

        {/* Strengths / Growth areas */}
        {(displayStrengths.length > 0 || displayWeaknesses.length > 0) && (
          <div className="pw-analysis-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 48 }}>
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

        {/* Strategic School Portfolio */}
        {displayPrograms.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#b8902f', marginBottom: 10 }}>PORTFOLIO OPTIMIZATION</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 800, color: '#16233f', margin: 0 }}>Strategic School Portfolio</h2>
            </div>
            <p style={{ fontSize: 14, color: '#7a8295', margin: '0 0 28px' }}>
              Tap the schools that excite you most, then send your picks straight to your advisor.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {TIERS.map(tier => {
                const schools = displayPrograms.filter(p => p.tier === tier.key);
                if (schools.length === 0) return null;
                return (
                  <div key={tier.key} style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 16, overflow: 'hidden' }}>
                    {/* Tier header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderBottom: `1px solid ${tier.border}` }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: tier.accent, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: tier.accent }}>{tier.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9a9a9a', marginLeft: 4 }}>{schools.length} {schools.length === 1 ? 'school' : 'schools'}</span>
                    </div>
                    {/* School rows */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {schools.map((school, idx) => {
                        const isSelected = selected.includes(school.name);
                        return (
                        <div
                          key={school.name || idx}
                          className="pw-school-row"
                          onClick={() => toggleSchool(school.name)}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSchool(school.name); } }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 24px',
                            borderBottom: idx < schools.length - 1 ? `1px solid ${tier.border}` : 'none',
                            gap: 16,
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(245,201,76,0.16)' : 'transparent',
                            boxShadow: isSelected ? `inset 3px 0 0 0 #c2962f` : 'none',
                            transition: 'background 0.15s ease, box-shadow 0.15s ease',
                          }}
                        >
                          {/* Checkbox */}
                          <div className="pw-school-checkbox" style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            border: isSelected ? '2px solid #c2962f' : '2px solid #cdc3a4',
                            background: isSelected ? '#c2962f' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}>
                            {isSelected && (
                              <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          {/* Left: name, location, notes */}
                          <div className="pw-school-info" style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: '#16233f', marginBottom: 3 }}>
                              {school.name}
                            </div>
                            {school.location && (
                              <div style={{ fontSize: 12, color: '#7a8295', marginBottom: school.notes ? 4 : 0 }}>
                                ◍ {school.location}
                              </div>
                            )}
                            {school.notes && (
                              <div style={{ fontSize: 12, color: '#7a8295', lineHeight: 1.45 }}>
                                {school.notes}
                              </div>
                            )}
                          </div>
                          {/* Right: stats */}
                          <div className="pw-school-stats" style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                            {school.avgGMAT != null && (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#2a3447' }}>{school.avgGMAT}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginTop: 1 }}>AVG GMAT</div>
                              </div>
                            )}
                            {school.avgGPA != null && (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#2a3447' }}>{school.avgGPA}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginTop: 1 }}>AVG GPA</div>
                              </div>
                            )}
                            {school.fit != null && (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: tier.accent, lineHeight: 1 }}>{school.fit}%</div>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9aa3b5', marginTop: 3 }}>FIT</div>
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {selected.length > 0 && <div style={{ height: 88 }} />}

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

      {selected.length > 0 && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
          display: 'flex', justifyContent: 'center',
          animation: 'pwFade 0.2s ease',
        }}>
          <div style={{
            margin: '0 auto 18px', maxWidth: 620, width: 'calc(100% - 32px)',
            background: '#16233f', borderRadius: 16, padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            boxShadow: '0 10px 30px rgba(22,35,63,0.35)',
          }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, minWidth: 0 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, marginRight: 8 }}>{selected.length}</span>
              {selected.length === 1 ? 'school selected' : 'schools selected'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => setSelected([])}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)', color: '#cfd8ec', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
              <button onClick={confirmSelection}
                style={{ background: '#f5c94c', border: 'none', color: '#42320a', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Back to Chat with Picks →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
