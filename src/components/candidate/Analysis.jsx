import React, { useEffect, useState } from 'react';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';

const BAR_COLORS = [
  { from: '#7dd3fc', to: '#4dbbec' }, // sky
  { from: '#fda4af', to: '#e25f7b' }, // rose
  { from: '#bef264', to: '#89d71c' }, // lime
  { from: '#f9e193', to: '#f09731' }, // amber
  { from: '#d9cbb3', to: '#a67ded' }, // violet
  { from: '#5eead4', to: '#1bc8b9' }, // teal
  { from: '#f0abfc', to: '#cc62d9' }, // fuchsia
  { from: '#93c5fd', to: '#6991ea' }, // blue
  { from: '#fbdab8', to: '#ed834b' }, // orange
  { from: '#86efac', to: '#28d367' }, // green
];

function ScoreBar({ score, title, last, color }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  return (
    <div style={{ marginBottom: last ? 0 : 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#141b34' }}>{title}</span>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#141b34' }}>{pct}</span>
      </div>
      <div style={{
        height: 12,
        borderRadius: 10,
        background: '#f1eadd',
        boxShadow: 'inset 0 1px 3px rgba(60,72,130,.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 10,
          background: `linear-gradient(180deg, ${color.from} 0%, ${color.to} 100%)`,
          boxShadow: `0 0 10px ${color.to}66, inset 0 1px 1px rgba(255,255,255,0.6)`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'width 0.4s ease',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '55%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.05) 100%)',
            borderRadius: '10px 10px 0 0',
          }} />
        </div>
      </div>
    </div>
  );
}

const TIERS = [
  {
    key: 'safe',
    label: 'STRONG FIT · >80%',
    accent: '#3fdca9',
    bg: '#eafdf6',
    border: '#a9eed1',
  },
  {
    key: 'possible',
    label: 'WORKABLE FIT · 50-80%',
    accent: '#eaa129',
    bg: '#fff8ea',
    border: '#ffe3a8',
  },
  {
    key: 'stretch',
    label: 'LOW FIT · <50%',
    accent: '#e384a5',
    bg: '#fff1f6',
    border: '#ffd3e3',
  },
  {
    key: 'locked',
    label: 'PREREQUISITES',
    accent: '#9098b5',
    bg: '#f4f5f8',
    border: '#dde0e8',
  },
];

const STATUS_COLORS = {
  'Not Eligible': '#c2410c',
  'Below Baseline': '#e0457a',
  Plausible: '#eaa129',
  Competitive: '#4b8fea',
  Strong: '#19a974',
};

const FIT_LABELS = {
  Strong: 'Strong Fit',
  Competitive: 'Competitive Fit',
  Plausible: 'Plausible Fit',
  'Below Baseline': 'Below Baseline Fit',
  'Not Eligible': 'Not Eligible',
};

function fitLabel(status) {
  return FIT_LABELS[status] || (status ? `${status} Fit` : '');
}

function relevantTestMetric(school) {
  const tests = [
    ['avgGMAT', 'AVG GMAT'],
    ['avgGRE', 'AVG GRE'],
    ['avgSAT', 'AVG SAT'],
    ['avgACT', 'AVG ACT'],
    ['avgLSAT', 'AVG LSAT'],
    ['avgMCAT', 'AVG MCAT'],
  ];
  return tests.map(([key, label]) => school[key] != null ? { value: school[key], label } : null).find(Boolean);
}

const SELECTIVITY_BADGES = {
  'Ultra competitive': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  'Highly competitive': { color: '#c56a12', bg: '#fff7ed', border: '#fed7aa' },
  Accessible: { color: '#15935f', bg: '#ecfdf5', border: '#bbf7d0' },
  Unknown: { color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
};

export default function Analysis({ setCandTab, scores, strengths, weaknesses, programs, profile, send, chosenSchools, setChosenSchools }) {
  const hasData = !!scores;
  const [selected, setSelected] = useState(chosenSchools || []);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    setSelected(chosenSchools || []);
  }, [chosenSchools]);

  const toggleSchool = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleExpanded = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const confirmSelection = () => {
    if (!selected.length) return;
    setChosenSchools && setChosenSchools(selected);
    const msg = `I'd like to move forward with: ${selected.join(', ')}.`;
    setCandTab('advisor');
    send(msg);
  };

  if (!hasData) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 34px 34px' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: '52px 36px', background: '#faf7f2', borderRadius: 24, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(140deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 12px 24px rgba(105,91,255,.34)' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" />
            </svg>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#141b34', margin: '0 0 14px', letterSpacing: '-.4px' }}>Analysis Not Yet Available</h2>
          <p style={{ fontSize: 14.5, color: '#6b7392', lineHeight: 1.65, margin: '0 0 28px' }}>
            Your competitiveness analysis will appear here once the advisor has enough information about your profile. Paste your CV or answer a few questions to get started.
          </p>
          <button onClick={() => setCandTab('advisor')}
            style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 12px 24px rgba(105,91,255,.36)' }}>
            Go to Advisor →
          </button>
        </div>
      </div>
    );
  }

  const scoreItems = [
    { key: 'academic', title: 'Academic', desc: 'GPA, test scores, and quantitative aptitude relative to program benchmarks.' },
    { key: 'testScore', title: 'Test Score', desc: 'Standardized test score gap relative to program medians.' },
    { key: 'professional', title: 'Professional', desc: 'Career trajectory, impact, and industry positioning.' },
    { key: 'leadership', title: 'Leadership', desc: 'Team leadership, initiative, and influence track record.' },
    { key: 'volunteering', title: 'Volunteering', desc: 'Sustained community involvement and leadership in service.' },
    { key: 'uniqueness', title: 'Uniqueness', desc: 'Non-linear path, rare achievements, and what sets you apart.' },
    { key: 'diversity', title: 'Diversity', desc: 'Nationality, languages, and background relative to the cohort.' },
    { key: 'goalClarity', title: 'Goal Clarity', desc: 'Specificity of post-degree role, sector, and timeline.' },
    { key: 'narrative', title: 'Narrative', desc: 'Cohesion of personal brand and clarity of purpose.' },
    { key: 'recommenders', title: 'Recommenders', desc: 'Status, direct relationship, evidence specificity, and fit with the target program.' },
    { key: 'potential', title: 'Potential', desc: 'Long-term upside and fit with program outcomes.' },
  ].filter(item => scores[item.key] != null);

  const displayStrengths = strengths || [];
  const displayWeaknesses = weaknesses || [];
  const displayPrograms = normalizeProgramList(programs) || [];
  const savedTargets = chosenSchools || [];

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 34px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1.2px', color: '#5b46e0', marginBottom: 10 }}>CANDIDATE OVERVIEW</div>
            <h1 style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 800, color: '#141b34', margin: 0, letterSpacing: '-.6px' }}>
              {profile?.name ? `${profile.name}'s` : 'Your'} Competitiveness
            </h1>
            {profile && (
              <div style={{ marginTop: 12, fontSize: 13.5, color: '#6b7392', fontWeight: 500 }}>
                {[profile.degree, profile.gpa && `GPA ${profile.gpa}`, profile.gmat && `Test/portfolio ${profile.gmat}`, profile.experience].filter(Boolean).join(' · ')}
              </div>
            )}
            {savedTargets.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {savedTargets.map(school => (
                  <span key={school} style={{ background: '#eef7f3', color: '#25785d', border: '1px solid #cfe9df', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 }}>
                    {school}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setCandTab('documents')}
              style={{ background: '#faf7f2', border: '1.5px solid #f1eadd', borderRadius: 13, padding: '12px 18px', fontSize: 13.5, fontWeight: 700, color: '#141b34', cursor: 'pointer', fontFamily: 'inherit' }}>
              Strengthen My CV
            </button>
            <button onClick={() => setCandTab('advisor')}
              style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', border: 'none', borderRadius: 13, padding: '12px 22px', fontSize: 13.5, fontWeight: 700, color: '#faf7f2', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
              Ask Advisor
            </button>
          </div>
        </div>

        {/* Overall score banner */}
        {scores.overall != null && (
          <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#474d80,#6d5cc2)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, boxShadow: '0 16px 30px rgba(40,30,90,.28)' }}>
            <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', color: '#d9cbb3', marginBottom: 6 }}>OVERALL COMPETITIVENESS SCORE</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#faf7f2', letterSpacing: '-1px' }}>{scores.overall}<span style={{ fontSize: 18, color: '#d9cbb3', fontWeight: 600 }}>/100</span></div>
            </div>
          </div>
        )}

        {/* Score breakdown */}
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1.2px', color: '#5b46e0', marginBottom: 10 }}>PROFILE BREAKDOWN</div>
        <div style={{ background: '#faf7f2', borderRadius: 20, padding: '28px 26px', border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', marginBottom: 24 }}>
          {scoreItems.map((item, i) => (
            <ScoreBar key={item.key} score={scores[item.key]} title={item.title} last={i === scoreItems.length - 1} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </div>

        {/* Strengths / Growth areas */}
        {(displayStrengths.length > 0 || displayWeaknesses.length > 0) && (
          <div className="pw-analysis-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 40 }}>
            {displayStrengths.length > 0 && (
              <div style={{ background: '#faf7f2', borderRadius: 20, padding: 28, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1eadd', paddingBottom: 14, marginBottom: 18 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#eafdf6', color: '#19c08a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>★</span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: 0, letterSpacing: '-.3px' }}>Core Strengths</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {displayStrengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3fdca9', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 13.5, color: '#33405e', lineHeight: 1.55 }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {displayWeaknesses.length > 0 && (
              <div style={{ background: '#faf7f2', borderRadius: 20, padding: 28, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1eadd', paddingBottom: 14, marginBottom: 18 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#fff1f6', color: '#e0457a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>◷</span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#141b34', margin: 0, letterSpacing: '-.3px' }}>Growth Areas</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {displayWeaknesses.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e384a5', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 13.5, color: '#33405e', lineHeight: 1.55 }}>{w}</div>
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
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1.2px', color: '#5b46e0', marginBottom: 10 }}>PORTFOLIO OPTIMIZATION</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#141b34', margin: 0, letterSpacing: '-.5px' }}>Strategic School Portfolio</h2>
            </div>
            <p style={{ fontSize: 13.5, color: '#6b7392', margin: '0 0 24px', fontWeight: 500 }}>
              {savedTargets.length > 0 ? 'Your target schools are saved here. You can adjust them anytime.' : 'Tap the schools that excite you most, then send your picks straight to your advisor.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {TIERS.map(tier => {
                const schools = displayPrograms.filter(p => p.tier === tier.key);
                if (schools.length === 0) return null;
                return (
                  <div key={tier.key} style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 18, overflow: 'hidden' }}>
                    {/* Tier header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', borderBottom: `1px solid ${tier.border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: tier.accent, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1.2px', color: tier.accent }}>{tier.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9098b5', marginLeft: 4 }}>{schools.length} {schools.length === 1 ? 'school' : 'schools'}</span>
                      {tier.key === 'locked' && (
                        <span style={{ fontSize: 12, fontStyle: 'italic', color: '#9098b5', marginLeft: 6 }}>Significant metric gaps — can still be selected.</span>
                      )}
                    </div>
                    {/* School rows */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {schools.map((school, idx) => {
                        const isSelected = selected.includes(school.name);
                        const isLocked = tier.key === 'locked';
                        const rowKey = `${school.name || idx}-${school.programGroup || ''}`;
                        const isExpanded = !!expandedRows[rowKey];
                        const testMetric = relevantTestMetric(school);
                        const gaps = [...(Array.isArray(school.evidenceGaps) ? school.evidenceGaps : []), ...(Array.isArray(school.riskFlags) ? school.riskFlags : [])];
                        return (
                        <div
                          key={school.name || idx}
                          className="pw-school-row"
                          style={{
                            borderBottom: idx < schools.length - 1 ? `1px solid ${tier.border}` : 'none',
                            background: isSelected ? 'rgba(255,255,255,.55)' : 'transparent',
                            opacity: isLocked && !isSelected ? 0.72 : 1,
                            boxShadow: isSelected ? `inset 3px 0 0 0 ${tier.accent}` : 'none',
                            transition: 'background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                          }}
                        >
                          <div
                            onClick={() => toggleSchool(school.name)}
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSchool(school.name); } }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '17px 22px',
                              gap: 16,
                              cursor: 'pointer',
                            }}
                          >
                            <div className="pw-school-checkbox" style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              border: isSelected ? `2px solid ${tier.accent}` : '2px solid #e7dcc7',
                              background: isSelected ? tier.accent : '#faf7f2',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}>
                              {isSelected && (
                                <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            <div className="pw-school-info" style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 700, color: isLocked ? '#9098b5' : '#141b34' }}>{school.name}</div>
                                {school.admissionStatus && (
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLORS[school.admissionStatus] || '#6b7392', background: '#ffffff99', border: `1px solid ${STATUS_COLORS[school.admissionStatus] || '#d7ddec'}55`, borderRadius: 999, padding: '3px 8px' }}>
                                    {fitLabel(school.admissionStatus)}
                                  </span>
                                )}
                                {school.selectivityLabel && (() => {
                                  const badge = SELECTIVITY_BADGES[school.selectivityLabel] || SELECTIVITY_BADGES.Unknown;
                                  return <span style={{ fontSize: 10.5, fontWeight: 800, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 999, padding: '3px 8px' }}>{school.selectivityLabel}</span>;
                                })()}
                              </div>
                              {(school.location || school.programGroup) && (
                                <div style={{ fontSize: 12, color: '#6b7392', fontWeight: 500 }}>{[school.location, school.programGroup].filter(Boolean).join(' · ')}</div>
                              )}
                            </div>
                            <div className="pw-school-stats" style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                              {testMetric && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{testMetric.value}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>{testMetric.label}</div></div>}
                              {school.avgGPA != null && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{school.avgGPA}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>AVG GPA</div></div>}
                              {school.fit != null && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: tier.accent, lineHeight: 1 }}>{isLocked ? '—' : `${school.fit}%`}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 3 }}>FIT INDEX</div></div>}
                              <button
                                type="button"
                                aria-label={isExpanded ? `Collapse ${school.name}` : `Expand ${school.name}`}
                                onClick={(e) => { e.stopPropagation(); toggleExpanded(rowKey); }}
                                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e7dcc7', background: '#faf7f2', color: '#33405e', cursor: 'pointer', fontSize: 18, fontWeight: 800, lineHeight: 1 }}
                              >{isExpanded ? '⌄' : '⌃'}</button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div style={{ padding: '0 22px 18px 60px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                              <div><div style={{ fontSize: 11, fontWeight: 800, color: '#5b46e0', marginBottom: 6 }}>WHY THIS FITS</div><div style={{ fontSize: 12.5, color: '#33405e', lineHeight: 1.5 }}>{school.notes || 'This program aligns with the current candidate evidence.'}</div></div>
                              <div><div style={{ fontSize: 11, fontWeight: 800, color: '#5b46e0', marginBottom: 6 }}>WHAT MAY BE MISSING</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{gaps.length ? gaps.slice(0, 5).map(gap => <span key={gap} style={{ fontSize: 10.5, fontWeight: 700, color: '#7a5a13', background: '#fff8ea', border: '1px solid #f5dfa6', borderRadius: 999, padding: '3px 8px' }}>{gap}</span>) : <span style={{ fontSize: 12.5, color: '#33405e' }}>No major gaps flagged yet.</span>}</div></div>
                              <div><div style={{ fontSize: 11, fontWeight: 800, color: '#5b46e0', marginBottom: 6 }}>FIT DRIVERS</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{Array.isArray(school.fitDrivers) && school.fitDrivers.length ? school.fitDrivers.slice(0, 3).map(driver => <span key={driver} style={{ fontSize: 10.5, fontWeight: 700, color: '#25785d', background: '#eef7f3', border: '1px solid #cfe9df', borderRadius: 999, padding: '3px 8px' }}>{driver}</span>) : <span style={{ fontSize: 12.5, color: '#33405e' }}>No fit drivers listed yet.</span>}</div></div>
                            </div>
                          )}
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
          <div style={{ background: '#f6f1e8', border: '1.5px dashed #e7dcc7', borderRadius: 18, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 14.5, color: '#6b7392', marginBottom: 16, fontWeight: 500 }}>School recommendations will appear here after your advisor completes the Programs step.</div>
            <button onClick={() => setCandTab('advisor')}
              style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '12px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
              Continue with Advisor →
            </button>
          </div>
        )}

        <div style={{ borderTop: '1px solid #edf0f9', marginTop: 40, paddingTop: 24, fontSize: 12.5, color: '#9098b5', textAlign: 'center', fontWeight: 500 }}>
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
            background: 'linear-gradient(135deg,#474d80,#6d5cc2)', borderRadius: 18, padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            boxShadow: '0 16px 34px rgba(40,30,90,.32)',
          }}>
            <div style={{ color: '#faf7f2', fontSize: 13.5, fontWeight: 600, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 17, marginRight: 8 }}>{selected.length}</span>
              {selected.length === 1 ? 'school selected' : 'schools selected'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setSelected([]); setChosenSchools && setChosenSchools([]); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)', color: '#d9cbb3', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
              <button onClick={confirmSelection}
                style={{ background: '#faf7f2', border: 'none', color: '#5b46e0', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Back to Chat with Picks →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
