import { CHART_TYPES, REPORT_METRICS } from "../app/constants.js";
import { buildReportModel, destroyChart, mountChart } from "../systems/reportEngine.js";
import { escapeHtml } from "../app/utils.js";
import { getMissionOrPrimary } from "../data/missions.js";
import { renderBadge, renderEmptyState, renderKeyValueList, renderStatCard, renderTable } from "./widgetView.js";

export function renderReportView(state) {
  const model = buildReportModel(state);
  const resultRows = model.resultRows || [];
  const conclusion = state.ui.report.conclusion || "";
  const recommendedChart = "bar";
  const mission = getMissionOrPrimary(state.missions.activeId || state.analysis.loadedMissionId);
  const hasResults = resultRows.length > 0;
  const validation = state.report.lastValidation;
  const missionState = mission ? state.missions.states?.[mission.id] : null;
  const revisionCount = missionState?.revisionRequests || 0;
  const isRevisionOpen = missionState?.needsRevision && missionState?.status === 'revision_required';
  const committeeSummaryReady = Boolean(missionState?.committeeSummaryReady);

  return `
    <section class="view view-report">
      <div class="view-head">
        <div>
          <div class="eyebrow">Executive delivery</div>
          <h2>Módulo de reporte</h2>
          <p>Configura una entrega breve, defendible y alineada con el pedido del stakeholder.</p>
        </div>
        <div class="view-head__meta">
          ${renderBadge(model.chartType, model.chartType === "bar" ? "success" : "warning")}
          ${renderBadge(model.metricKey, "info")}
          ${renderBadge(hasResults ? "Resultados listos" : "Sin output", hasResults ? "success" : "warning")}
        </div>
      </div>

      <div class="report-overview">
        ${renderStatCard({ label: "Misión", value: mission?.title || "Sin misión", note: mission?.executiveAudience || "Destino ejecutivo", tone: "info" })}
        ${renderStatCard({ label: "Métrica", value: state.ui.report.selectedMetric, note: "Indicador elegido", tone: "neutral" })}
        ${renderStatCard({ label: "Gráfico", value: state.ui.report.chartType, note: "Vista ejecutiva", tone: state.ui.report.chartType === "bar" ? "success" : "warning" })}
        ${renderStatCard({ label: "Resultado", value: validation ? (validation.success ? "Aprobado" : "Observado") : "Pendiente", note: validation?.expectedWinner ? `Canal esperado: ${validation.expectedWinner}` : "Todavía sin validar", tone: validation ? (validation.success ? "success" : "warning") : "neutral" })}
        ${renderStatCard({ label: "Revisión", value: revisionCount ? `${revisionCount} ciclo(s)` : 'Sin revisión', note: isRevisionOpen ? 'Corrección pendiente' : 'Estado estable', tone: isRevisionOpen ? 'warning' : (revisionCount ? 'info' : 'neutral') })}
        ${renderStatCard({ label: "Comité", value: committeeSummaryReady ? 'Mini-output listo' : 'Sin mini-output', note: committeeSummaryReady ? 'Resumen ejecutivo preparado' : 'Todavía no requerido', tone: committeeSummaryReady ? 'success' : 'neutral' })}
      </div>

      <div class="report-layout">
        <div class="report-side-stack">
          <section class="panel-card report-brief">
            <div class="panel-card__title">Brief de entrega</div>
            <div class="panel-card__body">
              ${renderKeyValueList([
                { label: "Pedido de negocio", value: mission?.business_goal || mission?.objective || "-" },
                { label: "Resultado esperado", value: mission?.answerKey?.primaryFinding || mission?.answerKey?.winningChannel || "-" },
                { label: "Gráfico recomendado", value: recommendedChart },
                { label: "Deadline", value: mission?.deadlineLabel || "-" }
              ])}
            </div>
          </section>

          <section class="panel-card report-controls">
            <div class="panel-card__title">Configuración</div>
            <div class="panel-card__body">
              <div class="form-group">
                <label>Métrica</label>
                <select class="retro-select" data-input="report-metric">
                  ${REPORT_METRICS.map((metric) => `<option value="${metric.id}" ${metric.id === state.ui.report.selectedMetric ? "selected" : ""}>${escapeHtml(metric.label)}</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label>Tipo de gráfico</label>
                <select class="retro-select" data-input="report-chart-type">
                  ${CHART_TYPES.map((chart) => `<option value="${chart.id}" ${chart.id === state.ui.report.chartType ? "selected" : ""}>${escapeHtml(chart.label)}</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label>Conclusión</label>
                <textarea class="retro-textarea report-conclusion" data-input="report-conclusion" spellcheck="false">${escapeHtml(conclusion)}</textarea>
              </div>

              <div class="report-actions">
                <button class="retro-button is-primary" data-action="submit-report" ${hasResults ? "" : "disabled"}>${isRevisionOpen ? 'Reenviar versión corregida' : 'Enviar reporte'}</button>
                <button class="retro-button" data-nav="terminal">Volver a terminal</button>
              </div>

              <div class="report-hint">
                Recomendado: ${escapeHtml(REPORT_METRICS.find((metric) => metric.id === "total_amount")?.label || "Total")} con gráfico ${escapeHtml(recommendedChart)}.
                ${isRevisionOpen ? `<div class="report-hint report-hint--warning">Hay una revisión pendiente. Corrige SQL, gráfico o conclusión antes de reenviar.</div>` : ''}
              </div>
            </div>
          </section>
        </div>

        <div class="report-main-stack">
          <section class="panel-card report-chart-panel">
            <div class="panel-card__title">Preview ejecutivo</div>
            <div class="panel-card__body">
              <div class="report-chart-frame">
                <canvas id="report-chart-canvas" class="report-chart-canvas"></canvas>
              </div>
              <div class="report-summary">
                ${hasResults ? renderTable(resultRows, { limit: 6, variant: "results" }) : renderEmptyState("Sin resultados SQL", "Ejecuta una consulta en Terminal antes de preparar la entrega.")}
              </div>
            </div>
          </section>

          <div class="split-panels report-support-panels">
            <section class="panel-card">
              <div class="panel-card__title">Checklist de envío</div>
              <div class="panel-card__body">
                ${renderKeyValueList([
                  { label: "Query ejecutada", value: hasResults ? "Sí" : "No" },
                  { label: "Métrica principal", value: state.ui.report.selectedMetric === "total_amount" ? "Correcta" : "Revisar" },
                  { label: "Gráfico", value: state.ui.report.chartType === "bar" ? "Correcto" : "Podría mejorar" },
                  { label: "Conclusión", value: conclusion.trim() ? "Completa" : "Falta redactar" }
                ])}
              </div>
            </section>

            <section class="panel-card">
              <div class="panel-card__title">Última devolución</div>
              <div class="panel-card__body">
                ${validation
                  ? `
                    <div class="report-validation ${validation.success ? "is-success" : "is-warning"}">
                      <div class="report-validation__title">${escapeHtml(validation.success ? "Entrega aprobada" : "Entrega observada")}</div>
                      <div class="report-validation__copy">${escapeHtml(validation.message)}</div>
                    </div>
                  `
                  : renderEmptyState("Sin feedback todavía", "Envía el reporte para recibir la devolución metodológica dentro de la workstation.")}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function afterRenderReport(state) {
  const canvas = document.getElementById("report-chart-canvas");
  if (!canvas) {
    destroyChart();
    return;
  }
  mountChart(canvas, state);
}
