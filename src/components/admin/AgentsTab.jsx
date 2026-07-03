import React, { useState, useEffect } from 'react';

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

export default function AgentsTab({ showToast }) {
  const [agents] = useState([
    { name: 'telegram_advisor', status: 'active', lastActive: Date.now() - 3600000, callCount: 47 },
    { name: 'whatsapp_advisor', status: 'active', lastActive: Date.now() - 7200000, callCount: 23 },
    { name: 'coordinator', status: 'active', lastActive: Date.now() - 300000, callCount: 156 },
  ]);

  function getStatusColor(status) {
    return status === 'active' ? '#3fdca9' : '#e0457a';
  }

  function getStatusBg(status) {
    return status === 'active' ? '#eafff6' : '#fff1f6';
  }

  function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={cardShell}>
        <div style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#141b34', margin: '0 0 16px' }}>Agents</h3>
          <p style={{ fontSize: 13, color: '#6b7392', margin: '0 0 20px', lineHeight: 1.5 }}>
            Advisor and coordinator agent status and activity.
          </p>

          {agents.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9098b5', textAlign: 'center', padding: '40px 20px' }}>
              No agents configured.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {agents.map((agent) => (
                <div key={agent.name} style={{ ...cardShell, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: getStatusColor(agent.status),
                        boxShadow: `0 0 8px ${getStatusColor(agent.status)}80`,
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#141b34' }}>{agent.name}</div>
                        <div style={{ fontSize: 11, color: '#9098b5', marginTop: 2 }}>Agent</div>
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: getStatusBg(agent.status),
                      color: getStatusColor(agent.status),
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '.3px',
                      textTransform: 'uppercase',
                    }}>
                      {agent.status}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#f6f1e8', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9098b5', marginBottom: 4 }}>LAST ACTIVE</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>{formatTime(agent.lastActive)}</div>
                    </div>
                    <div style={{ background: '#f6f1e8', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9098b5', marginBottom: 4 }}>TOTAL CALLS</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#141b34' }}>{agent.callCount}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5b46e0', marginBottom: 4 }}>AGENT HEALTH</div>
            <div style={{ fontSize: 13, color: '#33405e', lineHeight: 1.5 }}>
              All agents are operational. Call traces are recorded in the Call Log for detailed debugging.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
