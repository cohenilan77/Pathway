import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { getStore } from './store.js';

export const KPI_EXCEL_PATH = path.join(process.cwd(), 'data', 'admissions_kpi_universe_expanded.xlsx');
export const KPI_STORE_KEY = 'admissions:kpi:live';

const SHEETS_TO_IMPORT = [
  'Universities_Master',
  'Program_KPI_Rubrics',
  'School_Program_KPI',
  'Student_Action_Playbook',
  'Source_Registry',
  'Risk_Compliance',
  'U_Program_Taxonomy',
  'U_Subject_Taxonomy',
  'U_KPI_Rule_Engine',
  'U_Action_Gap_Rules',
  'U_KPI_Weights',
];

function cleanValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return value;
}

function sheetToRows(workbook, sheetName, limit = 500) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  return rows.slice(0, limit).map((row) => {
    const next = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = String(key || '').trim();
      if (cleanKey) next[cleanKey] = cleanValue(value);
    }
    return next;
  });
}

function buildPromptSummary(data) {
  const universities = data.sheets.Universities_Master || [];
  const schoolPrograms = data.sheets.School_Program_KPI || [];
  const rubrics = data.sheets.Program_KPI_Rubrics || [];
  const ruleEngine = data.sheets.U_KPI_Rule_Engine || [];
  const actionRules = data.sheets.U_Action_Gap_Rules || [];
  const programTaxonomy = data.sheets.U_Program_Taxonomy || [];
  const subjectTaxonomy = data.sheets.U_Subject_Taxonomy || [];
  const kpiWeights = data.sheets.U_KPI_Weights || [];
  const riskRules = data.sheets.Risk_Compliance || [];
  const sources = data.sheets.Source_Registry || [];

  const sampleUniversities = universities.slice(0, 80).map((u) => (
    `${u.university} (${u.country || u.region}; ${u.selectivity_tier || 'selectivity unknown'})`
  ));

  const samplePrograms = schoolPrograms.slice(0, 160).map((p) => (
    `${p.university} | ${p.program_group} | ${p.selectivity_tier} | Gate: ${p.baseline_gate} | KPIs: ${p.admission_office_kpis}`
  ));

  const rubricLines = rubrics.slice(0, 40).map((r) => (
    `${r.program_group} (${r.region_model}): ${r.kpi_1} ${r.weight_1}%, ${r.kpi_2} ${r.weight_2}%, ${r.kpi_3} ${r.weight_3}%, ${r.kpi_4} ${r.weight_4}%, ${r.kpi_5} ${r.weight_5}%`
  ));

  const ruleLines = ruleEngine.slice(0, 80).map((r) => (
    `${r.region_group} ${r.program_group} ${r.subject_family}: baseline=${r.baseline_gate}; KPI=${r.competitive_kpi}; evidence=${r.evidence_to_collect}`
  ));

  const taxonomyLines = programTaxonomy.slice(0, 20).map((r) => (
    `${r.top_level_group} | ${r.program_group} | examples=${r.degree_examples}; hard_gate=${r.hard_gate_first}; KPIs=${r.main_kpis}; instruction=${r.AI_instruction_goal}`
  ));

  const subjectLines = subjectTaxonomy.slice(0, 60).map((r) => (
    `${r.subject_family}: ${r.baseline_evidence_needed}`
  ));

  const weightLines = kpiWeights.slice(0, 20).map((r) => (
    `${r.program_group}: academic=${r.academic_readiness}, prerequisites=${r.subject_prerequisite_fit}, leadership=${r.leadership_impact}, research=${r.research_fit}, career=${r.career_logic}, writing=${r.writing_story_fit}, recs=${r.recommendations}, portfolio/interview=${r.portfolio_interview}, admin=${r.admin_language_funding}; ${r.notes}`
  ));

  const riskLines = riskRules.slice(0, 20).map((r) => (
    `${r.risk_area}: ${r.rule_for_app} (${r.implementation_note})`
  ));

  const actionLines = actionRules.slice(0, 40).map((r) => (
    `${r.gap_code} (${r.applies_to}): ${r.student_instruction}`
  ));

  const sourceLines = sources.slice(0, 20).map((s) => `${s.source_name}: ${s.url}`);

  return [
    'LIVE ADMISSIONS KPI DATABASE — use this as the first source for university/program recommendations, KPI scoring, hard gates, evidence gaps, and student action items.',
    `Imported at: ${data.importedAt}`,
    `Workbook: ${data.sourceFile}`,
    '',
    'University seed list:',
    sampleUniversities.join('\n'),
    '',
    'Program KPI examples:',
    samplePrograms.join('\n'),
    '',
    'Program KPI rubrics:',
    rubricLines.join('\n'),
    '',
    'Universal program taxonomy:',
    taxonomyLines.join('\n'),
    '',
    'Subject-family evidence requirements:',
    subjectLines.join('\n'),
    '',
    'Universal KPI weights:',
    weightLines.join('\n'),
    '',
    'Rule engine examples:',
    ruleLines.join('\n'),
    '',
    'Gap/action rules:',
    actionLines.join('\n'),
    '',
    'Risk/compliance rules:',
    riskLines.join('\n'),
    '',
    'Source registry examples:',
    sourceLines.join('\n'),
    '',
    'Instructions: prefer this live database over generic memory. If exact data is missing, say it needs verification, use the closest matching program_group/region rule, and do not invent exact official requirements.',
  ].join('\n').slice(0, 45000);
}

export function loadKpiWorkbook() {
  if (!fs.existsSync(KPI_EXCEL_PATH)) {
    throw new Error(`KPI Excel file not found at ${KPI_EXCEL_PATH}`);
  }
  const workbook = XLSX.readFile(KPI_EXCEL_PATH);
  const sheets = {};
  for (const sheetName of SHEETS_TO_IMPORT) {
    sheets[sheetName] = sheetToRows(workbook, sheetName);
  }
  const data = {
    version: 1,
    sourceFile: 'data/admissions_kpi_universe_expanded.xlsx',
    importedAt: new Date().toISOString(),
    sheets,
  };
  data.promptSummary = buildPromptSummary(data);
  data.counts = Object.fromEntries(Object.entries(sheets).map(([name, rows]) => [name, rows.length]));
  return data;
}

export async function refreshLiveKpiDatabase() {
  const data = loadKpiWorkbook();
  await getStore().set(KPI_STORE_KEY, data);
  return data;
}

export async function getLiveKpiDatabase() {
  return getStore().get(KPI_STORE_KEY);
}

export async function getKpiPromptSummary() {
  const live = await getLiveKpiDatabase();
  if (live?.promptSummary) return live.promptSummary;
  try {
    const fromWorkbook = loadKpiWorkbook();
    return fromWorkbook.promptSummary;
  } catch {
    return '';
  }
}
