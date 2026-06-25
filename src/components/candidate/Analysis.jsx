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

const SELECTIVITY_BADGES = {
  'Ultra competitive': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  'Highly competitive': { color: '#c56a12', bg: '#fff7ed', border: '#fed7aa' },
  Accessible: { color: '#15935f', bg: '#ecfdf5', border: '#bbf7d0' },
  Unknown: { color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
};

function getTestMetric(school) {
  const fields = [
    ['avgGMAT', 'AVG GMAT'],
    ['avgGRE', 'AVG GRE'],
    ['avgLSAT', 'AVG LSAT'],
    ['avgMCAT', 'AVG MCAT'],
    ['avgSAT', 'AVG SAT'],
    ['avgACT', 'AVG ACT'],
  ];
  for (const [key, label] of fields) {
    if (school?.[key] != null) return { value: school[key], label };
  }
  return null;
}

function truncateText(value, maxLength = 170) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

function firstSentences(value, fallback, maxSentences = 2) {
  if (!value) return fallback;
  const text = String(value).replace(/\s+/g, ' ').trim();
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  return truncateText(sentences.slice(0, maxSentences).join(' ').trim(), 180) || fallback;
}

const PROGRAM_STRENGTHS = [
  { match: /wharton|upenn|penn /, angle: 'Known for exceptional finance depth, buy-side recruiting, and an investor alumni base that carries real weight in private capital.', goals: /pe|private equity|buyout|vc|venture|finance|invest/ },
  { match: /columbia business school|columbia\b|cbs\b/, angle: 'Distinctive for its access to Wall Street deal flow, buy-side recruiting, and a dense finance alumni network.', goals: /pe|private equity|buyout|vc|venture|finance|invest/ },
  { match: /stern|nyu/, angle: 'Strongest where finance ambition benefits from buy-side access, investor alumni reach, and proximity to major capital-markets employers.', goals: /pe|private equity|buyout|vc|venture|finance|invest/ },
  { match: /mit sloan|sloan|massachusetts institute of technology/, angle: 'Distinguished by deep integration with AI, engineering, venture creation, and technical-founder ecosystems.', goals: /deep[-\s]?tech|ai|technology|tech|venture|startup|founder|innovation/ },
  { match: /stanford|gsb/, angle: 'Especially powerful for venture and deep-tech paths through entrepreneurship infrastructure, founder networks, and access to technical talent.', goals: /deep[-\s]?tech|ai|technology|tech|venture|startup|founder|innovation/ },
  { match: /harvard business school|hbs|harvard/, angle: 'Recognized for general-management training, case-method leadership development, and a broad investor/operator alumni network.', goals: /pe|private equity|buyout|vc|venture|leadership|management|entrepreneur|founder/ },
  { match: /booth|chicago/, angle: 'Known for analytical rigor, economics-driven decision training, and strong credibility with finance and investment employers.', goals: /pe|private equity|buyout|finance|invest|strategy/ },
  { match: /kellogg|northwestern/, angle: 'Strong for candidates who need collaborative leadership, brand-building, consulting access, and a highly engaged alumni network.', goals: /consult|leadership|marketing|operator|strategy/ },
  { match: /fuqua|duke/, angle: 'Distinctive for team-based leadership culture, general-management recruiting, and useful healthcare and technology networks.', goals: /health|tech|consult|leadership|operator|strategy/ },
  { match: /kelley|indiana/, angle: 'Practical value comes from finance and accounting depth, grounded MBA recruiting, and a value-oriented alumni network.', goals: /finance|invest|operator|management|consult/ },
  { match: /emory|goizueta/, angle: 'Useful for candidates targeting healthcare, consumer, or general-management roles through a close-knit MBA network and regional employer access.', goals: /health|consumer|operator|consult|management|strategy/ },
  { match: /nyu tisch|itp|interactive telecommunications/, angle: 'Value depends on interaction-design fit, creative-technical prototyping strength, studio culture, and portfolio evidence.', goals: /portfolio|creative|design|media|interactive|technology|tech|product/ },
  { match: /insead/, angle: 'Best known for one-year MBA speed, international cohort signal, and cross-border employer access for global career pivots.', goals: /global|international|consult|operator|management|strategy/ },
];

function textFromProfile(profile) {
  if (!profile || typeof profile !== 'object') return '';
  return [
    profile.name,
    profile.degree,
    profile.program,
    profile.industry,
    profile.targetRole,
    profile.target_role,
    profile.careerGoal,
    profile.career_goal,
    profile.postDegreeGoal,
    profile.post_degree_goal,
    profile.goal,
    profile.goals,
    profile.experience,
  ].filter(Boolean).join(' ');
}

function goalLabel(profile, school) {
  const source = [
    textFromProfile(profile),
    school?.notes,
    Array.isArray(school?.fitDrivers) ? school.fitDrivers.join(' ') : '',
    school?.programGroup,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/\bpe\b|private equity|buyout|private capital/.test(source)) return 'private equity transition';
  if (/\bvc\b|venture capital|venture/.test(source)) return 'venture capital goal';
  if (/deep[-\s]?tech|ai|artificial intelligence|technical founder|startup|founder/.test(source)) return 'deep-tech or founder goal';
  if (/law|jd|llm|legal/.test(source)) return 'legal career goal';
  if (/medicine|medical|md|clinical|health/.test(source)) return 'health or medicine goal';
  if (/phd|research|lab|supervisor|faculty/.test(source)) return 'research agenda';
  if (/portfolio|mfa|design|studio|creative|interactive/.test(source)) return 'creative portfolio goal';
  if (/consult|strategy/.test(source)) return 'strategy or consulting goal';
  return 'stated goal';
}

function isWeakProgramInfo(value, school) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  const location = String(school?.location || '').toLowerCase();
  const program = String(school?.programGroup || '').toLowerCase();
  if (text.length < 45) return true;
  if (location && lower.replace(/[^\w\s]/g, '').includes(location.replace(/[^\w\s]/g, ''))) {
    const withoutLocation = lower.replace(location, '').replace(/mba relevance|program relevance|relevance|located in|location|[:.]/g, '').trim();
    if (withoutLocation.length < 25) return true;
  }
  if (program && new RegExp(`^(program|${program.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}) relevance:?\\s*${program}\\.?$`, 'i').test(text)) return true;
  return /^(good school for business|strong university|this is a competitive program|located in\b|program relevance|mba relevance:? ?[^a-z]*$)/i.test(text);
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeProgramInfo(value, school, profile) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const schoolName = String(school?.name || '').trim();
  if (schoolName) {
    text = text.replace(new RegExp(`^${escapeRegExp(schoolName)}\\s+(?:is|offers|provides|stands out as|is strategically (?:relevant|interesting|strong))\\s+`, 'i'), '');
  }

  const candidateName = String(profile?.name || '').trim();
  if (candidateName) {
    text = text
      .replace(new RegExp(`\\b${escapeRegExp(candidateName)}(?:'s)+\\b`, 'gi'), 'the')
      .replace(new RegExp(`\\bfor\\s+${escapeRegExp(candidateName)}\\b`, 'gi'), 'for the candidate')
      .replace(new RegExp(`\\b${escapeRegExp(candidateName)}\\b`, 'gi'), 'the candidate');
  }

  text = text
    .replace(/\bthe's\b/gi, 'the')
    .replace(/\bthe the\b/gi, 'the')
    .replace(/^strategically relevant because/i, 'Strategic value comes from')
    .replace(/^strategically relevant for the\s+/i, '')
    .replace(/^strategically relevant for the candidate'?s?\s+/i, '')
    .replace(/^This program is strategically relevant for the candidate only if/i, 'Best evaluated by whether')
    .replace(/^This program is strategically relevant for the candidate'?s?\s+/i, '')
    .replace(/^This school is strategically relevant for the candidate if/i, 'Strategic value depends on whether')
    .replace(/^This program's value for the candidate depends on/i, 'Value depends on')
    .replace(/\s+because of its\s+/i, ' through ')
    .replace(/^([a-z][a-z\s/-]+ goal|[a-z][a-z\s/-]+ transition) through/i, 'Strong $1 relevance through')
    .replace(/\s+for the candidate'?s?\s+/gi, ' for the ')
    .replace(/\bThe\s+(Ultra competitive|Highly competitive|Accessible|Unknown)[^.?!]*(?:difficulty|benchmark|admissions difficulty)[^.?!]*[.?!]?/gi, '')
    .replace(/\b(Ultra competitive|Highly competitive|Accessible|Unknown)\s+program\b/gi, 'program')
    .trim();

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function inferStrategicAngle(school, profile) {
  const schoolText = String(school?.name || '').toLowerCase();
  const source = [
    textFromProfile(profile),
    school?.notes,
    Array.isArray(school?.fitDrivers) ? school.fitDrivers.join(' ') : '',
    Array.isArray(school?.evidenceGaps) ? school.evidenceGaps.join(' ') : '',
    Array.isArray(school?.riskFlags) ? school.riskFlags.join(' ') : '',
    school?.programGroup,
  ].filter(Boolean).join(' ').toLowerCase();

  const namedStrength = PROGRAM_STRENGTHS.find(item => item.match.test(schoolText) && item.goals.test(source))
    || PROGRAM_STRENGTHS.find(item => item.match.test(schoolText));
  if (namedStrength) return namedStrength.angle;
  if (/\bpe\b|private equity|buyout|private capital|finance|invest/.test(source)) return 'Known for finance recruiting, investor alumni access, and private-capital signaling.';
  if (/deep[-\s]?tech|ai|technology|tech|innovation|entrepreneur|venture|startup|founder/.test(source)) return 'Distinguished by an innovation ecosystem, technical network, and entrepreneurship platform that can support deep-tech or founder goals.';
  if (/faculty|lab|research|supervisor|phd|doctoral/.test(source)) return 'Strategic value depends on supervisor/lab alignment, methods fit, funding relevance, and research match more than brand alone.';
  if (/portfolio|studio|critique|design|creative|interactive|mfa|mdes|mps/.test(source)) return 'Value depends on portfolio fit, studio culture, critique model, and the surrounding creative-technical ecosystem.';
  if (/law|jd|llm|legal/.test(source)) return 'Most useful when its legal specialization, clerkship or employer pipeline, and alumni network match the intended practice area.';
  if (/medicine|medical|md|clinical|health/.test(source)) return 'Strategic value comes from clinical exposure, research access, health-system partnerships, and fit with the intended medical path.';
  if (/undergraduate|intended major|internship|advising/.test(source)) return 'Strength depends on intended-major depth, advising quality, internship access, and the student ecosystem around the academic direction.';
  if (/alumni|network|recruit|placement|employer|career/.test(source)) return 'Recognized for alumni reach, employer access, and recruiting strength tied to the target outcome.';
  return 'Strategic value should come from distinctive program strengths, employer access, alumni reach, and fit with the stated career goal.';
}

function buildProgramInfo(school, profile) {
  if (!isWeakProgramInfo(school?.programInfo, school)) {
    return firstSentences(sanitizeProgramInfo(school.programInfo, school, profile), '', 2);
  }

  const source = [
    school?.notes,
    Array.isArray(school?.fitDrivers) ? school.fitDrivers.join(' ') : '',
    Array.isArray(school?.evidenceGaps) ? school.evidenceGaps.join(' ') : '',
    Array.isArray(school?.riskFlags) ? school.riskFlags.join(' ') : '',
    school?.programGroup,
    textFromProfile(profile),
  ].filter(Boolean).join(' ').toLowerCase();

  const goal = goalLabel(profile, school);
  const angle = inferStrategicAngle(school, profile);

  if (/phd|doctoral|research/.test(source)) {
    return `Best evaluated through supervisor/lab alignment with the ${goal}; funding, methods fit, and research match matter more than brand alone.`;
  }
  if (/portfolio|mfa|mdes|mps|studio|creative|interactive/.test(source)) {
    return `Value depends on portfolio fit, studio culture, critique model, and the creative-technical ecosystem around the ${goal}.`;
  }
  if (/undergraduate|bachelor|college/.test(source)) {
    return `Strategic value depends on intended-major strength, advising, internships, and student ecosystem support for the ${goal}.`;
  }
  return angle;
}

function buildWhyThisFits(school) {
  const drivers = Array.isArray(school?.fitDrivers) ? school.fitDrivers.filter(Boolean).slice(0, 3) : [];
  if (drivers.length) {
    return truncateText(`Candidate fit is supported by ${drivers.join(', ')}.`, 180);
  }
  return firstSentences(school?.notes, 'Fit rationale not yet specified.');
}

function getMissingItems(school) {
  const note = school?.notes || '';
  const noteSignalsGap = /\bbut\b|risk|gap|missing|weaker|less aligned|must|needs|sharpen/i.test(note);
  const items = [
    ...(Array.isArray(school?.evidenceGaps) ? school.evidenceGaps : []),
    ...(Array.isArray(school?.riskFlags) ? school.riskFlags : []),
    noteSignalsGap ? firstSentences(note, '', 1) : '',
  ];
  return [...new Set(items.filter(Boolean))].slice(0, 3);
}

export default function Analysis({ setCandTab, scores, strengths, weaknesses, programs, profile, send, chosenSchools, setChosenSchools }) {
  const hasData = !!scores;
  const [selected, setSelected] = useState(chosenSchools || []);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setSelected(chosenSchools || []);
  }, [chosenSchools]);

  const toggleSchool = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleExpanded = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
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
                        const rowKey = `${school.name || idx}-${tier.key}`;
                        const isExpanded = !!expanded[rowKey];
                        const testMetric = getTestMetric(school);
                        const missingItems = getMissingItems(school);
                        return (
                        <div key={rowKey} style={{ borderBottom: idx < schools.length - 1 ? `1px solid ${tier.border}` : 'none' }}>
                          <div
                            className="pw-school-row"
                            onClick={() => toggleExpanded(rowKey)}
                            role="button"
                            aria-expanded={isExpanded}
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(rowKey); } }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '17px 22px',
                              gap: 16,
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(255,255,255,.55)' : 'transparent',
                              opacity: isLocked && !isSelected ? 0.72 : 1,
                              boxShadow: isSelected ? `inset 3px 0 0 0 ${tier.accent}` : 'none',
                              transition: 'background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                            }}
                          >
                            <div
                              className="pw-school-checkbox"
                              onClick={(e) => { e.stopPropagation(); toggleSchool(school.name); }}
                              role="checkbox"
                              aria-checked={isSelected}
                              tabIndex={-1}
                              style={{
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 700, color: isLocked ? '#9098b5' : '#141b34' }}>
                                  {school.name}
                                </div>
                                {school.admissionStatus && (
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLORS[school.admissionStatus] || '#6b7392', background: '#ffffff99', border: `1px solid ${STATUS_COLORS[school.admissionStatus] || '#d7ddec'}55`, borderRadius: 999, padding: '3px 8px' }}>
                                    {FIT_LABELS[school.admissionStatus] || school.admissionStatus}
                                  </span>
                                )}
                                {school.selectivityLabel && (() => {
                                  const badge = SELECTIVITY_BADGES[school.selectivityLabel] || SELECTIVITY_BADGES.Unknown;
                                  return (
                                    <span style={{ fontSize: 10.5, fontWeight: 800, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 999, padding: '3px 8px' }}>
                                      {school.selectivityLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                              {(school.location || school.programGroup) && (
                                <div style={{ fontSize: 12, color: '#6b7392', fontWeight: 500 }}>
                                  {[school.location, school.programGroup].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>

                            <div className="pw-school-stats" style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                              {testMetric && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{testMetric.value}</div>
                                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>{testMetric.label}</div>
                                </div>
                              )}
                              {school.avgGPA != null && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{school.avgGPA}</div>
                                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>AVG GPA</div>
                                </div>
                              )}
                              {school.fit != null && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: tier.accent, lineHeight: 1 }}>{isLocked ? '—' : `${school.fit}%`}</div>
                                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 3 }}>FIT INDEX</div>
                                </div>
                              )}
                              <div style={{ width: 24, textAlign: 'center', fontSize: 18, fontWeight: 800, color: tier.accent, lineHeight: 1 }}>
                                {isExpanded ? '⌄' : '⌃'}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '0 22px 18px 58px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.8px', color: tier.accent, marginBottom: 6 }}>PROGRAM INFO</div>
                                <div style={{ fontSize: 12, color: '#33405e', lineHeight: 1.45 }}>{buildProgramInfo(school, profile)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.8px', color: tier.accent, marginBottom: 6 }}>WHY THIS FITS</div>
                                <div style={{ fontSize: 12, color: '#33405e', lineHeight: 1.45 }}>{buildWhyThisFits(school)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.8px', color: tier.accent, marginBottom: 6 }}>WHAT MAY BE MISSING</div>
                                {missingItems.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {missingItems.map(item => (
                                      <span key={item} style={{ fontSize: 10.5, fontWeight: 700, color: '#6b7392', background: '#ffffff99', border: '1px solid #d7ddec66', borderRadius: 999, padding: '3px 8px' }}>
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 12, color: '#33405e', lineHeight: 1.45 }}>No major gaps flagged yet.</div>
                                )}
                              </div>
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
