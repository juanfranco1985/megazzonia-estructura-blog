import { CHART_TYPES, REPORT_METRICS } from "../app/constants.js";
import { createId, escapeHtml, formatCurrency, formatNumber } from "../app/utils.js";
import { getMissionOrPrimary } from "../data/missions.js";
import { upsertFeedbackThread } from "./mailSystem.js";
import { advanceSimulationTime } from "./clockEngine.js";
import { buildContextualFeedback } from "./feedbackEngine.js";

let activeChart = null;

function getLabelColumn(result) {
  if (!result || !result.columns || !result.columns.length) {
    return null;
  }
  const preferred = ["sales_channel", "channel", "segment", "category"];
  for (const name of preferred) {
    if (result.columns.includes(name)) {
      return name;
    }
  }
  return result.columns[0];
}

function getMetricColumns(result) {
  if (!result || !result.columns || !result.columns.length) {
    return [];
  }
  return result.columns.filter((column) => !/channel|segment|category|name/i.test(column));
}

export function buildReportModel(state) {
  const result = state.terminal.lastResult;
  const rows = result?.rows || [];
  const labelKey = getLabelColumn(result);
  const metricKey = state.ui.report.selectedMetric;
  const labels = rows.map((row) => row[labelKey]);
  const values = rows.map((row) => Number(row[metricKey] ?? row.total_amount ?? row.orders ?? 0));

  return {
    labelKey,
    metricKey,
    metricOptions: REPORT_METRICS,
    chartTypes: CHART_TYPES,
    chartData: {
      labels,
      datasets: [
        {
          label: REPORT_METRICS.find((entry) => entry.id === metricKey)?.label || metricKey,
          data: values,
          backgroundColor: ["#5c7f94", "#7d9b84", "#b08a58", "#8a677d", "#5f8e9a"],
          borderColor: "#4f6e83"
        }
      ]
    },
    resultRows: rows,
    availableMetrics: getMetricColumns(result),
    chartType: state.ui.report.chartType,
    conclusion: state.ui.report.conclusion,
    selectedMetric: state.ui.report.selectedMetric,
    result
  };
}

export function mountChart(canvas, state) {
  if (!canvas || typeof window.Chart !== "function") {
    return;
  }

  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }

  const model = buildReportModel(state);
  if (!model.chartData.labels.length) {
    return;
  }

  activeChart = new window.Chart(canvas, {
    type: model.chartType,
    data: model.chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

export function destroyChart() {
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
}

export function updateReportDraft(store, partial) {
  store.setState((state) => {
    state.ui.report = {
      ...state.ui.report,
      ...partial
    };
  }, { silent: true });
}

export function submitReport(store, deps) {
  const state = store.getState();
  const mission = getMissionOrPrimary(state.missions.activeId);
  if (!mission) {
    throw new Error("No hay una misión disponible para reportar.");
  }

  const validation = deps.validationEngine.validateMissionReport({
    state,
    runtime: deps.runtime,
    mission
  });

  store.setState((current) => {
    current.report.lastValidation = validation;
    current.report.lastSubmission = {
      id: createId("submission"),
      missionId: mission.id,
      createdAt: new Date().toISOString(),
      chartType: current.ui.report.chartType,
      metric: current.ui.report.selectedMetric,
      conclusion: current.ui.report.conclusion
    };
    current.feedback.unshift({
      id: createId("feedback"),
      missionId: mission.id,
      success: validation.success,
      message: validation.message,
      createdAt: new Date().toISOString()
    });
  }, { silent: true });

  deps.progressionSystem.applyMissionOutcome(store, mission.id, validation);

  const feedback = buildContextualFeedback(store.getState(), mission, validation);
  store.setState((current) => {
    current.feedback.unshift({
      id: createId("feedback_context"),
      missionId: mission.id,
      stakeholderId: feedback.stakeholderId,
      qualityLabel: feedback.qualityLabel,
      timingLabel: feedback.timingLabel,
      createdAt: new Date().toISOString(),
      subject: feedback.subject,
      preview: feedback.preview,
      body: feedback.body,
      totalScore: validation.totalScore || 0,
      outcome: validation.outcome || null
    });
    current.activity.unshift({
      id: createId("activity"),
      label: `${feedback.stakeholder.name} respondió con ${feedback.qualityLabel.replaceAll('_', ' ')}${feedback.timingLabel === 'late' ? ' y marca el atraso' : ''}.`,
      tone: validation.success ? (feedback.timingLabel === 'late' ? 'warning' : 'success') : 'warning',
      time: current.sim.timeLabel
    });
  }, { silent: true });

  upsertFeedbackThread(store, mission.id, {
    senderId: feedback.stakeholderId,
    senderName: feedback.stakeholder.name,
    senderRole: feedback.stakeholder.role,
    subject: feedback.subject,
    preview: feedback.preview,
    priority: feedback.priority,
    labels: ['feedback', validation.success ? 'approved' : 'revision', ...(feedback.labels || [])],
    body: feedback.body
  });

  store.setState((current) => {
    const missionState = current.missions.states[mission.id];
    const feedbackThread = current.mail.threads.find((thread) => thread.missionId === mission.id && thread.threadType === 'feedback');
    if (missionState && feedbackThread) {
      missionState.lastFeedbackThreadId = feedbackThread.id;
      missionState.lastFeedbackSubject = feedback.subject;
    }
  }, { silent: true });

  advanceSimulationTime(store, 'submit_report');

  deps.notificationSystem.pushNotification(store, {
    title: validation.success ? "Reporte aprobado" : "Reporte con observaciones",
    message: validation.message,
    level: validation.success ? "success" : "warning",
    ttl: 6500
  });

  return validation;
}

export function renderExecutiveSummary(state) {
  const result = state.terminal.lastResult;
  if (!result || !result.rows || !result.rows.length) {
    return "Ejecuta una consulta SQL para generar el resumen ejecutivo.";
  }

  const channel = result.rows[0].sales_channel || result.rows[0].channel || "el canal líder";
  const amount = result.rows[0].total_amount ?? result.rows[0].sum_amount ?? null;
  const orders = result.rows[0].orders ?? result.rows[0].count ?? null;
  return `El canal ${escapeHtml(channel)} lidera con ${amount !== null ? formatCurrency(amount) : "-"} en ${orders !== null ? formatNumber(orders) : "-"} pedidos.`;
}
