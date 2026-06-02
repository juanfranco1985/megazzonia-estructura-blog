import { APP_NAME, APP_TAGLINE } from "../app/constants.js";
import { escapeHtml } from "../app/utils.js";
import { getProjectSummary } from "../data/projectCatalog.js";

function isSimulatorState(state) {
  return Boolean(state?.missions && state?.analysis && state?.files);
}

function renderContextRows(rows) {
  return rows
    .map((row) => `<div class="context-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`)
    .join("");
}

export function renderShell(options = {}) {
  const shellTitle = options.title || APP_NAME;
  const shellTagline = options.tagline || APP_TAGLINE;

  return `
    <div class="app-shell">
      <div class="boot-overlay" id="boot-overlay" hidden aria-hidden="true">
        <div class="boot-card">
          <div class="boot-card__title">${escapeHtml(shellTitle)}</div>
          <div class="boot-card__subtitle">${escapeHtml(shellTagline)}</div>
          <div class="boot-progress"><span></span></div>
          <div class="boot-card__hint">Loading local assets...</div>
        </div>
      </div>

      <header class="status-bar" id="status-slot"></header>

      <main class="shell-grid">
        <aside class="dock-panel" id="dock-slot"></aside>
        <section class="workspace-panel">
            <div class="window-frame">
            <div class="window-frame__titlebar">
              <div class="window-frame__title">${escapeHtml(shellTitle)}</div>
              <div class="window-frame__controls">
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <span class="window-dot"></span>
              </div>
            </div>
            <div class="window-frame__body">
              <div id="view-slot"></div>
            </div>
          </div>
        </section>
        <aside class="context-panel" id="context-slot"></aside>
      </main>

      <footer class="taskbar" id="taskbar-slot"></footer>
      <div class="toast-stack" id="toast-host"></div>
      <div class="modal-host" id="modal-host"></div>
    </div>
  `;
}

export function renderStatusBar(state, models = {}) {
  if (isSimulatorState(state)) {
    const desktop = models.desktop || {};
    const score = Number(state.player?.technicalScore || 0);
    const prestige = Number(state.player?.prestige || 0);
    const datasetStatus = state.analysis?.databaseReady ? "Dataset cargado" : state.missions?.activeId ? "Dataset asignado" : "Sin dataset";

    return `
      <div class="status-bar__brand">
        <span class="status-bar__logo">DACS</span>
        <span class="status-bar__name">Data Analyst Career Simulator</span>
      </div>
      <div class="status-bar__meta">
        <span>SQL real</span>
        <span>SQLite in-browser</span>
        <span>${escapeHtml(datasetStatus)}</span>
        <span>${escapeHtml(desktop.missionStatusLabel || "Solicitud inicial")}</span>
      </div>
      <div class="status-bar__metrics">
        <span>${escapeHtml(state.sim?.workdayLabel || "Day 1")}</span>
        <span>${escapeHtml(state.sim?.timeLabel || "08:40")}</span>
        <span>Tech ${score}</span>
        <span>Prestigio ${prestige}</span>
      </div>
    `;
  }

  const summary = getProjectSummary();

  return `
    <div class="status-bar__brand">
      <span class="status-bar__logo">LM</span>
      <span class="status-bar__name">${escapeHtml(APP_NAME)}</span>
    </div>
    <div class="status-bar__meta">
      <span>Web hub</span>
      <span>Android wrapper</span>
      <span>${summary.launchable} demos</span>
      <span>Portfolio activo</span>
    </div>
    <div class="status-bar__metrics">
      <span>${summary.total} proyectos</span>
      <span>${summary.documented} fichas</span>
      <span>${summary.needsWork} a revisar</span>
    </div>
  `;
}

export function renderContextPanel(state, models = {}) {
  if (isSimulatorState(state)) {
    const desktop = models.desktop || {};
    const fileSummary = models.fileSummary || {};
    const terminal = models.terminal || {};
    const activeTask = desktop.pendingTasks?.[0]?.label || "Revisa la bandeja y toma una decision.";
    const rows = [
      { label: "Rol", value: state.player?.role || "Junior Data Analyst" },
      { label: "Mision", value: desktop.activeMissionLabel || "Solicitud inicial" },
      { label: "Deadline", value: desktop.deadlineCountdown || "Sin deadline activo" },
      { label: "Carga", value: state.player?.workload?.loadLabel || "Manejable" }
    ];
    const dataRows = [
      { label: "Archivo", value: state.ui?.selectedFileId || "Sin seleccion" },
      { label: "Tablas", value: String(state.analysis?.tables?.length || 0) },
      { label: "Ultima query", value: terminal.lastQueryLabel || (state.terminal?.lastResult ? "Ejecutada" : "Pendiente") },
      { label: "Bundle", value: fileSummary.activeBundleLabel || state.files?.activeBundleId || "Bloqueado" }
    ];

    return `
      <div class="panel-card panel-card--stack simulator-next-card">
        <div class="panel-card__title">Siguiente accion</div>
        <div class="panel-card__body">
          <p class="context-note">${escapeHtml(activeTask)}</p>
          <div class="context-actions">
            <button class="retro-button is-primary" data-action="open-onboarding">Ver guia</button>
            <button class="retro-button" data-nav="inbox">Ir a Correo</button>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card__title">Workstation</div>
        <div class="panel-card__body">
          ${renderContextRows(rows)}
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card__title">Analisis</div>
        <div class="panel-card__body">
          ${renderContextRows(dataRows)}
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card__title">Control</div>
        <div class="panel-card__body">
          <div class="context-actions context-actions--stack">
            <button class="retro-button" data-nav="terminal">Abrir SQL</button>
            <button class="retro-button" data-nav="report">Preparar reporte</button>
            <button class="retro-button retro-button--danger" data-action="reset-simulator-progress">Reiniciar progreso</button>
          </div>
        </div>
      </div>
    `;
  }

  const summary = getProjectSummary();

  return `
    <div class="panel-card panel-card--stack">
      <div class="panel-card__title">Portfolio</div>
      <div class="panel-card__body">
        <div class="context-row"><span>Hub</span><strong>${escapeHtml(APP_NAME)}</strong></div>
        <div class="context-row"><span>Proyectos</span><strong>${summary.total}</strong></div>
        <div class="context-row"><span>Demos web</span><strong>${summary.launchable}</strong></div>
        <div class="context-row"><span>Fichas</span><strong>${summary.documented}</strong></div>
      </div>
    </div>
    <div class="panel-card">
      <div class="panel-card__title">Accesos</div>
      <div class="panel-card__body">
        <div class="context-row"><span>Web</span><strong>Hub principal</strong></div>
        <div class="context-row"><span>Android</span><strong>Wrapper mobile</strong></div>
        <div class="context-row"><span>Casos</span><strong>Portfolio</strong></div>
      </div>
    </div>
    <div class="panel-card">
      <div class="panel-card__title">Siguiente foco</div>
      <div class="panel-card__body">
        <div class="context-row"><span>Prioridad</span><strong>Demo web limpia</strong></div>
        <div class="context-row"><span>Luego</span><strong>Capturas y casos</strong></div>
        <div class="context-row"><span>Publicacion</span><strong>Lista para host</strong></div>
      </div>
    </div>
  `;
}

export function renderModalShell(content) {
  return content ? `<div class="modal-backdrop">${content}</div>` : "";
}
