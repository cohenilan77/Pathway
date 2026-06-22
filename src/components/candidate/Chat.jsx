import React, { useEffect, useRef, useState, useCallback } from 'react';
import { chatT, chatDir, formatChatDate } from '../../lib/chatI18n.js';

export default function Chat({ authUser, authToken, showToast, language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const messagesEndRef = useRef(null);
  const candidateId = authUser?.id;
  const dir = chatDir(language);

  const fetchMessages = useCallback(() => {
    if (!candidateId || !authToken) return;
    fetch(`/api/chat/messages?candidateId=${candidateId}`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => {
        if (d.messages) { setMessages(d.messages); setLoadError(false); }
        else setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
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
      if (!res.ok) throw new Error(d.error || chatT(language, 'failedToSendMessage'));
      fetchMessages();
    } catch (e) {
      showToast(e.message || chatT(language, 'failedToSendMessage'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div dir={dir} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '30px 36px' }}>
      <div style={{ maxWidth: 800 }}>
        <div style={{ fontSize: 13, color: '#9098b5', fontWeight: 600, marginBottom: 14, textAlign: dir === 'rtl' ? 'right' : 'left' }}>{chatT(language, 'viewing')}: {chatT(language, 'consultant')}</div>
        <div style={{ background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, boxShadow: '0 18px 40px rgba(60,72,130,.06)', display: 'flex', flexDirection: 'column', height: '65vh', minHeight: 360, maxHeight: 680, overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
              {loading && (
                <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                  {chatT(language, 'loadingMessages')}
                </div>
              )}
              {!loading && loadError && (
                <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                  {chatT(language, 'failedToLoadMessages')}
                </div>
              )}
              {!loading && !loadError && messages.length === 0 && (
                <div style={{ fontSize: 13.5, color: '#aab2cc', textAlign: 'center', padding: '40px 0' }}>
                  {chatT(language, 'noMessagesYet')} — {chatT(language, 'startConversation')}
                </div>
              )}
              {messages.map((m) => (
                m.senderRole === 'candidate' ? (
                  <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', borderRadius: '18px 18px 6px 18px', padding: '14px 19px', fontSize: 14.5, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap', boxShadow: '0 10px 22px rgba(105,91,255,.28)' }}>
                    {m.text}
                    {m.sentAt && <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 6 }}>{formatChatDate(m.sentAt, language)}</div>}
                  </div>
                ) : (
                  <div key={m.id} style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 18px 18px 18px', padding: '16px 19px', fontSize: 14.5, lineHeight: 1.62, color: '#33405e', whiteSpace: 'pre-wrap', maxWidth: '90%' }}>
                    {m.text}
                    {m.sentAt && <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 6 }}>{formatChatDate(m.sentAt, language)}</div>}
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div style={{ padding: '16px 24px 20px', flexShrink: 0, borderTop: '1px solid #f1eadd' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6f1e8', border: '1.5px solid #e7dcc7', borderRadius: 18, padding: '7px 7px 7px 8px' }}>
              <input
                dir={dir}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={chatT(language, 'writeMessageToConsultant')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, padding: '11px 12px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500, textAlign: dir === 'rtl' ? 'right' : 'left' }}
              />
              <button onClick={send} disabled={sending || !input.trim()} aria-label={chatT(language, 'send')}
                style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', border: 'none', borderRadius: 13, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', color: '#faf7f2', flexShrink: 0, boxShadow: '0 8px 18px rgba(105,91,255,.36)', opacity: sending || !input.trim() ? 0.55 : 1 }}>
                <svg viewBox="0 0 24 24" width="19" height="19" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round', transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }}>
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
