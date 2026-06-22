import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function Chat({ authUser, authToken, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const candidateId = authUser?.id;

  const fetchMessages = useCallback(() => {
    if (!candidateId || !authToken) return;
    fetch(`/api/chat/messages?candidateId=${candidateId}`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => { if (d.messages) setMessages(d.messages); })
      .catch(() => {});
  }, [candidateId, authToken]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ candidateId, senderId: candidateId, senderRole: 'candidate', text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Failed to send message.');
      fetchMessages();
    } catch (e) {
      showToast(e.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '24px 28px 28px' }}>
      <div style={{ flex: 1, minHeight: 0, background: '#faf7f2', borderRadius: 24, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '24px 28px 18px', borderBottom: '1px solid #f1eadd', flexShrink: 0 }}>
          <span style={{ width: 48, height: 48, borderRadius: 15, background: 'linear-gradient(140deg,#94b3fb,#b899fb)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 10px 20px rgba(105,91,255,.32)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" /></svg>
          </span>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.4px', color: '#141b34', margin: 0 }}>Your Strategist</h2>
            <div style={{ fontSize: 12.5, color: '#19c08a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3fdca9', boxShadow: '0 0 8px rgba(25,192,138,.7)' }} />
              Direct line · human consultant
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                No messages yet — say hello to your strategist.
              </div>
            )}
            {messages.map((m) => (
              m.senderRole === 'candidate' ? (
                <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', borderRadius: '18px 18px 6px 18px', padding: '14px 19px', fontSize: 14.5, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap', boxShadow: '0 10px 22px rgba(105,91,255,.28)' }}>
                  {m.text}
                </div>
              ) : (
                <div key={m.id} style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 18px 18px 18px', padding: '16px 19px', fontSize: 14.5, lineHeight: 1.62, color: '#33405e', whiteSpace: 'pre-wrap', maxWidth: '90%' }}>
                  {m.text}
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{ padding: '16px 24px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6f1e8', border: '1.5px solid #e7dcc7', borderRadius: 18, padding: '7px 7px 7px 8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message your strategist…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, padding: '11px 12px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500 }}
            />
            <button onClick={send} disabled={sending || !input.trim()}
              style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', border: 'none', borderRadius: 13, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', color: '#faf7f2', flexShrink: 0, boxShadow: '0 8px 18px rgba(105,91,255,.36)', opacity: sending || !input.trim() ? 0.55 : 1 }}>
              <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
