import React, { useEffect, useRef, useState } from 'react';
import { renderFormattedText } from '../../lib/formatText.jsx';

const KICKOFF_TEXT = 'Begin the AI School Search session for this candidate.';

function extractProgramsBlock(raw) {
  const m = raw.match(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/);
  if (!m) return null;
  let body = m[1].trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(body); } catch { /* fall through */ }
  const arrMatch = body.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch { return null; }
  }
  return null;
}

function stripProgramsBlock(raw) {
  return raw.replace(/<PROGRAMS>[\s\S]*?<\/PROGRAMS>/g, '').trim();
}

export default function AISchoolSearch({ onClose, authToken, profile, scores, strengths, weaknesses, cvText, chosenSchools, setPrograms }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [workingList, setWorkingList] = useState(null);
  const messagesEndRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const callApi = async (nextHistory) => {
    setBusy(true);
    try {
      const res = await fetch('/api/school-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          messages: nextHistory,
          profile, scores, strengths, weaknesses, cvText, chosenSchools,
          currentList: workingList,
        }),
      });
      const data = await res.json();
      const raw = data.raw || data.error || 'Connection issue. Please try again.';
      const programs = extractProgramsBlock(raw);
      const displayText = stripProgramsBlock(raw);
      if (programs && Array.isArray(programs)) {
        setWorkingList(programs);
        setPrograms(programs);
      }
      setHistory(prev => [...prev, { role: 'ai', text: raw }]);
      setMessages(prev => [...prev, { role: 'ai', text: displayText }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection issue. Please try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const kickoff = [{ role: 'user', text: KICKOFF_TEXT }];
    setHistory(kickoff);
    callApi(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg = { role: 'user', text };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    callApi(nextHistory);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#faf7f2', borderRadius: 24, border: '1px solid #f1eadd', boxShadow: '0 18px 40px rgba(60,72,130,.06)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f1eadd', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(140deg,#94b3fb,#b899fb)', color: '#faf7f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 16px rgba(105,91,255,.32)' }}>
            <svg viewBox="0 0 24 24" width="17" height="17" style={{ fill: 'none', stroke: '#faf7f2', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#141b34' }}>AI School Search</div>
            <div style={{ fontSize: 11.5, color: '#19c08a', fontWeight: 700 }}>● searching live</div>
          </div>
        </div>
        <button onClick={onClose} title="Close" style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: '#f1eadd', color: '#6b7392', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((m, i) => (
            m.role === 'ai' ? (
              <div key={i} style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 16px 16px 16px', padding: '13px 16px', fontSize: 13.5, lineHeight: 1.55, color: '#33405e', whiteSpace: 'pre-wrap', maxWidth: '95%' }}>
                {renderFormattedText(m.text)}
              </div>
            ) : (
              <div key={i} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#94b3fb,#b899fb)', color: '#faf7f2', borderRadius: '16px 16px 6px 16px', padding: '12px 16px', fontSize: 13.5, lineHeight: 1.5, maxWidth: '90%', whiteSpace: 'pre-wrap' }}>
                {m.text}
              </div>
            )
          ))}
          {busy && (
            <div style={{ alignSelf: 'flex-start', background: '#f6f1e8', border: '1px solid #f1eadd', borderRadius: '6px 16px 16px 16px', padding: '14px 16px' }}>
              <span style={{ display: 'inline-flex', gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#9aa3c0', display: 'inline-block', animation: `pwPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* input */}
      <div style={{ padding: '12px 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f6f1e8', border: '1.5px solid #e7dcc7', borderRadius: 16, padding: '6px 6px 6px 8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            placeholder={busy ? 'Thinking…' : 'Reply or refine the list…'}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 13.5, padding: '9px 4px', color: '#1c2433', fontFamily: 'inherit', fontWeight: 500 }}
          />
          <button onClick={send} disabled={busy || !input.trim()}
            style={{ background: 'linear-gradient(135deg,#94b3fb,#b899fb)', border: 'none', borderRadius: 11, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', color: '#faf7f2', flexShrink: 0, opacity: busy || !input.trim() ? 0.55 : 1 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
