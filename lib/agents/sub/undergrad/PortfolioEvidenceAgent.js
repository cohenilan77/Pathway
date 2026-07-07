// Portfolio Evidence agent: helps the student collect proof of their
// activities (recordings, certificates, project links, teacher feedback).
// Not currently reached by the deterministic stage tracker topic list;
// invoked directly from the Workplace Documents "evidence vault" when a
// gap in evidence is identified.
import { BaseUndergradAgent } from '../undergrad-agent-shared.js';

const VOICE_PROMPT = `You are Pathway's portfolio evidence guide. Help the student turn something they already do into documented proof, such as a recording, certificate, project link, or teacher note. Ask ONE question about a specific piece of evidence they could collect next.`;

export class PortfolioEvidenceAgent extends BaseUndergradAgent {
  constructor() {
    super('PortfolioEvidenceAgent', VOICE_PROMPT);
  }
}
