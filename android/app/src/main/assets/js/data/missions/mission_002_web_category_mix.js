import { ANALYSIS_TYPE, MISSION_DIFFICULTY, MISSION_PRIORITY, MISSION_VISIBILITY } from '../../domain/missions/missionTypes.js';

export const MISSION_002_ID = 'mission_002_web_category_mix';
export const MISSION_002_WEEK_WINDOW = {
  start: '2026-04-06',
  end: '2026-04-12'
};

export const mission002WebCategoryMix = {
  id: MISSION_002_ID,
  version: 2,
  title: 'Categoría líder dentro del canal Web',
  summary: 'Determinar qué categoría generó más revenue dentro del canal Web durante la misma semana comercial.',
  category: 'marketing_analytics',
  analysisType: ANALYSIS_TYPE.SALES_ANALYSIS,
  difficulty: MISSION_DIFFICULTY.JUNIOR,
  priority: MISSION_PRIORITY.MEDIUM,
  ambiguity: 'low',
  initiallyUnlocked: false,
  visibilityMode: MISSION_VISIBILITY.HIDDEN_UNTIL_UNLOCKED,
  prerequisites: ['mission_001_sales_cleaning'],
  stakeholder: {
    id: 'nico_ortega',
    name: 'Nicolás Ortega',
    role: 'Líder de Marketing'
  },
  schedule: {
    dayLabel: 'Lunes',
    hourLabel: '11:05',
    deadlineHours: 4.5,
    deadlineLabel: 'Hoy 18:00 · Revisión de marketing',
    weekWindow: { ...MISSION_002_WEEK_WINDOW }
  },
  objective: 'Determinar qué categoría generó más revenue dentro del canal Web durante la semana pasada.',
  narrative: 'Tras el comité comercial, marketing quiere profundizar el mismo dataset para entender qué categoría domina dentro del canal Web. El corte debe mantenerse limpio, comparable y ejecutivamente usable.',
  business_goal: 'Identificar qué categoría domina el revenue digital para orientar foco de campaña y creatividad comercial.',
  analytical_goal: 'Trabajar sobre sales_clean, mantener el corte semanal, filtrar pedidos completados del canal Web y agrupar por categoría.',
  pressureNote: 'No alcanza con volumen bruto general: el foco es categoría líder dentro del canal Web.',
  executiveAudience: 'Equipo de Marketing',
  starterQuery: `SELECT
  product_category,
  SUM(amount) AS total_amount,
  COUNT(*) AS orders
FROM sales_clean
WHERE status_norm = 'completed'
  AND sale_date >= '2026-04-06'
  AND sale_date <= '2026-04-12'
  AND sales_channel = 'Web'
GROUP BY product_category
ORDER BY total_amount DESC;`,
  datasets: [
    {
      id: 'sales_dirty_csv',
      name: 'sales_dirty.csv',
      type: 'csv',
      label: 'Raw export',
      status: 'Reutilizado desde misión comercial',
      path: 'data/mission_002_web_category_mix/raw/sales_dirty.csv',
      loadMode: 'required'
    }
  ],
  context: {
    files: ['brief_web_category_mix.md'],
    notes: ['Mantener exactamente la misma ventana semanal usada en la misión comercial.'],
    attachments: [
      {
        id: 'sales_dirty_csv',
        name: 'sales_dirty.csv',
        type: 'csv',
        label: 'Raw export',
        status: 'Reutilizado desde misión comercial',
        path: 'data/mission_002_web_category_mix/raw/sales_dirty.csv'
      },
      {
        id: 'mission_json',
        name: 'mission.json',
        type: 'json',
        label: 'Brief de misión',
        status: 'Contexto operativo',
        path: 'data/mission_002_web_category_mix/mission.json'
      },
      {
        id: 'schema_json',
        name: 'schema.json',
        type: 'json',
        label: 'Analysis schema',
        status: 'Estructura de análisis',
        path: 'data/mission_002_web_category_mix/schema.json'
      }
    ]
  },
  deliverables: {
    sql: {
      required: true,
      targetTable: 'sales_clean',
      primaryMetric: 'total_amount'
    },
    chart: {
      required: true,
      allowedTypes: ['bar', 'column'],
      preferredType: 'bar'
    },
    executiveSummary: {
      required: true,
      minLength: 48
    }
  },
  validation: {
    rules: [
      { type: 'sql_uses_table', table: 'sales_clean', severity: 'hard' },
      { type: 'sql_has_group_by', severity: 'hard' },
      { type: 'sql_uses_sum', severity: 'hard' },
      { type: 'sql_filters_week_window', start: MISSION_002_WEEK_WINDOW.start, end: MISSION_002_WEEK_WINDOW.end, severity: 'hard' },
      { type: 'sql_filters_status', value: 'completed', severity: 'hard' },
      { type: 'sql_filters_field_value', field: 'sales_channel', value: 'Web', severity: 'hard' },
      { type: 'result_matches_winner', fieldCandidates: ['product_category', 'category'], expected: 'SaaS', severity: 'hard' },
      { type: 'report_metric_matches', expected: 'total_amount', severity: 'soft' },
      { type: 'report_chart_type', expected: 'bar', severity: 'soft' },
      { type: 'report_conclusion_mentions', expectedAny: ['saas', 'web'], severity: 'soft' }
    ]
  },
  scoring: {
    weights: {
      technical: 0.5,
      reporting: 0.3,
      businessCommunication: 0.2
    },
    thresholds: {
      excellent: 90,
      solid: 75,
      acceptable: 60
    },
    deltas: {
      success: { prestige: 18, score: 10 },
      failure: { prestige: -2, score: 1 }
    }
  },
  expectedAnswer: {
    winningChannel: 'SaaS'
  },
  rewards: {
    prestige: 18,
    technicalScore: 10,
    unlockSkills: [
      'channel_segmentation',
      'category_mix_analysis',
      'marketing_reporting'
    ]
  },
  outcomes: {
    excellent: 'approved_clean',
    solid: 'approved',
    acceptable: 'approved_with_notes',
    poor: 'revision_requested'
  },
  followups: []
};
