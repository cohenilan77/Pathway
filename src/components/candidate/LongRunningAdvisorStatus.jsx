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
  if (!busy) return null;
  const isFileScan = /\b(cv|resume|résumé|file|document|transcript)\b/i.test(String(message || ''));
  const label = status?.title || (isFileScan ? 'Scanning your file…' : 'Advisor is analyzing…');

  return (
    <span
      role="status"
      aria-live="polite"
      style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7392', lineHeight: 1.4, whiteSpace: 'nowrap', flexShrink: 0, animation: 'pwFade .25s ease' }}
    >
      {label}
    </span>
  );
}
