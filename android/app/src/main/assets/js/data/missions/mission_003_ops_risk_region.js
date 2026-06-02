
import { ANALYSIS_TYPE, MISSION_DIFFICULTY, MISSION_PRIORITY, MISSION_VISIBILITY } from '../../domain/missions/missionTypes.js';

export const MISSION_003_ID = 'mission_003_ops_risk_region';
export const MISSION_003_WEEK_WINDOW = {
  start: '2026-04-06',
  end: '2026-04-12'
};

export const mission003OpsRiskRegion = {
  id: MISSION_003_ID,
  version: 1,
  title: 'Región con más pedidos problemáticos',
  summary: 'Identificar la región con más pedidos problemáticos durante la semana para priorizar seguimiento operativo.',
  category: 'operations_analytics',
  analysisType: ANALYSIS_TYPE.MARKETING_ANALYSIS,
  difficulty: MISSION_DIFFICULTY.JUNIOR,
  priority: MISSION_PRIORITY.HIGH,
  ambiguity: 'medium',
  initiallyUnlocked: false,
  visibilityMode: MISSION_VISIBILITY.HIDDEN_UNTIL_UNLOCKED,
  prerequisites: ['mission_001_sales_cleaning'],
  stakeholder: {
    id: 'lucia_ferraro',
    name: 'Lucía Ferraro',
    role: 'Operations Lead'
  },
  schedule: {
    dayLabel: 'Lunes',
    hourLabel: '13:05',
    deadlineHours: 2.5,
    deadlineLabel: 'Hoy 15:45 · Corte operativo',
    weekWindow: { ...MISSION_003_WEEK_WINDOW }
  },
  objective: 'Determinar qué región concentra más pedidos problemáticos durante la semana pasada.',
  narrative: 'Operaciones detectó fricción en la postventa y necesita una lectura rápida de dónde se están acumulando pedidos no completados para priorizar seguimiento del equipo.',
  business_goal: 'Priorizar la región con mayor presión operativa por pedidos problemáticos.',
  analytical_goal: 'Usar sales_clean, mantener el mismo corte semanal y agrupar por región considerando pending, refunded o cancelled.',
  pressureNote: 'No hace falta un análisis largo: hace falta una región prioritaria y un criterio operativo claro.',
  executiveAudience: 'Mesa operativa',
  starterQuery: `SELECT
  region,
  COUNT(*) AS issue_orders,
  SUM(amount) AS impacted_amount
FROM sales_clean
WHERE sale_date >= '2026-04-06'
  AND sale_date <= '2026-04-12'
  AND status_norm IN ('pending', 'refunded', 'cancelled')
GROUP BY region
ORDER BY issue_orders DESC, impacted_amount DESC;`,
  datasets: [
    {
      id: 'sales_dirty_csv',
      name: 'sales_dirty.csv',
      type: 'csv',
      label: 'Raw export reutilizado',
      status: 'Mismo export limpio para operaciones',
      path: 'data/mission_003_ops_risk_region/raw/sales_dirty.csv',
      loadMode: 'required'
    }
  ],
  context: {
    files: ['brief_ops_risk_region.md'],
    notes: ['Contar como problemáticos pending, refunded y cancelled.'],
    attachments: [
      {
        id: 'sales_dirty_csv',
        name: 'sales_dirty.csv',
        type: 'csv',
        label: 'Raw export reutilizado',
        status: 'Disponible tras follow-up operativo',
        path: 'data/mission_003_ops_risk_region/raw/sales_dirty.csv'
      },
      {
        id: 'mission_json',
        name: 'mission.json',
        type: 'json',
        label: 'Brief de misión',
        status: 'Contexto operativo',
        path: 'data/mission_003_ops_risk_region/mission.json'
      },
      {
        id: 'schema_json',
        name: 'schema.json',
        type: 'json',
        label: 'Analysis schema',
        status: 'Estructura de análisis',
        path: 'data/mission_003_ops_risk_region/schema.json'
      }
    ]
  },
  deliverables: {
    sql: { required: true, targetTable: 'sales_clean', primaryMetric: 'issue_orders' },
    chart: { required: true, allowedTypes: ['bar', 'column'], preferredType: 'bar' },
    executiveSummary: { required: true, minLength: 48 }
  },
  validation: {
    rules: [
      { type: 'sql_uses_table', table: 'sales_clean', severity: 'hard' },
      { type: 'sql_has_group_by', severity: 'hard' },
      { type: 'sql_filters_week_window', start: MISSION_003_WEEK_WINDOW.start, end: MISSION_003_WEEK_WINDOW.end, severity: 'hard' },
      { type: 'sql_mentions_all_values', field: 'status_norm', values: ['pending', 'refunded', 'cancelled'], severity: 'hard' },
      { type: 'result_matches_winner', fieldCandidates: ['region'], expected: 'East', severity: 'hard' },
      { type: 'report_metric_matches', expected: 'issue_orders', severity: 'soft' },
      { type: 'report_chart_type', expected: 'bar', severity: 'soft' },
      { type: 'report_conclusion_mentions', expectedAny: ['east', 'operativa', 'riesgo'], severity: 'soft' }
    ]
  },
  scoring: {
    weights: {
      technical: 0.5,
      reporting: 0.3,
      businessCommunication: 0.2
    },
    thresholds: { excellent: 90, solid: 75, acceptable: 60 },
    deltas: { success: { prestige: 16, score: 9 }, failure: { prestige: -2, score: 1 } }
  },
  expectedAnswer: { winningChannel: 'East' },
  rewards: {
    prestige: 16,
    technicalScore: 9,
    unlockSkills: ['ops_risk_triage', 'status_segmentation', 'priority_switching']
  },
  outcomes: {
    excellent: 'approved_clean',
    solid: 'approved',
    acceptable: 'approved_with_notes',
    poor: 'revision_requested'
  },
  followups: []
};
