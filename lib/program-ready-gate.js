export const PROGRAM_READY_CLAIM = /recommended programs are ready|(?:school|university|program) list (?:is )?ready|choose\s+3\s*[–-]\s*5\s+schools|select them from the list|university list tab|matched\s+\d+|\d+[- ]school\s+portfolio|portfolio\s+spans|realistic\s+reaches|\b(?:MIT|Stanford|Carnegie Mellon|CMU|Berkeley|Harvard|Yale|Princeton|Cornell|UCLA|Georgia Tech)\b/i;
export const SCHOOL_SELECTION_REQUEST = /choose|select|pick|which\s+3\s*[–-]\s*5/i;
export const PROGRAM_RECOVERY_REPLY = 'I still need to generate the actual school list. Tap below to generate it now. → Generate my school list';

export function hasPrograms(programs) {
  return Array.isArray(programs) && programs.length > 0;
}

export function gateProgramReadyReply({ text, isUndergrad, parsedPrograms, currentPrograms }) {
  if (!isUndergrad || hasPrograms(parsedPrograms) || hasPrograms(currentPrograms)) return text;
  return PROGRAM_READY_CLAIM.test(String(text || '')) ? PROGRAM_RECOVERY_REPLY : text;
}

export function needsProgramRecovery(text, programs) {
  return !hasPrograms(programs)
    && PROGRAM_READY_CLAIM.test(String(text || ''))
    && SCHOOL_SELECTION_REQUEST.test(String(text || ''));
}
