function sourceText(profile = {}, messages = []) {
  return [profile.degree, profile.program, profile.programType, profile.format, profile.duration,
    ...(messages || []).filter((message) => message?.role === 'user').map((message) => message?.text)]
    .filter(Boolean).join(' ').toLowerCase();
}

export function requestedProgramFormat(profile = {}, messages = []) {
  const source = sourceText(profile, messages);
  if (!/\bmba\b/.test(source)) return null;
  const attendance = /full[ -]?time/.test(source) ? 'full-time'
    : /part[ -]?time/.test(source) ? 'part-time'
      : /(?:executive|\bemba\b)/.test(source) ? 'executive' : null;
  const durationYears = /(?:\b2[ -]?(?:year|yr)|two[ -]?year)/.test(source) ? 2
    : /(?:\b1[ -]?(?:year|yr)|one[ -]?year|\b12[ -]?month)/.test(source) ? 1 : null;
  return attendance || durationYears ? { family: 'mba', attendance, durationYears } : null;
}

function programText(program = {}) {
  return [program.name, program.school, program.degree, program.programGroup, program.studyFormat,
    program.format, program.duration, program.durationYears, program.programInfo, program.notes]
    .filter(Boolean).join(' ').toLowerCase();
}

export function programMatchesRequestedFormat(program, constraint) {
  if (!constraint) return true;
  const text = programText(program);
  const numericDuration = Number(program?.durationYears);
  const isExecutive = /(?:executive mba|\bemba\b|executive program)/.test(text);
  const isPartTime = /(?:part[ -]?time|weekend mba|evening mba)/.test(text);
  const isOnline = /(?:online mba|distance mba|hybrid mba)/.test(text);
  const isFullTime = /full[ -]?time/.test(text);
  const isOneYear = numericDuration === 1 || /(?:\b1[ -]?year|one[ -]?year|\b10[ -]?month|\b12[ -]?month|\b16[ -]?month)/.test(text);
  const isTwoYear = numericDuration === 2 || /(?:\b2[ -]?year|two[ -]?year|\b20[ -]?month|\b21[ -]?month|\b24[ -]?month)/.test(text);

  if (constraint.attendance === 'full-time' && (isExecutive || isPartTime || isOnline)) return false;
  if (constraint.attendance === 'part-time' && (isExecutive || isFullTime)) return false;
  if (constraint.attendance === 'executive' && !isExecutive) return false;
  if (constraint.durationYears === 2 && isOneYear) return false;
  if (constraint.durationYears === 1 && isTwoYear) return false;
  return true;
}

export function enforceProgramFormatInRaw(raw, profile = {}, messages = []) {
  const constraint = requestedProgramFormat(profile, messages);
  if (!constraint || typeof raw !== 'string') return raw;
  return raw.replace(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/gi, (block, body) => {
    try {
      const programs = JSON.parse(body);
      if (!Array.isArray(programs)) return block;
      const filtered = programs.filter((program) => programMatchesRequestedFormat(program, constraint));
      return `<PROGRAMS>${JSON.stringify(filtered)}</PROGRAMS>`;
    } catch {
      return block;
    }
  });
}
