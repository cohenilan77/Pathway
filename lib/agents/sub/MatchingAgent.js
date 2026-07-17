import { BaseAgent } from '../BaseAgent.js';
import { searchPrograms, getCandidateProfile } from '../tools/search.js';

const SYSTEM_PROMPT = `You are a school matching specialist for Pathway, a multi-track admissions advisory platform.

Your role: analyze a candidate's profile and return ranked school matches with fit scores and reasoning.

=== GRADUATE / MBA matching ===
When matching grad/MBA candidates:
- Consider GMAT/GRE, GPA, work experience, residency, career goals
- Assign a fit score (0-100) and canonical tier (safe/possible/stretch)
- Explain WHY each school is a good or poor fit
- Always return at least 10 schools with a strategic spread of stretch, possible, and safe options unless the candidate explicitly requests named-school-only analysis
- Be honest — do not oversell schools that are out of reach
- Missing GMAT/GRE, exact GPA, exact recommender titles, exception screening, languages, or international living history are evidence gaps, not reasons to refuse or return an empty list
- If target geography is USA, return USA programs only. If geography is unknown, return a global top-fit portfolio and add geography as an evidence gap

=== UNDERGRADUATE matching ===
When matching undergraduate students:
- Use GPA (if known), SAT/ACT (if known), subject strengths, activities, leadership, and pathwayType
- pathwayType "focused":   return schools strong in that specific intended field; emphasize program-level fit
- pathwayType "exploring": return versatile schools with broad liberal arts options and multiple strengths
- pathwayType "partial":   mix field-specific and flexible programs
- Grade 9-10: universities are exploratory — label recommendations as "exploratory match"; omit hard score requirements
- Grade 11-12: use actual SAT/ACT averages and GPA benchmarks when assigning tiers
- Tier labels for undergrad: "stretch" (fit < 45), "possible" (45-75), "safe" (fit > 75)
- NEVER return empty results — if no SAT/ACT score yet, estimate fit from activities + GPA + grade
- Always return at least 10 schools: 3-4 stretch, 4-5 possible, 3-4 safe
- Include diverse geographic mix unless the student specified country preferences
- Never use avgGMAT for undergrad schools — use avgSAT/avgACT and avgGPA where available

Always respond with structured JSON when requested.`;

const FINAL_JSON_INSTRUCTION = 'Return the final JSON synthesis now. Do not call any tools. Return only one JSON object with key "matches" using the canonical Pathway schema requested above.';

const TOOLS = [
  {
    name: 'search_programs',
    description: 'Search the school/program database by filters',
    input_schema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: 'School or program name keywords' },
        country: { type: 'string', description: 'Country filter' },
        degree: { type: 'string', description: 'Degree type (MBA, MS, PhD, Undergraduate, etc.)' },
        gmat: { type: 'number', description: 'Candidate GMAT score for compatibility filter (grad only)' },
        sat: { type: 'number', description: 'Candidate SAT score for compatibility filter (undergrad only)' },
        act: { type: 'number', description: 'Candidate ACT score for compatibility filter (undergrad only)' },
        gpa: { type: 'number', description: 'Candidate GPA for compatibility filter' },
        limit: { type: 'number', description: 'Max results to return' },
      },
    },
  },
];

export class MatchingAgent extends BaseAgent {
  constructor() {
    super({ name: 'MatchingAgent', systemPrompt: SYSTEM_PROMPT, maxTokens: 16000 });
  }

  async executeMatching(messages) {
    let result = await this.executeWithTools(messages, TOOLS);
    if (result.stopReason === 'tool_use' || !String(result.text || '').trim()) {
      result = await this.execute([
        ...(Array.isArray(result.history) ? result.history : messages),
        { role: 'user', content: FINAL_JSON_INSTRUCTION },
      ]);
    }
    return result;
  }

  async match(candidateId, preferences = {}, fallbackProfile = null) {
    const storedProfile = await getCandidateProfile(candidateId);
    const passedProfile = fallbackProfile || preferences?.profile || preferences;
    const profile = { ...(passedProfile || {}), ...(storedProfile || {}) };
    if (!Object.keys(profile).length) throw new Error('Candidate profile not found');

    const messages = [
      {
        role: 'user',
        content: `Match schools for this candidate now. Return ONLY final JSON with key "matches" containing at least 10 school objects in the canonical Pathway schema. Every object must have: "name", "tier" (exactly "safe", "possible", or "stretch"), "fit" (0-100), "location", "programGroup", "admissionStatus", "evidenceGaps" (array), "riskFlags" (array), "fitDrivers" (array), "programInfo" (approximately 40-60 words), and "notes". Do not use fitScore, reach/match/safety tiers, pros, cons, or recommendation. Use best-available evidence; unknown GPA/test/recommender detail must be represented as evidence gaps rather than blocking the list. If the candidate target geography is USA, include USA programs only. If geography is unknown, produce a global top-fit list and include geography clarification as an evidence gap. If you call search_programs, finish with a separate final JSON synthesis response after the tool result.\n\nCandidate profile:\n${JSON.stringify(profile, null, 2)}\n\nPreferences: ${JSON.stringify(preferences)}`,
      },
    ];

    return this.executeMatching(messages);
  }

  async matchUndergrad(candidateId, preferences = {}, pathwayType = null) {
    const profile = await getCandidateProfile(candidateId);
    if (!profile) throw new Error('Candidate profile not found');

    const grade = profile.grade || preferences.grade || 'unknown';
    const effectivePathway = pathwayType || profile.pathwayType || 'exploring';
    const isExploratory = parseInt(grade) <= 10 || effectivePathway === 'exploring';

    const pathwayInstruction = effectivePathway === 'focused'
      ? `Student knows they want to study ${profile.intendedMajor || 'their chosen field'}. Prioritize schools with strong programs in that area.`
      : effectivePathway === 'partial'
        ? `Student has a rough direction (${profile.intendedMajor || 'partially decided'}). Mix field-specific and broad/flexible programs.`
        : `Student is still exploring. Return versatile schools with strong liberal arts, many majors, and active campus life.`;

    const messages = [
      {
        role: 'user',
        content: `Match undergraduate universities for Grade ${grade} student. Return a JSON object with key "matches" containing at least 10 universities.\n\nPathway type: ${effectivePathway}\nInstruction: ${pathwayInstruction}\n${isExploratory ? 'Note: These are EXPLORATORY matches — focus on fit, culture, and direction rather than hard admission requirements.\n' : ''}\nEach school must include: name, tier ("stretch"|"possible"|"safe"), fit (0-100), location, programGroup ("Undergraduate"), admissionStatus, ${isExploratory ? '' : 'avgSAT (if known), avgACT (if known), avgGPA (if known), '}acceptanceRate (if known), fitDrivers (array of reasons this school fits), evidenceGaps (array), riskFlags (array), programInfo (approximately 40-60 words), and notes.\n\nStudent profile:\n${JSON.stringify(profile, null, 2)}\n\nPreferences: ${JSON.stringify(preferences)}`,
      },
    ];

    return this.executeMatching(messages);
  }

  async scoreSchool(candidateId, schoolName) {
    const profile = await getCandidateProfile(candidateId);
    const messages = [
      {
        role: 'user',
        content: `Score the fit between this candidate and "${schoolName}". Return JSON: { school, fitScore, tier, pros, cons, keyRisks, recommendation }.\n\nProfile: ${JSON.stringify(profile)}`,
      },
    ];
    return this.executeWithTools(messages, TOOLS);
  }

  async handleToolUse(toolUse) {
    if (toolUse.name === 'search_programs') return searchPrograms(toolUse.input);
    return super.handleToolUse(toolUse);
  }
}
