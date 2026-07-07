import React from 'react';
import { undergradGradeNumber } from '../../../lib/undergrad-profile.js';

const DEVELOPMENT_ITEMS = [
  ['Academic Foundation', ['academicFoundation']],
  ['Curiosity & Interests', ['curiosityInterests']],
  ['Activity Exploration', ['activityExploration']],
  ['Initiative & Habits', ['initiativeHabits']],
  ['Direction Fit', ['directionFit']],
  ['Testing Awareness', ['testingAwareness']],
  ['Narrative Seeds', ['narrativeSeeds']],
  ['Profile Completeness', ['profileCompleteness']],
];

const ADMISSIONS_ITEMS = [
  ['Academic Strength', ['academicStrength']],
  ['Testing', ['testing']],
  ['Activities Impact', ['activitiesImpact']],
  ['Leadership', ['leadership']],
  ['Major Fit', ['majorFit']],
  ['University Portfolio', ['universityPortfolio']],
  ['Essays / Narrative', ['essaysNarrative']],
  ['Execution Readiness', ['executionReadiness']],
];

const LEGACY_ITEMS = [
  ['Academic Base', ['academic']],
  ['Subject Direction', ['goalClarity']],
  ['Activity Depth', ['activities']],
  ['Leadership', ['leadership']],
  ['Testing Readiness', ['testScore']],
  ['Initiative / Projects', ['awards', 'uniqueness']],
  ['Consistency / Momentum', ['potential', 'consistency']],
];

function scoreFor(scores, keys) {
  const values = keys.map(key => scores?.[key]).filter(value => value != null && value !== '').map(Number).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function itemsFor(profile, scores) {
  const grade = undergradGradeNumber(profile || {});
  if (grade === 9 || grade === 10) return DEVELOPMENT_ITEMS;
  if (grade === 11 || grade === 12) return ADMISSIONS_ITEMS;
  // Unknown grade: prefer whichever dimension set the scores actually carry.
  if (DEVELOPMENT_ITEMS.some(([, keys]) => scores?.[keys[0]] != null)) return DEVELOPMENT_ITEMS;
  if (ADMISSIONS_ITEMS.some(([, keys]) => scores?.[keys[0]] != null)) return ADMISSIONS_ITEMS;
  return LEGACY_ITEMS;
}

export default function UndergradKpiPanel({ scores = {}, profile = {}, compact = false }) {
  const overall = scores?.overall != null && scores?.overall !== '' && Number.isFinite(Number(scores.overall)) ? Math.round(Number(scores.overall)) : null;
  const items = itemsFor(profile, scores);
  return (
    <section style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 18, padding: compact ? 14 : 18, boxShadow: '0 10px 28px rgba(22,35,63,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', textTransform: 'uppercase' }}>Undergraduate readiness</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#141b34' }}>Overall: {overall == null ? 'Needs update' : `${overall}%`}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 2 : 4},minmax(0,1fr))`, gap: 8 }} className="pw-undergrad-kpi-grid">
        {items.map(([label, keys]) => {
          const value = scoreFor(scores, keys);
          return (
            <div key={label} style={{ background: '#faf7f2', borderRadius: 11, padding: '10px 11px', minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: '#6b7392', lineHeight: 1.25 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: value == null ? '#9098b5' : '#141b34', marginTop: 4 }}>{value == null ? 'Needs update' : `${value}%`}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
