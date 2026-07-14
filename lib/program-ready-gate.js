import { PROGRAM_GENERATION_FAILURE_REPLY, validateProgramList } from './program-validation.js';

export const PROGRAM_READY_CLAIM = /recommended programs are ready|(?:school|university|program) list (?:is )?ready|choose\s+3\s*[–-]\s*5\s+schools|select them from the list|university list tab|matched\s+\d+|\d+[- ]school\s+portfolio|portfolio\s+spans|realistic\s+reaches|your targets are (?:locked in|set)|school portfolio is complete|recommendations are ready|now let'?s shape your narrative|move to narrative\s*&?\s*strategy|(?:schools?|programs?|portfolio|matches|recommendations?)\s+(?:were|are|have been)\s+(?:matched|generated|saved|displayed|ready)|(?:matched|generated|saved|displayed)\s+(?:your\s+)?(?:schools?|programs?|portfolio|matches)|\b(?:MIT|Stanford|Carnegie Mellon|CMU|Berkeley|Harvard|Yale|Princeton|Cornell|UCLA|Georgia Tech)\b/i;
export const SCHOOL_SELECTION_REQUEST = /choose|select|pick|which\s+3\s*[–-]\s*5/i;
export const PROGRAM_RECOVERY_REPLY = `${PROGRAM_GENERATION_FAILURE_REPLY} → Build my school list now`;

export function hasPrograms(programs) {
  return validateProgramList(programs).count > 0;
}

export function gateProgramReadyReply({ text, isUndergrad, parsedPrograms, currentPrograms }) {
  if (hasPrograms(parsedPrograms) || hasPrograms(currentPrograms)) return text;
  return PROGRAM_READY_CLAIM.test(String(text || '')) ? PROGRAM_RECOVERY_REPLY : text;
}

export function needsProgramRecovery(text, programs) {
  return !hasPrograms(programs)
    && PROGRAM_READY_CLAIM.test(String(text || ''))
    && SCHOOL_SELECTION_REQUEST.test(String(text || ''));
}
