// Thin, validated tool layer for lib/agents/UndergradAgent.js (the
// UNDERGRAD_SMART_AGENT-gated replacement for the 13-agent
// UndergradMasterAgent roster). Every tool wraps EXISTING storage
// primitives (lib/undergrad/store.js, lib/undergrad/schemas.js,
// lib/agents/tools/update.js, lib/known-admit-rates.js) — no new storage
// layer. Server-side validation lives here, never in the system prompt.
//
// Tools that mutate per-turn conversational state (profile facts, tasks,
// calendar events, university list, progress snapshots) write into the
// mutable `ctx` accumulator the caller (UndergradAgent.handle) passes in,
// so a later tool call in the SAME turn sees earlier writes (the
// already_saved / don't-ask-twice guards) without a round trip to the
// store. UndergradAgent.handle folds the final ctx into the statePatch it
// returns; the actual persistence happens the same way every other
// Undergraduate turn already persists (api/advisor.js's persistStatePatch).
//
// Tools backed by real, candidate-independent storage (essay documents)
// write straight through via lib/agents/tools/update.js, since there is
// nowhere else for that data to live in the statePatch.
import { makeTask, makeCalendarEvent } from '../../undergrad/schemas.js';
import { upsertTask, upsertCalendarEvent } from '../../undergrad/store.js';
import { recordProgress, latestProgress } from '../../undergrad/agents/profile-progress-agent.js';
import { saveDocument, getDocuments } from './update.js';
import { lookupAdmitRate } from '../../known-admit-rates.js';
import { getCandidateActivity } from '../../candidate-activity.js';
import { getStore } from '../../store.js';
import { computeRoadmapGaps, applySessionSummary } from '../../undergrad/roadmap-milestones.js';

// Matches the flat candidate profile fields the rest of the Undergraduate
// path already reads (lib/undergrad-profile.js, lib/undergrad/stage-tracker.js
// via UndergradMasterAgent's deriveStageInput) — NOT the separate
// lib/undergrad/store.js engine "profile" (an area -> facts[] structure
// nagger-agent.js/control-tower.js read from candidateState.undergrad.profile).
const PROFILE_FACT_FIELDS = new Set([
  'grade', 'curriculum', 'gpa', 'subjects', 'activities', 'strongestActivity',
  'leadership', 'awardsProjects', 'tests', 'intendedMajor', 'countries',
  'universityStyle', 'pathwayType', 'interests', 'storySeeds',
  'affordabilityPreference', 'targetRegions', 'sizeTier', 'setting',
]);

const TIER_TO_FIT = { reach: 35, target: 65, likely: 90 };
const END_TURN_CHAT_LIMIT = 400;

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isFutureIsoDate(value, now) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > now;
}

function parseGrade(grade) {
  const numeric = Number(String(grade ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function truncateAtSentence(text, max) {
  const clean = String(text || '');
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max);
  const lastBoundary = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '));
  return (lastBoundary > 20 ? clipped.slice(0, lastBoundary + 1) : clipped).trim();
}

function areaLabel(value) {
  return String(value || '').trim() || null;
}

// ---- Individual tool implementations ---------------------------------

async function getCandidateStateTool(candidateId, ctx) {
  const documents = await getDocuments(candidateId).catch(() => []);
  let conversationTurnsToday;
  try {
    const activity = await getCandidateActivity(candidateId);
    const todayKey = new Date(ctx.now).toISOString().slice(0, 10);
    conversationTurnsToday = (activity || []).filter(
      event => event?.type === 'request' && new Date(Number(event.at || 0)).toISOString().slice(0, 10) === todayKey,
    ).length;
  } catch {
    conversationTurnsToday = undefined;
  }

  const roadmapGaps = computeRoadmapGaps({
    profile: ctx.workingProfile,
    undergrad: ctx.workingUndergrad,
    programs: ctx.workingPrograms,
    documents,
  }).slice(0, 3);

  return {
    profile: ctx.workingProfile,
    tasks: ctx.workingUndergrad.tasks,
    calendar: ctx.workingUndergrad.calendar,
    reminders: ctx.workingUndergrad.reminders,
    progress: latestProgress(ctx.workingUndergrad),
    lastTopics: ctx.workingProfile.undergradStageTracker?.lastTopics || [],
    roadmapGaps,
    lastSessionSummary: ctx.workingUndergrad.lastSessionSummary?.text || null,
    documents: (documents || []).map(doc => ({ id: doc.id, name: doc.name, type: doc.type })),
    consultantInstruction: ctx.workingProfile.consultantNotes?.aiInstruction || null,
    ...(conversationTurnsToday !== undefined ? { conversationTurnsToday } : {}),
  };
}

function lookupSchoolDataTool({ schoolName } = {}) {
  const found = lookupAdmitRate(schoolName);
  if (!found) return { found: false, data: null };
  return { found: true, data: { schoolName, admitRate: found.admitRate, admitRateSource: found.admitRateSource } };
}

async function getDocumentTool(candidateId, { documentId } = {}) {
  const documents = await getDocuments(candidateId).catch(() => []);
  const doc = (documents || []).find(d => d.id === documentId);
  if (!doc) return { found: false };
  return { found: true, id: doc.id, name: doc.name, type: doc.type, content: doc.content };
}

function saveProfileFactTool(ctx, { field, value } = {}) {
  if (!PROFILE_FACT_FIELDS.has(field)) return { error: 'invalid_field', field };
  if (deepEqual(ctx.workingProfile[field], value)) return { status: 'already_saved', field };
  ctx.workingProfile = { ...ctx.workingProfile, [field]: value };
  if (!ctx.primaryArea) ctx.primaryArea = field;
  return { status: 'saved', field };
}

function saveTaskTool(ctx, { title, area, deadline, priority } = {}) {
  if (!title) return { error: 'missing_title' };
  if (deadline && !isFutureIsoDate(deadline, ctx.now)) return { error: 'invalid_deadline' };
  const task = makeTask({ candidateId: ctx.candidateId, title, area, deadline, priority }, ctx.now);
  ctx.workingUndergrad = upsertTask(ctx.workingUndergrad, task, ctx.now);
  ctx.undergradDirty = true;
  if (!ctx.primaryArea) ctx.primaryArea = areaLabel(task.area) || 'task';
  return { status: 'saved', id: task.id };
}

function saveCalendarEventTool(ctx, { title, date, type } = {}) {
  if (!title || !date) return { error: 'missing_fields' };
  if (!isFutureIsoDate(date, ctx.now)) return { error: 'invalid_date' };
  const event = makeCalendarEvent({ candidateId: ctx.candidateId, title, date, type }, ctx.now);
  ctx.workingUndergrad = upsertCalendarEvent(ctx.workingUndergrad, event, ctx.now);
  ctx.undergradDirty = true;
  if (!ctx.primaryArea) ctx.primaryArea = areaLabel(event.type) || 'calendar';
  return { status: 'saved', id: event.id };
}

function saveUniversityListTool(ctx, { schools } = {}) {
  const missing = [];
  if (!ctx.workingProfile.grade) missing.push('grade');
  if (!ctx.workingProfile.subjects && !ctx.workingProfile.intendedMajor) missing.push('subjects_or_intendedMajor');
  if (missing.length) return { error: 'profile_incomplete', missing };

  if (!Array.isArray(schools) || !schools.length) return { error: 'missing_schools' };
  for (const school of schools) {
    if (!school?.name || !['reach', 'target', 'likely'].includes(school?.tier)) return { error: 'invalid_school', school };
    if (!['db', 'web', 'estimate'].includes(school?.selectivitySource)) return { error: 'missing_selectivity_source', school: school?.name };
  }

  const next = [...ctx.workingPrograms];
  for (const school of schools) {
    const known = lookupAdmitRate(school.name);
    const admitRateSource = school.selectivitySource === 'db'
      ? (known?.admitRateSource || 'Known database')
      : school.selectivitySource === 'web' ? 'Web search' : 'AI estimate';
    const entry = {
      name: school.name,
      fit: TIER_TO_FIT[school.tier],
      requestedTier: school.tier,
      admitRate: known?.admitRate ?? null,
      admitRateSource,
      notes: school.notes || '',
    };
    const idx = next.findIndex(p => String(p.name || '').toLowerCase() === school.name.toLowerCase());
    if (idx === -1) next.push(entry);
    else next[idx] = { ...next[idx], ...entry };
  }
  ctx.workingPrograms = next;
  ctx.programsDirty = true;
  if (!ctx.primaryArea) ctx.primaryArea = 'university_list';
  return { status: 'saved', count: schools.length };
}

async function saveEssayMaterialTool(ctx, { kind, title, content } = {}) {
  if (!['story', 'draft'].includes(kind)) return { error: 'invalid_kind' };
  if (!title || !content) return { error: 'missing_fields' };
  const grade = parseGrade(ctx.workingProfile.grade);
  if (kind === 'draft' && grade !== null && grade < 11) return { error: 'story_bank_only_for_now' };
  const doc = await saveDocument(ctx.candidateId, { name: title, type: `essay_${kind}`, content });
  if (!ctx.primaryArea) ctx.primaryArea = 'essay';
  return { status: 'saved', id: doc.id };
}

function saveProgressSnapshotTool(ctx, { scores, note } = {}) {
  const before = ctx.workingUndergrad.progress.length;
  const next = recordProgress(ctx.workingUndergrad, scores, { candidateId: ctx.candidateId, now: ctx.now, note });
  if (next.progress.length === before) return { status: 'no_change' };
  ctx.workingUndergrad = next;
  ctx.undergradDirty = true;
  if (!ctx.primaryArea) ctx.primaryArea = 'progress';
  return { status: 'saved' };
}

// Reads the real, seeded community group index (api/community-groups.js's
// `community:groups:all` set / `community:group:${id}` records — the same
// store the Community tab reads). Deliberately does NOT reuse
// lib/db.js's getCommunityGroups(), which is scoped to the join-eligibility
// check (requires the candidate's selectedSchools and throws on category
// mismatch); this is an open discovery lookup, so it filters loosely by
// topic/level instead and never widens to schools the candidate hasn't
// chosen. Only ever returns groups that actually exist in the store — the
// whole point is to make fabrication structurally impossible.
async function findCommunityGroupTool(ctx, { topic, level } = {}) {
  const store = getStore();
  const groupIds = (await store.smembers('community:groups:all')) || [];
  const topicNeedle = String(topic || '').toLowerCase().trim();
  const levelNeedle = String(level || '').toLowerCase().trim();
  const matches = [];
  for (const groupId of groupIds) {
    // eslint-disable-next-line no-await-in-loop
    const group = await store.get(`community:group:${groupId}`);
    if (!group || group.category !== 'Undergraduate') continue;
    const haystack = `${group.name || ''} ${group.school || ''} ${group.program || ''}`.toLowerCase();
    if (topicNeedle && !haystack.includes(topicNeedle)) continue;
    if (levelNeedle && String(group.grade || '').toLowerCase() !== levelNeedle) continue;
    matches.push({ id: groupId, name: group.name, school: group.school || null, program: group.program || null, grade: group.grade || null });
  }
  const top = matches.slice(0, 5);
  top.forEach(group => ctx.knownChannels.set(group.id, group));
  if (!top.length) return { found: false, alternatives: [] };
  return { found: true, groups: top };
}

function saveCommunityJoinIntentTool(ctx, { channelId } = {}) {
  const group = ctx.knownChannels.get(channelId);
  if (!group) return { error: 'unknown_channel' };
  const task = makeTask({
    candidateId: ctx.candidateId,
    title: `Join community group: ${group.name}`,
    description: [group.school, group.program].filter(Boolean).join(' · '),
    area: 'Activities',
    priority: 'low',
  }, ctx.now);
  ctx.workingUndergrad = upsertTask(ctx.workingUndergrad, task, ctx.now);
  ctx.undergradDirty = true;
  if (!ctx.primaryArea) ctx.primaryArea = 'community';
  return { status: 'saved', id: task.id, groupName: group.name };
}

// Called at session close (goodbye) to leave a one-line breadcrumb the next
// session's get_candidate_state call returns as lastSessionSummary, so the
// agent can open a returning student's next session with a warm callback
// instead of a generic greeting.
function saveSessionSummaryTool(ctx, { summary } = {}) {
  const text = String(summary || '').trim();
  if (!text) return { error: 'missing_summary' };
  ctx.workingUndergrad = applySessionSummary(ctx.workingUndergrad, text, ctx.now);
  ctx.undergradDirty = true;
  return { status: 'saved' };
}

function endTurnResponseTool(ctx, { message, options } = {}) {
  let text = String(message || '').trim();
  if (ctx.surface === 'chat' && text.length > END_TURN_CHAT_LIMIT) {
    console.warn(`[UndergradAgent] end_turn_response message truncated from ${text.length} to ${END_TURN_CHAT_LIMIT} chars for candidate ${ctx.candidateId}`);
    text = truncateAtSentence(text, END_TURN_CHAT_LIMIT);
  }
  const cleanOptions = Array.isArray(options) ? options.map(o => String(o || '').trim()).filter(Boolean).slice(0, 4) : [];
  return { terminal: true, message: text, options: cleanOptions };
}

// ---- Tool schemas (Anthropic tool-use format) --------------------------

export const UNDERGRAD_TOOLS = [
  {
    name: 'get_candidate_state',
    description: 'Get the current candidate profile, tasks, calendar, reminders, latest progress snapshot, recently covered topics, saved document names/types, and any consultant instruction. Call this before asking about anything the student may already have told you.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'lookup_school_data',
    description: 'Look up known admit-rate data for a university by name. Never throws on a miss; returns found:false instead.',
    input_schema: {
      type: 'object',
      properties: { schoolName: { type: 'string' } },
      required: ['schoolName'],
    },
  },
  {
    name: 'get_document',
    description: 'Fetch the full text of a previously saved document (essay material, uploaded file) by its id.',
    input_schema: {
      type: 'object',
      properties: { documentId: { type: 'string' } },
      required: ['documentId'],
    },
  },
  {
    name: 'save_profile_fact',
    description: 'Save one factual profile field the student mentioned. Whitelisted fields only: grade, curriculum, gpa, subjects, activities, strongestActivity, leadership, awardsProjects, tests, intendedMajor, countries, universityStyle, pathwayType, interests, storySeeds, affordabilityPreference, targetRegions, sizeTier, setting.',
    input_schema: {
      type: 'object',
      properties: {
        field: { type: 'string', enum: [...PROFILE_FACT_FIELDS] },
        value: {},
      },
      required: ['field', 'value'],
    },
  },
  {
    name: 'save_task',
    description: 'Save a next-step task for the student.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        area: { type: 'string' },
        deadline: { type: 'string', description: 'ISO date, must be in the future, optional' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      },
      required: ['title', 'area'],
    },
  },
  {
    name: 'save_calendar_event',
    description: 'Save a calendar event (test date, deadline, milestone) for the student. Date must be an ISO date in the future.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string' },
        type: { type: 'string' },
      },
      required: ['title', 'date', 'type'],
    },
  },
  {
    name: 'save_university_list',
    description: 'Save or update the student\'s tiered university list. Requires the student\'s grade plus subjects or intended major to already be known. Every school needs a selectivitySource describing how its tier was determined.',
    input_schema: {
      type: 'object',
      properties: {
        schools: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              tier: { type: 'string', enum: ['reach', 'target', 'likely'] },
              selectivitySource: { type: 'string', enum: ['db', 'web', 'estimate'] },
              notes: { type: 'string' },
            },
            required: ['name', 'tier', 'selectivitySource'],
          },
        },
      },
      required: ['schools'],
    },
  },
  {
    name: 'save_essay_material',
    description: 'Save essay/story material the student shared. kind:"draft" is only available from grade 11 onward; use kind:"story" for raw story-bank material at any grade.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['story', 'draft'] },
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['kind', 'title', 'content'],
    },
  },
  {
    name: 'save_progress_snapshot',
    description: 'Record a progress snapshot across readiness dimensions when something meaningful changed this turn.',
    input_schema: {
      type: 'object',
      properties: {
        scores: { type: 'object' },
        note: { type: 'string' },
      },
      required: ['scores'],
    },
  },
  {
    name: 'find_community_group',
    description: 'Search the real, seeded community groups for one matching a topic (and optionally a grade/level). Never returns a group that does not actually exist; returns found:false with no alternatives when there is no real match. Do not invent a group name, tier, or membership when this returns found:false.',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        level: { type: 'string' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'save_community_join_intent',
    description: 'Record the student\'s intent to join a real community group. channelId must be an id returned by a prior find_community_group call in this same conversation; any other id is rejected.',
    input_schema: {
      type: 'object',
      properties: { channelId: { type: 'string' } },
      required: ['channelId'],
    },
  },
  {
    name: 'save_session_summary',
    description: 'Save a one-line breadcrumb of where this session left off, so the next session can open with a warm callback instead of a generic greeting. Call this once, right before end_turn_response, whenever the student is ending the session (Goodbye, "bye", "gotta go", etc.).',
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary'],
    },
  },
  {
    name: 'end_turn_response',
    description: 'The only way to reply to the student. Always call this last, exactly once, to end your turn. options may be an empty array when giving a substantive answer — do not manufacture chip options just to fill 2-4 slots.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        options: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 4 },
      },
      required: ['message'],
    },
  },
];

// Dispatches one tool_use block. Never throws — always resolves to a plain
// object suitable for JSON.stringify() as the tool_result content, so a
// malformed/unexpected call degrades gracefully instead of crashing the
// conversation turn.
export async function executeUndergradTool(candidateId, toolUse, ctx) {
  const input = toolUse?.input || {};
  try {
    switch (toolUse?.name) {
      case 'get_candidate_state': return await getCandidateStateTool(candidateId, ctx);
      case 'lookup_school_data': return lookupSchoolDataTool(input);
      case 'get_document': return await getDocumentTool(candidateId, input);
      case 'save_profile_fact': return saveProfileFactTool(ctx, input);
      case 'save_task': return saveTaskTool(ctx, input);
      case 'save_calendar_event': return saveCalendarEventTool(ctx, input);
      case 'save_university_list': return saveUniversityListTool(ctx, input);
      case 'save_essay_material': return await saveEssayMaterialTool(ctx, input);
      case 'save_progress_snapshot': return saveProgressSnapshotTool(ctx, input);
      case 'save_session_summary': return saveSessionSummaryTool(ctx, input);
      case 'find_community_group': return await findCommunityGroupTool(ctx, input);
      case 'save_community_join_intent': return saveCommunityJoinIntentTool(ctx, input);
      case 'end_turn_response': return endTurnResponseTool(ctx, input);
      default: return { error: 'unknown_tool', name: toolUse?.name || null };
    }
  } catch (err) {
    return { error: 'tool_execution_failed', message: String(err?.message || err) };
  }
}

export { PROFILE_FACT_FIELDS };
