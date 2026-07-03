import React, { useCallback, useEffect, useState } from 'react';

const AGENT_DEFINITIONS = [
  { id: 'main', name: 'MainAgent', role: 'Orchestrator', status: 'active', model: 'claude-haiku-4-5', calls: 1482, tokens: '3.2M', latency: '1.4s', description: 'Routes every candidate message to the correct sub-agent based on intent classification.', behavior: 'Classifies incoming messages into one of 12 intent categories, then delegates to the matching sub-agent. Falls back to ChatAgent for ambiguous requests.', settings: { maxRetries: 3, timeoutMs: 30000, logInteractions: true } },
  { id: 'advisor', name: 'AdvisorAgent', role: 'Advisor', status: 'active', model: 'claude-haiku-4-5', calls: 6841, tokens: '18.4M', latency: '4.2s', description: 'Powers the main advisor stepper with structured profile/scores/programs blocks.', behavior: 'Runs the full 9-step admissions pipeline with a 725-line system prompt, web search, 4-attempt retry loop, and portfolio-mix validation.', settings: { maxRetries: 4, webSearch: true, cachePrompt: true, portfolioMinSchools: 10 } },
  { id: 'chat', name: 'ChatAgent', role: 'Conversation', status: 'active', model: 'claude-haiku-4-5', calls: 3204, tokens: '8.1M', latency: '1.1s', description: 'Handles general Q&A with persistent per-candidate memory across sessions.', behavior: 'Fetches candidate profile from Redis, maintains last-20-message history under agent:memory:ChatAgent:{id}, responds with contextual awareness.', settings: { memoryWindow: 20, memoryTtlDays: 7 } },
  { id: 'essay', name: 'EssayAgent', role: 'Essay', status: 'active', model: 'claude-haiku-4-5', calls: 892, tokens: '4.7M', latency: '6.8s', description: 'Reviews, drafts, and improves application essays per school and narrative choice.', behavior: 'Supports three modes: review (feedback + INSIGHTS block), draft (from profile + prompt), improve (targeted rewrite with feedback). Word limit and narrative (Upgrade/Pivot) are injected into the system prompt.', settings: { maxTokens: 16000, narrativeDefault: 'upgrade' } },
  { id: 'matching', name: 'MatchingAgent', role: 'Matching', status: 'active', model: 'claude-haiku-4-5', calls: 1104, tokens: '2.9M', latency: '2.3s', description: 'Scores candidate-school fit and recommends a balanced admissions portfolio.', behavior: 'Queries Redis program store with keyword, country, degree, GMAT, and GPA filters. Applies the server-verified scoring formula from lib/scoring.js and returns ranked programs.', settings: { defaultLimit: 20, searchTool: 'search_programs' } },
  { id: 'profile', name: 'ProfileAgent', role: 'Profile', status: 'active', model: 'claude-haiku-4-5', calls: 644, tokens: '1.8M', latency: '1.7s', description: 'Extracts and normalizes candidate information from CV text or background dumps.', behavior: 'Parses free-form text and structured uploads. Emits a normalized PROFILE block with all mandatory KPI fields. Flags gaps and missing mandatory data.', settings: { strictExtraction: true } },
  { id: 'interview', name: 'InterviewAgent', role: 'Interview', status: 'active', model: 'claude-haiku-4-5', calls: 312, tokens: '1.2M', latency: '2.1s', description: 'Runs mock admissions interviews and scores candidate answers per school.', behavior: 'Simulates 8-10 question interview sequences for a named school. Emits an INTERVIEW_RESULT block with 1-10 rating, feedback summary, and next steps after the closing question.', settings: { questionCount: 10, feedbackDepth: 'detailed' } },
  { id: 'calendar', name: 'CalendarAgent', role: 'Calendar', status: 'active', model: 'claude-haiku-4-5', calls: 248, tokens: '0.4M', latency: '0.9s', description: 'Manages candidate events and deadlines via Redis-backed calendar CRUD.', behavior: 'Interprets natural language calendar requests (add/list/remove). All events are persisted under calendar:{candidateId}:events in Redis. Supports date parsing and conflict detection.', settings: { tools: ['add_event', 'get_events', 'remove_event'] } },
  { id: 'simulation', name: 'SimulationAgent', role: 'Simulation', status: 'active', model: 'claude-haiku-4-5', calls: 188, tokens: '0.6M', latency: '1.8s', description: 'Runs what-if scenarios and predicts admission outcomes for profile changes.', behavior: 'Takes a hypothetical profile delta (e.g. GMAT +30, GPA +0.2), re-runs the fit formula against target schools, and returns predicted tier/fit changes.', settings: { scenarioDepth: 3 } },
  { id: 'community', name: 'CommunityAgent', role: 'Community', status: 'active', model: 'claude-haiku-4-5', calls: 94, tokens: '0.3M', latency: '1.2s', description: 'Matches candidates with study partners and community members sharing target schools.', behavior: 'Queries Redis community opt-in members filtered by journey type and target school overlap. Returns ranked matches with shared school count.', settings: { optInRequired: true, defaultLimit: 5 } },
  { id: 'document', name: 'DocumentAgent', role: 'Documents', status: 'active', model: 'claude-haiku-4-5', calls: 176, tokens: '0.9M', latency: '2.4s', description: 'Processes uploaded documents and stores extracted content for retrieval.', behavior: 'Accepts raw document text, extracts structured facts, saves under docs:{candidateId} in Redis. Supports search and retrieval by document type.', settings: { maxDocSizeKb: 500 } },
  { id: 'nagger', name: 'NaggerAgent', role: 'Nudges', status: 'active', model: 'claude-haiku-4-5', calls: 520, tokens: '0.8M', latency: '0.7s', description: 'Proactively nudges candidates about upcoming deadlines and milestones.', behavior: 'Checks calendar events and task lists on each login. Generates personalized deadline reminders and milestone celebrations keyed to journey stage.', settings: { lookAheadDays: 14, silenceHours: 8 } },
  { id: 'search', name: 'SearchAgent', role: 'Search', status: 'active', model: 'claude-haiku-4-5', calls: 438, tokens: '1.1M', latency: '1.5s', description: 'Queries the live program KPI database and enriches results with web search.', behavior: 'Wraps lib/agents/tools/search.js. Supports keyword, country, degree, and metric filters against Redis program:* keys. Falls back to web search for programs not in the KPI database.', settings: { webSearchFallback: true } },
  { id: 'settings-agent', name: 'SettingsAgent', role: 'Settings', status: 'active', model: 'claude-haiku-4-5', calls: 142, tokens: '0.2M', latency: '0.6s', description: 'Handles candidate profile updates and notification preference changes via natural language.', behavior: 'Parses preference-change requests (language, notification opt-in/out, target country updates) and applies them via updateCandidateProfile in Redis.', settings: { allowedFields: ['language', 'notifications', 'destination', 'goals'] } },
];

const EMPTY_METRICS = {
  calls: 0, inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0, totalTokens: 0, avgLatencyMs: 0, errors: 0,
};

// Descriptions and settings are static; usage is always loaded from the server.
const INITIAL_AGENTS = AGENT_DEFINITIONS.map((agent) => ({ ...agent, ...EMPTY_METRICS }));

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatLatency = (value) => Number(value) > 0 ? `${Math.round(Number(value)).toLocaleString()} ms` : '—';

const STATUS_COLOR = { active: '#3fdca9', paused: '#eaa129', disabled: '#e384a5' };
const STATUS_BG = { active: '#eafff6', paused: '#fff8ea', disabled: '#fff1f6' };

const chip = (color, bg, label) => (
  <span style={{ background: bg, color, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.3px' }}>{label}</span>
);

const inputStyle = {
  width: '100%', border: '1.5px solid #b899fb', borderRadius: 10, padding: '10px 12px',
  fontFamily: 'inherit', fontSize: 13, color: '#141b34', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};

export default function AgentsTab({ showToast, adminHeaders = {} }) {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [selected, setSelected] = useState(INITIAL_AGENTS[0].id);
  const [openSection, setOpenSection] = useState('behavior');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetAt, setResetAt] = useState(null);
  const [architecture, setArchitecture] = useState(null);
  const [architectureBusy, setArchitectureBusy] = useState(false);
  const [architectureError, setArchitectureError] = useState('');

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError('');
    try {
      const response = await fetch('/api/admin-agent-usage', { headers: adminHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load agent usage.');
      const metrics = new Map((data.agents || []).map((item) => [item.agentId, item]));
      setAgents((current) => current.map((item) => ({
        ...item,
        ...EMPTY_METRICS,
        ...(metrics.get(item.id) || {}),
      })));
      setResetAt(data.resetAt || null);
    } catch (err) {
      setUsageError(err.message || 'Failed to load agent usage.');
    } finally {
      setUsageLoading(false);
    }
  }, [adminHeaders.Authorization, adminHeaders['X-Admin-Secret']]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  const loadArchitecture = useCallback(async () => {
    setArchitectureError('');
    try {
      const response = await fetch('/api/admin-agent-architecture', { headers: adminHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load architecture mode.');
      setArchitecture(data.config);
    } catch (err) {
      setArchitectureError(err.message || 'Failed to load architecture mode.');
    }
  }, [adminHeaders.Authorization, adminHeaders['X-Admin-Secret']]);

  useEffect(() => { loadArchitecture(); }, [loadArchitecture]);

  const switchArchitecture = async () => {
    const nextMode = architecture?.mode === 'hybrid' ? 'legacy' : 'hybrid';
    const action = nextMode === 'hybrid' ? 'enable the Multi-Agent architecture' : 'disable Multi-Agent and return to Legacy';
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setArchitectureBusy(true);
    setArchitectureError('');
    try {
      const response = await fetch('/api/admin-agent-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ mode: nextMode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to switch architecture.');
      setArchitecture(data.config);
      showToast?.(nextMode === 'hybrid' ? 'Multi-Agent architecture enabled.' : 'Legacy architecture restored.');
    } catch (err) {
      setArchitectureError(err.message || 'Failed to switch architecture.');
      showToast?.(err.message || 'Failed to switch architecture.');
    } finally {
      setArchitectureBusy(false);
    }
  };

  const resetCounters = async () => {
    if (!window.confirm('Reset usage counters for all agents? This cannot be undone.')) return;
    setResetBusy(true);
    try {
      const response = await fetch('/api/admin-agent-usage', { method: 'POST', headers: adminHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset agent counters.');
      setAgents((current) => current.map((item) => ({ ...item, ...EMPTY_METRICS })));
      setResetAt(data.resetAt || Date.now());
      setUsageError('');
      showToast?.('Agent usage counters reset.');
    } catch (err) {
      setUsageError(err.message || 'Failed to reset agent counters.');
      showToast?.(err.message || 'Failed to reset agent counters.');
    } finally {
      setResetBusy(false);
    }
  };

  const agent = agents.find((a) => a.id === selected);

  const startEdit = () => {
    setDraft({ behavior: agent.behavior, description: agent.description, model: agent.model });
    setEditing(true);
    setOpenSection('behavior');
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveEdit = () => {
    setAgents((prev) => prev.map((a) => a.id === selected ? { ...a, ...draft } : a));
    setEditing(false);
    setDraft(null);
    showToast?.(`${agent.name} saved.`);
  };

  const togglePause = () => {
    const next = agent.status === 'active' ? 'paused' : 'active';
    setAgents((prev) => prev.map((a) => a.id === selected ? { ...a, status: next } : a));
    showToast?.(`${agent.name} ${next === 'paused' ? 'paused' : 'resumed'}.`);
  };

  const deleteAgent = () => {
    const remaining = agents.filter((a) => a.id !== selected);
    setAgents(remaining);
    setSelected(remaining[0]?.id || null);
    setEditing(false);
    setDraft(null);
    showToast?.(`${agent.name} deleted.`);
  };

  const Section = ({ id, label, children }) => {
    const open = openSection === id;
    return (
      <div style={{ borderTop: '1px solid #f1eadd' }}>
        <button
          onClick={() => setOpenSection(open ? null : id)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#33405e' }}
        >
          {label}
          <span style={{ fontSize: 18, color: '#9098b5', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
        </button>
        {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '18px 20px', background: architecture?.mode === 'hybrid' ? '#eafff6' : '#faf7f2', border: `1px solid ${architecture?.mode === 'hybrid' ? '#b7ecd4' : '#f1eadd'}`, borderRadius: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.8px', color: '#9098b5', marginBottom: 5 }}>ARCHITECTURE MODE</div>
          <div style={{ fontSize: 18, fontWeight: 850, color: '#141b34' }}>
            {architecture?.mode === 'hybrid' ? 'Multi-Agent Enabled' : 'Legacy Enabled'}
          </div>
          <div style={{ fontSize: 12, color: '#6b7392', marginTop: 4 }}>
            {architecture?.mode === 'hybrid'
              ? 'The multi-agent orchestration endpoint is enabled.'
              : 'Multi-agent orchestration is disabled; the current Advisor workflow remains active.'}
          </div>
          {architectureError && <div style={{ fontSize: 11, color: '#c94f79', marginTop: 6 }}>{architectureError}</div>}
        </div>
        <button
          onClick={switchArchitecture}
          disabled={!architecture || architectureBusy}
          style={{ minWidth: 190, background: architecture?.mode === 'hybrid' ? '#fff1f6' : 'linear-gradient(135deg,#94b3fb,#b899fb)', color: architecture?.mode === 'hybrid' ? '#c94f79' : '#fff', border: architecture?.mode === 'hybrid' ? '1px solid #e384a560' : 'none', borderRadius: 11, padding: '11px 16px', fontSize: 12.5, fontWeight: 850, cursor: !architecture || architectureBusy ? 'not-allowed' : 'pointer', opacity: !architecture || architectureBusy ? .55 : 1 }}
        >
          {architectureBusy ? 'SWITCHING…' : architecture?.mode === 'hybrid' ? 'Disable Multi-Agent' : 'Enable Multi-Agent'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 22 }}>
      {/* Agent list */}
      <div style={{ width: 240, flexShrink: 0, background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #f1eadd' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#9098b5' }}>AGENTS</div>
            <button
              onClick={resetCounters}
              disabled={resetBusy || usageLoading}
              title="Reset all agent usage counters"
              style={{ background: '#fff1f6', color: '#c94f79', border: '1px solid #e384a560', borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 800, cursor: resetBusy || usageLoading ? 'not-allowed' : 'pointer', opacity: resetBusy || usageLoading ? .55 : 1 }}
            >
              {resetBusy ? 'RESETTING…' : 'RESET COUNTERS'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#9098b5', marginTop: 2 }}>{agents.length} agents registered</div>
          {resetAt && <div style={{ fontSize: 10, color: '#9098b5', marginTop: 4 }}>Since {new Date(resetAt).toLocaleString()}</div>}
          {usageError && <div style={{ fontSize: 10, color: '#c94f79', marginTop: 5 }}>{usageError}</div>}
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => { setSelected(a.id); setEditing(false); setDraft(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px',
                background: selected === a.id ? 'linear-gradient(135deg,#94b3fb18,#b899fb18)' : 'transparent',
                border: 'none', borderLeft: `3px solid ${selected === a.id ? '#7b68ee' : 'transparent'}`,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[a.status] || '#9098b5', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selected === a.id ? '#5b46e0' : '#141b34' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: '#9098b5' }}>{a.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {agent ? (
        <div style={{ flex: 1, background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 18, padding: '24px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#141b34' }}>{agent.name}</h2>
                {chip(STATUS_COLOR[agent.status] || '#9098b5', STATUS_BG[agent.status] || '#f1eadd', (agent.status || 'active').toUpperCase())}
                {chip('#5b46e0', '#f0eeff', agent.role)}
              </div>
              {editing ? (
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical', marginTop: 4 }}
                />
              ) : (
                <div style={{ fontSize: 13, color: '#6b7392', maxWidth: 500 }}>{agent.description}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {editing ? (
                <>
                  <button onClick={saveEdit} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 16px', fontSize: 13 }}>
                    Save
                  </button>
                  <button onClick={cancelEdit} style={{ background: '#faf7f2', color: '#33405e', border: '1px solid #f1eadd', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 14px', fontSize: 13 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startEdit} style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 14px', fontSize: 13 }}>
                    Edit
                  </button>
                  <button onClick={togglePause} style={{ background: '#faf7f2', color: '#33405e', border: '1px solid #f1eadd', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 14px', fontSize: 13 }}>
                    {agent.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'TOTAL CALLS', value: usageLoading ? '…' : formatNumber(agent.calls) },
              { label: 'TOKENS USED', value: usageLoading ? '…' : formatNumber(agent.totalTokens) },
              { label: 'AVG LATENCY', value: usageLoading ? '…' : formatLatency(agent.avgLatencyMs) },
              { label: 'MODEL', value: editing ? null : agent.model },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f6f1e8', border: `1px solid ${editing && label === 'MODEL' ? '#b899fb' : '#f1eadd'}`, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.5px', color: '#9098b5', marginBottom: 5 }}>{label}</div>
                {editing && label === 'MODEL' ? (
                  <input
                    value={draft.model}
                    onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: 13, fontWeight: 700 }}
                  />
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#141b34' }}>{value}</div>
                )}
              </div>
            ))}
          </div>

          {/* Expandable sections */}
          <Section id="behavior" label="Behavior">
            {editing ? (
              <textarea
                value={draft.behavior}
                onChange={(e) => setDraft((d) => ({ ...d, behavior: e.target.value }))}
                style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#6b7392', lineHeight: 1.6 }}>{agent.behavior}</p>
            )}
          </Section>

          <Section id="settings" label="Settings">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(agent.settings).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#f6f1e8', borderRadius: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7392' }}>{key}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#141b34', fontFamily: 'monospace' }}>
                    {typeof val === 'boolean' ? (val ? 'true' : 'false') : Array.isArray(val) ? val.join(', ') : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="usage" label="Usage (since last reset)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Calls', value: formatNumber(agent.calls) },
                { label: 'Input tokens', value: formatNumber(agent.inputTokens) },
                { label: 'Output tokens', value: formatNumber(agent.outputTokens) },
                { label: 'Cache write/read', value: `${formatNumber(agent.cacheCreationInputTokens)} / ${formatNumber(agent.cacheReadInputTokens)}` },
                { label: 'Avg latency', value: formatLatency(agent.avgLatencyMs) },
                { label: 'Errors', value: formatNumber(agent.errors) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#9098b5', letterSpacing: '.4px', marginBottom: 4 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#141b34' }}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="test" label="Test Agent">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                placeholder={`Send a test message to ${agent.name}…`}
                style={{ width: '100%', minHeight: 80, border: '1px solid #f1eadd', borderRadius: 12, padding: '12px 14px', fontFamily: 'inherit', fontSize: 13, color: '#33405e', background: '#f6f1e8', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => showToast?.(`Test message sent to ${agent.name}. Response will appear in logs.`)}
                style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '9px 18px', fontSize: 13 }}
              >
                Send Test
              </button>
            </div>
          </Section>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9098b5', fontSize: 14 }}>
          No agents registered.
        </div>
      )}
      </div>
    </div>
  );
}
