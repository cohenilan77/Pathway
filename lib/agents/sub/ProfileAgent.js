import { BaseAgent } from '../BaseAgent.js';
import { updateCandidateProfile } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a candidate profile specialist for Pathway.

Your role: extract structured information from CVs, resumes, LinkedIn profiles, transcripts, and raw text.
Build and maintain complete candidate profiles.

When parsing GRADUATE/MBA profiles:
- Extract: name, education (school, degree, GPA, year), work experience (company, role, duration),
  GMAT/GRE scores, extracurriculars, languages, certifications
- Infer career goals and MBA motivations from context
- Flag missing profile gaps that weaken applications

When parsing UNDERGRADUATE profiles:
- Extract: grade (9/10/11/12), curriculum (IB/AP/A-Level/Israeli/French/Other), GPA or grade average,
  subjects and strengths, activities (sports, clubs, arts, coding, volunteering, competitions),
  leadership roles, awards and competitions, standardized tests (SAT/ACT/PSAT/AP/TOEFL/IELTS),
  intended major or interests, target countries, university style preferences
- Determine pathwayType:
    "focused"   — student has clearly stated an intended field or major
    "exploring" — student is not sure what to study
    "partial"   — one or two ideas but undecided
- Grade-appropriate gap detection:
    Grade 9-10: flag missing leadership, low activity depth, no subject passion signal
    Grade 11:   flag missing SAT/ACT plan, weak university list, no teacher relationships flagged
    Grade 12:   flag missing applications, incomplete essays, no recommendation letters secured
- topWeakness: single most impactful gap for their grade level
- topTask: most urgent next action given grade and gaps

Always be precise and do not invent information not present in the source.
Return clean, structured JSON. Return all fields even if empty (use null for unknown).`;

const TOOLS = [
  {
    name: 'update_profile',
    description: 'Save extracted profile data to the candidate record',
    input_schema: {
      type: 'object',
      required: ['candidateId', 'updates'],
      properties: {
        candidateId: { type: 'string' },
        updates: {
          type: 'object',
          description: 'Profile fields to update',
        },
      },
    },
  },
];

export class ProfileAgent extends BaseAgent {
  constructor() {
    super({ name: 'ProfileAgent', systemPrompt: SYSTEM_PROMPT });
  }

  #candidateId = null;

  async parse(candidateId, rawText) {
    this.#candidateId = candidateId;
    const messages = [
      {
        role: 'user',
        content: `Parse this CV/resume and extract a structured profile. Then call update_profile to save it.\n\nCandidate ID: ${candidateId}\n\nRaw content:\n${rawText}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async parseUndergrad(candidateId, rawText, grade) {
    this.#candidateId = candidateId;
    const gradeStr = grade ? `Grade ${grade}` : 'unknown grade';
    const messages = [
      {
        role: 'user',
        content: `Parse this undergrad student's profile (${gradeStr}). Extract a complete undergraduate profile, then call update_profile to save it.\n\nMandatory fields to include in updates:\n- grade, curriculum, gpa (if known), subjects, activities, strongestActivity, leadership, awardsProjects, tests, intendedMajor, countries, universityStyle\n- pathwayType: "focused" | "exploring" | "partial"\n- topWeakness: the single most impactful gap for Grade ${grade || '?'}\n- topTask: the most urgent next action given their grade and current gaps\n- category: "Undergraduate", degree: "Undergraduate"\n\nCandidate ID: ${candidateId}\n\nRaw content:\n${rawText}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async audit(candidateId) {
    this.#candidateId = candidateId;
    const messages = [
      {
        role: 'user',
        content: `Audit the profile for candidate ${candidateId}. Identify: missing fields, weak areas, inconsistencies, and top 3 improvement priorities. Return JSON: { gaps, weakAreas, inconsistencies, priorities }.`,
      },
    ];
    return this.execute(messages);
  }

  async auditUndergrad(candidateId, grade) {
    this.#candidateId = candidateId;
    const gradeStr = grade ? `Grade ${grade}` : 'unknown grade';
    const messages = [
      {
        role: 'user',
        content: `Audit the undergrad profile for candidate ${candidateId} (${gradeStr}).\n\nIdentify grade-appropriate gaps and priorities:\n- Grade 9-10: focus gaps on leadership depth, activity uniqueness, subject passion signal\n- Grade 11: focus gaps on SAT/ACT plan, university list readiness, teacher relationships\n- Grade 12: focus gaps on completed applications, essay drafts, secured recommendations\n\nReturn JSON: { grade, pathwayType, gaps, weakAreas, topWeakness, topTask, priorities, urgencyLevel ("low"|"medium"|"high") }`,
      },
    ];
    return this.execute(messages);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'update_profile') {
      const { candidateId, updates } = toolUse.input;
      return updateCandidateProfile(candidateId || this.#candidateId, updates);
    }
    return super.handleToolUse(toolUse);
  }
}
