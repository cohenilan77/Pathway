import React, { useState, useEffect, useCallback, useRef } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';
import { saveBlob, downloadAsPdf, downloadAsDocx } from '../../lib/documentExport.js';
import { chatT, chatDir, formatChatDate } from '../../lib/chatI18n.js';
import { LANGUAGES } from '../../constants.js';
import { normalizeProgramList } from '../../../lib/program-normalizer.js';
import NotificationBell from '../NotificationBell.jsx';
import WhatsAppAiAdvisorToggle from '../../features/whatsappAiAdvisor/WhatsAppAiAdvisorToggle.jsx';
import AgentsTab from './AgentsTab.jsx';

const cardShell = { background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, boxShadow: '0 18px 40px rgba(60,72,130,.06)' };

const sideStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
  fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', width: '100%',
  textAlign: 'left', border: 'none', fontFamily: 'inherit',
  background: active ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : 'transparent',
  color: active ? '#faf7f2' : '#6b7392',
  boxShadow: active ? '0 8px 16px rgba(105,91,255,.32)' : 'none',
  transition: 'all .15s',
});

const btnPrimary = {
  background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 12,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 16px rgba(105,91,255,.3)',
};
const btnGhost = {
  background: '#faf7f2', color: '#33405e', border: '1px solid #f1eadd', borderRadius: 10,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
const btnDanger = {
  background: '#fff1f6', color: '#e0457a', border: '1px solid #fbd3e2', borderRadius: 10,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

const scoreColor = (s) => (s >= 75 ? '#3fdca9' : s >= 50 ? '#eaa129' : '#e384a5');
const tierColor = (tier) => (tier === 'stretch' ? '#e384a5' : tier === 'safe' ? '#3fdca9' : tier === 'possible' ? '#eaa129' : '#9098b5');
const tierBg = (tier) => (tier === 'stretch' ? '#fff1f6' : tier === 'safe' ? '#eafff6' : tier === 'possible' ? '#fff8ea' : '#f1eadd');
const tierBorder = (tier) => (tier === 'stretch' ? '#fbd3e2' : tier === 'safe' ? '#aaeed1' : tier === 'possible' ? '#f5dfa6' : '#f1eadd');
const tierLabel = (tier) => (tier === 'stretch' ? 'LOW FIT' : tier === 'possible' ? 'WORKABLE FIT' : tier === 'safe' ? 'STRONG FIT' : 'PREREQUISITES');

const NavIcon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}>{children}</svg>
);

const sortableHeaderStyle = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  color: 'inherit',
  font: 'inherit',
  letterSpacing: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

const usageRowsScrollStyle = {
  maxHeight: 272,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
};

const usageCompactRowsScrollStyle = {
  maxHeight: 118,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
};

function SortHeader({ label, column, sort, onSort }) {
  const active = sort.column === column;
  return (
    <button onClick={() => onSort(column)} style={{ ...sortableHeaderStyle, color: active ? '#5b46e0' : 'inherit' }}>
      <span>{label}</span>
      <span style={{ fontSize: 10, opacity: active ? 1 : 0.35 }}>{active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

const marketingKpis = [
  { label: 'ORGANIC VISITS', value: '18.4K', color: '#141b34' },
  { label: 'PAID CLICKS', value: '4,920', color: '#5b46e0' },
  { label: 'CTR', value: '4.8%', color: '#19c08a' },
  { label: 'LEADS', value: '642', color: '#141b34' },
  { label: 'CPA', value: '$41', color: '#eaa129' },
  { label: 'SPEND', value: '$26.3K', color: '#e0457a' },
];

const marketingCampaigns = [
  { campaign: 'MBA Profile Review', platform: 'Google', budget: '$12,000', spend: '$8,840', clicks: '1,920', leads: 188, cpa: '$47', status: 'Active' },
  { campaign: 'Undergrad Journey', platform: 'Meta', budget: '$7,500', spend: '$4,910', clicks: '2,140', leads: 246, cpa: '$20', status: 'Scaling' },
  { campaign: 'LLM Admissions', platform: 'LinkedIn', budget: '$6,000', spend: '$3,720', clicks: 520, leads: 74, cpa: '$50', status: 'Active' },
  { campaign: 'Consultant Webinar', platform: 'Google', budget: '$4,000', spend: '$2,180', clicks: 340, leads: 54, cpa: '$40', status: 'Testing' },
];

const seoKeywords = [
  { keyword: 'mba admissions consultant', rank: 4, traffic: '3,420', page: '/mba-admissions' },
  { keyword: 'undergraduate application roadmap', rank: 7, traffic: '2,180', page: '/undergraduate' },
  { keyword: 'llm application strategy', rank: 9, traffic: '940', page: '/law' },
  { keyword: 'college essay review', rank: 12, traffic: '1,260', page: '/essays' },
];

const paidChannels = [
  { name: 'Google', spend: 8840, budget: 12000, color: '#5b46e0' },
  { name: 'Meta', spend: 4910, budget: 7500, color: '#19c08a' },
  { name: 'LinkedIn', spend: 3720, budget: 6000, color: '#eaa129' },
];

const engagementKpis = [
  { label: 'MEETINGS', value: 18, color: '#141b34' },
  { label: 'CONSULTANT ACTIONS', value: 126, color: '#5b46e0' },
  { label: 'NOTES', value: 43, color: '#19c08a' },
  { label: 'FOLLOW-UPS', value: 21, color: '#eaa129' },
  { label: 'WAITING', value: 9, color: '#e0457a' },
];

const consultantLeaderboard = [
  { consultant: 'Jessica Cohen', candidates: 18, meetings: 7, actions: 42, notes: 15, response: '18m' },
  { consultant: 'David Rosen', candidates: 14, meetings: 5, actions: 31, notes: 10, response: '24m' },
  { consultant: 'Sarah Levy', candidates: 12, meetings: 4, actions: 28, notes: 9, response: '32m' },
  { consultant: 'Michael Stein', candidates: 10, meetings: 2, actions: 25, notes: 9, response: '41m' },
];

const upcomingMeetings = [
  { candidate: 'Adam G.', consultant: 'Jessica Cohen', date: 'Today, 14:30', status: 'Confirmed' },
  { candidate: 'Galit S.', consultant: 'David Rosen', date: 'Today, 16:00', status: 'Prep Needed' },
  { candidate: 'Noa L.', consultant: 'Sarah Levy', date: 'Tomorrow, 10:15', status: 'Confirmed' },
];

const followUpCandidates = [
  { candidate: 'Adam G.', last: 'Essay draft reviewed', inactive: '3 days', priority: 'High' },
  { candidate: 'Maya R.', last: 'Profile scores updated', inactive: '5 days', priority: 'Medium' },
  { candidate: 'Daniel K.', last: 'Waiting on transcript', inactive: '7 days', priority: 'High' },
  { candidate: 'Lior P.', last: 'University list opened', inactive: '4 days', priority: 'Medium' },
];

const activityFeed = [
  { actor: 'Jessica', action: 'reviewed essay', target: 'Adam G.', time: '12 min ago' },
  { actor: 'David', action: 'completed interview prep', target: 'Galit S.', time: '38 min ago' },
  { actor: 'Sarah', action: 'met candidate', target: 'Noa L.', time: '1h ago' },
  { actor: 'Michael', action: 'added notes', target: 'Daniel K.', time: '2h ago' },
];

function AdminMetricCard({ label, value, color = '#141b34', detail }) {
  return (
    <div style={{ ...cardShell, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg,rgba(148,179,251,.2),rgba(184,153,251,.18))' }} />
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 8, position: 'relative' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, position: 'relative' }}>{value}</div>
      {detail && <div style={{ fontSize: 12, color: '#9098b5', marginTop: 8, position: 'relative' }}>{detail}</div>}
    </div>
  );
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 14 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', color: '#9098b5', marginBottom: 5 }}>{eyebrow}</div>}
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: 0 }}>{title}</h3>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  const tones = {
    good: { bg: '#eafff6', color: '#19c08a', border: '#aaeed1' },
    warn: { bg: '#fff8ea', color: '#c77f0a', border: '#f5dfa6' },
    risk: { bg: '#fff1f6', color: '#e0457a', border: '#fbd3e2' },
    neutral: { bg: '#f1eadd', color: '#5b46e0', border: '#e7dcc7' },
  };
  const style = tones[tone] || tones.neutral;
  return (
    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.3px', padding: '4px 10px', borderRadius: 8, background: style.bg, color: style.color, border: `1px solid ${style.border}`, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div style={{ ...cardShell, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: Math.max(620, columns.length * 115) }}>
          <div style={{ display: 'grid', gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '), gap: 0, padding: '10px 20px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
            {columns.map(c => <span key={c.key}>{c.label}</span>)}
          </div>
          {rows.map((row, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '), gap: 0, padding: '15px 20px', alignItems: 'center', borderBottom: idx < rows.length - 1 ? '1px solid #f6f1e8' : 'none' }}>
              {columns.map(c => (
                <span key={c.key} style={{ fontSize: 13, color: c.strong ? '#141b34' : '#33405e', fontWeight: c.strong ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetBar({ value, max, color = '#5b46e0' }) {
  const pct = Math.min(100, Math.round((Number(value || 0) / Math.max(1, Number(max || 1))) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7392', marginBottom: 7 }}>
        <span>${Number(value || 0).toLocaleString()}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 8, background: '#f1eadd', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function ActivityFeed({ items }) {
  return (
    <div style={{ ...cardShell, padding: 22 }}>
      <SectionTitle eyebrow="RECENT ACTIVITY" title="Consultant Activity Feed" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, idx) => (
          <div key={`${item.actor}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, background: idx % 2 ? '#fff8ea' : '#f1eadd', color: idx % 2 ? '#c77f0a' : '#5b46e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {item.actor.slice(0, 1)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: '#33405e', lineHeight: 1.4 }}>
                <b style={{ color: '#141b34' }}>{item.actor}</b> {item.action} <b style={{ color: '#141b34' }}>{item.target}</b>
              </div>
              <div style={{ fontSize: 11.5, color: '#9098b5', marginTop: 2 }}>{item.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildAdminAlerts({ candidateUsers = [], consultantUsers = [], usageData, usageSettings }) {
  const alerts = [];
  const unread = candidateUsers.reduce((sum, u) => sum + (u.unreadMessages || 0), 0);
  const unassigned = candidateUsers.filter(u => !u.consultantId);
  const suspended = [...candidateUsers, ...consultantUsers].filter(u => u.suspended);
  if (unread) alerts.push({ id: `admin-unread-${unread}`, title: 'Unread candidate messages', message: `${unread} message${unread === 1 ? '' : 's'} waiting for consultant review.`, priority: 'high' });
  if (unassigned.length) alerts.push({ id: `admin-unassigned-${unassigned.length}`, title: 'Candidates need assignment', message: `${unassigned.length} candidate${unassigned.length === 1 ? '' : 's'} do not have a consultant yet.`, priority: 'high' });
  if (suspended.length) alerts.push({ id: `admin-suspended-${suspended.length}`, title: 'Suspended accounts', message: `${suspended.length} account${suspended.length === 1 ? '' : 's'} currently suspended.`, priority: 'medium' });
  consultantUsers.forEach(consultant => {
    const assigned = candidateUsers.filter(u => u.consultantId === consultant.id).length;
    if (assigned >= 8) alerts.push({ id: `admin-load-${consultant.id}-${assigned}`, title: 'Consultant capacity warning', message: `${consultant.name || consultant.email} has ${assigned} assigned candidates.`, priority: 'medium' });
  });
  if (usageSettings?.systemSuspended) alerts.push({ id: 'admin-system-suspended', title: 'System suspended', message: usageSettings.suspensionMessage || 'Candidate AI messages are currently blocked.', priority: 'high' });
  if ((usageData?.budgetPercent || 0) >= 80) alerts.push({ id: `admin-budget-${Math.round(usageData.budgetPercent)}`, title: 'Monthly AI cost threshold', message: `$${Number(usageData.monthlyCost || 0).toFixed(2)} used, ${Math.round(usageData.budgetPercent || 0)}% of budget.`, priority: (usageData.budgetPercent || 0) >= 100 ? 'high' : 'medium' });
  if ((usageData?.totalTokens || 0) >= 100000) alerts.push({ id: `admin-tokens-${Math.floor((usageData.totalTokens || 0) / 10000)}`, title: 'Token usage spike', message: `${Number(usageData.totalTokens || 0).toLocaleString()} tokens used across the platform.`, priority: 'medium' });
  (usageData?.topUsersByCost || []).filter(u => (u.cost || 0) >= (usageSettings?.maxCostPerUser || 2)).slice(0, 3).forEach(u => alerts.push({
    id: `admin-user-cost-${u.userId || u.id}-${Math.round((u.cost || 0) * 100)}`,
    title: 'Candidate over cost allowance',
    message: `${u.name || u.userId || 'A user'} used $${Number(u.cost || 0).toFixed(2)} this month.`,
    priority: 'medium',
  }));
  (usageData?.recentHighCostConversations || []).slice(0, 3).forEach((c, i) => alerts.push({
    id: `admin-expensive-conversation-${c.conversationId || i}`,
    title: 'Expensive AI conversation',
    message: `${c.feature || 'AI'} conversation cost $${Number(c.cost || 0).toFixed(2)}.`,
    priority: 'medium',
    createdAt: c.createdAt,
  }));
  (usageData?.alerts || []).slice(0, 5).forEach(a => alerts.push({
    id: `admin-usage-alert-${a.id}`,
    title: 'Usage alert',
    message: a.message,
    priority: 'high',
    createdAt: a.createdAt,
  }));
  return alerts;
}

function buildConsultantAlerts({ candidateUsers = [] }) {
  const alerts = [];
  candidateUsers.filter(u => u.unreadMessages).forEach(u => alerts.push({
    id: `consultant-message-${u.id}-${u.unreadMessages}`,
    title: 'Candidate message',
    message: `${u.name || 'A candidate'} sent ${u.unreadMessages} unread message${u.unreadMessages === 1 ? '' : 's'}.`,
    priority: 'high',
  }));
  candidateUsers.filter(u => u.sessionActive).slice(0, 5).forEach(u => alerts.push({
    id: `consultant-active-${u.id}`,
    title: 'Active candidate session',
    message: `${u.name || 'A candidate'} is currently working in the advisor.`,
    priority: 'medium',
  }));
  candidateUsers.filter(u => !u.scores).slice(0, 5).forEach(u => alerts.push({
    id: `consultant-pending-${u.id}`,
    title: 'Candidate needs first review',
    message: `${u.name || 'A candidate'} has not completed an initial score yet.`,
    priority: 'low',
  }));
  return alerts;
}

export default function AdminPortal({ adminTab, setAdminTab, signOut, showToast, STEPS, UNDERGRAD_STEPS, adminSecret,
  aiConfig, setAiConfig, authToken, authUser }) {
  const stepsFor = (category) => (category === 'Undergraduate' ? UNDERGRAD_STEPS : STEPS);
  const [adminView, setAdminView] = useState('dashboard');
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [liveChatMessages, setLiveChatMessages] = useState([]);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [liveChatSending, setLiveChatSending] = useState(false);
  const [liveChatLoading, setLiveChatLoading] = useState(true);
  const [liveChatLoadError, setLiveChatLoadError] = useState(false);
  const [chatLanguage, setChatLanguage] = useState(() => {
    try { return localStorage.getItem('pathway_admin_chat_language') || 'English'; } catch { return 'English'; }
  });
  const setChatLanguagePersist = (lang) => {
    setChatLanguage(lang);
    try { localStorage.setItem('pathway_admin_chat_language', lang); } catch {}
  };
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [aiSections, setAiSections] = useState([]);
  const [aiDefaults, setAiDefaults] = useState({});
  const [aiDrafts, setAiDrafts] = useState({});
  const [aiConfigLoaded, setAiConfigLoaded] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [candidateSort, setCandidateSort] = useState({ column: 'candidate', direction: 'asc' });
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedData, setSelectedData] = useState(null); // { user, data }
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [userDetailId, setUserDetailId] = useState(null);
  const [userActionBusy, setUserActionBusy] = useState(null);
  const [userForm, setUserForm] = useState(null);
  const [passwordResetId, setPasswordResetId] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [ownPasswordForm, setOwnPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [ownPasswordBusy, setOwnPasswordBusy] = useState(false);
  const [kpiStatus, setKpiStatus] = useState(null);
  const [kpiBusy, setKpiBusy] = useState(false);

  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');
  const [usagePeriod, setUsagePeriod] = useState('month');
  const [usageRefreshedAt, setUsageRefreshedAt] = useState(null);
  const [usageResetBusy, setUsageResetBusy] = useState(false);
  const [usageSettings, setUsageSettings] = useState({
    usageLimitsEnabled: false,
    monthlyBudget: 100,
    dailyBudget: 10,
    maxCostPerUser: 2,
    maxCostPerSession: 0.5,
    limitAction: 'block_messages',
    systemSuspended: false,
    suspensionMessage: 'This system is temporarily unavailable. Please try again later.',
  });
  const [usageSettingsBusy, setUsageSettingsBusy] = useState(false);

  const canManageUsers = authUser?.role === 'admin' || !!adminSecret;
  const adminHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : { 'X-Admin-Secret': adminSecret };

  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    setUsersError('');
    fetch('/api/admin-users', { headers: adminHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.users) setUsers(d.users);
        else setUsersError(d.error || 'Failed to load candidates.');
      })
      .catch(() => setUsersError('Failed to load candidates.'))
      .finally(() => setUsersLoading(false));
  }, [adminSecret, authToken]);

  const candidateUsers = users.filter(u => (u.role || 'candidate') === 'candidate');
  const consultantUsers = users.filter(u => u.role === 'consultant');
  const assignableConsultants = consultantUsers.filter(u => !u.suspended);
  const sortCandidates = (column) => {
    setCandidateSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const sortedCandidateUsers = [...candidateUsers].sort((a, b) => {
    const dir = candidateSort.direction === 'asc' ? 1 : -1;
    const val = (u) => {
      if (candidateSort.column === 'score') return u.scores?.overall ?? -1;
      if (candidateSort.column === 'step') return stepsFor(u.category)[u.stepIdx] || 'Profile';
      if (candidateSort.column === 'lastLogin') return u.lastLoginAt || 0;
      return (u.name || '').toLowerCase();
    };
    const av = val(a);
    const bv = val(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const loadKpiStatus = useCallback(() => {
    if (!canManageUsers) return;
    fetch('/api/kpi-refresh', { headers: adminHeaders })
      .then(r => r.json())
      .then(d => {
        if (!d.error) setKpiStatus(d);
      })
      .catch(() => {});
  }, [adminSecret, authToken, canManageUsers]);

  useEffect(() => { loadKpiStatus(); }, [loadKpiStatus]);

  const loadUsageData = useCallback(() => {
    if (!canManageUsers) return;
    setUsageLoading(true);
    setUsageError('');
    return fetch(`/api/admin-usage?period=${encodeURIComponent(usagePeriod)}`, { headers: adminHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setUsageError(d.error);
          return;
        }
        setUsageData(d);
        setUsageRefreshedAt(Date.now());
        if (d.settings) setUsageSettings(prev => ({ ...prev, ...d.settings }));
      })
      .catch(() => setUsageError('Failed to load usage data.'))
      .finally(() => setUsageLoading(false));
  }, [adminSecret, authToken, canManageUsers, usagePeriod]);

  const resetUsageData = async () => {
    const confirmed = window.confirm('Are you sure? This will permanently delete all usage, cost, token-log, and usage-alert data. Collection will restart from now.');
    if (!confirmed) return;
    setUsageResetBusy(true);
    try {
      const res = await fetch('/api/admin-usage-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to reset usage data.');
      await loadUsageData();
      showToast('Usage and cost data reset. New collection has started.');
    } catch (error) {
      showToast(error.message || 'Failed to reset usage data.');
    } finally {
      setUsageResetBusy(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) loadUsageData();
  }, [canManageUsers, loadUsageData]);

  const saveUsageSettings = async () => {
    setUsageSettingsBusy(true);
    try {
      const res = await fetch('/api/admin-usage-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify(usageSettings),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Failed to save usage settings.');
      if (d.settings) setUsageSettings(prev => ({ ...prev, ...d.settings }));
      showToast('Usage settings saved.');
      loadUsageData();
    } catch (e) {
      showToast(e.message || 'Failed to save usage settings.');
    } finally {
      setUsageSettingsBusy(false);
    }
  };

  const openCandidate = (userId) => {
    setSelectedUserId(userId);
    setCandidateOpen(true);
    setSelectedLoading(true);
    setSummary(''); setSummaryVisible(false);
    fetch(`/api/admin-session?userId=${userId}`, { headers: adminHeaders })
      .then(r => r.json())
      .then(d => setSelectedData(d))
      .catch(() => showToast('Failed to load candidate session.'))
      .finally(() => setSelectedLoading(false));
  };

  const closeCandidate = () => {
    setCandidateOpen(false);
    setSelectedUserId(null);
    setSelectedData(null);
    setAdminView('candidates');
    fetchUsers();
  };

  const fetchLiveChatMessages = useCallback(() => {
    if (!selectedUserId) return;
    fetch(`/api/chat/messages?candidateId=${selectedUserId}`, { headers: adminHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.messages) { setLiveChatMessages(d.messages); setLiveChatLoadError(false); }
        else setLiveChatLoadError(true);
      })
      .catch(() => setLiveChatLoadError(true))
      .finally(() => setLiveChatLoading(false));
  }, [selectedUserId, adminSecret, authToken]);

  useEffect(() => {
    if (!selectedUserId || adminView !== 'liveChat') { if (!selectedUserId) setLiveChatMessages([]); return; }
    setLiveChatLoading(true);
    fetchLiveChatMessages();
    fetch('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ candidateId: selectedUserId }),
    }).then(fetchUsers).catch(() => {});
  }, [selectedUserId, adminView]);

  useEffect(() => {
    if (!selectedUserId || adminView !== 'liveChat') return;
    const interval = setInterval(fetchLiveChatMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedUserId, adminView, fetchLiveChatMessages]);

  const sendLiveChatMessage = async () => {
    const text = liveChatInput.trim();
    if (!text || !selectedUserId || liveChatSending) return;
    setLiveChatSending(true);
    setLiveChatInput('');
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ candidateId: selectedUserId, senderId: authUser?.id, senderRole: 'consultant', text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || chatT(chatLanguage, 'failedToSendMessage'));
      if (d.deliveryWarning) showToast(`Saved in Live Chat, but ${d.deliveryChannel || 'external'} delivery failed: ${d.deliveryWarning}`);
      fetchLiveChatMessages();
    } catch (e) {
      showToast(e.message || chatT(chatLanguage, 'failedToSendMessage'));
    } finally {
      setLiveChatSending(false);
    }
  };

  const formatDateTime = (ts) => ts ? new Date(ts).toLocaleString() : '—';

  const formatDuration = (ms) => {
    if (ms == null) return '—';
    const mins = Math.round(ms / 60000);
    if (mins < 1) return '<1 min';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  const performUserAction = async (userId, action, payload = {}) => {
    setUserActionBusy(`${userId}:${action}`);
    try {
      const res = await fetch('/api/admin-user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ userId, action, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Action failed.');
      showToast(
        action === 'delete' ? 'User deleted.' :
        action === 'suspend' ? 'User suspended.' :
        action === 'unsuspend' ? 'User reinstated.' :
        action === 'resetPassword' ? 'Password reset.' :
        action === 'create' ? 'User created.' : 'User updated.'
      );
      if (action === 'delete' && userDetailId === userId) setUserDetailId(null);
      if (action === 'delete' && selectedUserId === userId) {
        setCandidateOpen(false);
        setSelectedUserId(null);
        setSelectedData(null);
        setLiveChatMessages([]);
        setAdminView('candidates');
      }
      setUserForm(null);
      setPasswordResetId(null);
      setPasswordDraft('');
      fetchUsers();
    } catch (e) {
      showToast(e.message || 'Action failed.');
    } finally {
      setUserActionBusy(null);
    }
  };

  const confirmUserAction = (userId, action, confirmMsg) => {
    if (window.confirm(confirmMsg)) performUserAction(userId, action);
  };

  const changeOwnPassword = async () => {
    if (!authToken) {
      showToast('Sign in with your admin or consultant account to change its password.');
      return;
    }
    if (ownPasswordForm.newPassword !== ownPasswordForm.confirmPassword) {
      showToast('New passwords do not match.');
      return;
    }
    setOwnPasswordBusy(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          currentPassword: ownPasswordForm.currentPassword,
          newPassword: ownPasswordForm.newPassword,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not change password.');
      setOwnPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password updated.');
    } catch (e) {
      showToast(e.message || 'Could not change password.');
    } finally {
      setOwnPasswordBusy(false);
    }
  };

  const refreshKpiDatabase = async () => {
    setKpiBusy(true);
    try {
      const res = await fetch('/api/kpi-refresh', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to refresh KPI database.');
        return;
      }
      setKpiStatus(data);
      showToast('KPI database refreshed.');
    } catch {
      showToast('Failed to refresh KPI database.');
    } finally {
      setKpiBusy(false);
    }
  };

  const userDetail = users.find(u => u.id === userDetailId) || null;

  const patchSelected = useCallback((patch) => {
    if (!selectedUserId) return;
    setSelectedData(prev => prev ? { ...prev, data: { ...prev.data, ...patch } } : prev);
    fetch('/api/admin-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ userId: selectedUserId, patch }),
    }).catch(() => showToast('Failed to save change.'));
  }, [selectedUserId, adminSecret, showToast]);

  // Derived view of the currently selected candidate's session
  const selUser = selectedData?.user || null;
  const sd = selectedData?.data || {};
  const chat = sd.chat || [];
  const scores = sd.scores || null;
  const profile = sd.profile || null;
  const programs = normalizeProgramList(sd.programs) || null;
  const chosenSchools = sd.chosenSchools || null;
  const strengths = sd.strengths || null;
  const weaknesses = sd.weaknesses || null;
  const stepIdx = sd.stepIdx || 0;
  const narrative = sd.narrative || null;
  const cvText = sd.cvText || '';
  const cvFile = sd.cvFile || null;
  const essayText = sd.essayText || '';
  const essays = sd.essays || {};
  const repositoryDocuments = (sd.documents || []).filter(doc => doc.status !== 'Archived');
  const override = sd.override ?? scores?.overall ?? 0;

  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(data => {
      setAiSections(data.sections || []);
      setAiDefaults(data.defaults || {});
      setAiConfigLoaded(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!aiConfigLoaded) return;
    const initial = {};
    for (const s of aiSections) {
      initial[s.key] = (aiConfig && aiConfig[s.key]) || aiDefaults[s.key] || '';
    }
    setAiDrafts(initial);
  }, [aiConfigLoaded, aiSections, aiDefaults]);

  const saveAiSection = (key) => {
    const next = { ...(aiConfig || {}) };
    const draftVal = (aiDrafts[key] || '').trim();
    if (draftVal && draftVal !== (aiDefaults[key] || '').trim()) {
      next[key] = draftVal;
    } else {
      delete next[key];
    }
    setAiConfig(next);
    showToast('AI configuration saved — applies to the candidate\'s next message.');
  };

  const resetAiSection = (key) => {
    setAiDrafts(prev => ({ ...prev, [key]: aiDefaults[key] || '' }));
    const next = { ...(aiConfig || {}) };
    delete next[key];
    setAiConfig(next);
    showToast('Reset to default.');
  };

  const sessionActive = chat && chat.length > 1;
  const stepLabel = stepsFor(profile?.category)[stepIdx] || 'Profile';
  const candidateName = selUser?.name || profile?.name || 'Candidate';
  const candidateSub = [selUser?.residency, profile?.degree, profile?.industry].filter(Boolean).join(' · ') || 'Session in progress';
  const initials = candidateName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const chatLogEndRef = useRef(null);
  useEffect(() => {
    if (adminView === 'session') chatLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, adminView, selectedUserId]);

  const handleOverride = (d) => {
    const next = Math.max(0, Math.min(100, (override || 0) + d));
    patchSelected({ override: next, scores: scores ? { ...scores, overall: next } : scores });
  };

  const sendConsultantNote = async () => {
    const text = msgInput.trim();
    if (!text || !selectedUserId || liveChatSending) return;
    setLiveChatSending(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ candidateId: selectedUserId, text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send note to candidate.');
      setMsgInput('');
      fetchLiveChatMessages();
      fetchUsers();
      showToast(data.deliveryWarning
        ? `Saved in Live Chat, but ${data.deliveryChannel || 'external'} delivery failed: ${data.deliveryWarning}`
        : 'Note delivered to the candidate in Live Chat.');
    } catch (error) {
      showToast(error.message || 'Could not send note to candidate.');
    } finally {
      setLiveChatSending(false);
    }
  };

  const downloadOriginalFile = async (file) => {
    if (!selectedUserId || !file) return;
    try {
      const res = await fetch(`/api/download-file?userId=${encodeURIComponent(selectedUserId)}`, {
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      saveBlob(blob, file.name || 'candidate-cv');
    } catch {
      showToast('Could not download the original file.');
    }
  };

  const savedEssaySchools = Object.keys(essays).filter((school) => essays[school]?.text);
  const documents = repositoryDocuments.length ? repositoryDocuments.map(doc => ({
    label: doc.name,
    text: doc.text || '',
    baseName: doc.name || 'candidate_document',
    file: doc.file,
    meta: [doc.type, doc.source, doc.status, doc.linkedSchool].filter(Boolean).join(' · '),
  })) : [
    cvText && { label: 'CV / Resume', text: cvText, baseName: 'candidate_cv', file: cvFile },
    ...savedEssaySchools.map((school) => ({
      label: `Essay — ${school}`,
      text: essays[school].text,
      baseName: `candidate_essay_${school.replace(/[^a-z0-9]+/gi, '_')}`,
    })),
    // The in-progress draft only shows up here if it hasn't been saved against a school yet.
    essayText && !savedEssaySchools.length && { label: 'Essay Draft (unsaved)', text: essayText, baseName: 'candidate_essay_draft' },
  ].filter(Boolean);

  const generateSummary = async () => {
    setSummarizing(true);
    setSummaryVisible(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ chat, conversationId: sd.sessionId, candidateId: selectedUserId }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
      else showToast('Could not generate summary.');
    } catch { showToast('Summary failed.'); }
    finally { setSummarizing(false); }
  };

  const tierCounts = programs ? {
    stretch: programs.filter(p => p.tier === 'stretch').length,
    possible: programs.filter(p => p.tier === 'possible').length,
    safe: programs.filter(p => p.tier === 'safe').length,
  } : null;

  // Primary source: the AI-emitted CHOSEN_SCHOOLS block (structured, reliable).
  // Fallback for older sessions recorded before that block existed: infer from the
  // candidate's reply right after the AI asks "which schools excite you most".
  const norm = (s) => (s || '').trim().toLowerCase();
  const chosenPrograms = (() => {
    if (chosenSchools && chosenSchools.length) {
      // Map every chosen name to its program match — never drop a name the candidate
      // chose just because it doesn't exactly match the PROGRAMS list.
      return chosenSchools.map(name => {
        const match = (programs || []).find(p => norm(p.name) === norm(name));
        return match || { name, tier: null, fit: null };
      });
    }
    if (!programs || !chat || !chat.length) return [];
    const portfolioMsgIdx = chat.findIndex(m =>
      m.role === 'ai' && (
        m.text.includes('excite you most') ||
        m.text.includes('3–5 schools') ||
        m.text.includes('3-5 schools') ||
        (m.text.includes('portfolio') && m.text.includes('excite'))
      )
    );
    if (portfolioMsgIdx < 0) return [];
    const userMsg = chat.slice(portfolioMsgIdx + 1).find(m => m.role === 'user');
    if (!userMsg) return [];
    const t = userMsg.text.toLowerCase();
    return programs.filter(p => {
      const nameLower = p.name.toLowerCase();
      if (t.includes(nameLower)) return true;
      // Also match on first word e.g. "Harvard" → "Harvard Business School", "Booth" → "Booth"
      const firstWord = nameLower.split(' ')[0];
      return firstWord.length >= 3 && t.includes(firstWord);
    });
  })();

  // Chosen schools first (in full, regardless of fit), then the rest of the portfolio.
  const sortedPrograms = programs
    ? [...chosenPrograms, ...programs.filter(p => !chosenPrograms.some(c => c.name === p.name))]
    : [];
  const portalRole = canManageUsers ? 'admin' : 'consultant';
  const portalAlerts = canManageUsers
    ? buildAdminAlerts({ candidateUsers, consultantUsers, usageData, usageSettings })
    : buildConsultantAlerts({ candidateUsers });
  const topIconButtonStyle = {
    width: 42,
    height: 42,
    borderRadius: 13,
    border: '1.5px solid #f1eadd',
    background: '#faf7f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#6b7392',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1eadd', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 258, flexShrink: 0, background: '#faf7f2', borderRight: '1px solid #f1eadd', display: 'flex', flexDirection: 'column', padding: '26px 18px', minHeight: '100vh' }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ fontSize: 23, fontWeight: 800, color: '#141b34' }}>Pathway</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#5b46e0', marginTop: 2 }}>ADMIN PORTAL</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 26 }}>
          <button onClick={() => setAdminView('dashboard')} style={sideStyle(adminView === 'dashboard')}>
            <NavIcon><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></NavIcon>
            Dashboard
          </button>
          <button onClick={() => setAdminView('candidates')} style={sideStyle(adminView === 'candidates')}>
            <NavIcon><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></NavIcon>
            Candidates
          </button>
          {canManageUsers && (
            <button onClick={() => setAdminView('users')} style={sideStyle(adminView === 'users')}>
              <NavIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></NavIcon>
              Consultants
            </button>
          )}
          {canManageUsers && (
            <button onClick={() => setAdminView('marketing')} style={sideStyle(adminView === 'marketing')}>
              <NavIcon><path d="M3 11l18-7-7 18-3-8-8-3Z" /><path d="M11 14 21 4" /></NavIcon>
              Marketing
            </button>
          )}
          {canManageUsers && (
            <button onClick={() => setAdminView('engagement')} style={sideStyle(adminView === 'engagement')}>
              <NavIcon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></NavIcon>
              Engagement
            </button>
          )}
          {(
            <button onClick={() => setAdminView('session')} style={sideStyle(adminView === 'session')}>
              <NavIcon><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></NavIcon>
              Logs
            </button>
          )}
          {selectedUserId && (
            <button onClick={() => setAdminView('liveChat')} style={sideStyle(adminView === 'liveChat')}>
              <NavIcon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></NavIcon>
              Live Chat
            </button>
          )}
          {canManageUsers && (
            <button onClick={() => setAdminView('agents')} style={sideStyle(adminView === 'agents')}>
              <NavIcon><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></NavIcon>
              Agents
            </button>
          )}
          {canManageUsers && (
            <button onClick={() => setAdminView('usageCost')} style={sideStyle(adminView === 'usageCost')}>
              <NavIcon><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></NavIcon>
              Usage & Cost
            </button>
          )}
          <button onClick={() => setAdminView('settings')} style={sideStyle(adminView === 'settings')}>
            <NavIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.33-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11v.09a2 2 0 0 1 0 3.82Z" /></NavIcon>
            Settings
          </button>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 1, background: '#f1eadd', marginBottom: 14 }} />
          {usageData && (
            <div style={{ padding: 10, background: '#f6f1e8', borderRadius: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: usageSettings.systemSuspended ? '#e0457a' : '#3fdca9', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: usageSettings.systemSuspended ? '#e0457a' : '#19c08a' }}>
                  {usageSettings.systemSuspended ? 'System Suspended' : 'System Running'}
                </span>
              </div>
              <div style={{ height: 5, background: '#f1eadd', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{
                  width: `${Math.min(100, usageData.budgetPercent || 0)}%`, height: '100%',
                  background: (usageData.budgetPercent || 0) >= 100 ? '#e0457a' : (usageData.budgetPercent || 0) >= 80 ? '#eaa129' : '#3fdca9',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#9098b5' }}>
                ${Number(usageData.monthlyCost || 0).toFixed(2)} / ${Number(usageData.monthlyBudget || 0).toFixed(2)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: '#f6f1e8', borderRadius: 14 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#474d80,#6d5cc2)', color: '#ffd76a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>✦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>Admin Panel</div>
              <div style={{ fontSize: 11, color: '#9098b5', letterSpacing: '.5px' }}>IVY ADMISSIONS</div>
            </div>
          </div>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#6b7392', fontWeight: 600, padding: 8, width: '100%', marginTop: 8 }}>
            <NavIcon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></NavIcon>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '26px 36px', borderBottom: '1px solid #f1eadd', background: '#faf7f2' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#141b34', margin: 0 }}>
            {adminView === 'candidates' && (candidateOpen ? candidateName : 'Candidates')}
            {adminView === 'users' && 'Consultants'}
            {adminView === 'session' && 'Live Session'}
            {adminView === 'liveChat' && chatT(chatLanguage, 'liveChat')}
            {adminView === 'dashboard' && 'Dashboard'}
            {adminView === 'marketing' && 'Marketing'}
            {adminView === 'engagement' && 'Engagement'}
            {adminView === 'agents' && 'Agents'}
            {adminView === 'usageCost' && 'Usage & Cost'}
            {adminView === 'settings' && 'Settings'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => showToast('Help center: use Candidates for profiles and Live Chat for messages. Admins can monitor costs in Usage & Cost.')} title="Help" style={topIconButtonStyle}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 2-2.4 3.5M12 17h.01" /></svg>
            </button>
            <NotificationBell
              alerts={portalAlerts}
              storageKey={`pathway_${portalRole}_alerts_${authUser?.id || authUser?.email || 'local'}`}
              title={portalRole === 'admin' ? 'Admin alerts' : 'Consultant alerts'}
            />
            {adminView === 'liveChat' && (
              <select
                value={chatLanguage}
                onChange={e => setChatLanguagePersist(e.target.value)}
                aria-label="Chat language"
                style={{ border: '1.5px solid #f1eadd', borderRadius: 12, padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#3c4564', background: '#f6f1e8', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
              >
                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            )}
            {sessionActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eafff6', border: '1px solid #aaeed1', borderRadius: 10, padding: '8px 16px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fdca9' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#19c08a' }}>Session Active</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '30px 36px' }}>

          {/* ── DASHBOARD ── */}
          {adminView === 'dashboard' && (
            <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ fontSize: 14, color: '#6b7392', marginTop: -8, marginBottom: 20 }}>
                Overview of candidate progress, acquisition and consultant momentum.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'TOTAL CANDIDATES', value: candidateUsers.length, color: '#141b34', detail: `${consultantUsers.length} consultants available` },
                  { label: 'ACTIVE CANDIDATES', value: candidateUsers.filter(u => u.sessionActive).length, color: '#5b46e0', detail: 'currently in advisor flow' },
                  { label: 'PENDING TASKS', value: candidateUsers.filter(u => !u.scores).length, color: '#c77f0a', detail: 'need first profile review' },
                  { label: 'UNREAD MESSAGES', value: candidateUsers.reduce((sum, u) => sum + (u.unreadMessages || 0), 0), color: '#e0457a', detail: 'waiting for response' },
                ].map((kpi) => (
                  <AdminMetricCard key={kpi.label} {...kpi} value={usersLoading ? '...' : kpi.value} />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(280px,1fr)', gap: 18 }}>
                <div style={{ ...cardShell, padding: 24 }}>
                  <SectionTitle
                    eyebrow="ACQUISITION"
                    title="Marketing Snapshot"
                    action={<button onClick={() => setAdminView('marketing')} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 12.5 }}>Open Marketing</button>}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    {[
                      ['Organic traffic', '18.4K'],
                      ['Paid traffic', '4.9K'],
                      ['Campaigns running', '4'],
                      ['Ad spend', '$26.3K'],
                      ['Leads generated', '642'],
                      ['Cost per lead', '$41'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 14, padding: '12px 13px' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#9098b5', letterSpacing: '.4px', marginBottom: 6 }}>{label.toUpperCase()}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: '#141b34' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...cardShell, padding: 24 }}>
                  <SectionTitle
                    eyebrow="CONSULTANT OPERATIONS"
                    title="Engagement Snapshot"
                    action={<button onClick={() => setAdminView('engagement')} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 12.5 }}>Open Engagement</button>}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    {[
                      ['Consultant actions today', 126],
                      ['Meetings today', 18],
                      ['Notes written', 43],
                      ['Need follow-up', 21],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 14, padding: '13px 14px' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#9098b5', letterSpacing: '.4px', marginBottom: 6 }}>{String(label).toUpperCase()}</div>
                        <div style={{ fontSize: 23, fontWeight: 800, color: label === 'Need follow-up' ? '#e0457a' : '#141b34' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 18 }}>
                <div style={{ ...cardShell, padding: 24 }}>
                  <SectionTitle eyebrow="APPLICATIONS" title="Application Overview" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#9098b5', letterSpacing: '.5px', marginBottom: 12 }}>PIPELINE STAGE</div>
                      {[
                        ['Profile', candidateUsers.filter(u => (stepsFor(u.category)[u.stepIdx] || 'Profile') === 'Profile').length || 8, '#94b3fb'],
                        ['Analysis', candidateUsers.filter(u => u.scores).length || 12, '#b899fb'],
                        ['School List', candidateUsers.filter(u => u.programs?.length).length || 9, '#eaa129'],
                        ['Applications', candidateUsers.filter(u => (u.stepIdx || 0) >= 5).length || 5, '#3fdca9'],
                      ].map(([label, value, color]) => {
                        const max = Math.max(1, candidateUsers.length || 18);
                        return (
                          <div key={label} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#33405e', marginBottom: 6 }}>
                              <span style={{ fontWeight: 700 }}>{label}</span><span>{value}</span>
                            </div>
                            <div style={{ height: 8, background: '#f1eadd', borderRadius: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#9098b5', letterSpacing: '.5px', marginBottom: 12 }}>SCORE HEALTH</div>
                      {[
                        ['Strong', candidateUsers.filter(u => (u.scores?.overall || 0) >= 75).length || 7, '#3fdca9'],
                        ['Workable', candidateUsers.filter(u => (u.scores?.overall || 0) >= 50 && (u.scores?.overall || 0) < 75).length || 11, '#eaa129'],
                        ['Needs Review', candidateUsers.filter(u => !u.scores || (u.scores?.overall || 0) < 50).length || 6, '#e384a5'],
                      ].map(([label, value, color]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 13, padding: '10px 12px', marginBottom: 9 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#33405e' }}>{label}</span>
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <ActivityFeed items={activityFeed} />
              </div>
            </div>
          )}

          {/* ── MARKETING ── */}
          {adminView === 'marketing' && canManageUsers && (
            <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14, color: '#6b7392', marginTop: -8 }}>
                  Marketing command center with mock acquisition, SEO and paid media signals.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => showToast('Campaign creation placeholder.')} style={{ ...btnPrimary, padding: '9px 16px', fontSize: 13 }}>Add Campaign</button>
                  <button onClick={() => showToast('Marketing export placeholder.')} style={{ ...btnGhost, padding: '9px 16px', fontSize: 13 }}>Export</button>
                  <button onClick={() => showToast('Report creation placeholder.')} style={{ ...btnGhost, padding: '9px 16px', fontSize: 13 }}>Create Report</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                {marketingKpis.map(kpi => <AdminMetricCard key={kpi.label} {...kpi} />)}
              </div>

              <div>
                <SectionTitle eyebrow="PAID ACQUISITION" title="Campaign Performance" />
                <DataTable
                  columns={[
                    { key: 'campaign', label: 'CAMPAIGN', width: '1.5fr', strong: true },
                    { key: 'platform', label: 'PLATFORM' },
                    { key: 'budget', label: 'BUDGET' },
                    { key: 'spend', label: 'SPEND' },
                    { key: 'clicks', label: 'CLICKS' },
                    { key: 'leads', label: 'LEADS' },
                    { key: 'cpa', label: 'CPA' },
                    { key: 'status', label: 'STATUS', render: (value) => <StatusPill tone={value === 'Scaling' ? 'good' : value === 'Testing' ? 'warn' : 'neutral'}>{value}</StatusPill> },
                  ]}
                  rows={marketingCampaigns}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 18 }}>
                <div>
                  <SectionTitle eyebrow="ORGANIC GROWTH" title="SEO Snapshot" />
                  <DataTable
                    columns={[
                      { key: 'keyword', label: 'TOP KEYWORDS', width: '1.5fr', strong: true },
                      { key: 'rank', label: 'RANK' },
                      { key: 'traffic', label: 'TRAFFIC' },
                      { key: 'page', label: 'LANDING PAGE', width: '1.2fr' },
                    ]}
                    rows={seoKeywords}
                  />
                </div>

                <div style={{ ...cardShell, padding: 24 }}>
                  <SectionTitle eyebrow="PAID ADS" title="Budget Progress" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {paidChannels.map(channel => (
                      <div key={channel.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#141b34' }}>{channel.name}</div>
                          <div style={{ fontSize: 12, color: '#9098b5' }}>${channel.budget.toLocaleString()} budget</div>
                        </div>
                        <BudgetBar value={channel.spend} max={channel.budget} color={channel.color} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ENGAGEMENT ── */}
          {adminView === 'engagement' && canManageUsers && (
            <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ fontSize: 14, color: '#6b7392', marginTop: -8 }}>
                Consultant productivity, meetings and candidate follow-up health.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                {engagementKpis.map(kpi => <AdminMetricCard key={kpi.label} {...kpi} />)}
              </div>

              <div>
                <SectionTitle eyebrow="CONSULTANT PRODUCTIVITY" title="Leaderboard" />
                <DataTable
                  columns={[
                    { key: 'consultant', label: 'CONSULTANT', width: '1.4fr', strong: true },
                    { key: 'candidates', label: 'CANDIDATES' },
                    { key: 'meetings', label: 'MEETINGS' },
                    { key: 'actions', label: 'ACTIONS' },
                    { key: 'notes', label: 'NOTES' },
                    { key: 'response', label: 'AVG RESPONSE' },
                  ]}
                  rows={consultantLeaderboard}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <SectionTitle eyebrow="CALENDAR" title="Upcoming Meetings" />
                  <DataTable
                    columns={[
                      { key: 'candidate', label: 'CANDIDATE', strong: true },
                      { key: 'consultant', label: 'CONSULTANT', width: '1.2fr' },
                      { key: 'date', label: 'DATE', width: '1.2fr' },
                      { key: 'status', label: 'STATUS', render: (value) => <StatusPill tone={value === 'Prep Needed' ? 'warn' : 'good'}>{value}</StatusPill> },
                    ]}
                    rows={upcomingMeetings}
                  />
                </div>

                <div>
                  <SectionTitle eyebrow="FOLLOW-UP QUEUE" title="Candidates Needing Follow-Up" />
                  <DataTable
                    columns={[
                      { key: 'candidate', label: 'CANDIDATE', strong: true },
                      { key: 'last', label: 'LAST ACTIVITY', width: '1.4fr' },
                      { key: 'inactive', label: 'INACTIVE' },
                      { key: 'priority', label: 'PRIORITY', render: (value) => <StatusPill tone={value === 'High' ? 'risk' : 'warn'}>{value}</StatusPill> },
                    ]}
                    rows={followUpCandidates}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 18 }}>
                <ActivityFeed items={[
                  { actor: 'Jessica', action: 'completed meeting', target: 'Adam G.', time: '9 min ago' },
                  { actor: 'David', action: 'reviewed essay', target: 'Galit S.', time: '28 min ago' },
                  { actor: 'Sarah', action: 'approved CV', target: 'Noa L.', time: '54 min ago' },
                  { actor: 'Michael', action: 'booked interview', target: 'Daniel K.', time: '1h ago' },
                ]} />
                <div style={{ ...cardShell, padding: 24 }}>
                  <SectionTitle eyebrow="WORKFLOW" title="Engagement Rhythm" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      ['Meeting completed', 18, '#3fdca9'],
                      ['Essay reviewed', 27, '#5b46e0'],
                      ['CV approved', 11, '#eaa129'],
                      ['Interview booked', 9, '#e384a5'],
                    ].map(([label, value, color]) => (
                      <div key={label} style={{ background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 16, padding: 14 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, marginBottom: 12 }} />
                        <div style={{ fontSize: 25, fontWeight: 800, color: '#141b34', lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: 11.5, color: '#6b7392', marginTop: 7, lineHeight: 1.35, fontWeight: 700 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CANDIDATES LIST ── */}
          {adminView === 'candidates' && !candidateOpen && (
            <div>
              <div style={{ display: 'flex', justifyContent: canManageUsers ? 'space-between' : 'flex-end', marginBottom: 12 }}>
                {canManageUsers && (
                  <button onClick={() => setUserForm({ mode: 'create', role: 'candidate', name: '', email: '', username: '', residency: '', age: '', consultantId: '', password: '' })} style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12.5 }}>
                    Create Candidate
                  </button>
                )}
                <button onClick={fetchUsers} disabled={usersLoading} style={{ ...btnGhost, padding: '7px 14px', fontSize: 12.5, cursor: usersLoading ? 'not-allowed' : 'pointer' }}>
                  {usersLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {usersError ? (
                <div style={{ background: '#fff1f6', border: '1px solid #fbd3e2', borderRadius: 16, padding: 24, textAlign: 'center', color: '#e0457a', fontSize: 14, fontWeight: 600 }}>
                  {usersError}
                </div>
              ) : !candidateUsers.length ? (
                <div style={{ background: '#faf7f2', border: '1px dashed #e7dcc7', borderRadius: 20, padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#6b7392', marginBottom: 8 }}>{usersLoading ? 'Loading candidates…' : 'No registered candidates yet.'}</div>
                  <div style={{ fontSize: 13, color: '#aab2cc' }}>Once candidates are created and start the advisor, they'll appear here.</div>
                </div>
              ) : (
                <div style={{ ...cardShell, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: canManageUsers ? 'minmax(220px,1.2fr) 80px 105px minmax(130px,.8fr) minmax(150px,1fr) 430px' : 'minmax(220px,1.2fr) 80px 105px minmax(130px,.8fr) minmax(150px,1fr) 40px', gap: 0, padding: '10px 20px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                    <SortHeader label="CANDIDATE" column="candidate" sort={candidateSort} onSort={sortCandidates} />
                    <SortHeader label="SCORE" column="score" sort={candidateSort} onSort={sortCandidates} />
                    <SortHeader label="STEP" column="step" sort={candidateSort} onSort={sortCandidates} />
                    <SortHeader label="LAST LOGIN" column="lastLogin" sort={candidateSort} onSort={sortCandidates} />
                    <span>TOP INSIGHT</span><span>{canManageUsers ? 'ACTIONS' : ''}</span>
                  </div>
                  {sortedCandidateUsers.map(u => {
                    const uInitials = (u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const busyDelete = userActionBusy === `${u.id}:delete`;
                    return (
                      <div key={u.id} style={{ display: 'grid', gridTemplateColumns: canManageUsers ? 'minmax(220px,1.2fr) 80px 105px minmax(130px,.8fr) minmax(150px,1fr) 430px' : 'minmax(220px,1.2fr) 80px 105px minmax(130px,.8fr) minmax(150px,1fr) 40px', gap: 0, padding: '18px 20px', width: '100%', background: 'none', fontFamily: 'inherit', textAlign: 'left', alignItems: 'center', borderBottom: '1px solid #f6f1e8' }}>
                        <button onClick={() => openCandidate(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(140deg,#94b3fb,#b899fb)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{uInitials}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34', display: 'flex', alignItems: 'center', gap: 7 }}>
                              {u.name}
                              {!!u.unreadMessages && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#e0457a', color: '#fff', fontSize: 10.5, fontWeight: 800 }}>
                                  {u.unreadMessages}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#9098b5' }}>{[u.residency, u.email].filter(Boolean).join(' · ')}</div>
                          </div>
                        </div>
                        </button>
                        <div>
                          {u.scores ? (
                            <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(u.scores.overall) }}>{u.scores.overall}</span>
                          ) : <span style={{ fontSize: 13, color: '#aab2cc' }}>—</span>}
                        </div>
                        <div>
                          <span style={{ background: '#f1eadd', color: '#5b46e0', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>{stepsFor(u.category)[u.stepIdx] || 'Profile'}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#33405e', paddingRight: 12 }}>
                          {formatDateTime(u.lastLoginAt)}
                        </div>
                        <div style={{ fontSize: 13, color: '#33405e', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.topInsight || (u.degree ? `${u.degree} candidate` : (u.sessionActive ? 'Session in progress' : 'Not started'))}
                        </div>
                        <div>
                          {canManageUsers ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <select
                                value={u.consultantId || ''}
                                onChange={(e) => performUserAction(u.id, 'assign', { patch: { consultantId: e.target.value } })}
                                style={{ minWidth: 96, flex: 1, border: '1px solid #f1eadd', borderRadius: 9, padding: '7px 8px', background: '#faf7f2', color: '#33405e', fontFamily: 'inherit', fontSize: 12 }}
                              >
                                <option value="">Unassigned</option>
                                {assignableConsultants.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                              </select>
                              <select
                                value={u.plan || 'free'}
                                onChange={(e) => performUserAction(u.id, 'assign', { patch: { plan: e.target.value } })}
                                style={{ minWidth: 88, border: '1px solid #f1eadd', borderRadius: 9, padding: '7px 8px', background: '#faf7f2', color: '#33405e', fontFamily: 'inherit', fontSize: 12 }}
                              >
                                <option value="free">Free</option>
                                <option value="ai">AI</option>
                                <option value="ai_strategy">AI + Strategy</option>
                              </select>
                              <button onClick={() => setUserForm({ mode: 'edit', ...u, password: '' })} style={{ ...btnGhost, padding: '7px 8px', fontSize: 12 }}>Edit</button>
                              <button onClick={() => { setPasswordResetId(u.id); setPasswordDraft(''); }} style={{ ...btnGhost, padding: '7px 8px', fontSize: 12 }}>Reset</button>
                              <button
                                onClick={() => confirmUserAction(u.id, 'delete', `Permanently delete ${u.name} (${u.email}) and all candidate data? This cannot be undone.`)}
                                disabled={busyDelete}
                                style={{ ...btnDanger, padding: '7px 8px', fontSize: 12, cursor: busyDelete ? 'not-allowed' : 'pointer', opacity: busyDelete ? 0.5 : 1 }}>
                                Delete
                              </button>
                            </div>
                          ) : (
                            <div style={{ color: '#5b46e0', fontSize: 18, fontWeight: 700 }}>→</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CANDIDATE DETAIL ── */}
          {adminView === 'candidates' && candidateOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
              <div>
                <button onClick={closeCandidate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#5b46e0', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: '0 0 20px', marginLeft: -4 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                  All Candidates
                </button>

                {selectedLoading && (
                  <div style={{ background: '#faf7f2', border: '1px dashed #e7dcc7', borderRadius: 20, padding: 32, textAlign: 'center', color: '#9098b5', fontSize: 14, marginBottom: 20 }}>
                    Loading candidate session…
                  </div>
                )}

                {/* Candidate card */}
                <div style={{ ...cardShell, padding: 24, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(140deg,#fbd2a2,#fcbfcf)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{initials}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#141b34' }}>{candidateName}</div>
                      <div style={{ fontSize: 13, color: '#6b7392', marginTop: 2 }}>{candidateSub}</div>
                      {profile && (
                        <div style={{ fontSize: 12, color: '#9098b5', marginTop: 4 }}>
                          {[profile.gpa && `GPA ${profile.gpa}`, profile.gmat && `Test/portfolio ${profile.gmat}`, profile.experience].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {scores && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 32, fontWeight: 800, color: '#141b34', lineHeight: 1 }}>{scores.overall}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginTop: 2 }}>OVERALL</div>
                        </div>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 4 }}>PIPELINE STEP</div>
                        <span style={{ background: '#f1eadd', color: '#5b46e0', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 9 }}>{stepLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key insights */}
                {strengths && strengths.length > 0 && (
                  <div style={{ ...cardShell, padding: 22, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 14 }}>KEY INSIGHTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {strengths.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#eaa129', marginTop: 6, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, color: '#33405e', lineHeight: 1.55 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk profile */}
                {weaknesses && weaknesses.length > 0 && (
                  <div style={{ ...cardShell, border: '1px solid #fbd3e2', padding: 22, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ color: '#e0457a', fontSize: 15 }}>⚠</span>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#e0457a' }}>RISK PROFILE</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {weaknesses.map((w, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e384a5', marginTop: 6, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, color: '#33405e', lineHeight: 1.55 }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* School portfolio */}
                {programs && programs.length > 0 && (
                  <div style={{ ...cardShell, padding: 22 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 14 }}>SCHOOL PORTFOLIO — {programs.length} schools</div>

                    {/* Tier counts */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                      {[{ key: 'safe', label: 'STRONG FIT' },
                        { key: 'possible', label: 'WORKABLE FIT' },
                        { key: 'stretch', label: 'LOW FIT' }].map(t => {
                        const n = programs.filter(p => p.tier === t.key).length;
                        if (!n) return null;
                        return (
                          <div key={t.key} style={{ flex: 1, background: tierBg(t.key), borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ fontSize: 26, fontWeight: 800, color: tierColor(t.key) }}>{n}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: tierColor(t.key), letterSpacing: '.5px', marginTop: 2 }}>{t.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Candidate's chosen schools */}
                    {chosenPrograms.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#c77f0a', marginBottom: 8 }}>★ CANDIDATE'S CHOSEN SCHOOLS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {chosenPrograms.map(p => (
                            <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tierBg(p.tier), border: `1.5px solid ${tierBorder(p.tier)}`, borderRadius: 12, padding: '9px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#c77f0a', fontSize: 13 }}>★</span>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34' }}>{p.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {p.tier && <span style={{ fontSize: 10, fontWeight: 700, color: tierColor(p.tier), letterSpacing: '.5px', textTransform: 'uppercase' }}>{tierLabel(p.tier)}</span>}
                                <span style={{ fontSize: 13, fontWeight: 700, color: tierColor(p.tier) }}>{p.fit != null ? `${p.fit}%` : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ height: 1, background: '#f1eadd', margin: '14px 0 10px' }} />
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 8 }}>FULL PORTFOLIO</div>
                      </div>
                    )}

                    {/* All schools list — chosen schools first, then the rest */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sortedPrograms.slice(0, Math.max(6, chosenPrograms.length)).map(p => {
                        const isChosen = chosenPrograms.some(c => c.name === p.name);
                        return (
                          <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f6f1e8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: tierColor(p.tier) }} />
                              <span style={{ fontSize: 13.5, fontWeight: isChosen ? 700 : 600, color: '#141b34' }}>{p.name}</span>
                              {isChosen && <span style={{ fontSize: 10, background: '#fff8ea', color: '#c77f0a', fontWeight: 700, padding: '2px 6px', borderRadius: 5, letterSpacing: '.3px' }}>CHOSEN</span>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#c77f0a' }}>{p.fit != null ? `${p.fit}%` : '—'}</span>
                          </div>
                        );
                      })}
                      {programs.length > Math.max(6, chosenPrograms.length) && (
                        <div style={{ fontSize: 12, color: '#9098b5', marginTop: 4 }}>+{programs.length - Math.max(6, chosenPrograms.length)} more schools in full portfolio</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Session summary */}
              <div style={{ ...cardShell, padding: 22, marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: summaryVisible && summary ? 14 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>SESSION SUMMARY</div>
                  <button onClick={generateSummary} disabled={summarizing || !sessionActive}
                    style={{ ...btnPrimary, padding: '9px 18px', fontSize: 13, cursor: summarizing || !sessionActive ? 'not-allowed' : 'pointer', opacity: summarizing || !sessionActive ? 0.5 : 1 }}>
                    {summarizing ? 'Summarizing…' : summary ? 'Re-summarize Chat' : 'Summarize Chat'}
                  </button>
                </div>
                {summaryVisible && (
                  <div style={{ marginTop: 14 }}>
                    {summarizing && !summary && (
                      <div style={{ fontSize: 13, color: '#9098b5', fontStyle: 'italic' }}>Analyzing conversation…</div>
                    )}
                    {summary && (
                      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#33405e', whiteSpace: 'pre-wrap', background: '#f6f1e8', borderRadius: 14, padding: '14px 16px', border: '1px solid #f1eadd' }}>{renderFormattedText(summary)}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Consultant controls panel */}
              <div style={{ background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 20, padding: 24, alignSelf: 'start', position: 'sticky', top: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: '#9098b5', marginBottom: 16 }}>CONSULTANT CONTROLS</div>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#141b34' }}>Score Override</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => handleOverride(-1)} style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid #f1eadd', background: '#faf7f2', color: '#141b34', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>–</button>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#141b34', minWidth: 32, textAlign: 'center' }}>{override}</span>
                      <button onClick={() => handleOverride(1)} style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid #f1eadd', background: '#faf7f2', color: '#141b34', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>+</button>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#f1eadd', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${override}%`, height: '100%', background: scoreColor(override), transition: 'all .2s' }} />
                  </div>
                </div>

                <WhatsAppAiAdvisorToggle
                  candidate={selUser}
                  headers={adminHeaders}
                  notify={showToast}
                  onChanged={(candidate) => {
                    setSelectedData((previous) => previous ? { ...previous, user: candidate } : previous);
                    fetchUsers();
                  }}
                />

                {/* Candidate documents */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 10 }}>CANDIDATE DOCUMENTS</div>
                  {documents.length === 0 ? (
                    <div style={{ background: '#faf7f2', border: '1px dashed #e7dcc7', borderRadius: 14, padding: '18px 14px', textAlign: 'center', fontSize: 12.5, color: '#9098b5' }}>
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {documents.map(doc => (
                        <div key={doc.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 12, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 28, height: 28, borderRadius: 8, background: '#f1eadd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b46e0', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                            </span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>{doc.label}</div>
                              <div style={{ fontSize: 11, color: '#9098b5' }}>{doc.meta || `${doc.text.trim().split(/\s+/).length} words${doc.file ? ` · original: ${doc.file.name}` : ''}`}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {doc.file && <button onClick={() => downloadOriginalFile(doc.file)} style={{ ...btnPrimary, borderRadius: 7, padding: '5px 9px', fontSize: 11, boxShadow: 'none' }}>Original</button>}
                            {doc.text && <button onClick={() => downloadAsPdf(doc.text, doc.baseName)} style={{ ...btnGhost, borderRadius: 7, padding: '5px 9px', fontSize: 11 }}>PDF</button>}
                            {doc.text && <button onClick={() => downloadAsDocx(doc.text, doc.baseName)} style={{ ...btnGhost, borderRadius: 7, padding: '5px 9px', fontSize: 11 }}>Word</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {narrative && (
                  <div style={{ background: '#f1eadd', border: '1px solid #f1eadd', borderRadius: 14, padding: 14, marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 5 }}>NARRATIVE STRATEGY</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#141b34', textTransform: 'capitalize' }}>{narrative}</div>
                    <div style={{ fontSize: 13, color: '#6b7392', marginTop: 3 }}>
                      {narrative === 'upgrade' ? 'Deepening existing trajectory' : 'Pivoting to new direction'}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 10 }}>SEND NOTE TO CANDIDATE</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 14, padding: '6px 6px 6px 14px', marginBottom: 0 }}>
                  <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Send a note to candidate's session..." rows="3"
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'none', resize: 'none', fontSize: 13, fontFamily: 'inherit', color: '#141b34', padding: '8px 0' }} />
                  <button onClick={sendConsultantNote} disabled={liveChatSending || !msgInput.trim()}
                    style={{ ...btnPrimary, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, opacity: liveChatSending || !msgInput.trim() ? 0.55 : 1, cursor: liveChatSending || !msgInput.trim() ? 'not-allowed' : 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M22 2 11 13M22 2 15 22l-4-9-9-4Z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {adminView === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 18 }}>
                  <div style={{ ...cardShell, padding: '10px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>TOTAL CONSULTANTS</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#141b34' }}>{consultantUsers.length}</div>
                  </div>
                  <div style={{ ...cardShell, padding: '10px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>ACTIVE</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#19c08a' }}>{consultantUsers.filter(u => !u.suspended).length}</div>
                  </div>
                  <div style={{ ...cardShell, padding: '10px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>SUSPENDED</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#e0457a' }}>{consultantUsers.filter(u => u.suspended).length}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setUserForm({ mode: 'create', role: 'consultant', name: '', email: '', username: '', residency: '', age: '', consultantId: '', password: '' })} style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12.5 }}>
                    Create Consultant
                  </button>
                  <button onClick={fetchUsers} disabled={usersLoading} style={{ ...btnGhost, padding: '7px 14px', fontSize: 12.5, cursor: usersLoading ? 'not-allowed' : 'pointer' }}>
                    {usersLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {usersError ? (
                <div style={{ background: '#fff1f6', border: '1px solid #fbd3e2', borderRadius: 16, padding: 24, textAlign: 'center', color: '#e0457a', fontSize: 14, fontWeight: 600 }}>
                  {usersError}
                </div>
              ) : !consultantUsers.length ? (
                <div style={{ background: '#faf7f2', border: '1px dashed #e7dcc7', borderRadius: 20, padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, color: '#9098b5' }}>{usersLoading ? 'Loading consultants…' : 'No consultants yet.'}</div>
                </div>
              ) : (
                <div style={{ ...cardShell, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr .8fr 1.6fr', gap: 0, padding: '10px 20px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                    <span>USER</span><span>LAST LOGIN</span><span>SESSION DURATION</span><span>STATUS</span><span>ACTIONS</span>
                  </div>
                  {consultantUsers.map(u => {
                    const uInitials = (u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const busySuspend = userActionBusy === `${u.id}:suspend` || userActionBusy === `${u.id}:unsuspend`;
                    const busyDelete = userActionBusy === `${u.id}:delete`;
                    return (
                      <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr .8fr 1.6fr', gap: 0, padding: '16px 20px', alignItems: 'center', borderBottom: '1px solid #f6f1e8' }}>
                        <button onClick={() => setUserDetailId(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
                          <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(140deg,#94b3fb,#b899fb)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{uInitials}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34' }}>{u.name}</div>
                            <div style={{ fontSize: 12, color: '#9098b5' }}>{u.email}</div>
                          </div>
                        </button>
                        <div style={{ fontSize: 13, color: '#33405e' }}>{formatDateTime(u.lastLoginAt)}</div>
                        <div style={{ fontSize: 13, color: '#33405e' }}>{formatDuration(u.sessionDurationMs)}</div>
                        <div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, letterSpacing: '.3px',
                            background: u.suspended ? '#fff1f6' : '#eafff6',
                            color: u.suspended ? '#e384a5' : '#3fdca9',
                            border: `1px solid ${u.suspended ? '#fbd3e2' : '#aaeed1'}`,
                          }}>{u.suspended ? 'SUSPENDED' : 'ACTIVE'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setUserForm({ mode: 'edit', ...u, password: '' })}
                            style={{ ...btnGhost, padding: '7px 12px', fontSize: 12 }}>
                            Edit
                          </button>
                          <button
                            onClick={() => { setPasswordResetId(u.id); setPasswordDraft(''); }}
                            style={{ ...btnGhost, padding: '7px 12px', fontSize: 12 }}>
                            Reset
                          </button>
                          <button
                            onClick={() => u.suspended
                              ? performUserAction(u.id, 'unsuspend')
                              : confirmUserAction(u.id, 'suspend', `Suspend ${u.name}? They will be unable to log in until reinstated.`)}
                            disabled={busySuspend}
                            style={{ ...btnGhost, padding: '7px 12px', fontSize: 12, cursor: busySuspend ? 'not-allowed' : 'pointer', opacity: busySuspend ? 0.5 : 1 }}>
                            {u.suspended ? 'Reinstate' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => confirmUserAction(u.id, 'delete', `Permanently delete ${u.name} (${u.email})? This cannot be undone.`)}
                            disabled={busyDelete}
                            style={{ ...btnDanger, padding: '7px 12px', fontSize: 12, cursor: busyDelete ? 'not-allowed' : 'pointer', opacity: busyDelete ? 0.5 : 1 }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* User detail overlay */}
              {userDetail && (
                <div onClick={() => setUserDetailId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,48,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: '#faf7f2', borderRadius: 22, padding: 28, width: 460, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(40,30,90,.28)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                      <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(140deg,#94b3fb,#b899fb)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                        {(userDetail.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: '#141b34' }}>{userDetail.name}</div>
                        <div style={{ fontSize: 13, color: '#9098b5' }}>{userDetail.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                      {[
                        ['Status', userDetail.suspended ? 'Suspended' : 'Active'],
                        ['Residency', userDetail.residency || '—'],
                        ['Joined', formatDateTime(userDetail.createdAt)],
                        ['Total logins', userDetail.loginCount || 0],
                        ['Last login', formatDateTime(userDetail.lastLoginAt)],
                        ['Last active', formatDateTime(userDetail.lastActiveAt)],
                        ['Session duration', formatDuration(userDetail.sessionDurationMs)],
                        ['Pipeline step', stepsFor(userDetail.category)[userDetail.stepIdx] || 'Profile'],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: '#f1eadd', borderRadius: 12, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', color: '#9098b5', marginBottom: 3 }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34' }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {userDetail.loginHistory && userDetail.loginHistory.length > 0 && (
                      <div style={{ marginBottom: 22 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 8 }}>RECENT LOGIN ACTIVITY</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                          {[...userDetail.loginHistory].reverse().map((h, i) => (
                            <div key={i} style={{ fontSize: 12.5, color: '#33405e', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f6f1e8', padding: '4px 0' }}>
                              <span>Login</span><span style={{ color: '#9098b5' }}>{formatDateTime(h.at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => userDetail.suspended
                          ? performUserAction(userDetail.id, 'unsuspend')
                          : confirmUserAction(userDetail.id, 'suspend', `Suspend ${userDetail.name}? They will be unable to log in until reinstated.`)}
                        style={{ ...btnPrimary, flex: 1, padding: '10px 14px', fontSize: 13 }}>
                        {userDetail.suspended ? 'Reinstate User' : 'Suspend User'}
                      </button>
                      <button
                        onClick={() => confirmUserAction(userDetail.id, 'delete', `Permanently delete ${userDetail.name} (${userDetail.email})? This cannot be undone.`)}
                        style={{ ...btnDanger, flex: 1, padding: '10px 14px', fontSize: 13 }}>
                        Delete User
                      </button>
                    </div>
                    <button onClick={() => setUserDetailId(null)} style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: '#9098b5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 6 }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LIVE SESSION FEED ── */}
          {adminView === 'session' && !selectedUserId && (
            <div style={{ maxWidth: 720, background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#141b34', marginBottom: 6 }}>Select a candidate</div>
              <div style={{ fontSize: 13, color: '#9098b5', marginBottom: 16 }}>Scroll through the candidate list and select a name to open their logs. No email is required.</div>
              <div style={{ maxHeight: 440, overflowY: 'auto', border: '1px solid #f1eadd', borderRadius: 14, background: '#f6f1e8', padding: 8 }}>
                {sortedCandidateUsers.length ? sortedCandidateUsers.map((candidate) => (
                  <button key={candidate.id} onClick={() => setSelectedUserId(candidate.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 13px', border: 'none', borderBottom: '1px solid #f1eadd', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 750, color: '#33405e' }}>{candidate.name || candidate.username || 'Candidate'}</span>
                    <span style={{ fontSize: 11.5, color: '#9098b5' }}>{candidate.residency || 'Open logs'} →</span>
                  </button>
                )) : <div style={{ padding: 24, textAlign: 'center', color: '#9098b5', fontSize: 13 }}>No candidates available.</div>}
              </div>
            </div>
          )}
          {adminView === 'session' && selectedUserId && (
            <div style={{ maxWidth: 800 }}>
              <div style={{ fontSize: 13, color: '#9098b5', fontWeight: 600, marginBottom: 4 }}>Viewing: {candidateName}</div>
              {/* Summarize button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#9098b5', fontWeight: 600 }}>{chat.length} messages in session</div>
                <button onClick={generateSummary} disabled={summarizing || !sessionActive}
                  style={{ ...btnPrimary, padding: '10px 20px', fontSize: 13, cursor: summarizing || !sessionActive ? 'not-allowed' : 'pointer', opacity: summarizing || !sessionActive ? 0.5 : 1 }}>
                  {summarizing ? 'Summarizing…' : 'Summarize Chat'}
                </button>
              </div>

              {/* Summary card */}
              {summary && (
                <div style={{ background: '#fff8ea', border: '1px solid #f5e3b8', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: '#c77f0a', marginBottom: 10 }}>SESSION SUMMARY</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#33405e', whiteSpace: 'pre-wrap' }}>{renderFormattedText(summary)}</div>
                </div>
              )}

              {/* Full chat log */}
              {!sessionActive ? (
                <div style={{ background: '#faf7f2', borderRadius: 16, padding: 32, textAlign: 'center', color: '#9098b5', border: '1px solid #f1eadd' }}>No session data. Have a candidate log in and start the advisor.</div>
              ) : (
                <div
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 10,
                    height: '55vh', minHeight: 280, maxHeight: 640,
                    overflowY: 'auto', overscrollBehavior: 'contain',
                    background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 18, padding: 18,
                  }}
                >
                  {chat.map((m, i) => {
                    const channel = m.channel || 'web';
                    const isSystem = m.role === 'system';
                    const isCandidate = m.role === 'user';
                    const label = isSystem
                      ? '[System]'
                      : isCandidate
                        ? `[Candidate] [${channel === 'whatsapp' ? 'WhatsApp' : 'Web'}]`
                        : `[AI Advisor] [${channel === 'whatsapp' ? 'WhatsApp' : 'Web'}]`;
                    return (
                      <div key={i} style={{
                        borderRadius: isSystem ? 999 : isCandidate ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                        padding: isSystem ? '8px 14px' : '12px 16px',
                        maxWidth: isSystem ? '92%' : '88%',
                        alignSelf: isSystem ? 'center' : isCandidate ? 'flex-end' : 'flex-start',
                        background: isSystem ? '#fff8ea' : isCandidate ? 'linear-gradient(135deg,#94b3fb,#b899fb)' : '#f1eadd',
                        color: isSystem ? '#a16207' : isCandidate ? '#faf7f2' : '#33405e',
                        flexShrink: 0,
                      }}>
                        {!isSystem && (
                          <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                            {isCandidate && m.text.startsWith('Here is my CV')
                              ? '📄 [CV submitted for analysis]'
                              : m.role === 'ai' ? renderFormattedText(m.text) : m.text}
                          </div>
                        )}
                        {isSystem && <span style={{ fontSize: 12 }}>{m.text}</span>}
                      </div>
                    );
                  })}
                  <div ref={chatLogEndRef} />
                </div>
              )}
            </div>
          )}

          {/* ── LIVE CHAT ── */}
          {adminView === 'liveChat' && !selectedUserId && (
            <div dir={chatDir(chatLanguage)} style={{ background: '#faf7f2', border: '1px dashed #e7dcc7', borderRadius: 20, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#6b7392', marginBottom: 8 }}>{chatT(chatLanguage, 'noCandidateSelected')}</div>
              <div style={{ fontSize: 13, color: '#aab2cc' }}>{chatT(chatLanguage, 'openCandidateFromList')}</div>
            </div>
          )}
          {adminView === 'liveChat' && selectedUserId && (() => {
            const dir = chatDir(chatLanguage);
            return (
            <div dir={dir} style={{ maxWidth: 800 }}>
              <div style={{ fontSize: 13, color: '#9098b5', fontWeight: 600, marginBottom: 14, textAlign: dir === 'rtl' ? 'right' : 'left' }}>{chatT(chatLanguage, 'viewing')}: <bdi style={{ unicodeBidi: 'isolate' }}>{candidateName}</bdi></div>
              <div style={{ ...cardShell, display: 'flex', flexDirection: 'column', height: '65vh', minHeight: 360, maxHeight: 680, overflow: 'hidden' }}>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
                    {liveChatLoading && (
                      <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                        {chatT(chatLanguage, 'loadingMessages')}
                      </div>
                    )}
                    {!liveChatLoading && liveChatLoadError && (
                      <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                        {chatT(chatLanguage, 'failedToLoadMessages')}
                      </div>
                    )}
                    {!liveChatLoading && !liveChatLoadError && liveChatMessages.length === 0 && (
                      <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                        {chatT(chatLanguage, 'emptyChatState')}
                      </div>
                    )}
                    {liveChatMessages.map((m) => (
                      ['consultant', 'admin'].includes(m.senderRole) ? (
                        <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', borderRadius: '18px 18px 6px 18px', padding: '14px 19px', fontSize: 14.5, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap', boxShadow: '0 10px 22px rgba(105,91,255,.28)' }}>
                          <bdi style={{ display: 'block', unicodeBidi: 'plaintext' }}>{m.text}</bdi>
                          {m.sentAt && <bdi style={{ display: 'block', fontSize: 10.5, opacity: 0.75, marginTop: 6 }}>{formatChatDate(m.sentAt, chatLanguage)}</bdi>}
                        </div>
                      ) : m.senderRole === 'ai' ? (
                        <div key={m.id} style={{ alignSelf: 'flex-start', background: '#eef2ff', border: '1px solid #d8deff', borderRadius: '6px 18px 18px 18px', padding: '16px 19px', fontSize: 14.5, lineHeight: 1.62, color: '#33405e', whiteSpace: 'pre-wrap', maxWidth: '90%' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.7px', color: '#7c6ef7', marginBottom: 6, textTransform: 'uppercase' }}>AI Advisor</div>
                          <bdi style={{ display: 'block', unicodeBidi: 'plaintext' }}>{m.text}</bdi>
                          {m.sentAt && <bdi style={{ display: 'block', fontSize: 10.5, opacity: 0.6, marginTop: 6 }}>{formatChatDate(m.sentAt, chatLanguage)}</bdi>}
                        </div>
                      ) : (
                        <div key={m.id} style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 18px 18px 18px', padding: '16px 19px', fontSize: 14.5, lineHeight: 1.62, color: '#33405e', whiteSpace: 'pre-wrap', maxWidth: '90%' }}>
                          <bdi style={{ display: 'block', unicodeBidi: 'plaintext' }}>{m.text}</bdi>
                          {m.sentAt && <bdi style={{ display: 'block', fontSize: 10.5, opacity: 0.6, marginTop: 6 }}>{formatChatDate(m.sentAt, chatLanguage)}</bdi>}
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div style={{ padding: '16px 24px 20px', flexShrink: 0, borderTop: '1px solid #f1eadd' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6f1e8', border: '1.5px solid #e7dcc7', borderRadius: 18, padding: '7px 7px 7px 8px' }}>
                    <input
                      dir={dir}
                      value={liveChatInput}
                      onChange={e => setLiveChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLiveChatMessage(); } }}
                      placeholder={chatT(chatLanguage, 'typeMessage')}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, padding: '11px 12px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500, textAlign: dir === 'rtl' ? 'right' : 'left' }}
                    />
                    <button onClick={sendLiveChatMessage} disabled={liveChatSending || !liveChatInput.trim()} aria-label={chatT(chatLanguage, 'send')}
                      style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', border: 'none', borderRadius: 13, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: liveChatSending || !liveChatInput.trim() ? 'not-allowed' : 'pointer', color: '#faf7f2', flexShrink: 0, boxShadow: '0 8px 18px rgba(105,91,255,.36)', opacity: liveChatSending || !liveChatInput.trim() ? 0.55 : 1 }}>
                      <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round', transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }}>
                        <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ── AGENTS ── */}
          {adminView === 'agents' && canManageUsers && (
            <AgentsTab showToast={showToast} adminHeaders={adminHeaders} />
          )}

          {/* ── USAGE & COST ── */}
          {adminView === 'usageCost' && canManageUsers && (
            <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: -8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={resetUsageData} disabled={usageResetBusy || usageLoading} style={{ ...btnDanger, padding: '8px 13px', fontSize: 12, opacity: usageResetBusy || usageLoading ? 0.55 : 1 }}>
                    {usageResetBusy ? 'Resetting…' : 'Reset'}
                  </button>
                  <select value={usagePeriod} onChange={(e) => setUsagePeriod(e.target.value)} style={{ border: '1px solid #e7dcc7', borderRadius: 10, padding: '8px 10px', background: '#fff', color: '#33405e', fontFamily: 'inherit', fontWeight: 700 }}>
                    <option value="today">Today</option>
                    <option value="month">This month</option>
                    <option value="all">All time</option>
                  </select>
                  <button onClick={loadUsageData} disabled={usageLoading} style={{ ...btnPrimary, padding: '8px 13px', fontSize: 12, opacity: usageLoading ? 0.6 : 1 }}>
                    {usageLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {usageError && (
                <div style={{ background: '#fff1f6', border: '1px solid #fbd3e2', borderRadius: 16, padding: 18, color: '#e0457a', fontSize: 13.5, fontWeight: 600 }}>
                  {usageError}
                </div>
              )}

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                {[
                  { label: `CORRECTED COST · ${usageData?.periodLabel || 'PERIOD'}`, value: `$${Number(usageData?.selectedCost || 0).toFixed(2)}`, color: '#141b34' },
                  { label: 'TOTAL TOKENS', value: Number(usageData?.totalTokens || 0).toLocaleString(), color: '#141b34' },
                  { label: 'INPUT TOKENS', value: Number(usageData?.inputTokens || 0).toLocaleString(), color: '#5b46e0' },
                  { label: 'OUTPUT TOKENS', value: Number(usageData?.outputTokens || 0).toLocaleString(), color: '#5b46e0' },
                  { label: 'CACHE READ TOKENS', value: Number(usageData?.cacheReadInputTokens || 0).toLocaleString(), color: '#5b46e0' },
                  { label: 'WEB SEARCHES', value: Number(usageData?.webSearchRequests || 0).toLocaleString(), color: '#5b46e0' },
                  { label: 'USERS', value: Number(usageData?.totalUsers || 0).toLocaleString(), color: '#141b34' },
                  { label: 'TRACKED SESSIONS', value: Number(usageData?.totalSessions || 0).toLocaleString(), color: '#141b34' },
                  { label: 'AVG COST / USER', value: `$${Number(usageData?.avgCostPerUser || 0).toFixed(2)}`, color: '#19c08a' },
                  { label: 'AVG / TRACKED SESSION', value: usageData?.avgCostPerSession == null ? '—' : `$${Number(usageData.avgCostPerSession).toFixed(2)}`, color: '#19c08a' },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ ...cardShell, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 6 }}>{kpi.label}</div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: kpi.color }}>{usageLoading && !usageData ? '…' : kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Corrected cost components */}
              <div style={{ ...cardShell, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 4px' }}>Corrected Cost Breakdown</h3>
                  <div style={{ fontSize: 12, color: '#9098b5', marginBottom: 14 }}>Each billing category uses its own official Haiku 4.5 rate.</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 0, padding: '10px 24px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                  <span>CATEGORY</span><span>USAGE</span><span>RATE</span><span>COST</span>
                </div>
                {[
                  ['Base input', usageData?.inputTokens, '$1 / MTok', usageData?.inputCost],
                  ['5-minute cache writes', usageData?.cacheCreationInputTokens, '$1.25 / MTok', usageData?.cacheCreationCost],
                  ['Cache reads', usageData?.cacheReadInputTokens, '$0.10 / MTok', usageData?.cacheReadCost],
                  ['Output', usageData?.outputTokens, '$5 / MTok', usageData?.totalOutputCost],
                  ['Web searches', usageData?.webSearchRequests, '$0.01 / search', usageData?.webSearchCost],
                ].map(([label, units, rate, cost]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 0, padding: '12px 24px', borderBottom: '1px solid #f6f1e8', fontSize: 13, color: '#33405e' }}>
                    <span style={{ fontWeight: 700, color: '#141b34' }}>{label}</span>
                    <span>{Number(units || 0).toLocaleString()}</span>
                    <span>{rate}</span>
                    <span style={{ fontWeight: 700, color: '#5b46e0' }}>${Number(cost || 0).toFixed(4)}</span>
                  </div>
                ))}
              </div>

              {/* Headroom Compression Panel */}
              <div style={{ ...cardShell, padding: '20px 24px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 4 }}>HEADROOM COMPRESSION</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#141b34' }}>Token Savings via AI Context Compression</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: usageData?.costByHeadroom?.enabled?.count > 0 ? '#22c55e' : '#d1d5db' }} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{usageData?.costByHeadroom?.enabled?.count > 0 ? 'Active' : 'Off'}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ ...cardShell, padding: '12px 14px', background: '#f0fdf4' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 4 }}>COMPRESSED CALLS</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{usageData?.costByHeadroom?.enabled?.count ?? 0}</div>
                  </div>
                  <div style={{ ...cardShell, padding: '12px 14px', background: '#fefce8' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 4 }}>UNCOMPRESSED CALLS</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#ca8a04' }}>{usageData?.costByHeadroom?.disabled?.count ?? 0}</div>
                  </div>
                  <div style={{ ...cardShell, padding: '12px 14px', background: '#eff6ff' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 4 }}>COST W/ COMPRESSION</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{'$'}{Number(usageData?.costByHeadroom?.enabled?.cost || 0).toFixed(4)}</div>
                  </div>
                  <div style={{ ...cardShell, padding: '12px 14px', background: '#fdf4ff' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5', marginBottom: 4 }}>AVG COMPRESSION</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#9333ea' }}>{usageData?.averageEstimatedCompressionPercent > 0 ? Number(usageData.averageEstimatedCompressionPercent).toFixed(1) + '%' : '—'}</div>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9098b5', marginBottom: 6 }}>COMPRESSION RATIO PROGRESS</div>
                  <div style={{ position: 'relative', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #22c55e, #16a34a)', width: usageData?.averageEstimatedCompressionPercent > 0 ? Math.min(100, usageData.averageEstimatedCompressionPercent).toFixed(1) + '%' : '0%', transition: 'width .5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
                    <span>0%</span><span>Avg saved: {usageData?.averageEstimatedCompressionPercent > 0 ? Number(usageData.averageEstimatedCompressionPercent).toFixed(1) + '%' : '—'}</span><span>100%</span>
                  </div>
                </div>
              </div>
              {/* System cost controls */}
              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>System Cost Controls</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: '#141b34', marginBottom: 18, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!usageSettings.usageLimitsEnabled}
                    onChange={(e) => setUsageSettings(s => ({ ...s, usageLimitsEnabled: e.target.checked }))} />
                  Enable Usage Limits
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Monthly Budget ($)
                    <input type="number" min="0" step="1" value={usageSettings.monthlyBudget}
                      onChange={(e) => setUsageSettings(s => ({ ...s, monthlyBudget: Number(e.target.value) }))}
                      style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Daily Budget ($)
                    <input type="number" min="0" step="1" value={usageSettings.dailyBudget}
                      onChange={(e) => setUsageSettings(s => ({ ...s, dailyBudget: Number(e.target.value) }))}
                      style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Daily Max Cost Per User ($)
                    <input type="number" min="0" step="0.1" value={usageSettings.maxCostPerUser}
                      onChange={(e) => setUsageSettings(s => ({ ...s, maxCostPerUser: Number(e.target.value) }))}
                      style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Max Cost Per Session ($)
                    <input type="number" min="0" step="0.1" value={usageSettings.maxCostPerSession}
                      onChange={(e) => setUsageSettings(s => ({ ...s, maxCostPerSession: Number(e.target.value) }))}
                      style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7392', marginBottom: 10 }}>WHEN A LIMIT IS REACHED</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                  {[
                    ['warn_user', 'Warn User Only'],
                    ['block_messages', 'Block Further Messages'],
                    ['notify_admin', 'Notify Admin Only'],
                  ].map(([value, label]) => (
                    <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#33405e', cursor: 'pointer' }}>
                      <input type="radio" name="limitAction" value={value} checked={usageSettings.limitAction === value}
                        onChange={() => setUsageSettings(s => ({ ...s, limitAction: value }))} />
                      {label}
                    </label>
                  ))}
                </div>

                <button onClick={saveUsageSettings} disabled={usageSettingsBusy}
                  style={{ ...btnPrimary, padding: '10px 18px', fontSize: 13, opacity: usageSettingsBusy ? 0.55 : 1, cursor: usageSettingsBusy ? 'not-allowed' : 'pointer' }}>
                  {usageSettingsBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* Emergency controls */}
              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>Emergency Controls</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: '#e0457a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!usageSettings.systemSuspended}
                      onChange={(e) => setUsageSettings(s => ({ ...s, systemSuspended: e.target.checked }))} />
                    Suspend Entire System
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: usageSettings.systemSuspended ? '#e0457a' : '#3fdca9' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: usageSettings.systemSuspended ? '#e0457a' : '#19c08a' }}>
                      {usageSettings.systemSuspended ? 'System Suspended' : 'System Running'}
                    </span>
                  </div>
                </div>
                <button onClick={saveUsageSettings} disabled={usageSettingsBusy}
                  style={{ ...btnDanger, padding: '10px 18px', fontSize: 13, opacity: usageSettingsBusy ? 0.55 : 1, cursor: usageSettingsBusy ? 'not-allowed' : 'pointer' }}>
                  {usageSettingsBusy ? 'Saving…' : 'Save Suspension Setting'}
                </button>
              </div>

              {/* Token savings via AI context compression */}
              <div style={{ ...cardShell, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 4px' }}>Token Savings via AI Context Compression</h3>
                  <div style={{ fontSize: 12.5, color: '#9098b5', margin: '0 0 14px' }}>
                    Context compression per conversation via Anthropic prompt caching, and the cost saved (cached tokens × discounted price). Rows marked REAL reflect actual cache reads; others are estimated from input size.
                    {usageData?.totalCompressionSaved ? ` Total saved: $${Number(usageData.totalCompressionSaved).toFixed(2)}.` : ''}
                  </div>
                </div>
                {!usageData?.contextCompression?.length ? (
                  <div style={{ padding: '0 24px 24px', fontSize: 13, color: '#9098b5' }}>No usage data yet.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr 1.1fr 0.7fr', gap: 0, padding: '10px 24px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                      <span>CONVERSATION</span><span>FEATURE</span><span>ORIGINAL TOKENS</span><span>COMPRESSED</span><span>SAVED</span><span>WHEN</span><span>SOURCE</span>
                    </div>
                    <div style={usageRowsScrollStyle}>
                      {usageData.contextCompression.map((c, i) => (
                        <div key={`${c.conversationId}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr 1.1fr 0.7fr', gap: 0, padding: '12px 24px', alignItems: 'center', borderBottom: '1px solid #f6f1e8' }}>
                          <span style={{ fontSize: 12.5, color: '#33405e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.conversationId}</span>
                          <span style={{ fontSize: 12.5, color: '#33405e' }}>{c.feature}</span>
                          <span style={{ fontSize: 12.5, color: '#33405e' }}>{Number(c.inputTokens || 0).toLocaleString()}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#5b46e0' }}>{Number(c.compressionPct || 0).toFixed(0)}%</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#19c08a' }}>${Number(c.costSaved || 0).toFixed(3)}</span>
                          <span style={{ fontSize: 12, color: '#9098b5' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</span>
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, letterSpacing: '.3px', textAlign: 'center', padding: '2px 6px', borderRadius: 6,
                            color: c.real ? '#19c08a' : '#9098b5',
                            background: c.real ? 'rgba(25,192,138,0.12)' : 'rgba(144,152,181,0.12)',
                          }}>
                            {c.real ? 'REAL' : 'EST.'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Cost over time */}
              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>Cost Over Time</h3>
                {!usageData?.costOverTime?.length ? (
                  <div style={{ fontSize: 13, color: '#9098b5' }}>No usage data yet.</div>
                ) : (
                  <div style={{ ...usageCompactRowsScrollStyle, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                    {(() => {
                      const maxCost = Math.max(0.01, ...usageData.costOverTime.map(d => d.cost || 0));
                      return [...usageData.costOverTime].slice(-14).reverse().map((d) => (
                        <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: '#9098b5', width: 80, flexShrink: 0 }}>{d.date}</span>
                          <div style={{ flex: 1, height: 10, background: '#f1eadd', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(2, (d.cost / maxCost) * 100)}%`, height: '100%', background: 'linear-gradient(135deg,#94b3fb,#b899fb)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#141b34', width: 60, textAlign: 'right' }}>${d.cost.toFixed(2)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Top users by cost */}
              <div style={{ ...cardShell, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 4px' }}>Top Users by Attributed Cost</h3>
                  <div style={{ fontSize: 12, color: '#9098b5', marginBottom: 14 }}>Corrected estimates use raw Anthropic counters. “Legacy” identifies usage recorded before real session IDs.</div>
                </div>
                {!usageData?.topUsersByCost?.length ? (
                  <div style={{ padding: '0 24px 24px', fontSize: 13, color: '#9098b5' }}>No usage data yet.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 0.8fr', gap: 0, padding: '10px 24px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                      <span>USER</span><span>SESSIONS</span><span>TOKENS</span><span>COST</span><span>AVG / SESSION</span><span>TODAY STATUS</span>
                    </div>
                    <div style={usageRowsScrollStyle}>
                      {usageData.topUsersByCost.map((u) => (
                        <div key={u.userId} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 0.8fr', gap: 0, padding: '14px 24px', alignItems: 'center', borderBottom: '1px solid #f6f1e8' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34' }}>{u.name}</span>
                          <span style={{ fontSize: 13, color: '#33405e' }}>{u.sessions || '—'}{u.legacyIdentifiers ? <span style={{ display: 'block', fontSize: 10.5, color: '#a16207' }}>+ legacy usage</span> : null}</span>
                          <span style={{ fontSize: 13, color: '#33405e' }}>{u.tokens.toLocaleString()}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>${u.cost.toFixed(2)}</span>
                          <span style={{ fontSize: 13, color: '#33405e' }}>{u.avgPerSession == null ? '—' : `$${u.avgPerSession.toFixed(2)}`}</span>
                          <span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, letterSpacing: '.3px', textTransform: 'uppercase',
                              background: u.status === 'high' ? '#fff1f6' : u.status === 'warning' ? '#fff8ea' : '#eafff6',
                              color: u.status === 'high' ? '#e384a5' : u.status === 'warning' ? '#eaa129' : '#3fdca9',
                              border: `1px solid ${u.status === 'high' ? '#fbd3e2' : u.status === 'warning' ? '#f5dfa6' : '#aaeed1'}`,
                            }}>{u.status}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Cost by feature */}
              <div style={{ ...cardShell, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 14px' }}>Cost by Feature</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 0, padding: '10px 24px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                  <span>FEATURE</span><span>COST</span><span>TOKENS</span>
                </div>
                <div style={usageRowsScrollStyle}>
                  {(usageData?.costByFeature || []).map((f) => (
                    <div key={f.feature} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 0, padding: '12px 24px', alignItems: 'center', borderBottom: '1px solid #f6f1e8' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#141b34' }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#5b46e0' }}>${Number(f.cost || 0).toFixed(2)}</span>
                      <span style={{ fontSize: 13, color: '#33405e' }}>{Number(f.tokens || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent high-cost conversations */}
              <div style={{ ...cardShell, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 0' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 4px' }}>Highest-Cost Sessions</h3>
                  <div style={{ fontSize: 12, color: '#9098b5', marginBottom: 14 }}>API calls and paid retries are aggregated into one session row.</div>
                </div>
                {!usageData?.recentHighCostConversations?.length ? (
                  <div style={{ padding: '0 24px 24px', fontSize: 13, color: '#9098b5' }}>No usage data yet.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr .7fr .9fr 1.2fr', gap: 0, padding: '10px 24px', borderBottom: '1px solid #f1eadd', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#9098b5' }}>
                      <span>SESSION</span><span>USER</span><span>FEATURE</span><span>CALLS</span><span>COST</span><span>LAST ACTIVITY</span>
                    </div>
                    <div style={usageRowsScrollStyle}>
                      {usageData.recentHighCostConversations.map((c, i) => (
                        <div key={`${c.conversationId}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr .7fr .9fr 1.2fr', gap: 0, padding: '12px 24px', alignItems: 'center', borderBottom: '1px solid #f6f1e8' }}>
                          <span style={{ fontSize: 12.5, color: '#33405e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.legacy ? 'Legacy usage' : c.conversationId}</span>
                          <span style={{ fontSize: 12.5, color: '#33405e' }}>{c.userName || c.userId}</span>
                          <span style={{ fontSize: 12.5, color: '#33405e' }}>{c.feature}</span>
                          <span style={{ fontSize: 12.5, color: '#33405e' }}>{c.attempts}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>${Number(c.cost || 0).toFixed(2)}</span>
                          <span style={{ fontSize: 12, color: '#9098b5' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Alerts */}
              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>Alerts</h3>
                {!usageData?.alerts?.length ? (
                  <div style={{ background: '#faf7f2', border: '2px dashed #e7dcc7', borderRadius: 16, padding: 24, textAlign: 'center', fontSize: 13, color: '#9098b5' }}>
                    No alerts.
                  </div>
                ) : (
                  <div style={{ ...usageRowsScrollStyle, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                    {usageData.alerts.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8ea', border: '1px solid #f5dfa6', borderRadius: 12, padding: '10px 14px', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: '#33405e' }}>{a.message}</span>
                        <span style={{ fontSize: 11, color: '#9098b5', flexShrink: 0, marginLeft: 12 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {usageData && (
                <div style={{ ...cardShell, padding: '16px 20px', background: '#f8fafc', borderColor: '#dbeafe' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: '#5b46e0', marginBottom: 5 }}>CORRECTED COST MODEL · {usageData.periodLabel}</div>
                      <div style={{ fontSize: 13, color: '#33405e', lineHeight: 1.55 }}>
                        Haiku 4.5: $1/M input · $5/M output · $1.25/M 5m cache write · $0.10/M cache read · $0.01/search.
                        Costs are calculated from the raw Anthropic usage counters collected for each request.
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: '#9098b5' }}>LAST REFRESH</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#33405e' }}>{usageRefreshedAt ? new Date(usageRefreshedAt).toLocaleTimeString() : '—'}</div>
                    </div>
                  </div>
                  {(usageData.legacySearchTelemetryRecords > 0 || usageData.unknownPricingRecords > 0) && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#a16207' }}>
                      {usageData.legacySearchTelemetryRecords > 0 ? `${usageData.legacySearchTelemetryRecords} older search-enabled calls lack actual search counts; their search surcharge is unknown. ` : ''}
                      {usageData.unknownPricingRecords > 0 ? `${usageData.unknownPricingRecords} calls use an unknown model price.` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {adminView === 'settings' && (
            <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>Portal Settings</h3>
                <div style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, marginBottom: 18 }}>
                  This admin panel shows live session data from the active candidate. In a production deployment, this would connect to a database with historical sessions and multi-consultant features.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#9098b5' }}>
                  <div>• Session persistence: server-side per account (any device)</div>
                  <div>• AI model: claude-haiku-4-5-20251001</div>
                  <div>• API: Anthropic Claude via /api/chat</div>
                  <div>• Email: /api/contact (requires EMAIL_USER + EMAIL_PASS)</div>
                  <div>• File parse: /api/parse-file (PDF via Anthropic document API, .docx via mammoth)</div>
                </div>
              </div>

              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 8px' }}>Security</h3>
                <div style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, marginBottom: 18 }}>
                  Change the password for the signed-in {authUser?.role || 'user'} account.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input type="password" value={ownPasswordForm.currentPassword} onChange={e => setOwnPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Current password" style={{ border: '1px solid #f1eadd', borderRadius: 10, padding: 11, background: '#f6f1e8', fontFamily: 'inherit', color: '#141b34' }} />
                  <input type="password" value={ownPasswordForm.newPassword} onChange={e => setOwnPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="New password" style={{ border: '1px solid #f1eadd', borderRadius: 10, padding: 11, background: '#f6f1e8', fontFamily: 'inherit', color: '#141b34' }} />
                  <input type="password" value={ownPasswordForm.confirmPassword} onChange={e => setOwnPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm new password" style={{ border: '1px solid #f1eadd', borderRadius: 10, padding: 11, background: '#f6f1e8', fontFamily: 'inherit', color: '#141b34' }} />
                </div>
                <button onClick={changeOwnPassword} disabled={ownPasswordBusy || !authToken} style={{ ...btnPrimary, marginTop: 14, padding: '10px 18px', fontSize: 13, opacity: ownPasswordBusy || !authToken ? 0.55 : 1, cursor: ownPasswordBusy || !authToken ? 'not-allowed' : 'pointer' }}>
                  {ownPasswordBusy ? 'Saving...' : 'Change Password'}
                </button>
              </div>

              {canManageUsers && (
                <div style={{ ...cardShell, padding: 28 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 8px' }}>KPI Database</h3>
                  <div style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, marginBottom: 16 }}>
                    Refresh the live university/program KPI database from the Excel file saved in GitHub.
                  </div>
                  <div style={{ background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 14, padding: 14, fontSize: 13, color: '#6b7392', lineHeight: 1.7 }}>
                    <div><strong style={{ color: '#33405e' }}>Source:</strong> {kpiStatus?.sourceFile || 'data/admissions_kpi_universe_expanded.xlsx'}</div>
                    <div><strong style={{ color: '#33405e' }}>Last refresh:</strong> {kpiStatus?.importedAt ? new Date(kpiStatus.importedAt).toLocaleString() : 'Not refreshed yet'}</div>
                    {kpiStatus?.counts && (
                      <div><strong style={{ color: '#33405e' }}>Rows:</strong> {Object.entries(kpiStatus.counts).map(([name, count]) => `${name}: ${count}`).join(' · ')}</div>
                    )}
                  </div>
                  <button onClick={refreshKpiDatabase} disabled={kpiBusy} style={{ ...btnPrimary, marginTop: 14, padding: '10px 18px', fontSize: 13, opacity: kpiBusy ? 0.55 : 1, cursor: kpiBusy ? 'not-allowed' : 'pointer' }}>
                    {kpiBusy ? 'Refreshing...' : 'Refresh KPI Database'}
                  </button>
                </div>
              )}

              <div style={{ ...cardShell, padding: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 8px' }}>AI Process Configuration</h3>
                <div style={{ fontSize: 14, color: '#6b7392', lineHeight: 1.6, marginBottom: 22 }}>
                  Edit how the advisor analyzes profiles, ranks candidates, searches programs, and scores fit. Saved changes apply to every candidate message going forward.
                </div>

                {!aiConfigLoaded && (
                  <div style={{ fontSize: 13, color: '#9098b5' }}>Loading configuration…</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                  {aiSections.map(s => {
                    const isCustom = !!(aiConfig && aiConfig[s.key]);
                    return (
                      <div key={s.key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34' }}>{s.label}</div>
                          {isCustom && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#c77f0a', background: '#fff8ea', border: '1px solid #f5dfa6', borderRadius: 7, padding: '2px 8px' }}>CUSTOM</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#9098b5', marginBottom: 8, lineHeight: 1.5 }}>{s.description}</div>
                        <textarea
                          value={aiDrafts[s.key] || ''}
                          onChange={(e) => setAiDrafts(prev => ({ ...prev, [s.key]: e.target.value }))}
                          rows={8}
                          style={{
                            width: '100%', fontFamily: "'SF Mono',Consolas,monospace", fontSize: 12.5, lineHeight: 1.6,
                            color: '#33405e', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 14,
                            padding: '12px 14px', resize: 'vertical', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button onClick={() => saveAiSection(s.key)} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>
                            Save
                          </button>
                          <button onClick={() => resetAiSection(s.key)} style={{ ...btnGhost, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
                            Reset to Default
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {userForm && canManageUsers && (
            <div onClick={() => setUserForm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,48,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#faf7f2', borderRadius: 22, padding: 28, width: 520, maxWidth: '100%', boxShadow: '0 24px 80px rgba(40,30,90,.28)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>{userForm.mode === 'create' ? `Create ${userForm.role}` : 'Edit User'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {userForm.mode === 'create' && (
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Role
                      <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} style={{ marginTop: 6, width: '100%', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }}>
                        <option value="candidate">Candidate</option>
                        <option value="consultant">Consultant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                  )}
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Name
                    <input value={userForm.name || ''} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Email
                    <input value={userForm.email || ''} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Username
                    <input value={userForm.username || ''} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Residency
                    <input value={userForm.residency || ''} onChange={e => setUserForm(f => ({ ...f, residency: e.target.value }))} style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                  </label>
                  {(userForm.role || 'candidate') === 'candidate' && (
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Consultant
                      <select value={userForm.consultantId || ''} onChange={e => setUserForm(f => ({ ...f, consultantId: e.target.value }))} style={{ marginTop: 6, width: '100%', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }}>
                        <option value="">Unassigned</option>
                        {assignableConsultants.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                      </select>
                    </label>
                  )}
                  {userForm.mode === 'create' && (
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>Temporary password
                      <input type="password" value={userForm.password || ''} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 10, fontFamily: 'inherit' }} />
                    </label>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => {
                    if (userForm.mode === 'create') performUserAction('new', 'create', { user: userForm });
                    else performUserAction(userForm.id, 'update', { patch: userForm });
                  }} style={{ ...btnPrimary, flex: 1, padding: '10px 14px', fontSize: 13 }}>
                    Save
                  </button>
                  <button onClick={() => setUserForm(null)} style={{ ...btnGhost, flex: 1, padding: '10px 14px', fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {passwordResetId && canManageUsers && (
            <div onClick={() => setPasswordResetId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,48,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 61, padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#faf7f2', borderRadius: 22, padding: 28, width: 420, maxWidth: '100%', boxShadow: '0 24px 80px rgba(40,30,90,.28)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 18px' }}>Reset Password</h3>
                <input type="password" value={passwordDraft} onChange={e => setPasswordDraft(e.target.value)} placeholder="New temporary password" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #f1eadd', borderRadius: 10, padding: 12, fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => performUserAction(passwordResetId, 'resetPassword', { password: passwordDraft })} style={{ ...btnPrimary, flex: 1, padding: '10px 14px', fontSize: 13 }}>
                    Reset
                  </button>
                  <button onClick={() => setPasswordResetId(null)} style={{ ...btnGhost, flex: 1, padding: '10px 14px', fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
