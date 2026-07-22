import React, { useEffect, useMemo, useState } from 'react';
import { longRunningStatus } from '../../lib/longRunningAdvisorStatus.js';

export default function LongRunningAdvisorStatus({ busy, message, showDots = true }) {
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
  if (!busy) return null;
  const isFileScan = /\b(cv|resume|résumé|file|document|transcript)\b/i.test(String(message || ''));
  const label = status?.title || (isFileScan ? 'Scanning your file and extracting profile facts…' : 'AI is crunching your data…');

  return (
    <span
      role="status"
      aria-live="polite"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#5a6a8f', lineHeight: 1.4, whiteSpace: 'nowrap', flexShrink: 0, animation: 'pwFade .25s ease' }}
    >
      {showDots && (
        <span aria-hidden="true" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3a63ff', display: 'inline-block', animation: `pwPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
