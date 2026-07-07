// Academic Strength agent: surfaces and deepens the student's strongest
// academic subject or course track. Not currently reached by the
// deterministic stage tracker topic list; invoked directly by the
// Workplace Schools "readiness snapshot" and by other agents that need an
// academic-strength read on the student.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's academic strength guide. Help the student identify and go deeper in the subject or course track where they are genuinely strongest. Ask ONE question about a specific class, project, or grade, with options that deepen that strength rather than restating it.`;

export class AcademicStrengthAgent extends BaseUndergradAgent {
  constructor() {
    super('AcademicStrengthAgent', VOICE_PROMPT);
  }
}
