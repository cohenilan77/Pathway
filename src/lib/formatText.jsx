import React from 'react';

export function renderFormattedText(text) {
  const lines = String(text || '').split('\n');
  return lines.map((line, li) => {
    const bulletMatch = line.match(/^\s*[*-]\s+(.*)$/);
    const content = bulletMatch ? `• ${bulletMatch[1]}` : line;
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={li}>
        {parts.map((part, pi) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={pi}>{part.slice(2, -2)}</strong>
            : part.replace(/\*/g, '')
        )}
        {li < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
