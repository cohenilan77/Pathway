import React, { useState, useEffect, useRef } from 'react';

const IDLE_MS = 30 * 60 * 1000;

// Undergrad Rail v2 chat surface. The server resolves identity from the
// session token, so every request carries Authorization: Bearer <token>; the
// body's userId is not trusted server-side and is sent only for logging.
export default function UndergradChat({ userId, name, authToken }) {
  const [messages, setMessages] = useState([]);
  const [options, setOptions]   = useState([]);
  const [ended, setEnded]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const idleTimer = useRef(null);

  const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('pathway_token') : null);

  const post = (body) => fetch('/api/undergrad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ userId, name, ...body }),
  }).then(r => r.json());

  // client-side guarantee, mirrors the server's ensureGoodbye
  const ensureGoodbye = (o = []) =>
    o.some(x => /goodbye|end session|done|bye/i.test(x)) ? o : [...o, '👋 Goodbye'];

  const resetIdle = () => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => endSession(), IDLE_MS);
  };

  useEffect(() => {
    post({ action: 'open' }).then(d => {
      setMessages([{ role: 'coach', text: d.message }]);
      setOptions(ensureGoodbye(d.options));
      resetIdle();
    });
    return () => clearTimeout(idleTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const send = async (text) => {
    if (busy) return;
    if (/goodbye|end session/i.test(text)) return endSession();

    setBusy(true);
    setMessages(m => [...m, { role: 'student', text }]);
    setOptions([]);
    resetIdle();

    const d = await post({ userMessage: text });
    setMessages(m => [...m, { role: 'coach', text: d.message }]);
    setOptions(ensureGoodbye(d.options));
    setBusy(false);
  };

  const endSession = async () => {
    clearTimeout(idleTimer.current);
    setEnded(true);
    setOptions([]);
    const d = await post({ action: 'end' });
    if (d.message) setMessages(m => [...m, { role: 'coach', text: d.message }]);
    setMessages(m => [...m, { role: 'coach', text: d.signOff }]);
    setTimeout(() => {
      localStorage.removeItem('pathway_token');
      window.location.href = '/login';
    }, 3000);
  };

  return (
    <div className="undergrad-chat">
      <div className="messages">
        {messages.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}
      </div>

      {!ended && options.length > 0 && (
        <div className="option-row">
          {options.map((o, i) => (
            <button key={i} onClick={() => send(o)} disabled={busy}
                    className={/goodbye/i.test(o) ? 'opt opt-goodbye' : 'opt'}>{o}</button>
          ))}
        </div>
      )}

      {!ended && (
        <input className="free-text" placeholder="Or type…" disabled={busy}
               onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { send(e.target.value); e.target.value = ''; } }} />
      )}
    </div>
  );
}
