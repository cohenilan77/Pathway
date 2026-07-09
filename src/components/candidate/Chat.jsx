import React, { useEffect, useRef, useState, useCallback } from 'react';
import { chatT, chatDir, formatChatDate } from '../../lib/chatI18n.js';

export default function Chat({ authUser, authToken, showToast, language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
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

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 60);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

const OPTIONS_PATTERN = /→\s*(.+)$/;

  function parseOptions(text) {
    const match = OPTIONS_PATTERN.exec(text || '');
    if (!match) return null;
    const options = match[1].split('|').map(o => o.trim()).filter(Boolean);
    if (options.length < 2) return null;
    return { mainText: text.slice(0, match.index).trim(), options };
  }

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
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

  const scrollChatToTop = () => chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollChatToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollButtonStyle = {
    position: 'absolute',
    zIndex: 5,
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#94b3fb,#b899fb)',
    color: '#faf7f2',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(105,91,255,.36)',
  };

  return (
    <div dir={dir} className="pw-chat-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '30px 36px' }}>
      <div style={{ maxWidth: 800 }}>
        <div style={{ fontSize: 13, color: '#9098b5', fontWeight: 600, marginBottom: 14, textAlign: dir === 'rtl' ? 'right' : 'left' }}>{chatT(language, 'viewingConsultant')}</div>
        <div style={{ position: 'relative', background: '#faf7f2', border: '1px solid #f1eadd', borderRadius: 20, boxShadow: '0 18px 40px rgba(60,72,130,.06)', display: 'flex', flexDirection: 'column', height: '65vh', minHeight: 360, maxHeight: 680, overflow: 'hidden' }}>
          {showScrollTop && (
            <>
              <button onClick={scrollChatToTop} title="Scroll conversation to top" aria-label="Scroll conversation to top" style={{ ...scrollButtonStyle, top: 16, right: dir === 'rtl' ? 'auto' : 18, left: dir === 'rtl' ? 18 : 'auto' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
              <button onClick={scrollChatToBottom} title="Scroll conversation to bottom" aria-label="Scroll conversation to bottom" style={{ ...scrollButtonStyle, bottom: 164, right: dir === 'rtl' ? 'auto' : 18, left: dir === 'rtl' ? 18 : 'auto' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </button>
            </>
          )}
          <div ref={chatScrollRef} className="pw-chat-messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px' }}>
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
                  {chatT(language, 'emptyChatState')}
                </div>
              )}
              {messages.filter(m => m.senderRole !== 'system' && m.senderRole !== 'ai').map((m) => (
                m.senderRole === 'candidate' ? (
                  <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', borderRadius: '18px 18px 6px 18px', padding: '14px 19px', fontSize: 14.5, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap', boxShadow: '0 10px 22px rgba(105,91,255,.28)' }}>
                    <bdi style={{ display: 'block', unicodeBidi: 'plaintext' }}>{m.text}</bdi>
                    {m.sentAt && <bdi style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 6 }}>{formatChatDate(m.sentAt, language)}</bdi>}
                  </div>
                ) : (
                  (() => {
                    const parsed = parseOptions(m.text);
                    return (
                      <div key={m.id} style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 18px 18px 18px', padding: '16px 19px', fontSize: 14.5, lineHeight: 1.62, color: '#33405e', whiteSpace: 'pre-wrap', maxWidth: '90%' }}>
                        <bdi style={{ display: 'block', unicodeBidi: 'plaintext' }}>{parsed ? parsed.mainText : m.text}</bdi>
                        {parsed && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                            {parsed.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => send(opt)}
                                disabled={sending}
                                style={{ background: '#fff', border: '1.5px solid #d8cdb4', borderRadius: 999, padding: '7px 14px', fontSize: 13.5, fontWeight: 600, color: '#33405e', cursor: sending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                        {m.sentAt && <bdi style={{ display: 'block', fontSize: 12, opacity: 0.6, marginTop: 6 }}>{formatChatDate(m.sentAt, language)}</bdi>}
                      </div>
                    );
                  })()
                )
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="pw-chat-composer" style={{ padding: '16px 24px 20px', flexShrink: 0, borderTop: '1px solid #f1eadd' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6f1e8', border: '1.5px solid #e7dcc7', borderRadius: 18, padding: '7px 7px 7px 8px' }}>
              <input
                dir={dir}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={chatT(language, 'writeMessageToConsultant')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, padding: '11px 12px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500, textAlign: dir === 'rtl' ? 'right' : 'left' }}
              />
              <button onClick={() => send()} disabled={sending || !input.trim()} aria-label={chatT(language, 'send')}
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
