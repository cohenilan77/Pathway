import React, { useEffect, useState } from 'react';

// Animated typing indicator for when AI is processing
export default function AdvisorToolStatus({ isLoading = false }) {
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 42 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: animationFrame === i ? '#b899fb' : '#e2d9f8',
              transition: 'background .3s ease',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12.5, color: '#6b7392', fontWeight: 500 }}>
        Processing your request...
      </span>
    </div>
  );
}
