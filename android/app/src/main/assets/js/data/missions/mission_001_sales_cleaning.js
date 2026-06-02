import { ANALYSIS_TYPE, MISSION_DIFFICULTY, MISSION_PRIORITY, MISSION_VISIBILITY } from '../../domain/missions/missionTypes.js';
import { MISSION_001_ID, MISSION_001_WEEK_WINDOW } from '../../app/constants.js';

export const mission001SalesCleaning = {
  id: MISSION_001_ID,
  version: 3,
  title: 'Canal semanal con mayor venta',
  summary: 'Determinar qué canal generó mayor venta durante la semana pasada con una base limpia y defendible.',
  category: 'commercial_analytics',
  analysisType: ANALYSIS_TYPE.SALES_ANALYSIS,
  difficulty: MISSION_DIFFICULTY.JUNIOR,
  priority: MISSION_PRIORITY.HIGH,
  ambiguity: 'low',
  initiallyUnlocked: true,
  visibilityMode: MISSION_VISIBILITY.VISIBLE,
  prerequisites: [],
  stakeholder: {
    id: 'carla_mendez',
    name: 'Carla Méndez',
    role: 'Gerente Comercial'
  },
  schedule: {
    dayLabel: 'Lunes',
    hourLabel: '09:10',
    deadlineHours: 7.5,
    deadlineLabel: 'Hoy 16:30 · Comité comercial',
    weekWindow: { ...MISSION_001_WEEK_WINDOW }
  },
  objective: 'Determinar qué canal generó mayor venta durante la semana pasada con una base limpia y defendible.',
  narrative: 'Primera semana laboral. El gerente comercial necesita una respuesta ejecutiva sobre qué canal vendió más la semana pasada, pero el export llegó sucio: hay fechas mezcladas, duplicados, montos vacíos y estados no normalizados.',
  business_goal: 'Responder con claridad qué canal generó mayor volumen de ventas dentro de la semana pedida y dejar la respuesta lista para comité.',
  analytical_goal: 'Normalizar el export, eliminar duplicados, filtrar registros válidos, agrupar por canal y evaluar el total vendido por canal.',
  pressureNote: 'La respuesta debe poder reenviarse sin contexto técnico extra.',
  executiveAudience: 'Comité comercial',
  datasets: [
    {
      id: 'sales_dirty_csv',
      name: 'sales_dirty.csv',
      type: 'csv',
      label: 'Raw export',
      status: 'Pendiente de revisión',
      path: 'data/mission_001_sales_cleaning/raw/sales_dirty.csv',
      loadMode: 'required'
    }
  ],
  context: {
    files: ['brief_weekly_sales.md'],
    notes: ['Usar solo ventas completadas dentro de la ventana semanal.'],
    attachments: [
      {
        id: 'sales_dirty_csv',
        name: 'sales_dirty.csv',
        type: 'csv',
        label: 'Raw export',
        status: 'Pendiente de revisión',
        path: 'data/mission_001_sales_cleaning/raw/sales_dirty.csv'
      },
      {
        id: 'mission_json',
        name: 'mission.json',
        type: 'json',
        label: 'Brief de misión',
        status: 'Contexto operativo',
        path: 'data/mission_001_sales_cleaning/mission.json'
      },
      {
        id: 'schema_json',
        name: 'schema.json',
        type: 'json',
        label: 'Analysis schema',
        status: 'Estructura de análisis',
        path: 'data/mission_001_sales_cleaning/schema.json'
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
      { type: 'sql_filters_week_window', start: MISSION_001_WEEK_WINDOW.start, end: MISSION_001_WEEK_WINDOW.end, severity: 'hard' },
      { type: 'sql_filters_status', value: 'completed', severity: 'hard' },
      { type: 'result_matches_winner', fieldCandidates: ['sales_channel', 'channel', 'segment', 'category', 'sales_channel_norm'], expected: 'Web', severity: 'hard' },
      { type: 'report_metric_matches', expected: 'total_amount', severity: 'soft' },
      { type: 'report_chart_type', expected: 'bar', severity: 'soft' },
      { type: 'report_conclusion_mentions', expectedAny: ['web', 'canal ganador'], severity: 'soft' }
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
      success: { prestige: 25, score: 12 },
      failure: { prestige: -2, score: 1 }
    }
  },
  expectedAnswer: {
    winningChannel: 'Web'
  },
  rewards: {
    prestige: 25,
    technicalScore: 12,
    unlockSkills: [
      'data_cleaning',
      'date_normalization',
      'duplicate_detection',
      'sql_grouping',
      'executive_reporting'
    ]
  },
  outcomes: {
    excellent: 'approved_clean',
    solid: 'approved',
    acceptable: 'approved_with_notes',
    poor: 'revision_requested'
  },
  followups: ['mission_002_web_category_mix']
};
