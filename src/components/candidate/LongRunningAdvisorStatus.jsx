import React, { useEffect, useMemo, useState } from 'react';
import { longRunningStatus } from '../../lib/longRunningAdvisorStatus.js';

export default function LongRunningAdvisorStatus({ busy, message }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!busy) {
      setElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [busy]);

  const status = useMemo(() => longRunningStatus(elapsedSeconds, message), [elapsedSeconds, message]);
  if (!busy || !status) return null;

  return (
    <div style={{ marginLeft: 42, maxWidth: 640, background: '#faf7f2', border: '1px solid #d9cef5', borderRadius: 14, padding: '13px 15px', boxShadow: '0 8px 22px rgba(91,70,224,.08)', animation: 'pwFade .25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ width: 9, height: 9, marginTop: 5, borderRadius: '50%', background: '#8f7bf2', boxShadow: '0 0 0 5px rgba(143,123,242,.12)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#33405e', lineHeight: 1.4 }}>{status.title}</div>
          <div style={{ fontSize: 12.5, color: '#6b7392', lineHeight: 1.5, marginTop: 3 }}>{status.detail}</div>
          <div style={{ fontSize: 11.5, color: '#8b91a8', marginTop: 7 }}>Please keep this tab open while I finish.</div>
        </div>
      </div>
    </div>
  );
}
