function cleanSource(value) {
  return String(value || '').replace(/\r\n?/g, '\n').trim();
}

export function normalizeProfileSources(input = {}) {
  const fileText = cleanSource(input.fileText);
  const pastedText = cleanSource(input.pastedText);
  const additionalText = cleanSource(input.additionalText);
  return {
    fileText,
    pastedText,
    additionalText,
    hasFileText: !!fileText,
    hasPastedText: !!pastedText,
    hasAdditionalText: !!additionalText,
    sourceLanguage: 'auto-detect',
    targetLanguage: 'English',
    normalizeToEnglish: true,
  };
}

export function buildProfileSourceBundle(input = {}) {
  const sources = normalizeProfileSources(input);
  const sections = [
    ['UPLOADED FILE TEXT', sources.fileText],
    ['PASTED CV / FIRST TEXT BOX', sources.pastedText],
    ['ADDITIONAL TEXT / SECOND TEXT BOX', sources.additionalText],
  ].filter(([, value]) => value);

  return {
    ...sources,
    combinedOriginal: sections
      .map(([label, value]) => `--- ${label} ---\n${value}`)
      .join('\n\n'),
    advisorMessage: [
      'Here is my CV/resume profile source bundle.',
      'Treat every populated section below as one factual baseline.',
      'Detect the language of each section, translate all content to English, then use the combined English meaning for profile extraction, completeness, and KPI scoring.',
      '',
      ...sections.map(([label, value]) => `--- ${label} ---\n${value}`),
      '',
      '--- END PROFILE SOURCE BUNDLE ---',
    ].join('\n'),
  };
}
