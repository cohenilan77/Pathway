import React, { useState } from 'react';
import Dashboard from './Dashboard.jsx';
import Advisor from './Advisor.jsx';
import Analysis from './Analysis.jsx';
import Documents from './Documents.jsx';
import Settings from './Settings.jsx';
import Chat from './Chat.jsx';
import UndergradRoadmap from './UndergradRoadmap.jsx';
import UndergradTracker from './UndergradTracker.jsx';
import UndergradKpiPanel from './UndergradKpiPanel.jsx';
import EssayDocuments from './EssayDocuments.jsx';
import WorkspaceHub from './WorkspaceHub.jsx';
import Scholarships from './Scholarships.jsx';
import CommunityHub from './CommunityHub.jsx';
import LiveChatHub from './LiveChatHub.jsx';
import HelpModal from './HelpModal.jsx';
import { LANGUAGES } from '../../constants.js';
import { downloadAsPdf, downloadAsDocx } from '../../lib/documentExport.js';
import NotificationBell from '../NotificationBell.jsx';
import { getTrackConfig } from '../../trackConfig.js';
import { estimatePracticeScore } from '../../lib/testScoring.js';
import { undergradProfileStage } from '../../../lib/undergrad-profile.js';
import { undergradGradeConfig } from '../../../lib/undergrad/profile-temperature.js';

const UNDERGRAD_DISCLAIMER = 'This is coaching guidance, not an admissions guarantee.';

// Per-track rollout flag for the Workspace-consolidation rebuild (Analysis /
// Simulation / Documents re-homed under one "Workspace" nav item, mirroring
// Undergraduate's existing layout). Undergraduate is unconditionally
// consolidated already (unrelated to this flag). Defaults to all four
// tracks ON. An env var (comma-separated track keys: 'mba' | 'graduate' |
// 'phd' | 'personal') can still override this list if a narrower rollout is
// ever needed again — set VITE_CONSOLIDATED_WORKSPACE_TRACKS to override.
const DEFAULT_CONSOLIDATED_WORKSPACE_TRACKS = 'mba,graduate,phd,personal';
const CONSOLIDATED_WORKSPACE_TRACKS = new Set(
  String(import.meta.env?.VITE_CONSOLIDATED_WORKSPACE_TRACKS || DEFAULT_CONSOLIDATED_WORKSPACE_TRACKS)
    .split(',').map(s => s.trim()).filter(Boolean),
);

const PLAN_LABELS = { free: 'Free plan', ai: 'AI', ai_strategy: 'AI + Strategy' };

const PLAN_ACCESS = {
  free: new Set(['dashboard', 'advisor', 'settings']),
  ai: new Set(['dashboard', 'advisor', 'analysis', 'documents', 'documentDepository', 'community', 'settings',
    'studentProfile', 'roadmap', 'ugRoadmap', 'calendar', 'activities', 'universities', 'universityList', 'testing', 'essays', 'applications', 'workspace']),
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
ICON_BY_KEY.calendar = ICON_BY_KEY.documentDepository;
ICON_BY_KEY.workspace = <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>;

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
    ? { position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#fff', background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', boxShadow: '0 3px 10px rgba(58,99,255,.35)' }
    : { position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#5a6a8f', background: 'transparent' };
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
    ? { bg: '#ffffff', color: '#b45309' }
    : status === 'Generated'
      ? { bg: '#f2f6ff', color: '#111a33' }
      : { bg: '#e6faf3', color: '#0ca678' };

  return (
    <div className="pw-depository-page" style={{ flex: 1, minHeight: 0, padding: '24px 28px 28px', background: '#eef4ff' }}>
      <div className="pw-depository-grid" style={{ height: '100%', display: 'grid', gridTemplateColumns: '270px 1fr', background: '#f2f6ff', borderRadius: 24, border: '1px solid #dbe4f7', boxShadow: '0 18px 40px rgba(30,45,90,.06)', overflow: 'hidden' }}>
        <aside className="pw-depository-sidebar" style={{ borderRight: '1px solid #dbe4f7', padding: 20, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.8px', color: '#8b97b8', marginBottom: 16 }}>DOCUMENT REPOSITORY</div>
          <div className="pw-depository-cats" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map(([key, label]) => (
              <button key={key} onClick={() => setCategory(key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', background: category === key ? '#e3ebfa' : 'transparent', color: category === key ? '#0b6b4f' : '#38456b', fontSize: 13.5, fontWeight: category === key ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span>{label}</span><span>{countFor(key)}</span>
              </button>
            ))}
          </div>
        </aside>
        <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="pw-depository-header" style={{ padding: 24, borderBottom: '1px solid #dbe4f7' }}>
            <div className="pw-depository-heading-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111a33', margin: 0, letterSpacing: '-.4px' }}>Documents</h1>
                <div style={{ fontSize: 13, color: '#5a6a8f', marginTop: 4 }}>Files saved from Advisor chat, Simulation, uploads, and generated work.</div>
              </div>
              <div className="pw-depository-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ padding: '9px 14px', border: '1px solid #dbe4f7', borderRadius: 10, background: '#eef4ff', color: '#5a6a8f', fontSize: 13, fontWeight: 700 }}>{selected.size} selected</span>
                <button onClick={sendSelected} style={{ background: '#f2f6ff', border: '1.5px solid #dbe4f7', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#111a33', cursor: 'pointer', fontFamily: 'inherit' }}>Send selected to chat</button>
              </div>
            </div>
            <div className="pw-depository-filters" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search documents, sources, schools" style={{ border: '1.5px solid #dbe4f7', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f2f6ff' }} />
              <select value={source} onChange={e => setSource(e.target.value)} style={{ border: '1.5px solid #dbe4f7', borderRadius: 10, padding: '11px 12px', fontSize: 14, fontFamily: 'inherit', background: '#f2f6ff' }}>
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
              <div style={{ margin: 28, border: '2px dashed #e3ebfa', borderRadius: 16, padding: 44, textAlign: 'center', color: '#8b97b8', fontSize: 14 }}>No documents yet. Save work from Simulation or upload/share files in Advisor to populate this repository.</div>
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
                <thead><tr style={{ color: '#5a6a8f', fontSize: 12, letterSpacing: '.7px' }}>
                  <th style={{ textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid #dbe4f7' }}>NAME</th>
                  <th style={{ textAlign: 'center', padding: '14px 10px', borderBottom: '1px solid #dbe4f7' }}>CHOOSE</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', borderBottom: '1px solid #dbe4f7' }}>STATUS</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', borderBottom: '1px solid #dbe4f7' }}>SOURCE</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', borderBottom: '1px solid #dbe4f7' }}>UPDATED</th>
                  <th style={{ padding: '14px 20px', borderBottom: '1px solid #dbe4f7' }}></th>
                </tr></thead>
                <tbody>
                  {visibleDocs.map(doc => {
                    const color = statusColor(doc.status);
                    return (
                      <tr key={doc.id} style={{ background: selected.has(doc.id) ? '#f2f6ff' : '#f2f6ff' }}>
                        <td style={{ padding: '14px 20px', borderBottom: '1px solid #dbe4f7' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#111a33' }}>{doc.name}</div>
                          <div style={{ fontSize: 12, color: '#5a6a8f', marginTop: 2 }}>{typeLabel(doc.type)}{doc.linkedSchool ? ` · ${doc.linkedSchool}` : ''} · v{doc.version || 1}</div>
                        </td>
                        <td style={{ textAlign: 'center', borderBottom: '1px solid #dbe4f7' }}><input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelected(doc.id)} /></td>
                        <td style={{ padding: '14px 10px', borderBottom: '1px solid #dbe4f7' }}><span style={{ background: color.bg, color: color.color, borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>{doc.status || 'Ready'}</span></td>
                        <td style={{ padding: '14px 10px', borderBottom: '1px solid #dbe4f7', fontSize: 13, color: '#111a33' }}>{doc.source}</td>
                        <td style={{ padding: '14px 10px', borderBottom: '1px solid #dbe4f7', fontSize: 13, color: '#111a33' }}>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '14px 20px', borderBottom: '1px solid #dbe4f7', whiteSpace: 'nowrap' }}>
                          {doc.text && <button onClick={() => downloadAsPdf(doc.text, doc.name)} style={{ border: '1px solid #dbe4f7', borderRadius: 8, background: '#f2f6ff', padding: '6px 9px', marginRight: 6, cursor: 'pointer' }}>PDF</button>}
                          {doc.text && <button onClick={() => downloadAsDocx(doc.text, doc.name)} style={{ border: '1px solid #dbe4f7', borderRadius: 8, background: '#f2f6ff', padding: '6px 9px', marginRight: 6, cursor: 'pointer' }}>Word</button>}
                          <button onClick={() => archiveDocument(doc.id)} style={{ border: '1px solid #dbe4f7', borderRadius: 8, background: '#f2f6ff', padding: '6px 9px', cursor: 'pointer' }}>Archive</button>
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

// Grade 9-10 must never see Reach/Target/Likely admissions bands — they see
// inspiration/exploration groupings instead. Grade 11-12 keep the real
// shortlist/application-portfolio categories (Grade 11 adds an "Explore"
// band; Grade 12 keeps "Locked" for confirmed applications).
function undergradListBuckets(programs = [], grade) {
  if (grade === 9) {
    return programs.length ? [['Schools to Explore', programs]] : [];
  }
  if (grade === 10) {
    const buckets = {
      'Strong Interest Fit': programs.filter(p => p.tier === 'safe' || (p.fit ?? 0) > 80),
      'Possible Future Fit': programs.filter(p => p.tier === 'possible' || ((p.fit ?? 0) >= 50 && (p.fit ?? 0) <= 80)),
      'Worth Exploring': programs.filter(p => p.tier === 'stretch' || p.tier === 'locked' || (p.fit ?? 0) < 50),
    };
    return ['Strong Interest Fit', 'Possible Future Fit', 'Worth Exploring']
      .map(label => [label, buckets[label]])
      .filter(([, schools]) => schools.length);
  }
  if (grade === 11) {
    const base = splitUniversities(programs);
    const buckets = { Reach: base.Reach, Target: base.Target, Likely: base.Likely, Explore: base.Locked };
    return ['Reach', 'Target', 'Likely', 'Explore']
      .map(label => [label, buckets[label] || []])
      .filter(([, schools]) => schools.length);
  }
  return orderedUniversityBuckets(programs);
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
    <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e3ebfa', boxShadow: '0 12px 30px rgba(30,45,90,.06)', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#3a63ff', textTransform: 'uppercase' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

const primaryButtonStyle = {
  background: '#111a33', color: '#fff', border: 'none', borderRadius: 9,
  padding: '10px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

const secondaryButtonStyle = {
  background: '#fff', color: '#111a33', border: '1px solid #e3ebfa', borderRadius: 9,
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
      <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e3ebfa', boxShadow: '0 18px 40px rgba(30,45,90,.06)', padding: 28 }}>
        <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 22, fontWeight: 700, color: '#111a33', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#5a6a8f', lineHeight: 1.55, marginBottom: 18 }}>
          20 original questions · {testType === 'sat' ? '28' : '20'} minutes · new AI-generated session every time
        </div>
        {error && <div style={{ background: '#ffe9ef', color: '#e8476b', border: '1px solid #ffe9ef', borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <button onClick={startSimulation} disabled={phase === 'loading'} style={{ background: '#111a33', color: '#fff', border: 'none', borderRadius: 13, padding: '12px 18px', fontSize: 13.5, fontWeight: 800, cursor: phase === 'loading' ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(30,45,90,.32)', width: '100%', opacity: phase === 'loading' ? 0.65 : 1 }}>
          {phase === 'loading' ? 'Generating a fresh test…' : `${phase === 'error' ? 'Try Again' : `Start ${title}`} →`}
        </button>
      </div>
    );
  }

  if (phase === 'results' && result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e3ebfa', boxShadow: '0 18px 40px rgba(30,45,90,.06)', padding: 28 }}>
          <div className="pw-test-result-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,.8fr) 1.5fr', gap: 28, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#8b97b8', letterSpacing: '.6px' }}>ESTIMATED {testType.toUpperCase()} SCORE</div>
              <div style={{ fontSize: 54, fontWeight: 900, color: '#111a33', lineHeight: 1.1 }}>{result.estimatedScore}</div>
              <div style={{ fontSize: 12, color: '#8b97b8' }}>Scale {result.scale}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111a33', marginBottom: 6 }}>{result.correctCount} of {questions.length} correct · {result.percentage}%</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {Object.entries(result.sectionScores).map(([section, sectionScore]) => (
                  <span key={section} style={{ background: '#f2f6ff', color: '#111a33', borderRadius: 9, padding: '6px 9px', fontSize: 12, fontWeight: 800 }}>{section}: {sectionScore}</span>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: '#5a6a8f', lineHeight: 1.5, marginBottom: 14 }}>{simulation.scoringNote}</div>
              <button onClick={startSimulation} style={{ ...primaryButtonStyle, padding: '10px 16px', fontSize: 13 }}>Generate a New Test</button>
            </div>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e3ebfa', padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111a33', marginBottom: 16 }}>Answer review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((question, index) => {
              const selected = answers[index];
              const correct = selected === question.correctIndex;
              return (
                <div key={question.id} style={{ border: `1px solid ${correct ? '#e6faf3' : '#ffd0dc'}`, background: correct ? '#ffffff' : '#ffe9ef', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: correct ? '#0ca678' : '#e8476b', marginBottom: 6 }}>QUESTION {index + 1} · {correct ? 'CORRECT' : 'REVIEW'}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111a33', marginBottom: 8 }}>{question.prompt}</div>
                  <div style={{ fontSize: 12.5, color: '#38456b', marginBottom: 4 }}>Your answer: {selected == null ? 'Unanswered' : `${String.fromCharCode(65 + selected)}. ${question.options[selected]}`}</div>
                  {!correct && <div style={{ fontSize: 12.5, color: '#0ca678', marginBottom: 4 }}>Correct answer: {String.fromCharCode(65 + question.correctIndex)}. {question.options[question.correctIndex]}</div>}
                  <div style={{ fontSize: 12.5, color: '#5a6a8f', lineHeight: 1.5 }}>{question.explanation}</div>
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
      <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e3ebfa', boxShadow: '0 18px 40px rgba(30,45,90,.06)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#111a33' }}>{question.section} · {question.domain}</div>
            <div style={{ fontSize: 12, color: '#8b97b8', textTransform: 'uppercase', marginTop: 3 }}>{question.difficulty} · Question {currentQuestion + 1} of {questions.length}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: timeLeft < 120 ? '#e8476b' : '#111a33' }}>{formatTime(timeLeft)}</div>
        </div>
        <div style={{ width: '100%', height: 7, borderRadius: 4, background: '#e3ebfa', marginBottom: 20 }}>
          <div style={{ width: `${(answeredCount / questions.length) * 100}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#3a63ff,#6d8cff)', transition: 'width .25s ease' }} />
        </div>
        {question.stimulus && <div style={{ background: '#f2f6ff', borderRadius: 14, padding: 16, fontSize: 13.5, color: '#38456b', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{question.stimulus}</div>}
        <div style={{ fontSize: 16, fontWeight: 750, color: '#111a33', lineHeight: 1.55, marginBottom: 16 }}>{question.prompt}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {question.options.map((option, index) => {
            const selected = answers[currentQuestion] === index;
            return (
              <button key={`${question.id}-${index}`} onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion]: index }))} style={{ background: selected ? '#f2f6ff' : '#fff', color: '#111a33', border: `1.5px solid ${selected ? '#6d8cff' : '#e3ebfa'}`, borderRadius: 12, padding: '13px 14px', fontSize: 13.5, fontWeight: 650, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', gap: 10 }}>
                <span style={{ color: selected ? '#111a33' : '#8b97b8', fontWeight: 900 }}>{String.fromCharCode(65 + index)}.</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        <div className="pw-test-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))} disabled={currentQuestion === 0} style={{ ...secondaryButtonStyle, opacity: currentQuestion === 0 ? 0.45 : 1 }}>← Previous</button>
          <button onClick={() => setFlagged((previous) => ({ ...previous, [currentQuestion]: !previous[currentQuestion] }))} style={{ ...secondaryButtonStyle, color: flagged[currentQuestion] ? '#c2410c' : '#111a33' }}>{flagged[currentQuestion] ? '★ Flagged' : '☆ Flag for review'}</button>
          {currentQuestion < questions.length - 1
            ? <button onClick={() => setCurrentQuestion((value) => Math.min(questions.length - 1, value + 1))} style={primaryButtonStyle}>Next →</button>
            : <button onClick={submitTest} style={primaryButtonStyle}>Submit Test</button>}
        </div>
      </div>

      <div style={{ background: '#f2f6ff', borderRadius: 18, border: '1px solid #dbe4f7', padding: 16, position: 'sticky', top: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#111a33', marginBottom: 4 }}>{answeredCount} / {questions.length} answered</div>
        <div style={{ fontSize: 12, color: '#8b97b8', marginBottom: 12 }}>{Object.values(flagged).filter(Boolean).length} flagged for review</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 14 }}>
          {questions.map((item, index) => {
            const active = index === currentQuestion;
            const answered = answers[index] != null;
            return <button key={item.id} onClick={() => setCurrentQuestion(index)} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${active ? '#111a33' : flagged[index] ? '#e08600' : answered ? '#0ca678' : '#e3ebfa'}`, background: active ? '#f2f6ff' : answered ? '#f2f6ff' : '#fff', color: '#38456b', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{index + 1}</button>;
          })}
        </div>
        <button onClick={submitTest} style={{ ...primaryButtonStyle, width: '100%', padding: '10px 12px' }}>Submit Test</button>
      </div>
    </div>
  );
}

function UndergradJourneyPage({ type, profile, scores, strengths, weaknesses, tasks, programs, setCandTab, send, authToken, sessionId, chosenSchools, setChosenSchools, undergrad }) {
  const [selectedTest, setSelectedTest] = React.useState(null);
  const selectedSchools = chosenSchools || [];
  const [expandedSchools, setExpandedSchools] = React.useState({});
  const grade = undergradGradeNumber(profile);
  const profileStage = undergradProfileStage(profile || {});
  const early = profileStage === 'discovery' || profileStage === 'exploratory';
  const buckets = splitUniversities(programs || []);

  const SELECTIVITY_BADGES = {
    'Ultra Competitive': { color: '#e8476b', bg: '#ffe9ef', border: '#ffd0dc' },
    'Ultra competitive': { color: '#e8476b', bg: '#ffe9ef', border: '#ffd0dc' },
    Competitive: { color: '#c2410c', bg: '#fff1e8', border: '#fff1e8' },
    'Highly competitive': { color: '#c2410c', bg: '#fff1e8', border: '#fff1e8' },
    Accessible: { color: '#0ca678', bg: '#f2f6ff', border: '#e6faf3' },
  };

  const displaySelectivityLabel = (label) => {
    if (/^ultra competitive$/i.test(String(label || ''))) return 'Ultra Competitive';
    if (/^(highly competitive|competitive)$/i.test(String(label || ''))) return 'Competitive';
    return 'Accessible';
  };

  // Persists directly to the real chosenSchools candidate state (same field the
  // graduate flow saves), so add/remove survives navigation and refresh. Unlike
  // grad's Analysis, this never advances stepIdx or messages the advisor —
  // undergrad's journey is stage-based, not step-gated.
  const toggleSchool = (schoolName) => {
    setChosenSchools?.(prev => {
      const list = prev || [];
      return list.includes(schoolName) ? list.filter(s => s !== schoolName) : [...list, schoolName];
    });
  };

  const moveSchool = (index, delta) => {
    setChosenSchools?.(prev => {
      const list = [...(prev || [])];
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  const toggleExpanded = (schoolName) => {
    setExpandedSchools(prev => ({ ...prev, [schoolName]: !prev[schoolName] }));
  };
  const list = (items = [], empty) => items.length
    ? items.slice(0, 6).map((item, i) => (
      <div key={`${item}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#38456b', lineHeight: 1.45, marginBottom: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3a63ff', marginTop: 6, flexShrink: 0 }} />
        <span>{typeof item === 'string' ? item : item?.name}</span>
      </div>
    ))
    : <div style={{ fontSize: 13.5, color: '#8b97b8' }}>{empty}</div>;
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
          <h2 style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 24, fontWeight: 700, color: '#111a33', margin: '0 0 8px' }}>{type === 'essays' ? 'Future essay preparation' : 'Future application preparation'}</h2>
          <p style={{ fontSize: 14, color: '#5a6a8f', lineHeight: 1.6, margin: 0 }}>{type === 'essays' ? 'Capture meaningful moments, values, projects, and reflections now. These become strong essay material later.' : 'Build strong grades, activities, relationships, and an evolving university universe now; final deadlines come in Grade 12.'}</p>
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
              <div style={{ fontSize: 15, fontWeight: 800, color: '#111a33', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: '#5a6a8f', lineHeight: 1.55 }}>{text}</div>
            </UndergradCard>
          ))}
        </div>
      )}

      {type === 'activities' && (
        <div style={{ maxWidth: 1100 }}>
          <div style={{ marginBottom: 16, color: '#5a6a8f', fontSize: 13.5 }}>Stage: <b>{profileStage}</b> · Deepen one activity this month and record a concrete update.</div>
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

      {type === 'universities' && (() => {
        const listConfig = undergradGradeConfig(profile);
        const listBuckets = undergradListBuckets(programs || [], grade);
        return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 34, fontWeight: 800, color: '#111a33', margin: '0 0 8px' }}>{listConfig.universityListTitle}</h1>
            <p style={{ fontSize: 13.5, color: '#5a6a8f', margin: 0, fontWeight: 500 }}>
              {programs?.length
                ? (early
                  ? (grade === 9 ? 'An inspiration-only list to help you explore possible majors and countries — not a prediction of admission.' : 'Soft exploratory categories that will evolve as your profile grows — not a prediction of admission.')
                  : `${selectedSchools.length} school${selectedSchools.length !== 1 ? 's' : ''} selected · Tap to select your target list.`)
                : (early ? 'Ask your advisor for schools to explore — your inspiration list will appear here.' : 'Ask your advisor for university recommendations — your Reach, Target, and Likely matches will appear here.')}
            </p>
            <p style={{ fontSize: 12.5, color: '#8b97b8', margin: '10px 0 0', fontStyle: 'italic' }}>{UNDERGRAD_DISCLAIMER}</p>
            {import.meta.env.DEV && (programs || []).some(p => p.sourceTag === 'hotfix_school_list') && (
              <p style={{ fontSize: 11, color: '#8b97b8', margin: '6px 0 0', fontFamily: 'monospace' }}>
                [dev] populated by school-list hotfix ({new Date().toISOString().slice(0, 10)})
              </p>
            )}
          </div>

          <UndergradKpiPanel scores={scores || {}} profile={profile || {}} />
          <div className="pw-undergrad-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0 18px' }}>
            <UndergradCard title="Strengths">
              {list((strengths || []).slice(0, 5), 'Strengths will appear after your readiness snapshot.')}
            </UndergradCard>
            <UndergradCard title="Weaknesses / Risks">
              {list((weaknesses || []).slice(0, 5), 'Risks will appear after your readiness snapshot.')}
            </UndergradCard>
          </div>

          {selectedSchools.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#3a63ff', textTransform: 'uppercase', marginBottom: 10 }}>Your target list ({selectedSchools.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedSchools.map((name, i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', border: '1px solid #e3ebfa', borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: '#111a33', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {name}</span>
                    <button onClick={() => moveSchool(i, -1)} disabled={i === 0} aria-label={`Move ${name} up`}
                      style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #e3ebfa', background: '#fff', color: '#111a33', fontSize: 12, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.35 : 1, fontFamily: 'inherit' }}>↑</button>
                    <button onClick={() => moveSchool(i, 1)} disabled={i === selectedSchools.length - 1} aria-label={`Move ${name} down`}
                      style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #e3ebfa', background: '#fff', color: '#111a33', fontSize: 12, cursor: i === selectedSchools.length - 1 ? 'default' : 'pointer', opacity: i === selectedSchools.length - 1 ? 0.35 : 1, fontFamily: 'inherit' }}>↓</button>
                    <button onClick={() => toggleSchool(name)} aria-label={`Remove ${name}`}
                      style={{ border: '1px solid #ffd0dc', borderRadius: 8, background: '#ffe9ef', color: '#e8476b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '5px 10px' }}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {programs?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {listBuckets.map(([tierLabel, schools]) => {
                const tierColors = {
                  Reach: { accent: '#f2789b', bg: '#ffe9ef', border: '#ffe9ef' },
                  Target: { accent: '#e08600', bg: '#ffffff', border: '#fff4e2' },
                  Likely: { accent: '#12b886', bg: '#e6faf3', border: '#b7ecd8' },
                  Locked: { accent: '#8b97b8', bg: '#f2f6ff', border: '#e3ebfa' },
                  Explore: { accent: '#8b97b8', bg: '#f2f6ff', border: '#e3ebfa' },
                  'Schools to Explore': { accent: '#6d8cff', bg: '#f2f6ff', border: '#e8efff' },
                  'Strong Interest Fit': { accent: '#12b886', bg: '#e6faf3', border: '#b7ecd8' },
                  'Possible Future Fit': { accent: '#e08600', bg: '#ffffff', border: '#fff4e2' },
                  'Worth Exploring': { accent: '#6d8cff', bg: '#f2f6ff', border: '#e8efff' },
                };
                const tierConfig = tierColors[tierLabel] || tierColors.Explore;
                if (!schools.length) return null;

                return (
                  <div key={tierLabel} style={{ background: tierConfig.bg, border: `1px solid ${tierConfig.border}`, borderRadius: 18, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', borderBottom: `1px solid ${tierConfig.border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: tierConfig.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1.2px', color: tierConfig.accent }}>{tierLabel.toUpperCase()}{['Reach', 'Target', 'Likely', 'Locked', 'Explore'].includes(tierLabel) ? ' SCHOOLS' : ''}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#8b97b8', marginLeft: 4 }}>{schools.length} {schools.length === 1 ? 'school' : 'schools'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {schools.map((school, idx) => {
                        const isSelected = selectedSchools.includes(school.name);
                        const isExpanded = expandedSchools[school.name];
                        return (
                          <div key={school.name} style={{ borderBottom: idx < schools.length - 1 ? `1px solid ${tierConfig.border}` : 'none' }}>
                            <div
                              className="pw-school-row"
                              onClick={() => toggleExpanded(school.name)}
                              style={{ display: 'flex', alignItems: 'center', padding: '17px 22px', gap: 16, cursor: 'pointer', background: isSelected ? 'rgba(255,255,255,.55)' : 'transparent', boxShadow: isSelected ? `inset 3px 0 0 0 ${tierConfig.accent}` : 'none', transition: 'background 0.15s ease, box-shadow 0.15s ease' }}
                            >
                              <div
                                className="pw-school-checkbox"
                                onClick={(e) => { e.stopPropagation(); toggleSchool(school.name); }}
                                style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: isSelected ? `2px solid ${tierConfig.accent}` : '2px solid #e3ebfa', background: isSelected ? tierConfig.accent : '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', cursor: 'pointer' }}
                              >
                                {isSelected && (
                                  <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: 'none', stroke: '#f2f6ff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </div>

                              <div className="pw-school-info" style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111a33' }}>{school.name}</div>
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
                                  <div style={{ fontSize: 12, color: '#5a6a8f', fontWeight: 500 }}>{[school.location, school.programGroup].filter(Boolean).join(' · ')}</div>
                                )}
                              </div>

                              <div className="pw-school-stats" style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                                {!early && school.avgSAT != null && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#38456b' }}>{school.avgSAT}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8b97b8', marginTop: 1 }}>AVG SAT</div>
                                  </div>
                                )}
                                {!early && (() => {
                                  const ar = school.admitRate ?? school.acceptanceRate;
                                  return (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: ar != null ? '#38456b' : '#c6d2ea' }}>
                                        {ar != null ? `${ar}%` : '—'}
                                      </div>
                                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8b97b8', marginTop: 1 }}>ADMIT</div>
                                    </div>
                                  );
                                })()}
                                {!early && school.avgGPA != null && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#38456b' }}>{school.avgGPA}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8b97b8', marginTop: 1 }}>AVG GPA</div>
                                  </div>
                                )}
                                {school.fit != null && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: tierConfig.accent, lineHeight: 1 }}>{school.fit}%</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#8b97b8', marginTop: 3 }}>{early ? 'EXPLORATION FIT' : 'FIT'}</div>
                                  </div>
                                )}
                                <div style={{ width: 24, textAlign: 'center', fontSize: 18, fontWeight: 800, color: tierConfig.accent, lineHeight: 1 }}>
                                  {isExpanded ? '⌄' : '⌃'}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '10px 22px 18px 58px' }}>
                                <div style={{ fontSize: 12.5, color: '#38456b', lineHeight: 1.55, maxWidth: 760 }}>
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
            <div style={{ background: '#f2f6ff', border: '1.5px dashed #e3ebfa', borderRadius: 18, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 14.5, color: '#5a6a8f', marginBottom: 16, fontWeight: 500 }}>Your profile is ready for an exploratory university universe.</div>
              {/* 2026-07-09 hotfix: this used to ask the chat for the
                  graduate/MBA <PROFILE>/<PROGRAMS> XML contract, which
                  undergrad's AdvisorAgent escape could never actually
                  produce — looped on fabricated chip options instead.
                  Plain undergrad phrasing routes deterministically via
                  lib/hybrid-coordinator.js's school-list detection. */}
              <button onClick={() => send?.('Show me a possible list of schools based on my profile.')} style={{ background: '#111a33', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Build my list now</button>
            </div>
          )}
        </div>
        );
      })()}

      {type === 'testing' && (
        <div style={{ maxWidth: 1000 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111a33', margin: '0 0 8px', letterSpacing: '-.5px' }}>Testing & Simulations</h1>
            <p style={{ fontSize: 13.5, color: '#5a6a8f', margin: 0, fontWeight: 500 }}>{early ? 'Testing awareness only: explore the future timeline without treating missing SAT or ACT scores as a weakness.' : profileStage === 'preliminary' ? 'Build an SAT, ACT, AP, or language-test plan with practice milestones.' : 'Confirm final testing status and score-submission strategy.'}</p>
          </div>

          {(() => {
            const plan = undergrad?.testingPlan;
            if (!plan) return null;
            const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', complete: 'Complete' };
            return (
              <UndergradCard title="Testing plan">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginBottom: plan.studyPlan.length || plan.testDates.length ? 16 : 0 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginBottom: 4 }}>STATUS</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111a33' }}>{STATUS_LABEL[plan.status] || 'Not started'}</div>
                  </div>
                  {plan.targetScore && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginBottom: 4 }}>TARGET SCORE</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111a33' }}>{plan.targetScore}</div>
                    </div>
                  )}
                  {plan.nextStep && (
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginBottom: 4 }}>NEXT STEP</div>
                      <div style={{ fontSize: 13.5, color: '#38456b', lineHeight: 1.5 }}>{plan.nextStep}</div>
                    </div>
                  )}
                </div>
                {plan.testDates.length > 0 && (
                  <div style={{ fontSize: 13, color: '#38456b', marginBottom: plan.studyPlan.length ? 10 : 0 }}>
                    <b>Test dates:</b> {plan.testDates.join(', ')}
                  </div>
                )}
                {plan.studyPlan.length > 0 && list(plan.studyPlan, '')}
              </UndergradCard>
            );
          })()}

          {!selectedTest ? (
            <div className="pw-test-picker" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, marginBottom: 24, marginTop: 20 }}>
              <button onClick={() => setSelectedTest('sat')} style={{ background: '#ffffff', border: '1px solid #e3ebfa', borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', boxShadow: '0 18px 40px rgba(30,45,90,.06)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a63ff'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(30,45,90,.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dbe4f7'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(30,45,90,.06)'; }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111a33', marginBottom: 6 }}>SAT Simulation</div>
                <div style={{ fontSize: 13.5, color: '#5a6a8f', marginBottom: 16 }}>28 minutes · 20 questions</div>
                <div style={{ fontSize: 13, color: '#8b97b8', lineHeight: 1.5 }}>Digital SAT-style Reading and Writing plus Math, with a fresh question set and estimated 400–1600 score.</div>
              </button>
              <button onClick={() => setSelectedTest('act')} style={{ background: '#ffffff', border: '1px solid #e3ebfa', borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', boxShadow: '0 18px 40px rgba(30,45,90,.06)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3a63ff'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(30,45,90,.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dbe4f7'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(30,45,90,.06)'; }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111a33', marginBottom: 6 }}>ACT Simulation</div>
                <div style={{ fontSize: 13.5, color: '#5a6a8f', marginBottom: 16 }}>20 minutes · 20 questions</div>
                <div style={{ fontSize: 13, color: '#8b97b8', lineHeight: 1.5 }}>Enhanced ACT-style English, Math, and Reading, with a fresh question set and estimated 1–36 composite.</div>
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => setSelectedTest(null)} style={{ background: 'none', border: 'none', color: '#111a33', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', padding: '8px 0', marginBottom: 16 }}>← Back to choose test</button>
              {selectedTest === 'sat' && <TestingSimulationCard title="SAT Simulation" testType="sat" authToken={authToken} sessionId={sessionId} />}
              {selectedTest === 'act' && <TestingSimulationCard title="ACT Simulation" testType="act" authToken={authToken} sessionId={sessionId} />}
            </div>
          )}

          {tasks?.filter(t => /sat|act|psat|ap|toefl|ielts|test/i.test(t)).length > 0 && (
            <UndergradCard title="Testing Roadmap">
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111a33', marginBottom: 14 }}>Your testing tasks</div>
              {list(tasks?.filter(t => /sat|act|psat|ap|toefl|ielts|test/i.test(t)) || [], 'No testing tasks yet.')}
            </UndergradCard>
          )}
        </div>
      )}

      {type === 'essays' && !early && (
        <UndergradCard title="Essays">
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111a33', marginBottom: 8 }}>Essay preparation</div>
          <div style={{ fontSize: 13.5, color: '#5a6a8f', lineHeight: 1.6, marginBottom: 16 }}>
            Use this space for personal statement, supplements, and school-specific drafts.
          </div>
          <button onClick={() => setCandTab('studentProfile')} style={{ background: '#111a33', color: '#fff', border: 'none', borderRadius: 13, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(30,45,90,.32)' }}>
            Work with counselor
          </button>
        </UndergradCard>
      )}

      {type === 'applications' && !early && (() => {
        const applications = undergrad?.applications || [];
        const SUBMISSION_LABEL = { not_started: 'Not started', in_progress: 'In progress', submitted: 'Submitted' };
        if (!applications.length) {
          return (
            <UndergradCard title="Applications">
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111a33', marginBottom: 8 }}>No applications started yet</div>
              <div style={{ fontSize: 13.5, color: '#5a6a8f', lineHeight: 1.6, marginBottom: 16 }}>Once you have a target school, deadlines, checklist, and recommendation status will appear here.</div>
              <button onClick={() => setCandTab('studentProfile')} style={{ background: '#111a33', color: '#fff', border: 'none', borderRadius: 13, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(30,45,90,.32)' }}>
                Work with counselor
              </button>
            </UndergradCard>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {applications.map(app => (
              <UndergradCard key={app.id} title={app.schoolName}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111a33' }}>{app.schoolName}</div>
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#3a63ff', background: '#f2f6ff', border: '1px solid #e8efff', borderRadius: 999, padding: '4px 10px' }}>
                    {SUBMISSION_LABEL[app.submissionStatus] || 'Not started'}
                  </span>
                </div>
                {app.deadlines.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginBottom: 6 }}>DEADLINES</div>
                    {app.deadlines.map((d, i) => (
                      <div key={i} style={{ fontSize: 13.5, color: '#38456b', marginBottom: 4 }}>{d.label}: <b>{d.date}</b></div>
                    ))}
                  </div>
                )}
                {app.checklist.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginBottom: 6 }}>CHECKLIST</div>
                    {app.checklist.map((c, i) => (
                      <div key={i} style={{ fontSize: 13.5, color: c.status === 'done' ? '#8b97b8' : '#38456b', textDecoration: c.status === 'done' ? 'line-through' : 'none', marginBottom: 4 }}>{c.label}</div>
                    ))}
                  </div>
                )}
                {app.recommendations.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', color: '#8b97b8', marginBottom: 6 }}>RECOMMENDATIONS</div>
                    {app.recommendations.map((r, i) => (
                      <div key={i} style={{ fontSize: 13.5, color: '#38456b', marginBottom: 4 }}>{r.name}: {r.status}</div>
                    ))}
                  </div>
                )}
              </UndergradCard>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// Undergraduate "My Profile" tab — a read-first snapshot of who the student is
// (grade, intended major, destination, readiness, strengths/focus), distinct
// from the Advisor conversation. Undergraduate only; driven off data already in
// props. Reuses existing design tokens — no new colors.
function UndergradProfilePage({ profile = {}, scores = {}, strengths = [], weaknesses = [], setCandTab, authUser }) {
  const name = authUser?.name || profile?.name || 'Your profile';
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'ME';
  const grade = undergradGradeNumber(profile);
  const major = profile.intendedMajor || profile.major || profile.subjects || '';
  const destination = profile.destination || profile.countries || '';
  const curriculum = profile.curriculum || profile.school || '';
  const stage = undergradProfileStage(profile || {});
  const stageLabel = ({
    discovery: 'Just getting started',
    exploratory: 'Exploring directions',
    preliminary: 'Building the plan',
    established: 'Strong momentum',
    mature: 'Application-ready',
  })[stage] || 'In progress';
  const overall = scores?.overall;
  const facts = [
    ['Grade', grade ? `Grade ${grade}` : 'Not set yet'],
    ['Intended major', major || 'Still exploring'],
    ['Destination', destination || 'Open'],
    ['Curriculum', curriculum || 'Not set yet'],
  ];
  const cardStyle = { background: '#fff', borderRadius: 22, border: '1px solid #dbe4f7', boxShadow: '0 1px 2px rgba(30,45,90,.04),0 10px 30px rgba(30,45,90,.05)', padding: 24 };
  const labelStyle = { fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#8b97b8', marginBottom: 14, textTransform: 'uppercase' };
  const columns = [
    ['Top strengths', (strengths || []).slice(0, 4), '#0ca678'],
    ['Focus areas', (weaknesses || []).slice(0, 4), '#e8476b'],
  ];
  return (
    <div className="pw-dashboard-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 28px 36px' }}>
      <div className="pw-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ ...cardStyle, gridColumn: '1 / -1', background: 'linear-gradient(135deg,#eef1ff,#f2f6ff)', border: '1px solid #e8efff', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', boxShadow: '0 3px 10px rgba(58,99,255,.35)' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 24, fontWeight: 700, color: '#111a33', lineHeight: 1.15 }}>{name}</div>
            <div style={{ fontSize: 13, color: '#5a6a8f', marginTop: 4 }}>{stageLabel}{grade ? ` · Grade ${grade}` : ''}</div>
          </div>
          <button onClick={() => setCandTab('studentProfile')} style={{ background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(58,99,255,.4)' }}>Update with Advisor →</button>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Snapshot</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {facts.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8b97b8' }}>{k}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111a33', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>University Readiness</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 30, fontWeight: 700, color: '#111a33', marginBottom: 6 }}>{overall != null ? `${overall} / 100` : 'Not analyzed yet'}</div>
          <div style={{ fontSize: 13, color: '#5a6a8f', lineHeight: 1.55 }}>Built from your grades, activities, testing, and goals.</div>
          <button onClick={() => setCandTab('dashboard')} style={{ marginTop: 14, background: '#fff', color: '#3a63ff', border: '1px solid #dbe4f7', borderRadius: 999, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>See your journey →</button>
        </div>

        <div style={{ gridColumn: '1 / -1' }}><UndergradKpiPanel scores={scores || {}} profile={profile || {}} /></div>

        {columns.map(([label, items, color]) => (
          <div key={label} style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            {items.length ? items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#38456b', lineHeight: 1.45, marginBottom: 9 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                <span>{typeof item === 'string' ? item : item?.header || item?.title}</span>
              </div>
            )) : <div style={{ fontSize: 13, color: '#8b97b8' }}>Appears after your first analysis.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Schools tab (the calm, single-page "readiness snapshot + school list + fit
// notes + next improvements" section from the Workplace spec). Composes the
// existing readiness snapshot (UndergradProfilePage) and Reach/Target/Likely
// school list (UndergradJourneyPage type="universities") rather than
// duplicating either, and adds a small "Next improvements" list, which did
// not exist before, built from the student's current top weakness and task.
function UndergradSchoolsPage(props) {
  const { weaknesses = [], tasks = [] } = props;
  const improvements = [...(weaknesses || []).slice(0, 2), ...(tasks || []).slice(0, 1)].filter(Boolean).slice(0, 3);
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <UndergradProfilePage {...props} />
      {improvements.length > 0 && (
        <div className="pw-undergrad-page" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px 4px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e3ebfa', borderRadius: 18, boxShadow: '0 12px 30px rgba(30,45,90,.06)', padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#3a63ff', textTransform: 'uppercase', marginBottom: 12 }}>Improve your chances</div>
            <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {improvements.map((item, i) => (
                <li key={i} style={{ fontSize: 13.5, color: '#38456b', lineHeight: 1.5 }}>{typeof item === 'string' ? item : item?.header || item?.title}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <UndergradJourneyPage type="universities" {...props} />
    </div>
  );
}

export default function CandidatePortal(props) {
  const { candTab, setCandTab, signOut, plan, language, setLanguage, profile, authUser, authToken, sessionId, resetSession, requiresOAuthDetails, showToast, chosenSchools, documents, archiveDocument, send, chat, tasks, completedTasks } = props;
  const [showHelp, setShowHelp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
    // "Workspace" is a nav grouping, not a page of its own — land on its
    // default sub-tab (WorkspaceHub keeps the horizontal sub-nav highlighted
    // correctly from there via workspaceActiveKey/gradWorkspaceActiveKey).
    // Referencing isUndergrad/trackConfig here is safe even though they're
    // declared later in this function body: this closure only ever runs on
    // a later click event, by which time the whole component has already
    // finished its first render and every const below is initialized.
    setCandTab(key !== 'workspace' ? key : (isUndergrad
      ? 'universities'
      : 'analysis'));
    setMenuOpen(false);
  };

  const name = authUser?.name || profile?.name || 'Candidate';
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const first = name.split(' ')[0];
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const trackConfig = getTrackConfig(profile || {});
  const isUndergrad = trackConfig.key === 'undergraduate';
  // Undergrad is unconditionally consolidated already; the other 4 tracks
  // only get the new Workspace-consolidated layout once their track key is
  // in CONSOLIDATED_WORKSPACE_TRACKS (empty by default — see that const's
  // comment). useConsolidatedLayout is the single switch every layout-only
  // (not content-routing) isUndergrad check below is generalized to.
  const useConsolidatedLayout = isUndergrad || CONSOLIDATED_WORKSPACE_TRACKS.has(trackConfig.key);
  const tabLabels = { dashboard: 'Dashboard', advisor: 'Advisor', studentProfile: 'Advisor', workspace: 'Workspace', roadmap: 'Roadmap', ugRoadmap: 'Roadmap', calendar: 'Calendar', activities: 'Activities', universities: 'University List', universityList: 'University List', testing: 'Testing', essays: 'Essays', scholarships: 'Scholarships', applications: 'Applications', analysis: 'Analysis', documents: 'Simulation', documentDepository: 'Documents', community: 'Community', settings: 'Settings', chat: 'Live Chat' };
  const tabSubtitles = {
    dashboard: 'Here is your overview.', advisor: 'Your next steps are one message away.', studentProfile: 'Your next steps are one message away.',
    workspace: 'Everything you\'ve built, in one place.',
    analysis: 'Where your profile stands today.', universities: 'Build a balanced university list.', universityList: 'Build a balanced university list.', roadmap: 'Your application plan at a glance.',
    activities: 'Shape the experiences that tell your story.', testing: 'Plan and track your test preparation.', essays: 'Draft and refine your strongest story.',
    calendar: 'Every deadline and milestone in one place.',
    applications: 'Keep every application moving.', documents: 'Timed practice with a full breakdown.', documentDepository: 'Everything your applications need.',
    community: 'Learn from candidates on the same path.', settings: 'Manage your account and plan.', chat: 'Talk to a human strategist.',
  };
  // Undergrad repurposes the shared 'documents' key for the file-repository view
  // (grad uses it for the Simulation workspace), so its header text is resolved
  // separately instead of colliding in the tabLabels/tabSubtitles maps above.
  const isUndergradDocsTab = candTab === 'documents' && isUndergrad;
  const targetSummary = chosenSchools?.length ? `Targets: ${chosenSchools.slice(0, 2).join(', ')}${chosenSchools.length > 2 ? ` +${chosenSchools.length - 2}` : ''}` : '';
  const hasChatAccess = true;
  // trackConfig.nav is now defined for every track (Step 2), but a track only
  // gets it when useConsolidatedLayout is true for that track — otherwise
  // navFromConfig falls back to its legacy per-page NAV_ITEMS default, same
  // as before this rebuild, byte-for-byte.
  const navItems = navFromConfig(useConsolidatedLayout ? trackConfig : { ...trackConfig, nav: undefined }, hasChatAccess);
  // Undergrad's "Workspace" nav tab is a grouping, not a page of its own — a
  // calm student workspace with exactly six sections: Schools, Roadmap,
  // Testing, Essays, Applications, Documents. 'universities' stays the
  // internal key for Schools (Advisor.jsx, AdvisorChatFirst.jsx, and
  // AdvisorConversational.jsx already navigate here) — only the visible tab
  // set and labels changed. 'analysis' (readiness snapshot) now renders
  // inside Schools instead of as its own tab; 'activities' stays reachable
  // (e.g. the Advisor's "Improve Activities" suggestion chip) but is no
  // longer its own visible tab — it renders inside Schools too.
  const WORKSPACE_TAB_KEYS = ['analysis', 'universities', 'universityList', 'ugRoadmap', 'activities', 'testing', 'essays', 'applications', 'documents', 'scholarships'];
  const WORKSPACE_DEFAULT_TAB = 'universities';
  const WORKSPACE_TABS = [
    ['universities', 'Schools'],
    ['ugRoadmap', 'Roadmap'],
    ['testing', 'Testing'],
    ['documents', 'Documents'],
    ['essays', 'Essays'],
    ['scholarships', 'Scholarships'],
    ['applications', 'Applications'],
  ];
  const workspaceActiveKey = WORKSPACE_TAB_KEYS.includes(candTab)
    ? (['universityList', 'analysis', 'activities'].includes(candTab) ? 'universities' : candTab)
    : WORKSPACE_DEFAULT_TAB;

  // Grad/MBA/PhD/Personal Development Workspace consolidation (only active
  // per-track when useConsolidatedLayout is true — see that const). Re-homes
  // the same three pages these tracks already had as top-level tabs
  // (Analysis, Simulation, Documents) behind one Workspace sub-nav, same
  // components/props/candTab keys, nothing renamed or merged.
  const GRAD_WORKSPACE_TAB_KEYS = ['analysis', 'documents', 'documentDepository', 'scholarships'];
  const GRAD_WORKSPACE_DEFAULT_TAB = 'analysis';
  const GRAD_WORKSPACE_TABS = [
    ['analysis', 'Analysis'],
    ['documents', 'Simulation'],
    ['documentDepository', 'Documents'],
    ['scholarships', 'Scholarships'],
  ];
  const gradWorkspaceActiveKey = GRAD_WORKSPACE_TAB_KEYS.includes(candTab) ? candTab : GRAD_WORKSPACE_DEFAULT_TAB;

  const candidateAlerts = buildCandidateAlerts({ documents, chat, tasks, completedTasks, plan: authUser?.plan || plan });

  // Sidebar plan/upgrade card. Grad/MBA/PhD/Personal Development render this
  // at the bottom of the sidebar (with the user info card, near marginTop:
  // 'auto'); Undergrad instead renders it right below the nav items (whose
  // last item is Live Chat) — see the two call sites below.
  const renderPlanCard = () => (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '16px 14px', background: 'linear-gradient(135deg,rgba(58,99,255,.28),rgba(58,99,255,.32))', border: '1px solid rgba(58,99,255,.35)' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, letterSpacing: '.08em', color: '#3a63ff', background: 'rgba(255,255,255,.75)', borderRadius: 999, padding: '3px 9px', marginBottom: 8 }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1.2 7.3 4.5 10.8 5 8.3 7.3 9 10.8 6 9l-3 1.8.7-3.5L1.2 5l3.5-.5L6 1.2Z" fill="#3a63ff" /></svg>
          {PLAN_LABELS[plan] || 'AI'}
        </div>
        {plan !== 'ai_strategy' ? (
          <>
            <div style={{ fontSize: 14, color: '#38456b', lineHeight: 1.5, marginBottom: 11 }}>Unlock a dedicated strategist &amp; unlimited reviews.</div>
            <button onClick={handleUpgrade} style={{ width: '100%', border: 'none', borderRadius: 999, padding: '9px 0', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', boxShadow: '0 3px 10px rgba(58,99,255,.4)', cursor: 'pointer' }}>Upgrade plan</button>
          </>
        ) : (
          <div style={{ fontSize: 14, color: '#38456b', lineHeight: 1.5 }}>You have full access, including your dedicated strategist.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="pw-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg,#f2f6ff 0%,#eef4ff 100%)', fontFamily: "'Albert Sans',system-ui,sans-serif", color: '#38456b', WebkitFontSmoothing: 'antialiased' }}>
      {/* Mobile top bar with hamburger */}
      <div className="pw-mobile-bar" style={{ background: 'rgba(238,244,255,.96)', borderBottom: '1px solid #dbe4f7', backdropFilter: 'blur(14px)' }}>
        <button className="pw-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ fill: 'none', stroke: '#111a33', strokeWidth: '2', strokeLinecap: 'round' }}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div>
          <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 19, fontWeight: 600, color: '#111a33', lineHeight: 1 }}>Pathway</div>
        </div>
      </div>

      {/* Backdrop for mobile drawer */}
      {menuOpen && <div className="pw-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`pw-sidebar${menuOpen ? ' pw-sidebar-open' : ''}`} style={{ width: 224, flexShrink: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '18px 14px', background: 'rgba(238,244,255,.85)', borderRight: '1px solid #dbe4f7' }}>

        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 10px 16px' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', boxShadow: '0 2px 6px rgba(58,99,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 9.5 6 2.5 10 9.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 19, fontWeight: 600, color: '#111a33', letterSpacing: '-.01em' }}>Pathway</div>
        </div>

        {/* language */}
        <div style={{ position: 'relative' }}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label="Chat language"
            style={{ width: '100%', appearance: 'none', border: '1px solid #dbe4f7', borderRadius: 12, padding: '9px 13px', fontSize: 14, fontWeight: 500, color: '#38456b', background: 'rgba(255,255,255,.7)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
          <svg viewBox="0 0 24 24" width="15" height="15" style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', fill: 'none', stroke: '#8b97b8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.11em', color: '#8b97b8', padding: '0 12px 8px', marginTop: 16 }}>MENU</div>

        {/* nav — cosmetic pass — see commit for scope */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {navItems.map(item => {
            const active = candTab === item.key
              || (item.key === 'studentProfile' && candTab === 'advisor')
              || (item.key === 'workspace' && isUndergrad && WORKSPACE_TAB_KEYS.includes(candTab))
              || (item.key === 'workspace' && !isUndergrad && GRAD_WORKSPACE_TAB_KEYS.includes(candTab));
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

        {/* Undergrad shows the plan/upgrade card directly below the nav
            items (Live Chat is the last one) instead of at the sidebar
            bottom — see renderPlanCard() above. */}
        {useConsolidatedLayout && <div style={{ marginTop: 14 }}>{renderPlanCard()}</div>}

        {/* help — consolidated-layout tracks move Help to the top-right header instead */}
        {!useConsolidatedLayout && (
          <button onClick={handleHelp} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', marginTop: 10, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#5a6a8f', background: 'transparent' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent', color: '#5a6a8f' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            </span>
            <span>Help</span>
          </button>
        )}

        {/* plan card + user — consolidated-layout tracks move these into the
            header Profile menu instead, so the sidebar stays just the nav tabs */}
        {!useConsolidatedLayout && (
        <div style={{ marginTop: 'auto' }}>
          {renderPlanCard()}

          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '10px 10px', borderRadius: 16, background: 'rgba(255,255,255,.7)', border: '1px solid #dbe4f7' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', boxShadow: '0 3px 10px rgba(58,99,255,.35)' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 14, color: '#8b97b8', fontWeight: 500 }}>Candidate</div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: '#fff', border: '1px solid #e3ebfa', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5a6a8f', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
        )}
      </aside>

      {/* Main */}
      <div className="pw-candidate-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

        {/* top bar */}
        <header className="pw-candidate-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 28px 12px', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontSize: 23, fontWeight: 600, color: '#111a33', letterSpacing: '-.01em' }}>{['dashboard', 'advisor', 'studentProfile'].includes(candTab) ? `Good ${tod}, ${first}` : (isUndergradDocsTab ? 'Documents' : tabLabels[candTab])}</div>
            <div style={{ fontSize: 13, color: '#5a6a8f', fontWeight: 400, marginTop: 2 }}>{targetSummary || (isUndergradDocsTab ? 'Your essays, CV, and every uploaded file in one place.' : tabSubtitles[candTab]) || tabLabels[candTab]}</div>
          </div>
          <div className="pw-candidate-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleHelp} title="Help" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #dbe4f7', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5a6a8f' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            </button>
            <NotificationBell
              alerts={candidateAlerts}
              storageKey={`pathway_candidate_alerts_${authUser?.id || authUser?.email || name}`}
              title="Candidate alerts"
            />
            {useConsolidatedLayout && (
              <button onClick={() => handleNavClick('settings')} title="Settings" aria-label="Settings" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #dbe4f7', background: candTab === 'settings' ? 'linear-gradient(135deg,#3a63ff,#6d8cff)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: candTab === 'settings' ? '#fff' : '#5a6a8f' }}>
                <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></svg>
              </button>
            )}
            {useConsolidatedLayout && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setProfileMenuOpen(o => !o)} title="Account" aria-label="Account menu" aria-expanded={profileMenuOpen} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 800, boxShadow: '0 3px 10px rgba(58,99,255,.35)' }}>
                  {initials}
                </button>
                {profileMenuOpen && (
                  <>
                    <div onClick={() => setProfileMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                    <div style={{ position: 'absolute', top: 44, right: 0, width: 260, background: '#fff', border: '1px solid #dbe4f7', borderRadius: 16, boxShadow: '0 18px 40px rgba(30,45,90,.14)', padding: 14, zIndex: 21 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{initials}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                          <div style={{ fontSize: 12, color: '#8b97b8' }}>{PLAN_LABELS[plan] || 'AI'}</div>
                        </div>
                      </div>
                      {plan !== 'ai_strategy' && (
                        <div style={{ background: '#ffffff', border: '1px solid #e8efff', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 12.5, color: '#38456b', lineHeight: 1.5, marginBottom: 9 }}>Unlock a dedicated strategist &amp; unlimited reviews.</div>
                          <button onClick={() => { handleUpgrade(); setProfileMenuOpen(false); }} style={{ width: '100%', border: 'none', borderRadius: 999, padding: '8px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3a63ff,#6d8cff)', cursor: 'pointer' }}>Upgrade plan</button>
                        </div>
                      )}
                      <button onClick={() => { handleNavClick('settings'); setProfileMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 10, padding: '9px 8px', fontSize: 13.5, fontWeight: 600, color: '#38456b', cursor: 'pointer', fontFamily: 'inherit' }}>Account &amp; billing</button>
                      <button onClick={() => { setProfileMenuOpen(false); handleSignOut(); }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 10, padding: '9px 8px', fontSize: 13.5, fontWeight: 600, color: '#e8476b', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button className="pw-new-session-button" onClick={resetSession} disabled={requiresOAuthDetails} title="New session" aria-label="New session" style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #e3ebfa', borderRadius: 999, padding: '9px 16px', height: 36, fontSize: 13, fontWeight: 600, color: '#38456b', cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: '#3a63ff', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
              <span>New session</span>
            </button>
          </div>
        </header>

        {candTab === 'dashboard' && <Dashboard {...props} />}
        {(candTab === 'advisor' || candTab === 'studentProfile') && <Advisor {...props} />}
        {candTab === 'analysis' && !isUndergrad && !useConsolidatedLayout && <Analysis {...props} />}

        {/* Workspace — the re-homed destination for every old Undergrad output
            page. Nothing here is new/rebuilt: same components, same props,
            just presented behind one shared horizontal sub-nav. */}
        {isUndergrad && WORKSPACE_TAB_KEYS.includes(candTab) && (
          <WorkspaceHub tabs={WORKSPACE_TABS} activeKey={workspaceActiveKey} onSelect={setCandTab}>
            {['analysis', 'universities', 'universityList'].includes(candTab) && <UndergradSchoolsPage {...props} />}
            {candTab === 'ugRoadmap' && <UndergradRoadmap {...props} />}
            {candTab === 'activities' && <UndergradJourneyPage type="activities" {...props} />}
            {candTab === 'testing' && <UndergradJourneyPage type="testing" {...props} />}
            {candTab === 'essays' && <EssayDocuments {...props} />}
            {candTab === 'documents' && <DocumentDepositoryPage documents={documents} setCandTab={setCandTab} send={send} archiveDocument={archiveDocument} showToast={showToast} />}
            {candTab === 'scholarships' && <Scholarships {...props} />}
            {candTab === 'applications' && <UndergradJourneyPage type="applications" {...props} />}
          </WorkspaceHub>
        )}

        {/* Grad/MBA/PhD/Personal Development Workspace consolidation — only
            when useConsolidatedLayout is on for this track. Same three
            components/props these tracks already render standalone below,
            just presented behind one shared horizontal sub-nav, mirroring
            the Undergrad block above. */}
        {!isUndergrad && useConsolidatedLayout && GRAD_WORKSPACE_TAB_KEYS.includes(candTab) && (
          <WorkspaceHub tabs={GRAD_WORKSPACE_TABS} activeKey={gradWorkspaceActiveKey} onSelect={setCandTab}>
            {candTab === 'analysis' && <Analysis {...props} />}
            {candTab === 'documents' && <Documents {...props} />}
            {candTab === 'documentDepository' && <DocumentDepositoryPage documents={documents} setCandTab={setCandTab} send={send} archiveDocument={archiveDocument} showToast={showToast} />}
            {candTab === 'scholarships' && <Scholarships {...props} />}
          </WorkspaceHub>
        )}

        {/* Calendar stays a Dashboard deep-link (its mini-calendar card opens
            this full tracker), not a Workspace tab, per the migration map. */}
        {candTab === 'calendar' && isUndergrad && <UndergradTracker {...props} />}

        {candTab === 'documents' && !isUndergrad && !useConsolidatedLayout && <Documents {...props} />}
        {candTab === 'documentDepository' && !isUndergrad && !useConsolidatedLayout && <DocumentDepositoryPage documents={documents} setCandTab={setCandTab} send={send} archiveDocument={archiveDocument} showToast={showToast} />}
        {candTab === 'community' && <CommunityHub {...props} />}
        {candTab === 'settings' && <Settings {...props} />}
        {candTab === 'chat' && hasChatAccess && (isUndergrad ? <LiveChatHub {...props} /> : <Chat {...props} />)}
      </div>

      {showHelp && <HelpModal authToken={authToken} sessionId={sessionId} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
