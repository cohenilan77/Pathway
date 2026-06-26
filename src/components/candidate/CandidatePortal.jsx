import React, { useState } from 'react';
import Dashboard from './Dashboard.jsx';
import Advisor from './Advisor.jsx';
import Analysis from './Analysis.jsx';
import Documents from './Documents.jsx';
import Settings from './Settings.jsx';
import Chat from './Chat.jsx';
import HelpModal from './HelpModal.jsx';
import { LANGUAGES } from '../../constants.js';
import { downloadAsPdf, downloadAsDocx } from '../../lib/documentExport.js';
import NotificationBell from '../NotificationBell.jsx';
import { getTrackConfig } from '../../trackConfig.js';

const PLAN_LABELS = { free: 'Free plan', ai: 'AI', ai_strategy: 'AI + Strategy' };

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
ICON_BY_KEY.studentProfile = ICON_BY_KEY.advisor;
ICON_BY_KEY.roadmap = ICON_BY_KEY.analysis;
ICON_BY_KEY.activities = ICON_BY_KEY.documents;
ICON_BY_KEY.universities = ICON_BY_KEY.analysis;
ICON_BY_KEY.testing = ICON_BY_KEY.documentDepository;
ICON_BY_KEY.essays = ICON_BY_KEY.documents;
ICON_BY_KEY.applications = ICON_BY_KEY.documentDepository;

function navFromConfig(config, hasChatAccess) {
  if (Array.isArray(config?.nav) && config.nav.length) {
    return config.nav.map(([key, label, iconKey]) => ({
      key,
      label,
      icon: ICON_BY_KEY[iconKey] || ICON_BY_KEY[key] || ICON_BY_KEY.dashboard,
    }));
  }
  return hasChatAccess
    ? [...NAV_ITEMS.filter(item => item.key !== 'settings'), CHAT_NAV_ITEM, NAV_ITEMS.find(item => item.key === 'settings')]
    : NAV_ITEMS;
}

function navStyle(active) {
  return active
    ? { position: 'relative', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', borderRadius: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#faf7f2', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', boxShadow: '0 12px 24px rgba(105,91,255,.36), inset 0 1px 0 rgba(255,255,255,.32)' }
    : { position: 'relative', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', borderRadius: 15, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#5e688c', background: 'transparent' };
}
function navIconStyle(active) {
  return active
    ? { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,.18)', color: '#faf7f2' }
    : { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f1eadd', color: '#8a93b3' };
}
function navDotStyle(active) {
  return active
    ? { marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#faf7f2', boxShadow: '0 0 8px rgba(255,255,255,.8)' }
    : { marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'transparent' };
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
  if (plan !== 'ai_strategy') {
    alerts.push({
      id: `plan-upgrade-${plan || 'free'}`,
      title: 'Consultant chat locked',
      message: 'Upgrade to AI + Strategy to message a human consultant.',
      priority: 'low',
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
      ? { bg: '#eef0ff', color: '#5b46e0' }
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
                <thead><tr style={{ color: '#6b7392', fontSize: 11, letterSpacing: '.7px' }}>
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
  };
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
    <div style={{ background: '#faf7f2', borderRadius: 20, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: '#9098b5', textTransform: 'uppercase' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function UndergradJourneyPage({ type, profile, scores, strengths, weaknesses, tasks, programs, setCandTab, send }) {
  const grade = undergradGradeNumber(profile);
  const early = grade && grade <= 10;
  const buckets = splitUniversities(programs || []);
  const list = (items = [], empty) => items.length
    ? items.slice(0, 6).map((item, i) => (
      <div key={`${item}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#33405e', lineHeight: 1.45, marginBottom: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b899fb', marginTop: 6, flexShrink: 0 }} />
        <span>{typeof item === 'string' ? item : item?.name}</span>
      </div>
    ))
    : <div style={{ fontSize: 13.5, color: '#9098b5' }}>{empty}</div>;
  const roadmap = [
    ['Weekly Coaching', 'Quick updates on grades, activities, problems, ideas, and goals.'],
    ['Monthly Review', 'Review academics, leadership, projects, testing, and readiness.'],
    ['Semester Review', 'Upload report card and achievements; generate briefing, summary, agenda, and tasks.'],
    ['Summer Planning', 'Build internships, volunteering, research, competitions, summer schools, or personal projects.'],
    ['Annual Review', 'Reset strategy, competitiveness, roadmap, and next-year objectives.'],
  ];

  if ((type === 'essays' || type === 'applications') && early) {
    return (
      <div className="pw-undergrad-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px 28px' }}>
        <UndergradCard title={type === 'essays' ? 'Essays' : 'Applications'}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#141b34', margin: '0 0 8px' }}>This section will unlock later in your journey.</h2>
          <p style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, margin: 0 }}>For Grade 9-10, the priority is grades, interests, activities, leadership, and a stronger profile foundation.</p>
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
        <div className="pw-undergrad-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, maxWidth: 1100 }}>
          {['Planned', 'In Progress', 'Completed'].map((status, idx) => (
            <UndergradCard key={status} title={status}>
              {idx === 0 && list(tasks || [], 'Roadmap tasks will appear here.')}
              {idx === 1 && list(strengths || [], 'Active strengths and activities will appear here.')}
              {idx === 2 && list([], 'Mark roadmap tasks complete to build history.')}
            </UndergradCard>
          ))}
        </div>
      )}

      {type === 'universities' && (
        <div className="pw-undergrad-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, maxWidth: 1180 }}>
          {Object.entries(buckets).map(([label, schools]) => (
            <UndergradCard key={label} title={`${label} Universities`}>
              {schools.length ? schools.slice(0, 8).map(school => (
                <div key={school.name} style={{ border: '1px solid #f1eadd', borderRadius: 15, padding: 14, marginBottom: 10, background: '#fffdf8' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#141b34', marginBottom: 4 }}>{school.name}</div>
                  <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.45, minHeight: 68 }}>{undergradUniversityDescription(school, profile)}</div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: '#9098b5', fontWeight: 800 }}>Fit index {school.fit ?? '-'}%</div>
                </div>
              )) : <div style={{ fontSize: 13.5, color: '#9098b5' }}>This bucket will populate after the starting snapshot.</div>}
            </UndergradCard>
          ))}
        </div>
      )}

      {type === 'testing' && (
        <UndergradCard title="Testing">
          <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 8 }}>Testing plan</div>
          <div style={{ fontSize: 13.5, color: '#6b7392', lineHeight: 1.6, marginBottom: 16 }}>Track SAT, ACT, PSAT, AP, TOEFL, or IELTS plans here as the counselor learns more.</div>
          {list(tasks?.filter(t => /sat|act|psat|ap|toefl|ielts|test/i.test(t)) || [], 'No testing tasks yet.')}
        </UndergradCard>
      )}

      {(type === 'essays' || type === 'applications') && !early && (
        <UndergradCard title={type === 'essays' ? 'Essays' : 'Applications'}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 8 }}>{type === 'essays' ? 'Essay preparation' : 'Application mode'}</div>
          <div style={{ fontSize: 13.5, color: '#6b7392', lineHeight: 1.6, marginBottom: 16 }}>
            {type === 'essays' ? 'Use this space for personal statement, supplements, and school-specific drafts.' : 'Track deadlines, recommendations, transcripts, interviews, and final decisions.'}
          </div>
          <button onClick={() => setCandTab('studentProfile')} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 13, padding: '11px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
            Work with counselor
          </button>
        </UndergradCard>
      )}
    </div>
  );
}

export default function CandidatePortal(props) {
  const { candTab, setCandTab, signOut, plan, language, setLanguage, profile, authUser, resetSession, requiresOAuthDetails, showToast, chosenSchools, documents, archiveDocument, send, chat, tasks, completedTasks } = props;
  const [showHelp, setShowHelp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHelp = () => { setShowHelp(true); setMenuOpen(false); };
  const handleUpgrade = () => { setCandTab('settings'); setMenuOpen(false); };
  const handleSignOut = () => { setMenuOpen(false); signOut(); };
  const handleNavClick = (key) => {
    if (requiresOAuthDetails && key !== 'settings') {
      setCandTab('settings');
      setMenuOpen(false);
      showToast('Please confirm your details before continuing.');
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
  const tabLabels = { dashboard: 'Dashboard', advisor: 'Advisor', studentProfile: 'Student Profile', roadmap: 'Roadmap', activities: 'Activities', universities: 'University List', testing: 'Testing', essays: 'Essays', applications: 'Applications', analysis: 'Analysis', documents: 'Simulation', documentDepository: 'Documents', settings: 'Settings', chat: 'Live Chat' };
  const targetSummary = chosenSchools?.length ? `Targets: ${chosenSchools.slice(0, 2).join(', ')}${chosenSchools.length > 2 ? ` +${chosenSchools.length - 2}` : ''}` : '';
  const hasChatAccess = (authUser?.plan || plan) === 'ai_strategy';
  const navItems = navFromConfig(trackConfig, hasChatAccess);
  const candidateAlerts = buildCandidateAlerts({ documents, chat, tasks, completedTasks, plan: authUser?.plan || plan });

  return (
    <div className="pw-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1eadd', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: '#141b34', WebkitFontSmoothing: 'antialiased' }}>
      {/* Mobile top bar with hamburger */}
      <div className="pw-mobile-bar">
        <button className="pw-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ fill: 'none', stroke: '#141b34', strokeWidth: '2', strokeLinecap: 'round' }}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.4px', color: '#141b34' }}>Pathway</div>
      </div>

      {/* Backdrop for mobile drawer */}
      {menuOpen && <div className="pw-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <div className={`pw-sidebar${menuOpen ? ' pw-sidebar-open' : ''}`} style={{ width: 266, flexShrink: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '26px 18px', background: '#faf7f2', borderRight: '1px solid #edf0f9' }}>

        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 10px 4px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 15, flexShrink: 0, background: 'linear-gradient(140deg,#94b3fb,#b899fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(105,91,255,.36), inset 0 1px 0 rgba(255,255,255,.45)' }}>
            <svg viewBox="0 0 24 24" width="23" height="23" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: '2.3', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M5 19 C5 13 9 11 12 11 C15 11 19 9 19 4.5" /><circle cx="5" cy="19" r="1.7" fill="#faf7f2" stroke="none" /><circle cx="19" cy="4.6" r="1.7" fill="#faf7f2" stroke="none" />
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', color: '#141b34', lineHeight: 1 }}>Pathway</div>
        </div>

        {/* language */}
        <div style={{ position: 'relative', marginTop: 24 }}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label="Chat language"
            style={{ width: '100%', appearance: 'none', border: '1.5px solid #f1eadd', borderRadius: 14, padding: '12px 15px', fontSize: 13.5, fontWeight: 600, color: '#3c4564', background: '#f6f1e8', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
          <svg viewBox="0 0 24 24" width="15" height="15" style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', fill: 'none', stroke: '#9aa3c0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', color: '#b2bad2', margin: '24px 12px 10px' }}>MENU</div>

        {/* nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {navItems.map(item => {
            const active = candTab === item.key || (item.key === 'studentProfile' && candTab === 'advisor') || (item.key === 'universities' && candTab === 'analysis' && isUndergrad);
            const locked = requiresOAuthDetails && item.key !== 'settings';
            return (
              <button key={item.key} onClick={() => handleNavClick(item.key)} style={{ ...navStyle(active), opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                <span style={navIconStyle(active)}>{item.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span>{item.label}</span>
                </span>
                <span style={navDotStyle(active)} />
              </button>
            );
          })}
        </div>

        {/* help */}
        <button onClick={handleHelp} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', marginTop: 10, borderRadius: 15, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', color: '#5e688c', background: 'transparent' }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f1eadd', color: '#8a93b3' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
          </span>
          <span>Help</span>
        </button>

        {/* plan card + user */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '17px 17px 18px', background: 'linear-gradient(145deg,#9ba5fb,#c199fb)', boxShadow: '0 16px 30px rgba(105,91,255,.34)' }}>
            <div style={{ position: 'absolute', top: -30, right: -26, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
            <div style={{ position: 'absolute', bottom: -34, left: -20, width: 74, height: 74, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: '#fce7b0', stroke: 'none' }}><path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 21 12 17.3 6.5 21 8 13.4 3 9l6.4-.7L12 2Z" /></svg>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.4px', color: '#f1eadd' }}>{PLAN_LABELS[plan] || 'AI'}</span>
              </div>
              {plan !== 'ai_strategy' ? (
                <>
                  <div style={{ fontSize: 12.5, color: '#f1eadd', lineHeight: 1.45, marginBottom: 13, fontWeight: 500 }}>Unlock a dedicated strategist &amp; unlimited reviews.</div>
                  <button onClick={handleUpgrade} style={{ width: '100%', background: '#faf7f2', color: '#5b46e0', border: 'none', borderRadius: 12, padding: 11, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 14px rgba(40,20,90,.18)' }}>Upgrade plan</button>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: '#f1eadd', lineHeight: 1.45, fontWeight: 500 }}>You have full access, including your dedicated strategist.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '8px 8px', borderRadius: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(140deg,#fbd2a2,#fcbfcf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#faf7f2', boxShadow: '0 6px 14px rgba(255,122,156,.35)' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2745', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 11.5, color: '#9098b5', fontWeight: 500 }}>Candidate</div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: '#f1eadd', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8a93b3', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="pw-candidate-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

        {/* top bar */}
        <div className="pw-candidate-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '26px 36px', borderBottom: '1px solid #f1eadd', background: '#faf7f2', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', color: '#141b34' }}>Good {tod}, {first}</div>
            <div style={{ fontSize: 13.5, color: '#838bab', fontWeight: 500, marginTop: 3 }}>{targetSummary || (tabLabels[candTab] === 'Advisor' ? "Let's keep your application moving forward." : tabLabels[candTab])}</div>
          </div>
          <div className="pw-candidate-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleHelp} title="Help" style={{ width: 42, height: 42, borderRadius: 13, border: '1.5px solid #f1eadd', background: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7392' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            </button>
            <NotificationBell
              alerts={candidateAlerts}
              storageKey={`pathway_candidate_alerts_${authUser?.id || authUser?.email || name}`}
              title="Candidate alerts"
            />
            <button className="pw-new-session-button" onClick={resetSession} disabled={requiresOAuthDetails} title="New session" aria-label="New session" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf7f2', border: '1.5px solid #f1eadd', borderRadius: 13, padding: '0 16px', height: 42, fontSize: 13, fontWeight: 700, color: '#5b46e0', cursor: requiresOAuthDetails ? 'not-allowed' : 'pointer', opacity: requiresOAuthDetails ? 0.45 : 1, fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
              <span>New session</span>
            </button>
          </div>
        </div>

        {candTab === 'dashboard' && <Dashboard {...props} />}
        {(candTab === 'advisor' || candTab === 'studentProfile') && <Advisor {...props} />}
        {candTab === 'analysis' && !isUndergrad && <Analysis {...props} />}
        {(candTab === 'universities' || (candTab === 'analysis' && isUndergrad)) && isUndergrad && <UndergradJourneyPage type="universities" {...props} />}
        {['roadmap', 'activities', 'testing', 'essays', 'applications'].includes(candTab) && isUndergrad && <UndergradJourneyPage type={candTab} {...props} />}
        {candTab === 'documents' && <Documents {...props} />}
        {candTab === 'documentDepository' && <DocumentDepositoryPage documents={documents} setCandTab={setCandTab} send={send} archiveDocument={archiveDocument} showToast={showToast} />}
        {candTab === 'settings' && <Settings {...props} />}
        {candTab === 'chat' && hasChatAccess && <Chat {...props} />}
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
