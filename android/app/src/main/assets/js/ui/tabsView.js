import { VIEW_KEYS } from "../app/constants.js";
import { escapeHtml, joinClasses } from "../app/utils.js";
import { getProjectSummary } from "../data/projectCatalog.js";

const NAV_ITEMS = [
  { id: VIEW_KEYS.HOME, label: "Inicio", short: "IN" },
  { id: VIEW_KEYS.PROJECTS, label: "Proyectos", short: "LAB" }
];

const SIMULATOR_NAV_ITEMS = [
  { id: VIEW_KEYS.HOME, label: "Inicio", short: "IN", icon: "HM" },
  { id: VIEW_KEYS.INBOX, label: "Correo", short: "MAIL", icon: "@" },
  { id: VIEW_KEYS.FILES, label: "Archivos", short: "DATA", icon: "DB" },
  { id: VIEW_KEYS.TERMINAL, label: "SQL", short: "SQL", icon: "SQL" },
  { id: VIEW_KEYS.REPORT, label: "Reporte", short: "REP", icon: "RP" },
  { id: VIEW_KEYS.CAREER, label: "Carrera", short: "CV", icon: "CV" }
];

function isSimulatorState(state) {
  return Boolean(state?.missions && state?.analysis && state?.files);
}

function getVisibleThreads(state) {
  return (state?.mail?.threads || []).filter((thread) => !thread.missionId || state.missions?.states?.[thread.missionId]?.isVisible);
}

function getUnreadCount(state) {
  return getVisibleThreads(state).filter((thread) => thread.unread).length;
}

function getMissionLabel(state) {
  if (state?.missions?.activeId) {
    return "Mision activa";
  }
  if (state?.missions?.completedIds?.length) {
    return "Entrega cerrada";
  }
  return "Solicitud inicial";
}

function renderDockButton(item, state) {
  const active = state?.ui?.activeView === item.id;
  return `
    <button class="${joinClasses("dock-launch", active && "is-active")}" data-nav="${item.id}">
      <span class="dock-launch__icon">${escapeHtml(item.icon || item.short)}</span>
      <span class="dock-launch__text">${escapeHtml(item.label)}</span>
    </button>
  `;
}

function renderSimulatorDock(state) {
  const unreadCount = getUnreadCount(state);
  const datasetLabel = state.analysis?.databaseReady ? "SQL listo" : state.missions?.activeId ? "Dataset pendiente" : "Bloqueado";

  return `
    <div class="dock-panel__header">DACS Workbench</div>
    <div class="dock-panel__body dock-panel__body--simulator">
      ${SIMULATOR_NAV_ITEMS.map((item) => renderDockButton(item, state)).join("")}
      <button class="dock-launch dock-launch--utility" data-action="open-onboarding">
        <span class="dock-launch__icon">?</span>
        <span class="dock-launch__text">Guia rapida</span>
      </button>
      <button class="dock-launch dock-launch--danger" data-action="reset-simulator-progress">
        <span class="dock-launch__icon">RST</span>
        <span class="dock-launch__text">Reiniciar</span>
      </button>
    </div>
    <div class="dock-panel__footer">
      <div class="dock-mini-label">Estado</div>
      <div class="dock-mini-value">${escapeHtml(getMissionLabel(state))}</div>
      <div class="dock-mini-label">Correo</div>
      <div class="dock-mini-value">${unreadCount} pendiente${unreadCount === 1 ? "" : "s"}</div>
      <div class="dock-mini-label">Datos</div>
      <div class="dock-mini-value">${escapeHtml(datasetLabel)}</div>
    </div>
  `;
}

export function renderDock(state = {}) {
  if (isSimulatorState(state)) {
    return renderSimulatorDock(state);
  }

  const summary = getProjectSummary();

  return `
    <div class="dock-panel__header">Laboratorio</div>
    <div class="dock-panel__body">
      <button class="dock-launch" data-nav="${VIEW_KEYS.HOME}">
        <span class="dock-launch__icon">LM</span>
        <span class="dock-launch__text">Inicio</span>
      </button>
      <button class="dock-launch" data-nav="${VIEW_KEYS.PROJECTS}">
        <span class="dock-launch__icon">LAB</span>
        <span class="dock-launch__text">Proyectos</span>
      </button>
    </div>
    <div class="dock-panel__footer">
      <div class="dock-mini-label">Catalogo</div>
      <div class="dock-mini-value">${summary.total} proyectos</div>
      <div class="dock-mini-label">Demos web</div>
      <div class="dock-mini-value">${summary.launchable} accesos directos</div>
      <div class="dock-mini-label">Fichas</div>
      <div class="dock-mini-value">${summary.documented} casos documentados</div>
    </div>
  `;
}

export function renderTaskbar(state) {
  if (isSimulatorState(state)) {
    const unreadCount = getUnreadCount(state);
    const activeMissionCount = state.missions?.activeId ? 1 : 0;
    const reportReady = Boolean(state.terminal?.lastResult && state.missions?.activeId && !state.report?.lastSubmission);

    return `
      <nav class="taskbar-nav taskbar-nav--simulator">
        ${SIMULATOR_NAV_ITEMS.map((item) => {
          const active = state.ui.activeView === item.id;
          const badge = item.id === VIEW_KEYS.INBOX && unreadCount
            ? `<span class="taskbar-button__badge">${unreadCount}</span>`
            : item.id === VIEW_KEYS.REPORT && reportReady
              ? `<span class="taskbar-button__badge">!</span>`
              : "";

          return `
            <button class="${joinClasses("taskbar-button", active && "is-active")}" data-nav="${item.id}">
              <span class="taskbar-button__short">${escapeHtml(item.short)}</span>
              <span class="taskbar-button__label">${escapeHtml(item.label)}</span>
              ${badge}
            </button>
          `;
        }).join("")}
        <div class="taskbar-spacer"></div>
        <div class="taskbar-status">
          <span class="taskbar-status__item">${escapeHtml(state.sim?.workdayLabel || "Day 1")}</span>
          <span class="taskbar-status__item">${escapeHtml(state.sim?.timeLabel || "08:40")}</span>
          <span class="taskbar-status__item">Mision ${activeMissionCount ? "1" : "0"}</span>
        </div>
      </nav>
    `;
  }

  const summary = getProjectSummary();

  return `
    <nav class="taskbar-nav">
      ${NAV_ITEMS.map((item) => {
        const active = state.ui.activeView === item.id;

        return `
          <button class="${joinClasses("taskbar-button", active && "is-active")}" data-nav="${item.id}">
            <span class="taskbar-button__short">${escapeHtml(item.short)}</span>
            <span class="taskbar-button__label">${escapeHtml(item.label)}</span>
          </button>
        `;
      }).join("")}
      <div class="taskbar-spacer"></div>
      <div class="taskbar-status">
        <span class="taskbar-status__item">Portfolio</span>
        <span class="taskbar-status__item">Proyectos ${summary.total}</span>
        <span class="taskbar-status__item">Demos ${summary.launchable}</span>
      </div>
    </nav>
  `;
}

export function renderNavPills(state) {
  const navItems = isSimulatorState(state) ? SIMULATOR_NAV_ITEMS : NAV_ITEMS;

  return `
    <div class="nav-pills">
      ${navItems.map((item) => {
        const active = state.ui.activeView === item.id;
        return `<button class="${joinClasses("nav-pill", active && "is-active")}" data-nav="${item.id}">${escapeHtml(item.label)}</button>`;
      }).join("")}
    </div>
  `;
}
