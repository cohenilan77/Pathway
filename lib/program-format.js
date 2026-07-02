function sourceText(profile = {}, messages = []) {
  profile = profile || {};
  messages = Array.isArray(messages) ? messages : [];
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

// Only identity/format fields participate in text sniffing. programInfo and
// notes are descriptive paragraphs that routinely mention OTHER tracks the
// school offers ("a part-time option is also available", "the accelerated
// 1-year track...") — sniffing them deleted valid programs and shrank a
// 15-school portfolio to a handful.
function programFormatText(program = {}) {
  return [program.name, program.school, program.degree, program.programGroup, program.studyFormat,
    program.format, program.duration]
    .filter(Boolean).join(' ').toLowerCase();
}

export function programMatchesRequestedFormat(program, constraint) {
  if (!constraint) return true;

  // Structured fields are authoritative when the model provided them.
  const structuredAttendance = String(program?.studyFormat || '').toLowerCase().trim();
  const numericDuration = Number(program?.durationYears);
  const hasStructuredAttendance = ['full-time', 'part-time', 'executive', 'online'].includes(structuredAttendance);
  const hasStructuredDuration = Number.isFinite(numericDuration) && numericDuration > 0;

  if (constraint.attendance && hasStructuredAttendance) {
    if (structuredAttendance !== constraint.attendance) return false;
  }
  if (constraint.durationYears === 2 && hasStructuredDuration && numericDuration < 1.8) return false;
  if (constraint.durationYears === 1 && hasStructuredDuration && numericDuration > 1.5) return false;

  // Fall back to identity-text sniffing only for the dimensions the model
  // left unstructured.
  const text = programFormatText(program);
  const isExecutive = /(?:executive mba|\bemba\b|executive program)/.test(text);
  const isPartTime = /(?:part[ -]?time|weekend mba|evening mba)/.test(text);
  const isOnline = /(?:online mba|distance mba|hybrid mba)/.test(text);
  const isFullTime = /full[ -]?time/.test(text);
  const isOneYear = /(?:\b1[ -]?year|one[ -]?year|\b10[ -]?month|\b12[ -]?month|\b16[ -]?month)/.test(text);
  const isTwoYear = /(?:\b2[ -]?year|two[ -]?year|\b20[ -]?month|\b21[ -]?month|\b24[ -]?month)/.test(text);

  if (constraint.attendance && !hasStructuredAttendance) {
    if (constraint.attendance === 'full-time' && (isExecutive || isPartTime || isOnline)) return false;
    if (constraint.attendance === 'part-time' && (isExecutive || isFullTime)) return false;
    if (constraint.attendance === 'executive' && !isExecutive) return false;
  }
  if (constraint.durationYears && !hasStructuredDuration) {
    if (constraint.durationYears === 2 && isOneYear) return false;
    if (constraint.durationYears === 1 && isTwoYear) return false;
  }
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

// How many programs in the raw PROGRAMS blocks survive the format filter.
// Used by the advisor retry loop to demand regeneration when the model
// produced a portfolio that mostly fails the candidate's selected format.
export function countFormatMatches(raw, constraint) {
  if (!constraint || typeof raw !== 'string') return null;
  const matches = raw.matchAll(/<PROGRAMS>([\s\S]*?)<\/PROGRAMS>/gi);
  let total = 0;
  let kept = 0;
  for (const match of matches) {
    try {
      const programs = JSON.parse(match[1]);
      if (!Array.isArray(programs)) continue;
      total += programs.length;
      kept += programs.filter((program) => programMatchesRequestedFormat(program, constraint)).length;
    } catch { /* invalid JSON handled by the missing-block retry */ }
  }
  return { total, kept };
}
