import { BaseAgent } from '../BaseAgent.js';
import { updateCandidateProfile } from '../tools/update.js';

const SYSTEM_PROMPT = `You are a candidate profile specialist for Pathway.

Your role: extract structured information from CVs, resumes, LinkedIn profiles, transcripts, and raw text.
Build and maintain useful candidate profiles quickly. Extraction quality comes before completeness.

Extract facts only. Never calculate or return competitiveness, readiness, KPI, or admission scores.
Never invent GPA, test scores, work years, achievements, or missing dates. Uploaded file text, pasted profile text, additional text, existing saved profile facts, and candidate chat history are one factual baseline. Unknown facts must be null, marked incomplete, and listed in missingFields; unknown never means weak and never means blocking.

SOURCE NORMALIZATION — mandatory for every profile:
- The input can contain three labeled sections: UPLOADED FILE TEXT, PASTED CV / FIRST TEXT BOX, and ADDITIONAL TEXT / SECOND TEXT BOX.
- Use every populated section. Never let one section replace or cancel another.
- Detect the language of each section independently. The sections may use different languages.
- Translate all supplied content to English internally before extracting or reconciling facts.
- Use the combined English meaning as the sole baseline for the saved profile and all downstream KPI work.
- Save every free-text profile field in English, while preserving names, institutions, employers, dates, scores, and proper nouns exactly.
- Include sourceLanguages (unique detected languages), normalizationLanguage: "English", and sourceCoverage with booleans uploadedFileText, pastedText, and additionalText in the saved profile.
- A fact present in any language or any section is known and must not be listed as missing.
- Extract aggressively from context before marking a gap. Infer qualitative role seniority, leadership scope, achievement evidence, career progression, MBA intent, and career direction when the source supports the inference. Never infer exact numbers, dates, scores, titles, or credentials.

When parsing GRADUATE/MBA profiles:
- Extract: name, education (school, degree, GPA, year), currentRole, currentCompany, companies,
  employerStrength, achievements, quantifiedImpact, GMAT/GRE scores, extracurriculars, languages, certifications
- Extract every role with roleStartDate and roleEndDate; support "present". Calculate unioned experience months
  without double-counting overlapping roles. Count IDF/army/military service as professional experience and store
  workYears, militaryYears, civilianWorkYears, roles, currentRole, currentCompany, companies, careerProgression,
  and leadershipEvidence. Ask about work years only when role dates are missing, unclear, or impossible to resolve.
- Extract leadershipEvidence, managedPeople, teamSize, ledProjects, careerProgression, internationalExposure,
  countriesWorked, careerGoal, whyMBA/whyDegree, whyNow, recommenders, and directEvaluatorConfirmed
- Infer career goals and MBA motivations from context
- Flag missing profile gaps that weaken confidence, but classify GMAT/GRE, exact GPA, exact recommender titles, exception screening, extra languages, and international living history as optional evidence gaps/tasks rather than blockers.
- A strong professional baseline plus leadership/achievement evidence plus MBA/goal intent is sufficient for downstream best-available scoring.

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

  async parse(candidateId, rawText, context = {}) {
    this.#candidateId = candidateId;
    const messages = [
      {
        role: 'user',
        // No "Candidate ID: X" line here — the id is already threaded via
        // #candidateId (handleToolUse) and the update_profile tool's own
        // input schema, so the model never needs a bare internal id in its
        // natural-language input to complete this turn.
        content: `Parse the complete candidate baseline below now. First detect the language of each populated source section and translate all sections to English internally. Merge UPLOADED FILE TEXT, PASTED CV / FIRST TEXT BOX, ADDITIONAL TEXT / SECOND TEXT BOX, EXISTING PROFILE, and CHAT HISTORY into one authoritative baseline. Extract every supported fact before identifying gaps; never ask the candidate to upload or provide the document again. Save all free-text profile fields in English and include sourceLanguages, normalizationLanguage:"English", and sourceCoverage. Then call update_profile. After the tool succeeds, return strict JSON with keys "profile" (the English-normalized extracted fields), "missingFields" (only information genuinely absent from every supplied source), and "summary" (English). Missing optional facts are confidence gaps, not blockers. Do not ask for information already inferable from any source.\n\nSOURCE BUNDLE:\n${rawText}\n\nEXISTING PROFILE:\n${JSON.stringify(context.profile || {})}\n\nCHAT HISTORY:\n${JSON.stringify(context.conversationHistory || [])}`,
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
        content: `Parse this undergrad student's complete profile source bundle (${gradeStr}). Detect each section's language, translate all populated sections to English internally, merge their English meaning, and extract a complete English-normalized undergraduate profile. Then call update_profile to save it.\n\nMandatory fields to include in updates:\n- grade, curriculum, gpa (if known), subjects, activities, strongestActivity, leadership, awardsProjects, tests, intendedMajor, countries, universityStyle\n- pathwayType: "focused" | "exploring" | "partial"\n- topWeakness: the single most impactful gap for Grade ${grade || '?'}\n- topTask: the most urgent next action given their grade and current gaps\n- category: "Undergraduate", degree: "Undergraduate"
- sourceLanguages, normalizationLanguage: "English", sourceCoverage for uploaded file, pasted text, and additional text\n\nRaw content:\n${rawText}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async audit(candidateId) {
    this.#candidateId = candidateId;
    const messages = [
      {
        role: 'user',
        content: 'Audit the candidate profile. Identify: missing fields, weak areas, inconsistencies, and top 3 improvement priorities. Return JSON: { gaps, weakAreas, inconsistencies, priorities }.',
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
        content: `Audit the undergrad candidate's profile (${gradeStr}).\n\nIdentify grade-appropriate gaps and priorities:\n- Grade 9-10: focus gaps on leadership depth, activity uniqueness, subject passion signal\n- Grade 11: focus gaps on SAT/ACT plan, university list readiness, teacher relationships\n- Grade 12: focus gaps on completed applications, essay drafts, secured recommendations\n\nReturn JSON: { grade, pathwayType, gaps, weakAreas, topWeakness, topTask, priorities, urgencyLevel ("low"|"medium"|"high") }`,
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
