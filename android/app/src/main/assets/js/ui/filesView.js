import { buildFileCatalog, buildFileSummary, formatQualityNotes } from "../systems/fileSystem.js";
import { escapeHtml, truncate } from "../app/utils.js";
import { renderBadge, renderEmptyState, renderKeyValueList, renderStatCard, renderTable } from "./widgetView.js";
import { getMissionOrPrimary, getPrimaryMissionId } from "../data/missions.js";

export function renderFilesView(state, runtime) {
  const bundleId = state.files.activeBundleId || state.analysis.loadedMissionId || state.missions.activeId || getPrimaryMissionId();
  const fileSummary = buildFileSummary(state, bundleId);
  const catalog = buildFileCatalog(state, runtime, bundleId);
  const selectedId = state.ui.selectedFileId || catalog[0]?.id || null;
  const selectedDataset = catalog.find((item) => item.id === selectedId) || catalog[0];
  const mission = getMissionOrPrimary(bundleId);
  const previewRows = selectedDataset?.id === "sales_clean_view"
    ? runtime?.cleanPreview
    : selectedDataset?.id === "sales_dirty_csv"
      ? runtime?.rawPreview
      : [];
  const missionMeta = runtime?.mission || mission;
  const schemaMeta = runtime?.schema || {};
  const isReady = fileSummary.datasetStatus === "ready";

  return `
    <section class="view view-files">
      <div class="view-head">
        <div>
          <div class="eyebrow">Workstation files</div>
          <h2>Paquete de análisis</h2>
          <p>Adjuntos internos, notas de schema y vista normalizada del workspace para la misión actual.</p>
        </div>
        <div class="view-head__meta">
          ${renderBadge(fileSummary.datasetStatus || "locked", isReady ? "success" : "warning")}
          ${renderBadge(selectedDataset?.name || "Sin activo", "info")}
        </div>
      </div>

      <div class="files-overview">
        ${renderStatCard({ label: "Bundle", value: mission?.title || "Sin misión", note: mission?.executiveAudience || "Mesa operativa", tone: "info" })}
        ${renderStatCard({ label: "Filas crudas", value: runtime?.summary?.rawRows || 0, note: "Export original", tone: "neutral" })}
        ${renderStatCard({ label: "Filas limpias", value: runtime?.summary?.cleanRows || 0, note: "Workspace normalizado", tone: isReady ? "success" : "warning" })}
        ${renderStatCard({ label: "Resultado esperado", value: mission?.answerKey?.primaryFinding || mission?.answerKey?.winningChannel || "-", note: "Respuesta de referencia", tone: "warning" })}
      </div>

      <div class="files-layout">
        <aside class="panel-card file-list-panel">
          <div class="panel-card__title">Contenido del bundle</div>
          <div class="panel-card__body">
            <div class="files-sidebar-note">Selecciona un activo para revisar su función dentro del flujo y abrir el siguiente paso operativo.</div>
            <div class="file-list">
              ${catalog.map((item) => `
                <button class="${item.id === selectedDataset?.id ? "file-row is-active" : "file-row"}" data-action="select-dataset" data-dataset-id="${escapeHtml(item.id)}">
                  <div class="file-row__head">
                    <span class="file-row__name">${escapeHtml(item.name)}</span>
                    ${renderBadge(item.status, item.status === "ready" ? "success" : item.status === "locked" ? "warning" : "info")}
                  </div>
                  <div class="file-row__meta">${escapeHtml(item.label)} · ${escapeHtml(item.kind)}</div>
                  <div class="file-row__preview">${escapeHtml(truncate(item.notes, 90))}</div>
                </button>
              `).join("")}
            </div>
          </div>
        </aside>

        <div class="files-detail-stack">
          <article class="panel-card file-detail">
            <div class="panel-card__title">Activo seleccionado</div>
            <div class="panel-card__body">
              <div class="file-detail__header">
                <div>
                  <div class="file-detail__name">${escapeHtml(selectedDataset?.name || "Activo")}</div>
                  <div class="file-detail__subtitle">${escapeHtml(selectedDataset?.path || "")}</div>
                </div>
                ${renderBadge(selectedDataset?.status || "locked", selectedDataset?.status === "ready" ? "success" : "warning")}
              </div>

              ${renderKeyValueList([
                { label: "Origen", value: selectedDataset?.label || "Mission bundle" },
                { label: "Listo para análisis", value: selectedDataset?.ready ? "Sí" : "Todavía no" },
                { label: "Filas", value: selectedDataset?.rowCount || 0 },
                { label: "Notas", value: selectedDataset?.notes || "-" }
              ])}

              <div class="preview-section">
                <div class="preview-section__title">Preview</div>
                ${
                  selectedDataset?.id === "mission_json"
                    ? renderKeyValueList([
                        { label: "Misión", value: missionMeta?.title || mission?.title || "-" },
                        { label: "Objetivo de negocio", value: missionMeta?.business_goal || missionMeta?.businessGoal || "-" },
                        { label: "Objetivo analítico", value: missionMeta?.analytical_goal || missionMeta?.analyticalGoal || "-" },
                        { label: "Prestigio", value: missionMeta?.prestige_reward || missionMeta?.prestigeReward || "-" }
                      ])
                    : selectedDataset?.id === "schema_json"
                      ? renderKeyValueList([
                          { label: "Tabla raw", value: schemaMeta?.raw_table?.name || "sales_raw" },
                          { label: "Tabla limpia", value: schemaMeta?.clean_table?.name || "sales_clean" },
                          { label: "Problemas conocidos", value: schemaMeta?.quality_issues?.length || 0 },
                          { label: "Notas de validación", value: schemaMeta?.validation_notes?.length || 0 }
                        ])
                      : previewRows && previewRows.length
                        ? renderTable(previewRows, { limit: 6, variant: "results" })
                        : renderEmptyState("Preview bloqueado", "Acepta la misión para desbloquear el export y la vista de análisis.")
                }
              </div>

              <div class="file-detail__actions">
                <button class="retro-button" data-nav="inbox">Volver a correo</button>
                <button class="retro-button is-primary" data-nav="terminal">Abrir terminal</button>
              </div>
            </div>
          </article>

          <div class="split-panels files-support-panels">
            <section class="panel-card">
              <div class="panel-card__title">Notas de calidad</div>
              <div class="panel-card__body">
                <div class="quality-note">${escapeHtml(formatQualityNotes(fileSummary.qualityNotes || []))}</div>
              </div>
            </section>

            <section class="panel-card">
              <div class="panel-card__title">Siguiente paso</div>
              <div class="panel-card__body">
                <div class="files-next-step">${escapeHtml(
                  isReady
                    ? "El dataset limpio ya está disponible. Pasa a Terminal y arma la consulta sobre sales_clean."
                    : "Revisa el export y el schema; después usa Terminal para responder la pregunta del gerente."
                )}</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  `;
}
