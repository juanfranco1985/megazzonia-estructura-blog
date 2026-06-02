import { DEFAULT_TERMINAL_QUERY } from "../app/constants.js";
import { buildTerminalModel } from "../systems/terminalSystem.js";
import { getDatasetDefinition } from "../systems/datasetRegistry.js";
import { escapeHtml, truncate } from "../app/utils.js";
import { renderBadge, renderEmptyState, renderTable } from "./widgetView.js";
import { getMissionOrPrimary, getPrimaryMissionId } from "../data/missions.js";

export function renderTerminalView(state, runtime) {
  const terminal = buildTerminalModel(state);
  const missionId = state.missions.activeId || state.analysis.loadedMissionId || state.files.activeBundleId || getPrimaryMissionId();
  const mission = getMissionOrPrimary(missionId);
  const bundle = getDatasetDefinition(missionId);
  const rows = terminal.lastResult?.rows || [];
  const columns = terminal.lastResult?.columns || [];
  const schemaPreview = runtime?.schema?.clean_table?.columns || [];
  const schemaColumns = schemaPreview.length;
  const visibleRowCount = rows.length;
  const qualityNotesCount = runtime?.summary?.qualityNotes?.length || 0;

  return `
    <section class="view view-terminal">
      <div class="view-head">
        <div>
          <div class="eyebrow">Analytical terminal</div>
          <h2>SQL workspace</h2>
          <p>Run queries against the mission tables and inspect the output directly inside the workstation.</p>
        </div>
        <div class="view-head__meta">
          ${renderBadge(terminal.engineReady ? "SQL engine ready" : "SQL idle", terminal.engineReady ? "success" : "warning")}
          ${renderBadge(terminal.historyCount ? `${terminal.historyCount} queries` : "No history", terminal.historyCount ? "info" : "neutral")}
          ${renderBadge(terminal.lastError ? "Last run error" : terminal.lastResult ? `${rows.length} rows returned` : "Awaiting run", terminal.lastError ? "error" : terminal.lastResult ? "success" : "neutral")}
        </div>
      </div>

      <section class="panel-card terminal-context-panel">
        <div class="panel-card__title">Workspace context</div>
        <div class="panel-card__body">
          <div class="terminal-context-grid">
            <article class="terminal-context-card">
              <div class="terminal-context-card__label">Mission</div>
              <div class="terminal-context-card__value">${escapeHtml(mission?.title || "None")}</div>
              <div class="terminal-context-card__note">${escapeHtml(mission?.objective || mission?.analytical_goal || "Use the workspace to answer the business question.")}</div>
            </article>
            <article class="terminal-context-card">
              <div class="terminal-context-card__label">Dataset</div>
              <div class="terminal-context-card__value">${escapeHtml(bundle?.label || mission?.title || "Sin paquete activo")}</div>
              <div class="terminal-context-card__note">${terminal.loadedRows} loaded rows - ${terminal.cleanRows} clean rows</div>
            </article>
            <article class="terminal-context-card">
              <div class="terminal-context-card__label">Active table</div>
              <div class="terminal-context-card__value">${escapeHtml(terminal.activeTableName || "sales_clean")}</div>
              <div class="terminal-context-card__note">${terminal.tables.length ? `${terminal.tables.length} tables available` : "No tables loaded yet"}</div>
            </article>
            <article class="terminal-context-card">
              <div class="terminal-context-card__label">Engine</div>
              <div class="terminal-context-card__value">${terminal.engineReady ? "Ready" : "Idle"}</div>
              <div class="terminal-context-card__note">${terminal.lastRunRows ? `Last query returned ${terminal.lastRunRows} rows` : "Run a query to see output"}</div>
            </article>
          </div>
        </div>
      </section>

      <div class="terminal-layout">
        <section class="panel-card terminal-editor-panel">
          <div class="panel-card__title">Query editor</div>
          <div class="panel-card__body">
            <div class="terminal-editor-toolbar">
              <div>
                <div class="terminal-editor-kicker">SQL input</div>
                <div class="terminal-editor-note">Use the clean table to answer the weekly channel question.</div>
              </div>
              <div class="terminal-editor-status">
                ${renderBadge(`${terminal.historyCount} saved`, "info")}
                ${renderBadge(terminal.lastError ? "Needs attention" : "Ready to run", terminal.lastError ? "warning" : "success")}
              </div>
            </div>

            <textarea class="terminal-editor" data-input="terminal-query" spellcheck="false" aria-label="SQL query">${escapeHtml(terminal.query || DEFAULT_TERMINAL_QUERY)}</textarea>

            <div class="terminal-actions">
              <button class="retro-button is-primary" data-action="run-query">Run query</button>
              <button class="retro-button" data-action="reset-query">Reset query</button>
            </div>
          </div>
        </section>

        <div class="terminal-stack">
          <section class="panel-card terminal-schema-panel">
            <div class="panel-card__title">Schema preview</div>
            <div class="panel-card__body">
              <div class="terminal-panel-head">
                <div>
                  <div class="terminal-panel-subtitle">Normalized workspace</div>
                  <div class="terminal-panel-copy">sales_clean is the analysis table built from the raw export.</div>
                </div>
                <div class="terminal-output-meta">
                  ${renderBadge(`${schemaColumns} columns`, "info")}
                  ${renderBadge(`${qualityNotesCount} quality notes`, qualityNotesCount ? "warning" : "success")}
                </div>
              </div>

              ${
                schemaPreview.length
                  ? `<div class="chip-list terminal-schema-chips">${schemaPreview.map((column) => `<span class="chip">${escapeHtml(column.name)}:${escapeHtml(column.type)}</span>`).join("")}</div>`
                  : renderEmptyState("No schema available", "Load the mission dataset to inspect the table structure.")
              }
            </div>
          </section>

          <section class="panel-card terminal-result-panel">
            <div class="panel-card__title">Results</div>
            <div class="panel-card__body">
              <div class="terminal-panel-head">
                <div>
                  <div class="terminal-panel-subtitle">Query output</div>
                  <div class="terminal-panel-copy">${terminal.lastError ? "The SQL engine reported an error." : terminal.lastResult ? "Review the returned rows below." : "Run a query to populate results."}</div>
                </div>
                <div class="terminal-output-meta">
                  ${renderBadge(terminal.lastError ? "error" : terminal.lastResult ? "result ready" : "waiting", terminal.lastError ? "error" : terminal.lastResult ? "success" : "neutral")}
                  ${renderBadge(rows.length ? `${visibleRowCount}/${rows.length} shown` : "0 rows", rows.length ? "info" : "neutral")}
                  ${renderBadge(columns.length ? `${columns.length} columns` : "0 columns", "neutral")}
                </div>
              </div>

              ${
                terminal.lastError
                  ? `<div class="terminal-error" role="alert">${escapeHtml(terminal.lastError)}</div>`
                  : renderTable(rows, {
                      columns,
                      variant: "results",
                      emptyTitle: "No rows yet",
                      emptyBody: "Run a query to inspect the result set."
                    })
              }

              <div class="terminal-footnote">
                ${
                  terminal.lastError
                    ? "Fix the SQL and run again."
                    : rows.length
                      ? `${visibleRowCount} of ${rows.length} row(s) shown.`
                      : "No result rows yet."
                }
              </div>
            </div>
          </section>

          <section class="panel-card terminal-history-panel">
            <div class="panel-card__title">Query history</div>
            <div class="panel-card__body">
              <div class="terminal-panel-head">
                <div>
                  <div class="terminal-panel-subtitle">Recent queries</div>
                  <div class="terminal-panel-copy">Click a previous query to restore it in the editor.</div>
                </div>
                <div class="terminal-output-meta">
                  ${renderBadge(terminal.historyCount ? `${terminal.historyCount} saved` : "No history", terminal.historyCount ? "info" : "neutral")}
                </div>
              </div>

              <div class="history-list">
                ${terminal.history.length
                  ? terminal.history.map((entry) => `
                    <button
                      type="button"
                      class="history-item ${entry.failed ? "is-failed" : ""} ${entry.sql === terminal.lastQueryText ? "is-latest" : ""}"
                      data-action="reuse-query"
                      data-query="${escapeHtml(entry.sql)}"
                      aria-label="Reuse previous query"
                    >
                      <div class="history-item__head">
                        <span>${entry.failed ? "Failed query" : "Query"}</span>
                        <span>${entry.failed ? "error" : `${entry.rowCount} row(s)`}</span>
                      </div>
                      <div class="history-item__preview">${escapeHtml(truncate(entry.preview, 110))}</div>
                    </button>
                  `).join("")
                  : renderEmptyState("No history yet", "Executed queries will appear here for quick reuse.")
                }
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}
