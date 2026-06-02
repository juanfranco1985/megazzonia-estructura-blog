import { normalizeText } from '../../app/utils.js';

export const SUPPORTED_RULE_TYPES = new Set([
  'sql_uses_table',
  'sql_has_group_by',
  'sql_uses_sum',
  'sql_filters_week_window',
  'sql_filters_status',
  'sql_filters_field_value',
  'sql_mentions_all_values',
  'result_matches_winner',
  'report_metric_matches',
  'report_chart_type',
  'report_conclusion_mentions'
]);

function extractWinnerFromResult(result, fieldCandidates = []) {
  if (!result?.rows?.length) {
    return null;
  }

  const row = result.rows[0];
  for (const key of fieldCandidates) {
    if (row[key]) {
      return String(row[key]).trim();
    }
  }

  const firstKey = result.columns?.[0];
  return firstKey ? String(row[firstKey] ?? '').trim() : null;
}

function buildRuleResult(success, issue, strength, severity = 'soft') {
  return { success, issue, strength, severity };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getExpectedMissionResult(mission) {
  const expectedAnswer = mission?.expectedAnswer || {};
  return Object.values(expectedAnswer).find((value) => value !== null && value !== undefined && String(value).trim()) || null;
}

function evaluateRule(rule, context) {
  const sql = context.sql;
  const report = context.report;
  const detectedWinner = context.detectedWinner;

  switch (rule.type) {
    case 'sql_uses_table': {
      const table = rule.table || 'sales_clean';
      const regex = new RegExp(`from\\s+${escapeRegExp(String(table).toLowerCase())}`);
      return regex.test(sql)
        ? buildRuleResult(true, '', `La consulta usa la tabla ${table} del workspace.`, rule.severity)
        : buildRuleResult(false, `La consulta debe apoyarse en ${table}, no en el export crudo.`, '', rule.severity);
    }
    case 'sql_has_group_by':
      return /group\s+by/.test(sql)
        ? buildRuleResult(true, '', 'La consulta agrupa resultados correctamente.', rule.severity)
        : buildRuleResult(false, 'Falta agrupar resultados para responder el pedido.', '', rule.severity);
    case 'sql_uses_sum':
      return /sum\s*\(/.test(sql)
        ? buildRuleResult(true, '', 'La métrica principal agrega importes.', rule.severity)
        : buildRuleResult(false, 'El pedido requiere sumar importes, no solo contar filas.', '', rule.severity);
    case 'sql_filters_week_window': {
      const ok = /sale_date/.test(sql) && sql.includes(String(rule.start).toLowerCase()) && sql.includes(String(rule.end).toLowerCase());
      return ok
        ? buildRuleResult(true, '', 'La ventana temporal de la semana pedida está contemplada.', rule.severity)
        : buildRuleResult(false, 'La consulta no demuestra el corte semanal correcto.', '', rule.severity);
    }
    case 'sql_filters_status': {
      if (!/status_norm|status/.test(sql)) {
        return buildRuleResult(false, 'Conviene filtrar el estado de los pedidos para evitar ruido.', '', rule.severity);
      }
      const regex = new RegExp(`status(?:_norm)?\\s*=\\s*['"]${escapeRegExp(String(rule.value).toLowerCase())}['"]`);
      return regex.test(sql)
        ? buildRuleResult(true, '', `El estado ${rule.value} está filtrado.`, rule.severity)
        : buildRuleResult(false, `La consulta debe filtrar pedidos ${rule.value} para esta misión.`, '', rule.severity);
    }
    case 'sql_filters_field_value': {
      const field = String(rule.field || '').toLowerCase();
      const value = String(rule.value || '').toLowerCase();
      if (!field || !value) {
        return buildRuleResult(true, '', '', rule.severity);
      }
      const regex = new RegExp(`${escapeRegExp(field)}\\s*=\\s*['"]${escapeRegExp(value)}['"]`);
      return regex.test(sql)
        ? buildRuleResult(true, '', `${rule.field} se filtra correctamente por ${rule.value}.`, rule.severity)
        : buildRuleResult(false, `La consulta debe filtrar ${rule.field} = '${rule.value}' para responder el pedido.`, '', rule.severity);
    }
    case 'sql_mentions_all_values': {
      const field = String(rule.field || '').toLowerCase();
      const values = Array.isArray(rule.values) ? rule.values.map((value) => String(value).toLowerCase()) : [];
      if (!field || !values.length) {
        return buildRuleResult(true, '', '', rule.severity);
      }
      if (!new RegExp(escapeRegExp(field)).test(sql)) {
        return buildRuleResult(false, `La consulta debe contemplar ${field} para esta misión.`, '', rule.severity);
      }
      const missingValues = values.filter((value) => !new RegExp(`['"]${escapeRegExp(value)}['"]`).test(sql));
      return missingValues.length === 0
        ? buildRuleResult(true, '', `La consulta contempla todos los valores requeridos de ${field}.`, rule.severity)
        : buildRuleResult(false, `Faltan valores requeridos en ${field}: ${missingValues.join(', ')}.`, '', rule.severity);
    }
    case 'result_matches_winner':
      return normalizeText(detectedWinner) === normalizeText(rule.expected)
        ? buildRuleResult(true, '', `El resultado principal correcto es ${rule.expected}.`, rule.severity)
        : buildRuleResult(false, `El resultado detectado no coincide con el esperado (${rule.expected}).`, '', rule.severity);
    case 'report_metric_matches':
      return normalizeText(report.selectedMetric) === normalizeText(rule.expected)
        ? buildRuleResult(true, '', 'La métrica principal del reporte es consistente con el objetivo.', rule.severity)
        : buildRuleResult(false, 'La métrica elegida no responde directamente al pedido de negocio.', '', rule.severity);
    case 'report_chart_type':
      return normalizeText(report.chartType) === normalizeText(rule.expected)
        ? buildRuleResult(true, '', 'El gráfico elegido facilita la comparación principal.', rule.severity)
        : buildRuleResult(false, 'El tipo de gráfico elegido no es el más claro para esta misión.', '', rule.severity);
    case 'report_conclusion_mentions': {
      const conclusion = normalizeText(report.conclusion);
      const ok = (rule.expectedAny || []).some((token) => conclusion.includes(normalizeText(token)));
      return ok
        ? buildRuleResult(true, '', 'La conclusión menciona el resultado ejecutivo.', rule.severity)
        : buildRuleResult(false, 'La conclusión no nombra explícitamente el hallazgo principal.', '', rule.severity);
    }
    default:
      return buildRuleResult(false, `La regla ${rule.type} no está soportada por el validador actual.`, '', rule.severity || 'hard');
  }
}

export function validateMissionPayload({ mission, state, runtime }) {
  const result = state.terminal.lastResult;
  const sql = String(state.terminal.lastQueryText || state.ui.terminalQuery || '').toLowerCase();
  const report = state.ui.report;
  const summary = runtime?.summary || state.analysis.summary || {};
  const winnerRule = mission.validation.rules.find((rule) => rule.type === 'result_matches_winner');
  const detectedWinner = extractWinnerFromResult(result, winnerRule?.fieldCandidates || []);
  const issues = [];
  const strengths = [];

  if (!result?.rows?.length) {
    issues.push('No hay resultados SQL para evaluar.');
  }

  const evaluatedRules = mission.validation.rules.map((rule) => evaluateRule(rule, { sql, report, state, runtime, summary, detectedWinner }));
  const categorized = mission.validation.rules.map((rule, index) => ({ rule, outcome: evaluatedRules[index] }));

  for (const outcome of evaluatedRules) {
    if (outcome.success) {
      if (outcome.strength) {
        strengths.push(outcome.strength);
      }
    } else if (outcome.issue) {
      issues.push(outcome.issue);
    }
  }

  const hardFailures = categorized
    .filter(({ rule, outcome }) => rule.severity === 'hard' && !outcome.success)
    .length;

  const technicalRules = categorized.filter(({ rule }) => rule.type.startsWith('sql_') || rule.type === 'result_matches_winner');
  const reportingRules = categorized.filter(({ rule }) => rule.type === 'report_metric_matches' || rule.type === 'report_chart_type');
  const businessRules = categorized.filter(({ rule }) => rule.type === 'report_conclusion_mentions');
  const ratio = (items) => {
    if (!items.length) {
      return 100;
    }
    const passed = items.filter(({ outcome }) => outcome.success).length;
    return Math.round((passed / items.length) * 100);
  };

  const success = hardFailures === 0 && issues.length <= 2 && Boolean(result?.rows?.length);

  return {
    success,
    issues,
    strengths,
    expectedWinner: getExpectedMissionResult(mission) || 'Web',
    detectedWinner,
    missionId: mission.id,
    evaluatedRules,
    breakdown: {
      technical: ratio(technicalRules),
      reporting: ratio(reportingRules),
      businessCommunication: ratio(businessRules)
    }
  };
}
