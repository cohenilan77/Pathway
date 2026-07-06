import React, { useState } from 'react';
import Dashboard from './Dashboard.jsx';
import Advisor from './Advisor.jsx';
import Analysis from './Analysis.jsx';
import Documents from './Documents.jsx';
import Community from './Community.jsx';
import Settings from './Settings.jsx';
import Chat from './Chat.jsx';
import UndergradRoadmap from './UndergradRoadmap.jsx';
import UndergradTracker from './UndergradTracker.jsx';
import UndergradKpiPanel from './UndergradKpiPanel.jsx';
import HelpModal from './HelpModal.jsx';
import { LANGUAGES } from '../../constants.js';
import { downloadAsPdf, downloadAsDocx } from '../../lib/documentExport.js';
import NotificationBell from '../NotificationBell.jsx';
import { getTrackConfig } from '../../trackConfig.js';
import { estimatePracticeScore } from '../../lib/testScoring.js';
import { undergradProfileStage } from '../../../lib/undergrad-profile.js';

const PLAN_LABELS = { free: 'Free plan', ai: 'AI', ai_strategy: 'AI + Strategy' };

const PLAN_ACCESS = {
  free: new Set(['dashboard', 'advisor', 'settings']),
  ai: new Set(['dashboard', 'advisor', 'analysis', 'documents', 'documentDepository', 'community', 'settings',
    'studentProfile', 'roadmap', 'ugRoadmap', 'ugTracker', 'activities', 'universities', 'testing', 'essays', 'applications']),
  ai_strategy: null, // null = all tabs
};

const NAV_ITEMS = [
  {
    key: 'dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  },
  {
    key: 'advisor', label: 'Advisor',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>,
  },
  {
    key: 'analysis', label: 'Analysis',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></svg>,
  },
  {
    key: 'documents', label: 'Simulation',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>,
  },
  {
    key: 'documentDepository', label: 'Documents',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>,
  },
  {
    key: 'community', label: 'Community',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.85" /></svg>,
  },
  {
    key: 'settings', label: 'Settings',
    icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>,
  },
];

const CHAT_NAV_ITEM = {
  key: 'chat', label: 'Live Chat',
  icon: <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>,
};

const ICON_BY_KEY = Object.fromEntries(NAV_ITEMS.map(item => [item.key, item.icon]));
ICON_BY_KEY.chat = CHAT_NAV_ITEM.icon;
ICON_BY_KEY.community = ICON_BY_KEY.community;
ICON_BY_KEY.studentProfile = ICON_BY_KEY.advisor;
ICON_BY_KEY.roadmap = ICON_BY_KEY.analysis;
ICON_BY_KEY.activities = ICON_BY_KEY.documents;
ICON_BY_KEY.universities = ICON_BY_KEY.analysis;
ICON_BY_KEY.testing = ICON_BY_KEY.documentDepository;
ICON_BY_KEY.essays = ICON_BY_KEY.documents;
ICON_BY_KEY.applications = ICON_BY_KEY.documentDepository;
ICON_BY_KEY.ugRoadmap = ICON_BY_KEY.analysis;
ICON_BY_KEY.ugTracker = ICON_BY_KEY.documentDepository;

function navFromConfig(config, hasChatAccess) {
  let items = Array.isArray(config?.nav) && config.nav.length
    ? config.nav.map(([key, label, iconKey]) => ({
      key,
      label,
      icon: ICON_BY_KEY[iconKey] || ICON_BY_KEY[key] || ICON_BY_KEY.dashboard,
    }))
    : [...NAV_ITEMS];

  if (hasChatAccess && !items.some(item => item.key === 'chat')) {
    const settingsIndex = items.findIndex(item => item.key === 'settings');
    items = [...items];
    items.splice(settingsIndex >= 0 ? settingsIndex : items.length, 0, CHAT_NAV_ITEM);
  }
  return items;
}

function navStyle(active) {
  return active
    ? { position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#fff', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 3px 10px rgba(148,153,251,.35)' }
    : { position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#6b7392', background: 'transparent' };
}

function buildCandidateAlerts({ documents = [], chat = [], tasks = [], completedTasks = [], plan }) {
  const activeDocs = documents.filter(doc => doc.status !== 'Archived');
  const alerts = [];
  const latestAdvisor = [...chat].reverse().find(m => m.role === 'ai' && !String(m.text || '').includes('Welcome'));
  if (latestAdvisor) {
    alerts.push({
      id: `advisor-reply-${String(latestAdvisor.text || '').slice(0, 36)}`,
      title: 'Advisor replied',
      message: 'Open Advisor to continue the conversation.',
      priority: 'medium',
    });
  }
  activeDocs.filter(doc => doc.status === 'Needs review').slice(0, 3).forEach(doc => alerts.push({
    id: `doc-review-${doc.id}`,
    title: 'Document needs review',
    message: `${doc.name} is saved but still needs review.`,
    priority: 'high',
    createdAt: doc.updatedAt,
  }));
  activeDocs.filter(doc => ['Generated', 'Ready'].includes(doc.status)).slice(0, 3).forEach(doc => alerts.push({
    id: `doc-saved-${doc.id}`,
    title: 'Document saved',
    message: `${doc.name} is available in Documents.`,
    priority: 'low',
    createdAt: doc.updatedAt,
  }));
  const remainingTasks = Math.max(0, (tasks || []).length - (completedTasks || []).length);
  if (remainingTasks) {
    alerts.push({
      id: `tasks-open-${remainingTasks}`,
      title: 'Open application tasks',
      message: `${remainingTasks} task${remainingTasks === 1 ? '' : 's'} still need attention.`,
      priority: 'medium',
    });
  }
  return alerts;
}

function DocumentDepositoryPage({ documents = [], setCandTab, send, archiveDocument, showToast }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const visibleDocs = documents
    .filter(doc => doc.status !== 'Archived')
    .filter(doc => category === 'all' || doc.type === category)
    .filter(doc => source === 'all' || doc.source === source)
    .filter(doc => {
      const q = query.trim().toLowerCase();
      return !q || [doc.name, doc.type, doc.source, doc.status, doc.linkedSchool].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  const categories = [
    ['all', 'All documents'],
    ['resume', 'Resume / CV'],
    ['essay', 'Essays'],
    ['portfolio', 'Portfolio'],
    ['transcript', 'Transcript'],
    ['certificate', 'Certificates'],
    ['ref_letter', 'Ref Letters'],
  ];
  const countFor = (key) => key === 'all'
    ? documents.filter(doc => doc.status !== 'Archived').length
    : documents.filter(doc => doc.status !== 'Archived' && doc.type === key).length;
  const toggleSelected = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectedDocs = documents.filter(doc => selected.has(doc.id));
  const sendSelected = () => {
    if (!selectedDocs.length) { showToast('Choose at least one document first.'); return; }
    const body = selectedDocs.map(doc => `# ${doc.name}\nSource: ${doc.source}\nType: ${doc.type}\n\n${doc.text || '[Original file attached without extracted text]'}`).join('\n\n---\n\n');
    setCandTab('advisor');
    send(`Please review these selected documents and tell me what to improve:\n\n${body}`);
  };
  const typeLabel = (type) => ({
    resume: 'Resume / CV',
    essay: 'Essay',
    portfolio: 'Portfolio',
    transcript: 'Transcript',
    certificate: 'Certificate',
    ref_letter: 'Ref Letter',
  }[type] || 'Other');
  const statusColor = (status) => status === 'Needs review'
    ? { bg: '#fff8ea', color: '#b27620' }
    : status === 'Generated'
      ? { bg: '#eef1f7', color: '#141b34' }
      : { bg: '#eafdf6', color: '#119467' };

  return (
    <div className="pw-depository-page" style={{ flex: 1, minHeight: 0, padding: '24px 28px 28px', background: '#f6f1e8' }}>
      <div className="pw-depository-grid" style={{ height: '100%', display: 'grid', gridTemplateColumns: '270px 1fr', background: '#faf7f2', borderRadius: 24, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', overflow: 'hidden' }}>
        <aside className="pw-depository-sidebar" style={{ borderRight: '1px solid #f1eadd', padding: 20, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.8px', color: '#9098b5', marginBottom: 16 }}>DOCUMENT REPOSITORY</div>
          <div className="pw-depository-cats" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map(([key, label]) => (
              <button key={key} onClick={() => setCategory(key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', background: category === key ? '#e5f5ef' : 'transparent', color: category === key ? '#145d4b' : '#3c4564', fontSize: 13.5, fontWeight: category === key ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span>{label}</span><span>{countFor(key)}</span>
              </button>
            ))}
          </div>
        </aside>
        <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="pw-depository-header" style={{ padding: 24, borderBottom: '1px solid #f1eadd' }}>
            <div className="pw-depository-heading-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#141b34', margin: 0, letterSpacing: '-.4px' }}>Documents</h1>
                <div style={{ fontSize: 13, color: '#6b7392', marginTop: 4 }}>Files saved from Advisor chat, Simulation, uploads, and generated work.</div>
              </div>
              <div className="pw-depository-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ padding: '9px 14px', border: '1px solid #d8dfeb', borderRadius: 10, background: '#f6f1e8', color: '#6b7392', fontSize: 13, fontWeight: 700 }}>{selected.size} selected</span>
                <button onClick={sendSelected} style={{ background: '#faf7f2', border: '1.5px solid #d8dfeb', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#141b34', cursor: 'pointer', fontFamily: 'inherit' }}>Send selected to chat</button>
              </div>
            </div>
            <div className="pw-depository-filters" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search documents, sources, schools" style={{ border: '1.5px solid #d8dfeb', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#faf7f2' }} />
              <select value={source} onChange={e => setSource(e.target.value)} style={{ border: '1.5px solid #d8dfeb', borderRadius: 10, padding: '11px 12px', fontSize: 14, fontFamily: 'inherit', background: '#faf7f2' }}>
                <option value="all">Any source</option>
                <option value="Simulation">Simulation</option>
                <option value="Advisor Chat">Advisor Chat</option>
                <option value="Upload">Upload</option>
                <option value="AI Rewrite">AI Rewrite</option>
              </select>
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {visibleDocs.length === 0 ? (
              <div style={{ margin: 28, border: '2px dashed #e7dcc7', borderRadius: 16, padding: 44, textAlign: 'center', color: '#9098b5', fontSize: 14 }}>No documents yet. Save work from Simulation or upload/share files in Advisor to populate this repository.</div>
            ) : (
              <>
              <div className="pw-depository-mobile-list">
                {visibleDocs.map(doc => {
                  const color = statusColor(doc.status);
                  return (
                    <article key={doc.id} className={selected.has(doc.id) ? 'pw-depository-mobile-card is-selected' : 'pw-depository-mobile-card'}>
                      <div className="pw-depository-mobile-card-head">
                        <label>
                          <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelected(doc.id)} />
                          <span>{doc.name}</span>
                        </label>
                        <span style={{ background: color.bg, color: color.color }}>{doc.status || 'Ready'}</span>
                      </div>
                      <div className="pw-depository-mobile-meta">
                        <span>{typeLabel(doc.type)}</span>
                        <span>{doc.source}</span>
                        <span>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : '-'}</span>
                      </div>
                      {doc.linkedSchool && <div className="pw-depository-mobile-school">{doc.linkedSchool}</div>}
                      <div className="pw-depository-mobile-actions">
                        {doc.text && <button onClick={() => downloadAsPdf(doc.text, doc.name)}>PDF</button>}
                        {doc.text && <button onClick={() => downloadAsDocx(doc.text, doc.name)}>Word</button>}
                        <button onClick={() => archiveDocument(doc.id)}>Archive</button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <table className="pw-depository-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#6b7392', fontSize: 12, letterSpacing: '.7px' }}>
                  <th style={{ textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid #f1eadd' }}>NAME</th>
                  <th style={{ textAlign: 'center', padding: '14px 10px', borderBottom: '1px solid #f1eadd' }}>CHOOSE</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', borderBottom: '1px solid #f1eadd' }}>STATUS</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', borderBottom: '1px solid #f1eadd' }}>SOURCE</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', borderBottom: '1px solid #f1eadd' }}>UPDATED</th>
                  <th style={{ padding: '14px 20px', borderBottom: '1px solid #f1eadd' }}></th>
                </tr></thead>
                <tbody>
                  {visibleDocs.map(doc => {
                    const color = statusColor(doc.status);
                    return (
                      <tr key={doc.id} style={{ background: selected.has(doc.id) ? '#f0faf6' : '#faf7f2' }}>
                        <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1eadd' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#141b34' }}>{doc.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7392', marginTop: 2 }}>{typeLabel(doc.type)}{doc.linkedSchool ? ` · ${doc.linkedSchool}` : ''} · v{doc.version || 1}</div>
                        </td>
                        <td style={{ textAlign: 'center', borderBottom: '1px solid #f1eadd' }}><input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelected(doc.id)} /></td>
                        <td style={{ padding: '14px 10px', borderBottom: '1px solid #f1eadd' }}><span style={{ background: color.bg, color: color.color, borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>{doc.status || 'Ready'}</span></td>
                        <td style={{ padding: '14px 10px', borderBottom: '1px solid #f1eadd', fontSize: 13, color: '#141b34' }}>{doc.source}</td>
                        <td style={{ padding: '14px 10px', borderBottom: '1px solid #f1eadd', fontSize: 13, color: '#141b34' }}>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1eadd', whiteSpace: 'nowrap' }}>
                          {doc.text && <button onClick={() => downloadAsPdf(doc.text, doc.name)} style={{ border: '1px solid #d8dfeb', borderRadius: 8, background: '#faf7f2', padding: '6px 9px', marginRight: 6, cursor: 'pointer' }}>PDF</button>}
                          {doc.text && <button onClick={() => downloadAsDocx(doc.text, doc.name)} style={{ border: '1px solid #d8dfeb', borderRadius: 8, background: '#faf7f2', padding: '6px 9px', marginRight: 6, cursor: 'pointer' }}>Word</button>}
                          <button onClick={() => archiveDocument(doc.id)} style={{ border: '1px solid #d8dfeb', borderRadius: 8, background: '#faf7f2', padding: '6px 9px', cursor: 'pointer' }}>Archive</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function undergradGradeNumber(profile) {
  const grade = String(profile?.grade || profile?.currentGrade || '').match(/\d{1,2}/)?.[0];
  return grade ? Number(grade) : null;
}

function splitUniversities(programs = []) {
  return {
    Reach: programs.filter(p => p.tier === 'stretch' || (p.fit ?? 0) < 50),
    Target: programs.filter(p => p.tier === 'possible' || ((p.fit ?? 0) >= 50 && (p.fit ?? 0) <= 80)),
    Likely: programs.filter(p => p.tier === 'safe' || (p.fit ?? 0) > 80),
    Locked: programs.filter(p => p.tier === 'locked'),
  };
}

function orderedUniversityBuckets(programs = []) {
  const buckets = splitUniversities(programs);
  const hasNonLocked = buckets.Reach.length || buckets.Target.length || buckets.Likely.length;
  const order = buckets.Locked.length && !hasNonLocked
    ? ['Locked', 'Reach', 'Target', 'Likely']
    : ['Reach', 'Target', 'Likely', 'Locked'];

  return order
    .map(label => [label, buckets[label] || []])
    .filter(([, schools]) => schools.length);
}

function intendedMajor(profile = {}) {
  return String(profile.intendedMajor || profile.major || profile.subjects || profile.interests || profile.goals || '').toLowerCase();
}

function cleanSchoolDescription(value, maxWords = 120) {
  const text = String(value || '')
    .replace(/\.{3,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const joined = sentences.slice(0, 4).join(' ').replace(/\s+/g, ' ').trim();
  const words = joined.split(' ').filter(Boolean);
  if (words.length <= maxWords) return joined.replace(/[,:;\-]+$/g, '').trim();
  const cut = words.slice(0, maxWords).join(' ');
  const sentenceEnd = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  if (sentenceEnd > 80) return cut.slice(0, sentenceEnd + 1).trim();
  return `${cut.replace(/\s+\S*$/, '').replace(/[,:;\-]+$/, '').trim()}.`;
}

function undergradSchoolInsight(school = {}, profile = {}) {
  const name = String(school.name || '').toLowerCase();
  const major = intendedMajor(profile);
  const premed = /medicine|medical|pre-med|biology|chemistry|health|neuro|biomedical/.test(major);
  const cs = /computer science|cs|ai|software|data|technology|engineering|robotics/.test(major);
  const business = /business|economics|finance|entrepreneur|management|accounting/.test(major);
  const design = /design|architecture|arts|creative|studio|media/.test(major);
  const lawPolicy = /law|politics|policy|international relations|government|humanities|history|philosophy/.test(major);

  const rules = [
    {
      match: /mit|massachusetts institute of technology/,
      text: cs
        ? 'Exceptional for students aiming at computer science, AI, engineering, robotics, or technical entrepreneurship because undergraduate learning sits close to serious labs, founder culture, and top technology recruiting. The right application should show advanced coursework, original technical projects, and evidence of building rather than just consuming technology. The trade-off is that raw academic strength is not enough; the profile needs unusual initiative and technical depth.'
        : 'Best known for engineering, computation, applied science, and founder-driven problem solving, with a culture that rewards builders who can handle intensity. It is most compelling when the intended major is technical and the activity record already shows independent projects, research, competitions, or product work. The trade-off is that students without a clear technical spike can look less differentiated here than at broader universities.',
    },
    {
      match: /stanford/,
      text: cs || business
        ? 'Powerful for students interested in technology, entrepreneurship, AI, product building, or venture-backed innovation because the undergraduate ecosystem connects research, startups, design thinking, and ambitious peers. A strong match needs intellectual range plus evidence of initiative outside the classroom, not just high grades. The trade-off is that the story must feel original and self-directed rather than a generic Silicon Valley aspiration.'
        : 'Known for academic flexibility, entrepreneurship, research access, and a student culture that rewards initiative across disciplines. It fits students who can connect academic curiosity with projects, leadership, or community impact that already show momentum. The trade-off is that broad excellence can disappear in this pool unless the application has a clear personal spike.',
    },
    {
      match: /harvard/,
      text: 'Known for liberal arts breadth, institutional leadership, alumni reach, research access, and unmatched convening power across politics, business, science, and public life. It fits students who can show academic excellence plus a leadership or impact record that suggests they will shape communities, not simply join them. The trade-off is that prestige alone is never the argument; the application needs a distinctive intellectual and personal contribution.',
    },
    {
      match: /yale/,
      text: lawPolicy
        ? 'Especially strong for writing, humanities, politics, law-oriented exploration, global affairs, and close faculty-student intellectual culture. It fits students who can show depth of thought through debate, writing, research, civic work, or original inquiry. The trade-off is that the application should prove intellectual voice and community contribution, not only ambition for law or public life.'
        : 'Known for residential-college community, humanities strength, arts culture, writing, and unusually strong faculty-student engagement. It fits students who combine academic seriousness with a clear voice, creative or civic contribution, and genuine curiosity. The trade-off is that the application must feel deeply personal and intellectually alive, not just high-achieving.',
    },
    {
      match: /princeton/,
      text: 'Known for undergraduate teaching, rigorous academics, senior thesis culture, quantitative strength, public policy, economics, engineering, and close advising. It fits students who can show disciplined academic depth and the maturity to pursue a serious independent project. The trade-off is that the profile should read as intellectually focused rather than only activity-heavy.',
    },
    {
      match: /columbia/,
      text: business || lawPolicy
        ? 'Distinctive for its Core Curriculum, urban academic intensity, global affairs, finance, media, policy, and access to internships during the school year. It fits students who want a demanding intellectual base plus direct exposure to professional ecosystems. The trade-off is that the application should explain why an urban, structured, high-intensity environment is essential to the student direction.'
        : 'Known for the Core Curriculum, serious academic culture, urban engagement, research access, and proximity to major cultural and professional institutions. It fits students who want intellectual structure and real-world exposure at the same time. The trade-off is that fit depends on showing maturity for an intense city campus rather than just liking a famous university.',
    },
    {
      match: /penn|upenn|university of pennsylvania/,
      text: business
        ? 'Highly relevant for business, economics, finance, entrepreneurship, and interdisciplinary study because undergraduate options connect liberal arts with Wharton-level clubs, recruiting energy, and employer-facing student culture. It fits students who pair academic strength with leadership, initiative, and commercial curiosity. The trade-off is that the application must show substance behind business ambition, not just interest in finance or prestige.'
        : 'Known for pre-professional energy, interdisciplinary flexibility, strong student organizations, research, and employer-connected opportunities. It fits students who want academic breadth with practical ambition and visible leadership. The trade-off is that the profile should show direction and initiative, otherwise the pre-professional environment can make the story feel generic.',
    },
    {
      match: /duke/,
      text: premed
        ? 'Strong for future physicians through rigorous sciences, research access, hospital adjacency, service culture, and a collaborative undergraduate environment. It fits students who can combine biology or chemistry strength with sustained clinical exposure, volunteering, and leadership. The trade-off is that medical ambition must be supported by service maturity, not just strong grades.'
        : 'Known for strong academics, school spirit, research, public policy, entrepreneurship, and a collaborative campus culture. It fits students who combine high achievement with leadership, service, and community energy. The trade-off is that the application should show contribution to campus life, not only academic ambition.',
    },
    {
      match: /nyu|new york university/,
      text: business || design
        ? 'Valuable for students whose goals benefit from direct exposure to finance, media, arts, technology, startups, internships, and a highly independent urban environment. It fits applicants who already show maturity, initiative, and a reason to use the city as part of their education. The trade-off is that the student must be ready to self-direct; the opportunity is broad but less contained than a traditional campus.'
        : 'Known for urban independence, global programs, arts, media, business, technology, and internship access across multiple industries. It fits students who can turn city exposure into concrete academic and professional growth. The trade-off is that the application should show self-management and purpose, because the environment rewards students who actively build their own path.',
    },
  ];

  return rules.find(rule => rule.match.test(name))?.text || '';
}

function undergradUniversityDescription(school = {}, profile = {}) {
  const specific = undergradSchoolInsight(school, profile);
  if (specific) return cleanSchoolDescription(specific, 125);

  const stored = cleanSchoolDescription(school.programInfo || school.notes, 120);
  if (stored && stored.length > 120 && !/useful undergraduate platform|good school|strong university|located in|program relevance|mba relevance/i.test(stored)) return stored;

  const major = intendedMajor(profile);
  if (/medicine|medical|pre-med|biology|chemistry|health/.test(major)) {
    return 'Strong pathway for future physicians when the student can use science coursework, research access, service opportunities, and health-related advising to build a credible pre-med profile. The best fit comes from combining biology or chemistry depth with clinical volunteering, community impact, and maturity around patient-facing work. The trade-off is that medical-school readiness must be built over time, not assumed from grades alone.';
  }
  if (/computer science|cs|ai|software|data|technology|engineering/.test(major)) {
    return 'Strong technology pathway when the student can access advanced CS or engineering coursework, project-based learning, research, internships, and entrepreneurship opportunities. It fits applicants who already show technical curiosity through coding, competitions, products, or independent builds. The trade-off is that the application needs proof of making things, not just saying AI or computer science sounds interesting.';
  }
  if (/business|economics|finance/.test(major)) {
    return 'Strong platform for business, economics, or finance when rigorous quantitative coursework connects with clubs, internships, competitions, alumni access, and early employer exposure. It fits students who can show leadership, commercial curiosity, and evidence of initiative beyond classroom performance. The trade-off is that finance or business goals need a sharper story than simply wanting a prestigious career.';
  }
  if (/design|architecture|arts|creative/.test(major)) {
    return 'Valuable creative pathway when studio culture, critique, portfolio development, design resources, and interdisciplinary projects match the student direction. It fits applicants who can show original work, process, taste, and creative risk-taking rather than only academic strength. The trade-off is that portfolio depth and point of view will matter more than a broad activity list.';
  }
  if (/law|politics|policy|humanities/.test(major)) {
    return 'Strong exploratory pathway for law, politics, policy, or humanities when writing intensity, debate, research, civic engagement, and advising help the student build an intellectual voice. It fits applicants who can show argument, service, reading depth, and leadership in communities or ideas. The trade-off is that the application needs substance and perspective, not just a future-lawyer label.';
  }
  return 'Useful undergraduate platform when the student can explore academic direction while building stronger grades, activities, leadership, projects, and a coherent intended-major story. It fits profiles that are still forming but show curiosity, initiative, and room to grow over Grades 9-12. The strategic priority is to turn exploration into evidence: coursework, projects, awards, service, or leadership that make the future application feel intentional.';
}

function UndergradCard({ title, children, action }) {
  return (
    <div style={{ background: '#fffdf7', borderRadius: 16, border: '1px solid #efe7d4', boxShadow: '0 12px 30px rgba(22,35,63,.06)', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#5b46e0', textTransform: 'uppercase' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

const primaryButtonStyle = {
  background: '#141b34', color: '#fff', border: 'none', borderRadius: 9,
  padding: '10px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

const secondaryButtonStyle = {
  background: '#fff', color: '#141b34', border: '1px solid #e7dcc7', borderRadius: 9,
  padding: '9px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

function TestingSimulationCard({ title, testType, authToken, sessionId }) {
  const [phase, setPhase] = React.useState('idle');
  const [simulation, setSimulation] = React.useState(null);
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [flagged, setFlagged] = React.useState({});
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');
  const answersRef = React.useRef(answers);
  const deadlineRef = React.useRef(null);
  answersRef.current = answers;

  const questions = simulation?.questions || [];
  const answeredCount = Object.keys(answers).length;
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  const finishTest = React.useCallback((finalAnswers = answersRef.current) => {
    if (!questions.length) return;
    setResult(estimatePracticeScore(testType, questions, finalAnswers));
    setPhase('results');
  }, [questions, testType]);

  React.useEffect(() => {
    if (phase !== 'active') return undefined;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current || Date.now()) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(interval);
        finishTest(answersRef.current);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [phase, finishTest]);

  const startSimulation = async () => {
    setPhase('loading');
    setError('');
    setSimulation(null);
    setAnswers({});
    setFlagged({});
    setResult(null);
    setCurrentQuestion(0);
    try {
      const response = await fetch('/api/test-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ testType, conversationId: sessionId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.simulation) throw new Error(data.error || 'Could not generate the simulation.');
      setSimulation(data.simulation);
      setTimeLeft(data.simulation.durationSeconds);
      deadlineRef.current = Date.now() + data.simulation.durationSeconds * 1000;
      setPhase('active');
    } catch (generationError) {
      setError(generationError.message || 'Could not generate the simulation.');
      setPhase('error');
    }
  };

  const submitTest = () => {
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? '' : 's'} unanswered. Submit anyway?`)) return;
    finishTest(answersRef.current);
  };

  if (phase === 'idle' || phase === 'loading' || phase === 'error') {
    return (
      <div style={{ background: '#fffdf7', borderRadius: 16, border: '1px solid #efe7d4', boxShadow: '0 18px 40px rgba(60,72,130,.06)', padding: 28 }}>
        <div style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 700, color: '#141b34', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b7392', lineHeight: 1.55, marginBottom: 18 }}>
          20 original questions · {testType === 'sat' ? '28' : '20'} minutes · new AI-generated session every time
        </div>
        {error && <div style={{ background: '#fff1f6', color: '#c2416c', border: '1px solid #fbd3e2', borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <button onClick={startSimulation} disabled={phase === 'loading'} style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 13, padding: '12px 18px', fontSize: 13.5, fontWeight: 800, cursor: phase === 'loading' ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(22,35,63,.32)', width: '100%', opacity: phase === 'loading' ? 0.65 : 1 }}>
          {phase === 'loading' ? 'Generating a fresh test…' : `${phase === 'error' ? 'Try Again' : `Start ${title}`} →`}
        </button>
      </div>
    );
  }

  if (phase === 'results' && result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: '#fffdf7', borderRadius: 16, border: '1px solid #efe7d4', boxShadow: '0 18px 40px rgba(60,72,130,.06)', padding: 28 }}>
          <div className="pw-test-result-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,.8fr) 1.5fr', gap: 28, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9098b5', letterSpacing: '.6px' }}>ESTIMATED {testType.toUpperCase()} SCORE</div>
              <div style={{ fontSize: 54, fontWeight: 900, color: '#141b34', lineHeight: 1.1 }}>{result.estimatedScore}</div>
              <div style={{ fontSize: 12, color: '#9098b5' }}>Scale {result.scale}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#141b34', marginBottom: 6 }}>{result.correctCount} of {questions.length} correct · {result.percentage}%</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {Object.entries(result.sectionScores).map(([section, sectionScore]) => (
                  <span key={section} style={{ background: '#eef1f7', color: '#141b34', borderRadius: 9, padding: '6px 9px', fontSize: 12, fontWeight: 800 }}>{section}: {sectionScore}</span>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.5, marginBottom: 14 }}>{simulation.scoringNote}</div>
              <button onClick={startSimulation} style={{ ...primaryButtonStyle, padding: '10px 16px', fontSize: 13 }}>Generate a New Test</button>
            </div>
          </div>
        </div>

        <div style={{ background: '#fffdf7', borderRadius: 16, border: '1px solid #efe7d4', padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 16 }}>Answer review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((question, index) => {
              const selected = answers[index];
              const correct = selected === question.correctIndex;
              return (
                <div key={question.id} style={{ border: `1px solid ${correct ? '#b7ead8' : '#f2c6d5'}`, background: correct ? '#f2fcf8' : '#fff7fa', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: correct ? '#168c68' : '#c2416c', marginBottom: 6 }}>QUESTION {index + 1} · {correct ? 'CORRECT' : 'REVIEW'}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34', marginBottom: 8 }}>{question.prompt}</div>
                  <div style={{ fontSize: 12.5, color: '#33405e', marginBottom: 4 }}>Your answer: {selected == null ? 'Unanswered' : `${String.fromCharCode(65 + selected)}. ${question.options[selected]}`}</div>
                  {!correct && <div style={{ fontSize: 12.5, color: '#168c68', marginBottom: 4 }}>Correct answer: {String.fromCharCode(65 + question.correctIndex)}. {question.options[question.correctIndex]}</div>}
                  <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.5 }}>{question.explanation}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  return (
    <div className="pw-test-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px', gap: 18, alignItems: 'start' }}>
      <div style={{ background: '#fffdf7', borderRadius: 16, border: '1px solid #efe7d4', boxShadow: '0 18px 40px rgba(60,72,130,.06)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#141b34' }}>{question.section} · {question.domain}</div>
            <div style={{ fontSize: 12, color: '#9098b5', textTransform: 'uppercase', marginTop: 3 }}>{question.difficulty} · Question {currentQuestion + 1} of {questions.length}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: timeLeft < 120 ? '#e0457a' : '#141b34' }}>{formatTime(timeLeft)}</div>
        </div>
        <div style={{ width: '100%', height: 7, borderRadius: 4, background: '#e7dcc7', marginBottom: 20 }}>
          <div style={{ width: `${(answeredCount / questions.length) * 100}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#94b3fb,#b899fb)', transition: 'width .25s ease' }} />
        </div>
        {question.stimulus && <div style={{ background: '#f4f6fb', borderRadius: 14, padding: 16, fontSize: 13.5, color: '#33405e', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{question.stimulus}</div>}
        <div style={{ fontSize: 16, fontWeight: 750, color: '#141b34', lineHeight: 1.55, marginBottom: 16 }}>{question.prompt}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {question.options.map((option, index) => {
            const selected = answers[currentQuestion] === index;
            return (
              <button key={`${question.id}-${index}`} onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion]: index }))} style={{ background: selected ? '#eef1f7' : '#fff', color: '#141b34', border: `1.5px solid ${selected ? '#8b72ef' : '#e7dcc7'}`, borderRadius: 12, padding: '13px 14px', fontSize: 13.5, fontWeight: 650, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', gap: 10 }}>
                <span style={{ color: selected ? '#141b34' : '#9098b5', fontWeight: 900 }}>{String.fromCharCode(65 + index)}.</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        <div className="pw-test-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))} disabled={currentQuestion === 0} style={{ ...secondaryButtonStyle, opacity: currentQuestion === 0 ? 0.45 : 1 }}>← Previous</button>
          <button onClick={() => setFlagged((previous) => ({ ...previous, [currentQuestion]: !previous[currentQuestion] }))} style={{ ...secondaryButtonStyle, color: flagged[currentQuestion] ? '#c56a12' : '#141b34' }}>{flagged[currentQuestion] ? '★ Flagged' : '☆ Flag for review'}</button>
          {currentQuestion < questions.length - 1
            ? <button onClick={() => setCurrentQuestion((value) => Math.min(questions.length - 1, value + 1))} style={primaryButtonStyle}>Next →</button>
            : <button onClick={submitTest} style={primaryButtonStyle}>Submit Test</button>}
        </div>
      </div>

      <div style={{ background: '#faf7f2', borderRadius: 18, border: '1px solid #f1eadd', padding: 16, position: 'sticky', top: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#141b34', marginBottom: 4 }}>{answeredCount} / {questions.length} answered</div>
        <div style={{ fontSize: 12, color: '#9098b5', marginBottom: 12 }}>{Object.values(flagged).filter(Boolean).length} flagged for review</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 14 }}>
          {questions.map((item, index) => {
            const active = index === currentQuestion;
            const answered = answers[index] != null;
            return <button key={item.id} onClick={() => setCurrentQuestion(index)} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${active ? '#141b34' : flagged[index] ? '#e5a238' : answered ? '#6fd4b1' : '#e7dcc7'}`, background: active ? '#eef1f7' : answered ? '#effbf6' : '#fff', color: '#33405e', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{index + 1}</button>;
          })}
        </div>
        <button onClick={submitTest} style={{ ...primaryButtonStyle, width: '100%', padding: '10px 12px' }}>Submit Test</button>
      </div>
    </div>
  );
}

function UndergradJourneyPage({ type, profile, scores, strengths, weaknesses, tasks, programs, setCandTab, send, authToken, sessionId }) {
  const [selectedTest, setSelectedTest] = React.useState(null);
  const [selectedSchools, setSelectedSchools] = React.useState([]);
  const [expandedSchools, setExpandedSchools] = React.useState({});
  const grade = undergradGradeNumber(profile);
  const profileStage = undergradProfileStage(profile || {});
  const early = profileStage === 'discovery' || profileStage === 'exploratory';
  const buckets = splitUniversities(programs || []);

  const SELECTIVITY_BADGES = {
    'Ultra Competitive': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    'Ultra competitive': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    Competitive: { color: '#c56a12', bg: '#fff7ed', border: '#fed7aa' },
    'Highly competitive': { color: '#c56a12', bg: '#fff7ed', border: '#fed7aa' },
    Accessible: { color: '#15935f', bg: '#ecfdf5', border: '#bbf7d0' },
  };

  const displaySelectivityLabel = (label) => {
    if (/^ultra competitive$/i.test(String(label || ''))) return 'Ultra Competitive';
    if (/^(highly competitive|competitive)$/i.test(String(label || ''))) return 'Competitive';
    return 'Accessible';
  };

  const toggleSchool = (schoolName) => {
    setSelectedSchools(prev =>
      prev.includes(schoolName) ? prev.filter(s => s !== schoolName) : [...prev, schoolName]
    );
  };

  const toggleExpanded = (schoolName) => {
    setExpandedSchools(prev => ({ ...prev, [schoolName]: !prev[schoolName] }));
  };
  const list = (items = [], empty) => items.length
    ? items.slice(0, 6).map((item, i) => (
      <div key={`${item}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#33405e', lineHeight: 1.45, marginBottom: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5b46e0', marginTop: 6, flexShrink: 0 }} />
        <span>{typeof item === 'string' ? item : item?.name}</span>
      </div>
    ))
    : <div style={{ fontSize: 13.5, color: '#9098b5' }}>{empty}</div>;
  const stageRoadmaps = {
    discovery: [['Academic habits', 'Build strong grades and subject habits.'], ['Activity exploration', 'Try activities and notice where curiosity becomes commitment.'], ['First spike', 'Turn one interest into a small project or contribution.'], ['Summer ideas', 'Explore age-appropriate programs, service, projects, or competitions.']],
    exploratory: [['Academic direction', 'Strengthen core grades while identifying subject patterns.'], ['Activity depth', 'Deepen one activity with ownership and measurable progress.'], ['First spike', 'Build a project, competition, research, or service anchor.'], ['Summer plan', 'Choose one meaningful summer growth experience.']],
    preliminary: [['Testing plan', 'Set SAT, ACT, AP, and language-test milestones.'], ['College list', 'Build a preliminary reach, target, and likely portfolio.'], ['Leadership impact', 'Turn participation into ownership and outcomes.'], ['Essay discovery', 'Collect stories, values, and moments for future essays.']],
    application: [['Final list', 'Confirm the final application portfolio and requirements.'], ['Essays', 'Draft, review, and tailor personal and supplemental essays.'], ['Applications', 'Track deadlines, recommendations, transcripts, and submissions.'], ['Interviews', 'Prepare school-specific examples and questions.']],
  };
  const roadmap = stageRoadmaps[profileStage] || stageRoadmaps.discovery;

  if ((type === 'essays' || type === 'applications') && early) {
    return (
      <div className="pw-undergrad-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px 28px' }}>
        <UndergradCard title={type === 'essays' ? 'Essays' : 'Applications'}>
          <h2 style={{ fontFamily: "'Newsreader',serif", fontSize: 24, fontWeight: 700, color: '#141b34', margin: '0 0 8px' }}>{type === 'essays' ? 'Future essay preparation' : 'Future application preparation'}</h2>
          <p style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, margin: 0 }}>{type === 'essays' ? 'Capture meaningful moments, values, projects, and reflections now. These become strong essay material later.' : 'Build strong grades, activities, relationships, and an evolving university universe now; final deadlines come in Grade 12.'}</p>
        </UndergradCard>
      </div>
    );
  }

  return (
    <div className="pw-undergrad-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px 28px' }}>
      {type === 'roadmap' && (
        <div className="pw-undergrad-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 980 }}>
          {roadmap.map(([title, text]) => (
            <UndergradCard key={title} title={title}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#141b34', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: '#6b7392', lineHeight: 1.55 }}>{text}</div>
            </UndergradCard>
          ))}
        </div>
      )}

      {type === 'activities' && (
        <div style={{ maxWidth: 1100 }}>
          <div style={{ marginBottom: 16, color: '#6b7392', fontSize: 13.5 }}>Stage: <b>{profileStage}</b> · Deepen one activity this month and record a concrete update.</div>
          <div className="pw-undergrad-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
          {['Planned', 'In Progress', 'Completed'].map((status, idx) => (
            <UndergradCard key={status} title={status}>
              {idx === 0 && list(tasks || [], 'Roadmap tasks will appear here.')}
              {idx === 1 && list(strengths || [], 'Active strengths and activities will appear here.')}
              {idx === 2 && list([], 'Mark roadmap tasks complete to build history.')}
            </UndergradCard>
          ))}
          </div>
        </div>
      )}

      {type === 'universities' && (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 34, fontWeight: 800, color: '#141b34', margin: '0 0 8px' }}>{early ? 'Exploratory University Universe' : profileStage === 'preliminary' ? 'Preliminary University List' : 'University List'}</h1>
            <p style={{ fontSize: 13.5, color: '#6b7392', margin: 0, fontWeight: 500 }}>
              {programs?.length ? (early ? 'Reach, Target, and Likely are exploratory fit bands that will evolve with your profile.' : `${selectedSchools.length} school${selectedSchools.length !== 1 ? 's' : ''} selected · Tap to select your target list.`) : 'Your university matches will appear here after your advisor learns more about your profile.'}
            </p>
          </div>

          <UndergradKpiPanel scores={scores || {}} />
          <div className="pw-undergrad-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0 18px' }}>
            <UndergradCard title="Strengths">
              {list((strengths || []).slice(0, 5), 'Strengths will appear after your readiness snapshot.')}
            </UndergradCard>
            <UndergradCard title="Weaknesses / Risks">
              {list((weaknesses || []).slice(0, 5), 'Risks will appear after your readiness snapshot.')}
            </UndergradCard>
          </div>

          {programs?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {orderedUniversityBuckets(programs || []).map(([tierLabel, schools]) => {
                const tierColors = {
                  Reach: { accent: '#e384a5', bg: '#fff1f6', border: '#ffd3e3' },
                  Target: { accent: '#eaa129', bg: '#fff8ea', border: '#ffe3a8' },
                  Likely: { accent: '#3fdca9', bg: '#eafdf6', border: '#a9eed1' },
                  Locked: { accent: '#9098b5', bg: '#f4f5f8', border: '#dde0e8' },
                };
                const tierConfig = tierColors[tierLabel];
                if (!schools.length) return null;

                return (
                  <div key={tierLabel} style={{ background: tierConfig.bg, border: `1px solid ${tierConfig.border}`, borderRadius: 18, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', borderBottom: `1px solid ${tierConfig.border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: tierConfig.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: tierConfig.accent }}>{tierLabel.toUpperCase()} SCHOOLS</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9098b5', marginLeft: 4 }}>{schools.length} {schools.length === 1 ? 'school' : 'schools'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {schools.map((school, idx) => {
                        const isSelected = selectedSchools.includes(school.name);
                        const isExpanded = expandedSchools[school.name];
                        return (
                          <div key={school.name} style={{ borderBottom: idx < schools.length - 1 ? `1px solid ${tierConfig.border}` : 'none' }}>
                            <div
                              onClick={() => toggleExpanded(school.name)}
                              style={{ display: 'flex', alignItems: 'center', padding: '17px 22px', gap: 16, cursor: 'pointer', background: isSelected ? 'rgba(255,255,255,.55)' : 'transparent', boxShadow: isSelected ? `inset 3px 0 0 0 ${tierConfig.accent}` : 'none', transition: 'background 0.15s ease, box-shadow 0.15s ease' }}
                            >
                              <div
                                onClick={(e) => { e.stopPropagation(); toggleSchool(school.name); }}
                                style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: isSelected ? `2px solid ${tierConfig.accent}` : '2px solid #e7dcc7', background: isSelected ? tierConfig.accent : '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', cursor: 'pointer' }}
                              >
                                {isSelected && (
                                  <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#141b34' }}>{school.name}</div>
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
                                  <div style={{ fontSize: 12, color: '#6b7392', fontWeight: 500 }}>{[school.location, school.programGroup].filter(Boolean).join(' · ')}</div>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                                {school.avgSAT != null && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{school.avgSAT}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>AVG SAT</div>
                                  </div>
                                )}
                                {(() => {
                                  const ar = school.admitRate ?? school.acceptanceRate;
                                  return (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: ar != null ? '#33405e' : '#c0c8e0' }}>
                                        {ar != null ? `${ar}%` : '—'}
                                      </div>
                                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>ADMIT</div>
                                    </div>
                                  );
                                })()}
                                {school.avgGPA != null && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{school.avgGPA}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 1 }}>AVG GPA</div>
                                  </div>
                                )}
                                {school.fit != null && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: tierConfig.accent, lineHeight: 1 }}>{school.fit}%</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 3 }}>FIT</div>
                                  </div>
                                )}
                                <div style={{ width: 24, textAlign: 'center', fontSize: 18, fontWeight: 800, color: tierConfig.accent, lineHeight: 1 }}>
                                  {isExpanded ? '⌄' : '⌃'}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '10px 22px 18px 58px' }}>
                                <div style={{ fontSize: 12.5, color: '#33405e', lineHeight: 1.55, maxWidth: 760 }}>
                                  {undergradUniversityDescription(school, profile)}
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
          ) : (
            <div style={{ background: '#f4f6fb', border: '1.5px dashed #e7dcc7', borderRadius: 18, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 14.5, color: '#6b7392', marginBottom: 16, fontWeight: 500 }}>Your profile is ready for an exploratory university universe.</div>
              <button onClick={() => send?.('Generate my undergraduate university list now. Include PROFILE, SCORES, STRENGTHS, WEAKNESSES, TASKS, and PROGRAMS. Do not reply with school names unless PROGRAMS is emitted.')} style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Build my list now</button>
            </div>
          )}
        </div>
      )}

      {type === 'testing' && (
        <div style={{ maxWidth: 1000 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#141b34', margin: '0 0 8px', letterSpacing: '-.5px' }}>Testing & Simulations</h1>
            <p style={{ fontSize: 13.5, color: '#6b7392', margin: 0, fontWeight: 500 }}>{early ? 'Testing awareness only: explore the future timeline without treating missing SAT or ACT scores as a weakness.' : profileStage === 'preliminary' ? 'Build an SAT, ACT, AP, or language-test plan with practice milestones.' : 'Confirm final testing status and score-submission strategy.'}</p>
          </div>

          {!selectedTest ? (
            <div className="pw-test-picker" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, marginBottom: 24 }}>
              <button onClick={() => setSelectedTest('sat')} style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5b46e0'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(22,35,63,.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1eadd'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(60,72,130,.06)'; }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#141b34', marginBottom: 6 }}>SAT Simulation</div>
                <div style={{ fontSize: 13.5, color: '#6b7392', marginBottom: 16 }}>28 minutes · 20 questions</div>
                <div style={{ fontSize: 13, color: '#9098b5', lineHeight: 1.5 }}>Digital SAT-style Reading and Writing plus Math, with a fresh question set and estimated 400–1600 score.</div>
              </button>
              <button onClick={() => setSelectedTest('act')} style={{ background: '#fffdf7', border: '1px solid #efe7d4', borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', boxShadow: '0 18px 40px rgba(60,72,130,.06)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5b46e0'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(22,35,63,.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1eadd'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(60,72,130,.06)'; }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#141b34', marginBottom: 6 }}>ACT Simulation</div>
                <div style={{ fontSize: 13.5, color: '#6b7392', marginBottom: 16 }}>20 minutes · 20 questions</div>
                <div style={{ fontSize: 13, color: '#9098b5', lineHeight: 1.5 }}>Enhanced ACT-style English, Math, and Reading, with a fresh question set and estimated 1–36 composite.</div>
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => setSelectedTest(null)} style={{ background: 'none', border: 'none', color: '#141b34', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', padding: '8px 0', marginBottom: 16 }}>← Back to choose test</button>
              {selectedTest === 'sat' && <TestingSimulationCard title="SAT Simulation" testType="sat" authToken={authToken} sessionId={sessionId} />}
              {selectedTest === 'act' && <TestingSimulationCard title="ACT Simulation" testType="act" authToken={authToken} sessionId={sessionId} />}
            </div>
          )}

          {tasks?.filter(t => /sat|act|psat|ap|toefl|ielts|test/i.test(t)).length > 0 && (
            <UndergradCard title="Testing Roadmap">
              <div style={{ fontSize: 16, fontWeight: 800, color: '#141b34', marginBottom: 14 }}>Your testing tasks</div>
              {list(tasks?.filter(t => /sat|act|psat|ap|toefl|ielts|test/i.test(t)) || [], 'No testing tasks yet.')}
            </UndergradCard>
          )}
        </div>
      )}

      {(type === 'essays' || type === 'applications') && !early && (
        <UndergradCard title={type === 'essays' ? 'Essays' : 'Applications'}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 8 }}>{type === 'essays' ? 'Essay preparation' : 'Application mode'}</div>
          <div style={{ fontSize: 13.5, color: '#6b7392', lineHeight: 1.6, marginBottom: 16 }}>
            {type === 'essays' ? 'Use this space for personal statement, supplements, and school-specific drafts.' : 'Track deadlines, recommendations, transcripts, interviews, and final decisions.'}
          </div>
          <button onClick={() => setCandTab('studentProfile')} style={{ background: '#141b34', color: '#fff', border: 'none', borderRadius: 13, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(22,35,63,.32)' }}>
            Work with counselor
          </button>
        </UndergradCard>
      )}
    </div>
  );
}

export default function CandidatePortal(props) {
  const { candTab, setCandTab, signOut, plan, language, setLanguage, profile, authUser, authToken, sessionId, resetSession, requiresOAuthDetails, showToast, chosenSchools, documents, archiveDocument, send, chat, tasks, completedTasks } = props;
  const [showHelp, setShowHelp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHelp = () => { setShowHelp(true); setMenuOpen(false); };
  const handleUpgrade = () => { setCandTab('settings'); setMenuOpen(false); };
  const handleSignOut = () => { setMenuOpen(false); signOut(); };
  const currentPlan = authUser?.plan || plan || 'free';
  const planAccess = PLAN_ACCESS[currentPlan] ?? null;
  const isPlanLocked = (key) => planAccess !== null && !planAccess.has(key);

  const handleNavClick = (key) => {
    if (requiresOAuthDetails && key !== 'settings') {
      setCandTab('settings');
      setMenuOpen(false);
      showToast('Please confirm your details before continuing.');
      return;
    }
    if (isPlanLocked(key)) {
      setCandTab('settings');
      setMenuOpen(false);
      const needed = key === 'chat' ? 'AI + Strategy' : 'AI';
      showToast(`Upgrade to ${needed} to unlock this feature.`);
      return;
    }
    setCandTab(key);
    setMenuOpen(false);
  };

  const name = authUser?.name || profile?.name || 'Candidate';
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const first = name.split(' ')[0];
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const trackConfig = getTrackConfig(profile || {});
  const isUndergrad = trackConfig.key === 'undergraduate';
  const tabLabels = { dashboard: 'Dashboard', advisor: 'Advisor', studentProfile: 'Advisor', roadmap: 'Roadmap', ugRoadmap: 'Roadmap', ugTracker: 'Tracker / Calendar', activities: 'Activities', universities: 'University List', testing: 'Testing', essays: 'Essays', applications: 'Applications', analysis: 'Analysis', documents: 'Simulation', documentDepository: 'Documents', community: 'Community', settings: 'Settings', chat: 'Live Chat' };
  const tabSubtitles = {
    dashboard: 'Here is your overview.', advisor: 'Your next steps are one message away.', studentProfile: 'Your next steps are one message away.',
    analysis: 'Where your profile stands today.', universities: 'Build a balanced university list.', roadmap: 'Your application plan at a glance.',
    activities: 'Shape the experiences that tell your story.', testing: 'Plan and track your test preparation.', essays: 'Draft and refine your strongest story.',
    applications: 'Keep every application moving.', documents: 'Timed practice with a full breakdown.', documentDepository: 'Everything your applications need.',
    community: 'Learn from candidates on the same path.', settings: 'Manage your account and plan.', chat: 'Talk to a human strategist.',
  };
  const targetSummary = chosenSchools?.length ? `Targets: ${chosenSchools.slice(0, 2).join(', ')}${chosenSchools.length > 2 ? ` +${chosenSchools.length - 2}` : ''}` : '';
  const hasChatAccess = true;
  const navItems = navFromConfig(trackConfig, hasChatAccess);
  const candidateAlerts = buildCandidateAlerts({ documents, chat, tasks, completedTasks, plan: authUser?.plan || plan });

  return (
    <div className="pw-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg,#faf7f2 0%,#f6f1e8 100%)', fontFamily: "'Albert Sans',system-ui,sans-serif", color: '#33405e', WebkitFontSmoothing: 'antialiased' }}>
      {/* Mobile top bar with hamburger */}
      <div className="pw-mobile-bar" style={{ background: 'rgba(250,247,242,.96)', borderBottom: '1px solid #f1eadd', backdropFilter: 'blur(14px)' }}>
        <button className="pw-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ fill: 'none', stroke: '#141b34', strokeWidth: '2', strokeLinecap: 'round' }}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 19, fontWeight: 600, color: '#141b34', lineHeight: 1 }}>Pathway</div>
        </div>
      </div>

      {/* Backdrop for mobile drawer */}
      {menuOpen && <div className="pw-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`pw-sidebar${menuOpen ? ' pw-sidebar-open' : ''}`} style={{ width: 224, flexShrink: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '18px 14px', background: 'rgba(250,247,242,.85)', borderRight: '1px solid #f1eadd' }}>

        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 10px 16px' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 2px 6px rgba(91,70,224,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 9.5 6 2.5 10 9.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontFamily: "'Newsreader',serif", fontSize: 19, fontWeight: 600, color: '#141b34', letterSpacing: '-.01em' }}>Pathway</div>
        </div>

        {/* language */}
        <div style={{ position: 'relative' }}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label="Chat language"
            style={{ width: '100%', appearance: 'none', border: '1px solid #f1eadd', borderRadius: 12, padding: '9px 13px', fontSize: 14, fontWeight: 500, color: '#33405e', background: 'rgba(255,255,255,.7)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
          <svg viewBox="0 0 24 24" width="15" height="15" style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', fill: 'none', stroke: '#9098b5', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.11em', color: '#9098b5', padding: '0 12px 8px', marginTop: 16 }}>MENU</div>

        {/* nav — cosmetic pass — see commit for scope */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {navItems.map(item => {
            const active = candTab === item.key || (item.key === 'universities' && candTab === 'analysis' && isUndergrad);
            const locked = (requiresOAuthDetails && item.key !== 'settings') || isPlanLocked(item.key);
            return (
              <button key={item.key} className="pw-nav-item" onClick={() => handleNavClick(item.key)} style={{ ...navStyle(active), opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span>{item.label}</span>
                </span>
                {isPlanLocked(item.key) && (
                  <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.6, flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* help */}
        <button onClick={handleHelp} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', marginTop: 10, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#6b7392', background: 'transparent' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent', color: '#6b7392' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
          </span>
          <span>Help</span>
        </button>

        {/* plan card + user */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '16px 14px', background: 'linear-gradient(135deg,rgba(148,179,251,.28),rgba(184,153,251,.32))', border: '1px solid rgba(184,153,251,.35)' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, letterSpacing: '.08em', color: '#5b46e0', background: 'rgba(255,255,255,.75)', borderRadius: 999, padding: '3px 9px', marginBottom: 8 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1.2 7.3 4.5 10.8 5 8.3 7.3 9 10.8 6 9l-3 1.8.7-3.5L1.2 5l3.5-.5L6 1.2Z" fill="#5b46e0" /></svg>
                {PLAN_LABELS[plan] || 'AI'}
              </div>
              {plan !== 'ai_strategy' ? (
                <>
                  <div style={{ fontSize: 14, color: '#33405e', lineHeight: 1.5, marginBottom: 11 }}>Unlock a dedicated strategist &amp; unlimited reviews.</div>
                  <button onClick={handleUpgrade} style={{ width: '100%', border: 'none', borderRadius: 999, padding: '9px 0', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 3px 10px rgba(148,153,251,.4)', cursor: 'pointer' }}>Upgrade plan</button>
                </>
              ) : (
                <div style={{ fontSize: 14, color: '#33405e', lineHeight: 1.5 }}>You have full access, including your dedicated strategist.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '10px 10px', borderRadius: 16, background: 'rgba(255,255,255,.7)', border: '1px solid #f1eadd' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', boxShadow: '0 3px 10px rgba(148,153,251,.35)' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 14, color: '#9098b5', fontWeight: 500 }}>Candidate</div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: '#fff', border: '1px solid #e7dcc7', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7392', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="pw-candidate-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

        {/* top bar */}
        <header className="pw-candidate-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 28px 12px', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Newsreader',serif", fontSize: 23, fontWeight: 600, color: '#141b34', letterSpacing: '-.01em' }}>{['dashboard', 'advisor', 'studentProfile'].includes(candTab) ? `Good ${tod}, ${first}` : tabLabels[candTab]}</div>
            <div style={{ fontSize: 13, color: '#6b7392', fontWeight: 400, marginTop: 2 }}>{targetSummary || tabSubtitles[candTab] || tabLabels[candTab]}</div>
          </div>
          <div className="pw-candidate-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleHelp} title="Help" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #f1eadd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7392' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            </button>
            <NotificationBell
              alerts={candidateAlerts}
              storageKey={`pathway_candidate_alerts_${authUser?.id || authUser?.email || name}`}
              title="Candidate alerts"
            />
            <button className="pw-new-session-button" onClick={resetSession} disabled={requiresOAuthDetails} title="New session" aria-label="New session" style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #e7dcc7', borderRadius: 999, padding: '9px 16px', height: 36, fontSize: 13, fontWeight: 600, color: '#33405e', cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: '#5b46e0', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
              <span>New session</span>
            </button>
          </div>
        </header>

        {candTab === 'dashboard' && <Dashboard {...props} />}
        {(candTab === 'advisor' || candTab === 'studentProfile') && <Advisor {...props} />}
        {candTab === 'analysis' && !isUndergrad && <Analysis {...props} />}
        {(candTab === 'universities' || (candTab === 'analysis' && isUndergrad)) && isUndergrad && <UndergradJourneyPage type="universities" {...props} />}
        {candTab === 'ugRoadmap' && isUndergrad && <UndergradRoadmap {...props} />}
        {candTab === 'ugTracker' && isUndergrad && <UndergradTracker {...props} />}
        {['roadmap', 'activities', 'testing', 'essays', 'applications'].includes(candTab) && isUndergrad && <UndergradJourneyPage type={candTab} {...props} />}
        {candTab === 'documents' && <Documents {...props} />}
        {candTab === 'documentDepository' && <DocumentDepositoryPage documents={documents} setCandTab={setCandTab} send={send} archiveDocument={archiveDocument} showToast={showToast} />}
        {candTab === 'community' && <Community {...props} />}
        {candTab === 'settings' && <Settings {...props} />}
        {candTab === 'chat' && hasChatAccess && <Chat {...props} />}
      </div>

      {showHelp && <HelpModal authToken={authToken} sessionId={sessionId} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
