import React, { useEffect, useState } from 'react';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';
import { getTrackConfig } from '../../trackConfig.js';
import { getCandidateKpiDisplayItems } from '../../../lib/candidate-kpi-schemas.js';

const BAR_COLORS = [
  { from: '#2c3e63', to: '#141b34' }, // navy
  { from: '#e3bc5e', to: '#5b46e0' }, // gold
  { from: '#8ea2c9', to: '#5a7099' }, // slate blue
  { from: '#d3c9a8', to: '#a89767' }, // parchment
  { from: '#4a5b82', to: '#22304f' }, // deep slate
  { from: '#c9a85c', to: '#96742a' }, // bronze
  { from: '#aebde6', to: '#7688b8' }, // periwinkle
  { from: '#38507a', to: '#1a2947' }, // midnight
  { from: '#e8d29a', to: '#5b46e0' }, // champagne
  { from: '#6d7f9e', to: '#42536f' }, // steel
];

function ScoreBar({ score, title, last, color, incomplete = false }) {
  const pct = incomplete ? 0 : Math.max(0, Math.min(100, score || 0));
  return (
    <div style={{ marginBottom: last ? 0 : 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#141b34' }}>{title}</span>
        <span style={{ fontSize: incomplete ? 12 : 14.5, fontWeight: 700, color: incomplete ? '#9098b5' : '#141b34' }}>{incomplete ? 'Incomplete' : pct}</span>
      </div>
      <div style={{
        height: 12,
        borderRadius: 10,
        background: incomplete ? '#f2f4f9' : '#f1eadd',
        border: incomplete ? '1px dashed #d8cdb4' : 'none',
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
    key: 'stretch',
    label: 'LOW FIT · <50%',
    accent: '#e384a5',
    bg: '#fff1f6',
    border: '#ffd3e3',
  },
  {
    key: 'possible',
    label: 'WORKABLE FIT · 50-80%',
    accent: '#eaa129',
    bg: '#fff8ea',
    border: '#ffe3a8',
  },
  {
    key: 'safe',
    label: 'STRONG FIT · >80%',
    accent: '#3fdca9',
    bg: '#eafdf6',
    border: '#a9eed1',
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

function fitBucketLabel(school) {
  const tier = String(school?.tier || '').toLowerCase();
  const fit = Number(school?.fit);
  if (tier === 'locked') return 'Not Eligible';
  if (tier === 'safe' || fit > 80) return 'Strong Fit';
  if (tier === 'possible' || fit >= 50) return 'Competitive Fit';
  if (tier === 'stretch' || Number.isFinite(fit)) return 'Reach';
  return FIT_LABELS[school?.admissionStatus] || school?.admissionStatus || 'Competitive Fit';
}

function fitBucketColor(school) {
  const tier = String(school?.tier || '').toLowerCase();
  const fit = Number(school?.fit);
  if (tier === 'locked') return '#9098b5';
  if (tier === 'safe' || fit > 80) return '#19a974';
  if (tier === 'possible' || fit >= 50) return '#eaa129';
  if (tier === 'stretch' || Number.isFinite(fit)) return '#e0457a';
  return STATUS_COLORS[school?.admissionStatus] || '#6b7392';
}

const SELECTIVITY_BADGES = {
  'Ultra Competitive': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  'Ultra competitive': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  Competitive: { color: '#c56a12', bg: '#fff7ed', border: '#fed7aa' },
  'Highly competitive': { color: '#c56a12', bg: '#fff7ed', border: '#fed7aa' },
  Accessible: { color: '#15935f', bg: '#ecfdf5', border: '#bbf7d0' },
};

function displaySelectivityLabel(label) {
  if (/^ultra competitive$/i.test(String(label || ''))) return 'Ultra Competitive';
  if (/^(highly competitive|competitive)$/i.test(String(label || ''))) return 'Competitive';
  return 'Accessible';
}

function getTestMetric(school) {
  const text = `${school?.programGroup || ''} ${school?.degree || ''} ${school?.name || ''}`.toLowerCase();
  let fields;
  if (/mba|business school|gsb|sloan|wharton|booth|kellogg/.test(text)) {
    fields = [['avgGMAT', 'AVG GMAT'], ['avgGRE', 'AVG GRE']];
  } else if (/\b(llm|jd|law)\b/.test(text)) {
    fields = [['avgGRE', 'AVG GRE'], ['avgLSAT', 'AVG LSAT']];
  } else if (/\b(md|medicine|medical|health|mcat)\b/.test(text)) {
    fields = [['avgMCAT', 'AVG MCAT']];
  } else if (/\b(phd|doctoral|doctorate|research|msc|ms\b|ma\b|master|masters)\b/.test(text)) {
    fields = [['avgGRE', 'AVG GRE'], ['avgGMAT', 'AVG GMAT']];
  } else if (/undergraduate|bachelor|college|\bba\b|\bbs\b/.test(text)) {
    fields = [['avgSAT', 'AVG SAT'], ['avgACT', 'AVG ACT']];
  } else {
    fields = [
      ['avgGMAT', 'AVG GMAT'],
      ['avgGRE', 'AVG GRE'],
      ['avgLSAT', 'AVG LSAT'],
      ['avgMCAT', 'AVG MCAT'],
      ['avgSAT', 'AVG SAT'],
      ['avgACT', 'AVG ACT'],
    ];
  }

  for (const [key, label] of fields) {
    if (school?.[key] != null) return { value: school[key], label };
  }
  return null;
}

function getAdmitRateMetric(school) {
  const rate = asDisplayRate(school?.admitRate ?? school?.acceptanceRate);
  return rate ? `${rate}%` : null;
}

function truncateText(value, maxLength = 420) {
  if (!value) return '';
  const text = String(value).replace(/\.{3,}/g, '.').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const sentenceEnd = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
  if (sentenceEnd >= 80) return slice.slice(0, sentenceEnd + 1).trim();
  return `${slice.replace(/\s+\S*$/, '').replace(/[,:;\-]+$/, '').trim()}.`;
}

function firstSentences(value, fallback, maxSentences = 2) {
  if (!value) return fallback;
  const text = String(value).replace(/\.{3,}/g, '.').replace(/\s+/g, ' ').trim();
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  return truncateText(sentences.slice(0, maxSentences).join(' ').trim(), 520) || fallback;
}

function limitWords(value, maxWords = 80) {
  const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ').replace(/[.;,:-]+$/, '')}.`;
}

function asDisplayRate(value) {
  if (value == null) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const rate = Number(match[0]);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) return null;
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(1).replace(/\.0$/, '');
}

const PROGRAM_STRENGTHS = [
  { match: /wharton|upenn|penn /, angle: 'Known for finance depth, buy-side recruiting, analytical rigor, and one of the densest investor alumni networks in business education.', fact: 'That platform is unusually direct for private equity, venture capital, asset management, and finance leadership because employers already associate the brand with technical fluency and investing ambition.', goals: /pe|private equity|buyout|vc|venture|finance|invest/ },
  { match: /columbia business school|columbia\b|cbs\b/, angle: 'Known for finance, value investing, capital markets, and close access to buy-side recruiting, investment firms, and senior alumni in private capital.', fact: 'The platform is strongest when the candidate can connect prior experience to a specific investing thesis rather than a broad interest in business.', goals: /pe|private equity|buyout|vc|venture|finance|invest/ },
  { match: /stern|nyu/, angle: 'Known for finance, entertainment/media business, fintech exposure, and strong access to banks, funds, startups, and investor alumni.', fact: 'It can be a serious private-capital platform when the application shows a precise investing angle and uses the school as a bridge into deal flow rather than just a brand upgrade.', goals: /pe|private equity|buyout|vc|venture|finance|invest/ },
  { match: /mit sloan|sloan|massachusetts institute of technology/, angle: 'Known for analytics, innovation, entrepreneurship, operations, and unusually tight links to engineering, AI, labs, venture creation, and technical founders.', fact: 'That makes it especially relevant for candidates aiming at deep-tech investing, AI commercialization, product-led entrepreneurship, or operating roles where technical credibility matters.', goals: /deep[-\s]?tech|ai|technology|tech|venture|startup|founder|innovation/ },
  { match: /stanford|gsb/, angle: 'Known for entrepreneurship, venture capital, leadership self-awareness, and access to technical founders, high-growth companies, and investor networks.', fact: 'The strategic value is highest when the candidate already has a credible innovation thesis, founder/operator evidence, or deep-tech market point of view that can stand out in a small class.', goals: /deep[-\s]?tech|ai|technology|tech|venture|startup|founder|innovation/ },
  { match: /harvard business school|hbs|harvard/, angle: 'Known for case-method leadership, general management, global brand power, and a broad alumni base across investors, founders, CEOs, and operators.', fact: 'It is powerful for candidates who can translate achievement into decisive leadership judgment and show why they will influence institutions, not only join elite employers.', goals: /pe|private equity|buyout|vc|venture|leadership|management|entrepreneur|founder/ },
  { match: /booth|chicago/, angle: 'Known for analytical rigor, economics, flexible curriculum, and strong credibility with finance, investing, consulting, and strategy employers.', fact: 'It fits candidates who can show disciplined judgment, quantitative comfort, and a career thesis that benefits from a more intellectually rigorous, less scripted MBA environment.', goals: /pe|private equity|buyout|finance|invest|strategy/ },
  { match: /kellogg|northwestern/, angle: 'Known for collaborative leadership, marketing, general management, consulting, and one of the most engaged alumni cultures in business education.', fact: 'It fits candidates whose advantage is influence, team leadership, client-facing judgment, and broad management range rather than only technical finance specialization.', goals: /consult|leadership|marketing|operator|strategy/ },
  { match: /fuqua|duke/, angle: 'Known for team-based leadership, practical general management, healthcare, consulting, and a culture that rewards collaboration and execution.', fact: 'It can be a strong strategic choice for candidates who need to prove operating maturity, cross-functional leadership, and a warmer leadership style rather than pure prestige signaling.', goals: /health|tech|consult|leadership|operator|strategy/ },
  { match: /kelley|indiana/, angle: 'Known for practical finance, accounting, supply chain, and employer-oriented career support with a value-conscious alumni network.', fact: 'It is strongest as a pragmatic career accelerator when the goal is realistic mobility, focused recruiting, and a safer outcome rather than maximum prestige.', goals: /finance|invest|operator|management|consult/ },
  { match: /emory|goizueta/, angle: 'Known for a close-knit MBA experience, strong career coaching, and useful access to healthcare, consumer, consulting, and Atlanta-linked employers.', fact: 'Its value rises when the candidate wants relationship-driven recruiting, smaller-cohort attention, and a realistic bridge into operating or consulting roles.', goals: /health|consumer|operator|consult|management|strategy/ },
  { match: /nyu tisch|itp|interactive telecommunications/, angle: 'A studio-driven creative technology program where interaction design, prototyping, critique culture, and portfolio evidence matter most.', fact: 'The best candidates show a clear creative-technical point of view, not just academic strength.', goals: /portfolio|creative|design|media|interactive|technology|tech|product/ },
  { match: /insead/, angle: 'A fast global MBA with a highly international cohort, cross-border employer access, and strong consulting and general-management recognition.', fact: 'It is particularly useful for candidates who need speed, mobility, and a global repositioning story.', goals: /global|international|consult|operator|management|strategy/ },
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
  let text = String(value || '').replace(/\.{3,}/g, '.').replace(/\s+/g, ' ').trim();
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
    .replace(/\bThe\s+(Ultra Competitive|Ultra competitive|Competitive|Highly competitive|Accessible)[^.?!]*(?:difficulty|benchmark|admissions difficulty)[^.?!]*[.?!]?/gi, '')
    .replace(/\b(Ultra Competitive|Ultra competitive|Competitive|Highly competitive|Accessible)\s+program\b/gi, 'program')
    .trim();

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function stripRowVisibleFacts(value, school, profile) {
  let text = sanitizeProgramInfo(value, school, profile);
  const removals = [
    school?.name,
    school?.location,
    school?.selectivityLabel,
    school?.avgGMAT,
    school?.avgGRE,
    school?.avgLSAT,
    school?.avgMCAT,
    school?.avgSAT,
    school?.avgACT,
    school?.avgGPA,
    school?.acceptanceRate,
    school?.acceptanceRate != null ? `${school.acceptanceRate}%` : '',
    school?.fit != null ? `${school.fit}%` : '',
    profile?.name,
  ].filter(Boolean);

  for (const item of removals) {
    text = text.replace(new RegExp(escapeRegExp(item), 'gi'), '');
  }

  return text
    .replace(/\b(GMAT|GRE|LSAT|MCAT|SAT|ACT|GPA|fit score|fit index|selectivity)\b[^.?!,;]*/gi, '')
    .replace(/\b(?:admit|admission|acceptance)\s+rate\b[^.?!,;]*/gi, '')
    .replace(/\b(location|located in)\b[^.?!,;]*/gi, '')
    .replace(/\s+[,;:.]\s+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
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
  if (namedStrength) return namedStrength;
  if (/\bpe\b|private equity|buyout|private capital|finance|invest/.test(source)) return { angle: 'Known for finance recruiting, investor alumni access, and private-capital signaling.', fact: 'Most valuable when the application makes the investing thesis concrete.' };
  if (/deep[-\s]?tech|ai|technology|tech|innovation|entrepreneur|venture|startup|founder/.test(source)) return { angle: 'Distinguished by an innovation ecosystem, technical network, and entrepreneurship platform that can support deep-tech or founder goals.', fact: 'The strongest applications connect technical fluency to a specific market or venture thesis.' };
  if (/faculty|lab|research|supervisor|phd|doctoral/.test(source)) return { angle: 'Strategic value depends on supervisor/lab alignment, methods fit, funding relevance, and research match more than brand alone.', fact: 'The decisive question is whether the research agenda maps cleanly to faculty capacity.' };
  if (/portfolio|studio|critique|design|creative|interactive|mfa|mdes|mps/.test(source)) return { angle: 'Value depends on portfolio fit, studio culture, critique model, and the surrounding creative-technical ecosystem.', fact: 'The best evidence is a distinctive body of work, not conventional metrics.' };
  if (/law|jd|llm|legal/.test(source)) return { angle: 'Most useful when its legal specialization, clerkship or employer pipeline, and alumni network match the intended practice area.', fact: 'The strongest case will tie prior legal or policy work to a specific practice direction.' };
  if (/medicine|medical|md|clinical|health/.test(source)) return { angle: 'Strategic value comes from clinical exposure, research access, health-system partnerships, and fit with the intended medical path.', fact: 'The profile must show service maturity and scientific readiness, not only academic strength.' };
  if (/undergraduate|intended major|internship|advising/.test(source)) return { angle: 'Strength depends on intended-major depth, advising quality, internship access, and the student ecosystem around the academic direction.', fact: 'The fit is strongest when academic direction and extracurricular evidence point the same way.' };
  if (/alumni|network|recruit|placement|employer|career/.test(source)) return { angle: 'Recognized for alumni reach, employer access, and recruiting strength tied to the target outcome.', fact: 'The strongest use of this platform is a precise career bridge: which employers, industries, mentors, or projects the candidate can realistically activate.' };
  return { angle: 'Best evaluated through the program strengths that are specific to the candidate track: employer outcomes, academic depth, alumni reach, faculty or lab access, ecosystem fit, and culture.', fact: 'The application should show exactly which of those assets unlock the next step, because generic prestige is not a strategy.' };
}

function buildProgramInfo(school, profile) {
  if (!isWeakProgramInfo(school?.programInfo, school)) {
    return firstSentences(sanitizeProgramInfo(school.programInfo, school, profile), '', 4);
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
  const intelligence = inferStrategicAngle(school, profile);

  if (/phd|doctoral|research/.test(source)) {
    return `Best evaluated through supervisor/lab alignment with the ${goal}; funding, methods fit, and research match matter more than brand alone.`;
  }
  if (/portfolio|mfa|mdes|mps|studio|creative|interactive/.test(source)) {
    return `Value depends on portfolio fit, studio culture, critique model, and the creative-technical ecosystem around the ${goal}.`;
  }
  if (/undergraduate|bachelor|college/.test(source)) {
    return `Strategic value depends on intended-major strength, advising, internships, and student ecosystem support for the ${goal}.`;
  }
  return `${intelligence.angle} ${intelligence.fact || ''}`.trim();
}

function strategicTradeoff(school, profile) {
  const source = [
    school?.notes,
    school?.programInfo,
    Array.isArray(school?.fitDrivers) ? school.fitDrivers.join(' ') : '',
    Array.isArray(school?.evidenceGaps) ? school.evidenceGaps.join(' ') : '',
    Array.isArray(school?.riskFlags) ? school.riskFlags.join(' ') : '',
    textFromProfile(profile),
    school?.programGroup,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/\bpe\b|private equity|buyout|private capital|finance|invest/.test(source)) {
    return 'The trade-off is that finance outcomes depend heavily on a precise investing thesis and targeted networking, not brand alone.';
  }
  if (/deep[-\s]?tech|ai|technology|tech|venture|startup|founder|innovation/.test(source)) {
    return 'The strategic question is whether the application proves technical fluency strongly enough to access the venture and founder ecosystem.';
  }
  if (/consult|general management|operator|leadership/.test(source)) {
    return 'It is strongest for broad leadership or consulting paths, but less ideal if the goal is a narrow specialist track.';
  }
  if (/phd|doctoral|research|faculty|lab|supervisor/.test(source)) {
    return 'The trade-off is that faculty fit and funding alignment matter more than institutional brand.';
  }
  if (/portfolio|studio|creative|design|interactive|mfa|mdes|mps/.test(source)) {
    return 'The trade-off is that portfolio distinctiveness will matter more than conventional academic strength.';
  }
  if (/law|jd|llm|legal/.test(source)) {
    return 'The strategic value depends on matching the legal specialization and employer pipeline to the intended practice area.';
  }
  if (/medicine|medical|md|clinical|health/.test(source)) {
    return 'The trade-off is that service maturity and clinical exposure must be as convincing as academic readiness.';
  }
  return 'The strategic trade-off is whether its strongest outcomes match the next career move closely enough to justify the application effort.';
}

function fitEvidenceSummary(school) {
  const source = [
    ...(Array.isArray(school?.fitDrivers) ? school.fitDrivers : []),
    school?.notes,
  ].filter(Boolean).join(' ').toLowerCase();
  const signals = [];

  if (/leadership|manager|led|founded|impact|elite leadership/.test(source)) signals.push('demonstrated leadership');
  if (/professional|career|experience|operator|strategy|consult|public-sector|private-sector/.test(source)) signals.push('a coherent professional arc');
  if (/goal|alignment|finance|private equity|\bpe\b|venture|vc|deep[-\s]?tech|technology/.test(source)) signals.push('clear career alignment');
  if (/research|publication|thesis|faculty|lab|methods/.test(source)) signals.push('research readiness');
  if (/portfolio|studio|creative|design|project|technical craft/.test(source)) signals.push('portfolio and project evidence');
  if (/recommender|recommendation|direct evaluator|supervisor/.test(source)) signals.push('credible recommender potential');
  if (/award|unique|distinctive|international|diversity|national-level/.test(source)) signals.push('a differentiated background');
  if (/academic|quantitative|rigor|analytical/.test(source)) signals.push('academic readiness');

  const uniqueSignals = [...new Set(signals)].slice(0, 3);
  if (!uniqueSignals.length) return '';
  if (uniqueSignals.length === 1) return uniqueSignals[0];
  if (uniqueSignals.length === 2) return `${uniqueSignals[0]} and ${uniqueSignals[1]}`;
  return `${uniqueSignals.slice(0, -1).join(', ')}, and ${uniqueSignals[uniqueSignals.length - 1]}`;
}

function buildAccordionSummary(school, profile) {
  const intelligence = inferStrategicAngle(school, profile);
  const enrichedInsight = stripRowVisibleFacts(`${intelligence.angle || ''} ${intelligence.fact || ''}`, school, profile);
  const storedInsight = !isWeakProgramInfo(school?.programInfo, school)
    ? stripRowVisibleFacts(school.programInfo, school, profile)
    : '';
  const genericEnrichment = /distinctive program strengths|concrete next step/i.test(enrichedInsight);
  const programInsight = genericEnrichment
    ? stripRowVisibleFacts(storedInsight || buildProgramInfo(school, profile), school, profile)
    : enrichedInsight;
  const fitEvidence = fitEvidenceSummary(school);
  const fitSentence = fitEvidence ? `The profile reads as a credible match because it shows ${fitEvidence}.` : '';
  const goal = goalLabel(profile, school);
  const goalSentence = goal !== 'stated goal'
    ? `For a ${goal}, those strengths matter because they point toward the networks and outcomes the application must credibly reach.`
    : '';
  const tradeoff = strategicTradeoff(school, profile);
  const summary = [programInsight, goalSentence, fitSentence, tradeoff].filter(Boolean).join(' ')
    .replace(/\.{3,}/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
  return firstSentences(limitWords(summary, 125), '', 4);
}

export default function Analysis({ setCandTab, scores, strengths, weaknesses, programs, profile, send, busy, chosenSchools, setChosenSchools, confirmTargetSchools }) {
  const hasData = !!scores;
  const trackConfig = getTrackConfig(profile || {});
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
    if (!selected.length || busy) return;
    confirmTargetSchools?.(selected);
  };

  const refreshAnalysis = () => {
    if (!send || busy) return;
    send('Refresh Analysis.');
  };

  if (!hasData) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 34px 34px' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: '52px 36px', background: '#fff', borderRadius: 20, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 3px 10px rgba(148,153,251,.4)' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" style={{ fill: 'none', stroke: '#fff', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Newsreader',serif", fontSize: 28, fontWeight: 700, color: '#141b34', margin: '0 0 14px' }}>Analysis Not Yet Available</h2>
          <p style={{ fontSize: 14.5, color: '#6b7392', lineHeight: 1.65, margin: '0 0 28px' }}>
            Your competitiveness analysis will appear here once the advisor has enough information about your profile. Paste your CV or answer a few questions to get started.
          </p>
          <button onClick={() => setCandTab('advisor')}
            style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(148,153,251,.4)' }}>
            Go to Advisor →
          </button>
        </div>
      </div>
    );
  }

  const descriptions = Object.fromEntries((trackConfig.kpis || []).map(([key, , desc]) => [key, desc]));
  const scoreItems = getCandidateKpiDisplayItems(scores, profile)
    .map(item => ({ ...item, title: item.label, desc: descriptions[item.key] }));

  const displayStrengths = strengths || [];
  const displayWeaknesses = weaknesses || [];
  const displayPrograms = normalizeProgramList(programs) || [];
  const savedTargets = chosenSchools || [];
  const hasAnyUnlockedPrograms = displayPrograms.some(program => program.tier !== 'locked');
  const tierOrder = hasAnyUnlockedPrograms ? ['stretch', 'possible', 'safe', 'locked'] : ['locked', 'stretch', 'possible', 'safe'];

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#faf6ec' }}>
      <div className="pw-analysis-page" style={{ maxWidth: 1020, margin: '0 auto', padding: '24px 34px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 20, padding: '18px 22px', borderRadius: 20, background: 'linear-gradient(135deg,#fffdf7,#fff8ea)', border: '1px solid #efe5cf', boxShadow: '0 16px 32px rgba(22,35,63,.06)' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.4px', color: '#5b46e0', marginBottom: 10 }}>CANDIDATE OVERVIEW</div>
            <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 40, lineHeight: 1.08, fontWeight: 800, color: '#141b34', margin: 0 }}>
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
          <div className="pw-analysis-header-actions" style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <button onClick={refreshAnalysis} disabled={busy}
              title="Refresh analysis using the latest chat details"
              style={{
                background: busy
                  ? 'linear-gradient(135deg,#e7dcc7,#c8cfdf)'
                  : 'linear-gradient(135deg,#141b34,#2c3e63)',
                border: '1px solid rgba(255,255,255,.55)',
                borderRadius: 999,
                padding: '11px 18px',
                fontSize: 13.5,
                fontWeight: 800,
                color: busy ? '#788198' : '#fff',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: busy
                  ? 'inset 0 1px 0 rgba(255,255,255,.35)'
                  : '0 12px 24px rgba(217,166,44,.28), inset 0 1px 0 rgba(255,255,255,.72)',
                opacity: busy ? 0.7 : 1,
              }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
                <path d="M3 21v-5h5" />
                <path d="M3 12A9 9 0 0 1 18.4 5.6L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              {busy ? 'Refreshing...' : 'Refresh Analysis'}
            </button>
            <button onClick={() => setCandTab('documents')}
              style={{ background: '#fff', border: '1px solid #e7dcc7', borderRadius: 10, padding: '12px 18px', fontSize: 13.5, fontWeight: 700, color: '#141b34', cursor: 'pointer', fontFamily: 'inherit' }}>
              Strengthen My CV
            </button>
            <button onClick={() => setCandTab('advisor')}
              style={{ background: '#5b46e0', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(184,144,47,.26)' }}>
              Ask Advisor
            </button>
          </div>
        </div>

        {/* Refresh analysis CTA */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg,#fff8de,#f5c94c 52%,#d8a326)',
          border: '1px solid rgba(255,255,255,.7)',
          borderRadius: 20,
          padding: '18px 22px',
          marginBottom: 24,
          boxShadow: '0 16px 32px rgba(217,166,44,.24), inset 0 1px 0 rgba(255,255,255,.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'absolute', top: -28, right: 24, width: 82, height: 82, borderRadius: '50%', background: 'rgba(255,255,255,.24)' }} />
          <div style={{ position: 'absolute', bottom: -34, left: -18, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,.16)' }} />
          <div style={{ position: 'relative', minWidth: 220 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '1px', color: '#70510a', marginBottom: 5 }}>LATEST CHAT UPDATE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#3d2d08' }}>Refresh scores and school matches with new info.</div>
          </div>
          <button onClick={refreshAnalysis} disabled={busy}
            style={{
              position: 'relative',
              background: busy ? 'rgba(255,255,255,.62)' : '#fff',
              border: '1px solid rgba(112,81,10,.14)',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 13.5,
              fontWeight: 900,
              color: busy ? '#8d7b50' : '#4b3708',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              boxShadow: '0 10px 20px rgba(85,58,4,.16), inset 0 1px 0 rgba(255,255,255,.8)',
            }}>
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
              <path d="M3 21v-5h5" />
              <path d="M3 12A9 9 0 0 1 18.4 5.6L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            {busy ? 'Refreshing...' : 'Refresh Analysis'}
          </button>
        </div>

        {/* Overall score banner */}
        {scores.overall != null && (
          <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#474d80,#6d5cc2)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, boxShadow: '0 16px 30px rgba(40,30,90,.28)' }}>
            <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: '#d9cbb3', marginBottom: 6 }}>OVERALL COMPETITIVENESS SCORE</div>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: '-1px' }}>{scores.overall}<span style={{ fontSize: 18, color: '#d9cbb3', fontWeight: 600 }}>/100</span></div>
            </div>
          </div>
        )}

        {/* Score breakdown */}
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.4px', color: '#5b46e0', marginBottom: 10 }}>PROFILE BREAKDOWN · {scoreItems.length} KPIs</div>
        <div style={{ background: '#fffdf7', borderRadius: 20, padding: '28px 26px', border: '1px solid #efe5cf', boxShadow: '0 18px 40px rgba(22,35,63,.05)', marginBottom: 24 }}>
          {scoreItems.map((item, i) => (
            <ScoreBar key={item.key} score={item.value} incomplete={item.status === 'incomplete'} title={item.title} last={i === scoreItems.length - 1} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </div>

        {/* Strengths / Growth areas */}
        {(displayStrengths.length > 0 || displayWeaknesses.length > 0) && (
          <div className="pw-analysis-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 40 }}>
            {displayStrengths.length > 0 && (
              <div style={{ background: '#fffdf7', borderRadius: 20, padding: 28, border: '1px solid #efe5cf', boxShadow: '0 18px 40px rgba(22,35,63,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efe5cf', paddingBottom: 14, marginBottom: 18 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#eafdf6', color: '#19c08a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>★</span>
                  <h3 style={{ fontFamily: "'Newsreader',serif", fontSize: 20, fontWeight: 700, color: '#141b34', margin: 0 }}>Core Strengths</h3>
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
              <div style={{ background: '#fffdf7', borderRadius: 20, padding: 28, border: '1px solid #efe5cf', boxShadow: '0 18px 40px rgba(22,35,63,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efe5cf', paddingBottom: 14, marginBottom: 18 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#fff1f6', color: '#e0457a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>◷</span>
                  <h3 style={{ fontFamily: "'Newsreader',serif", fontSize: 20, fontWeight: 700, color: '#141b34', margin: 0 }}>Growth Areas</h3>
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
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.4px', color: '#5b46e0', marginBottom: 10 }}>PORTFOLIO OPTIMIZATION</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <h2 style={{ fontFamily: "'Newsreader',serif", fontSize: 32, fontWeight: 800, color: '#141b34', margin: 0 }}>Strategic School Portfolio</h2>
            </div>
            <p style={{ fontSize: 13.5, color: '#6b7392', margin: '0 0 24px', fontWeight: 500 }}>
              {savedTargets.length > 0 ? 'Your target schools are saved here. You can adjust them anytime.' : 'Tap the schools that excite you most, then send your picks straight to your advisor.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {tierOrder.map(tierKey => {
                const tier = TIERS.find(item => item.key === tierKey);
                const schools = displayPrograms.filter(p => p.tier === tier.key);
                if (schools.length === 0) return null;
                return (
                  <div key={tier.key} style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 28px rgba(22,35,63,.05)' }}>
                    {/* Tier header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', borderBottom: `1px solid ${tier.border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: tier.accent, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: tier.accent }}>{tier.label}</span>
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
                        const admitRate = getAdmitRateMetric(school);
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
                                background: isSelected ? tier.accent : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}>
                              {isSelected && (
                                <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>

                            <div className="pw-school-info" style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 700, color: isLocked ? '#9098b5' : '#141b34' }}>
                                  {school.name}
                                </div>
                                {(school.admissionStatus || school.tier || school.fit != null) && (
                                  <span style={{ fontSize: 12, fontWeight: 800, color: fitBucketColor(school), background: '#ffffff99', border: `1px solid ${fitBucketColor(school)}55`, borderRadius: 999, padding: '3px 8px' }}>
                                    {fitBucketLabel(school)}
                                  </span>
                                )}
                                {school.selectivityLabel && (() => {
                                  const badge = SELECTIVITY_BADGES[school.selectivityLabel] || SELECTIVITY_BADGES.Competitive;
                                  return (
                                    <span style={{ fontSize: 12, fontWeight: 800, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 999, padding: '3px 8px' }}>
                                      {displaySelectivityLabel(school.selectivityLabel)}
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
                              {admitRate && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{admitRate}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>ADMIT RATE</div>
                                </div>
                              )}
                              {testMetric && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{testMetric.value}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>{testMetric.label}</div>
                                </div>
                              )}
                              {school.avgGPA != null && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{school.avgGPA}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>AVG GPA</div>
                                </div>
                              )}
                              {school.fit != null && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: tier.accent, lineHeight: 1 }}>{isLocked ? '—' : `${school.fit}%`}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 3 }}>FIT INDEX</div>
                                </div>
                              )}
                              <div style={{ width: 24, textAlign: 'center', fontSize: 18, fontWeight: 800, color: tier.accent, lineHeight: 1 }}>
                                {isExpanded ? '⌄' : '⌃'}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '10px 22px 18px 58px' }}>
                              <div style={{ fontSize: 12.5, color: '#33405e', lineHeight: 1.55, maxWidth: 760 }}>
                                {buildAccordionSummary(school, profile)}
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
          <div style={{ background: '#fffdf7', border: '1px dashed #d3c9a8', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 14.5, color: '#6b7392', marginBottom: 16, fontWeight: 500 }}>School recommendations will appear here after your advisor completes the Programs step.</div>
            <button onClick={() => setCandTab('advisor')}
              style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(22,35,63,.26)' }}>
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
          <div className="pw-analysis-sticky-bar" style={{
            margin: '0 auto 18px', maxWidth: 620, width: 'calc(100% - 32px)',
            background: '#141b34', borderRadius: 14, padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            boxShadow: '0 16px 34px rgba(15,26,48,.35)',
          }}>
            <div style={{ color: '#eef2fa', fontSize: 13.5, fontWeight: 600, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 17, marginRight: 8 }}>{selected.length}</span>
              {selected.length === 1 ? 'school selected' : 'schools selected'}
            </div>
            <div className="pw-analysis-sticky-actions" style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setSelected([]); setChosenSchools && setChosenSchools([]); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)', color: '#c6d2ea', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
              <button onClick={confirmSelection} disabled={busy}
                style={{ background: '#f5c94c', border: 'none', color: '#42320a', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {busy ? 'Confirming…' : 'Back to Chat with Picks →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
