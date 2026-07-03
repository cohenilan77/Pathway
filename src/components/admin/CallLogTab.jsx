import React, { useState, useRef } from 'react';

const cardShell = {
  background: '#faf7f2',
  border: '1px solid #f1eadd',
  borderRadius: 18,
  boxShadow: '0 18px 40px rgba(60,72,130,.06)',
};

const btnPrimary = {
  background: 'linear-gradient(135deg,#94b3fb,#b899fb)',
  color: '#faf7f2',
  border: 'none',
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 8px 16px rgba(105,91,255,.3)',
  padding: '10px 16px',
  fontSize: 13,
};

const btnGhost = {
  background: '#faf7f2',
  color: '#33405e',
  border: '1px solid #f1eadd',
  borderRadius: 10,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '10px 16px',
  fontSize: 13,
};

const btnDanger = {
  background: '#fff1f6',
  color: '#e0457a',
  border: '1px solid #fbd3e2',
  borderRadius: 10,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '10px 16px',
  fontSize: 13,
};

const preStyle = {
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#141b34',
  background: '#f6f1e8',
  maxHeight: '65vh',
  overflow: 'auto',
  userSelect: 'text',
  padding: '12px',
  borderRadius: 8,
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
};

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatEvent(event) {
  const time = formatTime(event.at);

  if (event.level === 'turn') {
    if (event.direction === 'in') {
      const data = event.data || {};
      return `[${time}] TURN IN  ${event.agent}
message: ${data.message || ''}`;
    }

    if (event.direction === 'out') {
      const data = event.data || {};
      const meta = event.meta || {};
      const latency = meta.latencyMs ? ` (${meta.latencyMs}ms)` : '';
      return `[${time}] TURN OUT ${event.agent}${latency}
text: ${data.text || ''}`;
    }
  }

  if (event.level === 'model') {
    const data = event.data || {};
    const meta = event.meta || {};
    const modelInfo = meta.model ? ` (${meta.model}` : '';
    const latency = meta.latencyMs ? `, ${meta.latencyMs}ms` : '';
    const tokens = meta.usage ? `, ${meta.usage.input_tokens || 0}+${meta.usage.output_tokens || 0} tokens` : '';
    const modelSuffix = modelInfo || tokens ? ')' : '';
    const fullModel = modelInfo + latency + tokens + modelSuffix;

    return `[${time}] MODEL IO ${event.agent}${fullModel}
in:  ${data.lastUserMessage || ''}
out: ${data.responseText || ''}`;
  }

  return `[${time}] ${event.level.toUpperCase()} ${event.agent}`;
}

export default function CallLogTab({ showToast, adminHeaders, users = [] }) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const preRef = useRef(null);

  const candidateUsers = (users || []).filter(u => (u.role || 'candidate') === 'candidate').sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const loadCalls = async (candidate) => {
    if (!candidate) {
      showToast('Please select a candidate.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin-agent-trace?candidateId=${candidate.id}&limit=300`, {
        headers: adminHeaders,
      });

      if (res.status === 404) {
        showToast('Call log is disabled in this environment.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load call log.');
      }

      const data = await res.json();
      setEvents(data.events || []);
      setDropdownOpen(false);

      if (!data.events || data.events.length === 0) {
        showToast('No call log entries found.');
      }
    } catch (error) {
      showToast(error.message || 'Failed to load call log.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCalls = async () => {
    if (!selectedCandidate) {
      showToast('Select a candidate first.');
      return;
    }
    loadCalls(selectedCandidate);
  };

  const clearLog = async () => {
    if (!selectedCandidate) {
      showToast('Select a candidate first.');
      return;
    }

    if (!window.confirm('Clear the call log for this candidate? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin-agent-trace?candidateId=${selectedCandidate.id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clear call log.');
      }

      setEvents([]);
      showToast('Call log cleared.');
    } catch (error) {
      showToast(error.message || 'Failed to clear call log.');
    }
  };

  const copyAll = () => {
    if (preRef.current) {
      const text = preRef.current.innerText;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Call log copied to clipboard.');
      }).catch(() => {
        showToast('Failed to copy to clipboard.');
      });
    }
  };

  const logText = events.length > 0
    ? events.map(e => formatEvent(e)).join('\n---\n')
    : 'No call log entries.';

  return (
    <div style={{ padding: '24px' }}>
      <div style={cardShell}>
        <div style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 16px' }}>Call Log</h3>
          <p style={{ fontSize: 13, color: '#6b7392', margin: '0 0 16px', lineHeight: 1.5 }}>
            View advisor and agent call records for debugging on staging.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7392', marginBottom: 6 }}>
                Select Candidate
              </label>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #f1eadd',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  background: '#fff',
                  color: '#141b34',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{selectedCandidate ? selectedCandidate.name : 'Choose candidate...'}</span>
                <span>{dropdownOpen ? '▲' : '▼'}</span>
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #f1eadd',
                    borderRadius: 8,
                    marginTop: 4,
                    maxHeight: 300,
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  {candidateUsers.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        loadCalls(candidate);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: 'none',
                        background: selectedCandidate?.id === candidate.id ? '#f0f4ff' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1eadd',
                        fontSize: 13,
                        color: '#33405e',
                        fontWeight: selectedCandidate?.id === candidate.id ? 700 : 600,
                      }}
                    >
                      {candidate.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={refreshCalls} disabled={loading || !selectedCandidate} style={{ ...btnGhost, opacity: loading || !selectedCandidate ? 0.6 : 1, cursor: loading || !selectedCandidate ? 'not-allowed' : 'pointer' }}>
              Refresh
            </button>
            <button onClick={copyAll} disabled={events.length === 0} style={{ ...btnGhost, opacity: events.length === 0 ? 0.6 : 1, cursor: events.length === 0 ? 'not-allowed' : 'pointer' }}>
              Copy All
            </button>
            <button onClick={clearLog} disabled={!selectedCandidate} style={{ ...btnDanger, opacity: !selectedCandidate ? 0.6 : 1, cursor: !selectedCandidate ? 'not-allowed' : 'pointer' }}>
              Clear Log
            </button>
          </div>

          {selectedCandidate && (
            <div style={{ fontSize: 12, color: '#6b7392', marginBottom: 16 }}>
              Candidate: <strong>{selectedCandidate.name}</strong> (ID: {selectedCandidate.id})
            </div>
          )}

          <div style={preStyle} ref={preRef}>
            {logText}
          </div>

          {events.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, color: '#9098b5' }}>
              Showing {events.length} events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
