import { createInitialState, createStore } from "./app/state.js";
import { clearPersistedState, loadPersistedState, mergePersistedState, persistState } from "./app/storage.js";
import { createRouter } from "./app/router.js";
import { VIEW_KEYS, DEFAULT_TERMINAL_QUERY } from "./app/constants.js";
import { renderShell, renderStatusBar, renderContextPanel } from "./ui/shellView.js";
import { renderDock, renderTaskbar } from "./ui/tabsView.js";
import { renderToasts } from "./ui/toastView.js";
import { renderModal } from "./ui/modalView.js";
import { renderDesktopHome } from "./ui/desktopHomeView.js";
import { renderProjectsView } from "./ui/projectsView.js";
import { renderInboxView } from "./ui/inboxView.js";
import { renderFilesView } from "./ui/filesView.js";
import { renderTerminalView } from "./ui/terminalView.js";
import { renderReportView, afterRenderReport } from "./ui/reportView.js";
import { renderCareerView } from "./ui/careerView.js";
import { buildDesktopModel } from "./systems/desktopSystem.js";
import { buildFileSummary, selectDataset } from "./systems/fileSystem.js";
import { getDefaultAssetId } from "./systems/datasetRegistry.js";
import { buildTerminalModel, runTerminalQuery, resetTerminalQuery, setTerminalQuery } from "./systems/terminalSystem.js";
import { acceptMission } from "./systems/missionSystem.js";
import { selectThread } from "./systems/mailSystem.js";
import { respondToCheckin } from "./systems/checkinSystem.js";
import { attendAgendaItem, deprioritizeAgendaItem, reprogramAgendaItem, startFocusWindow } from "./systems/agendaSystem.js";
import { createFollowupTaskFromAgenda, resolveFollowupTask } from "./systems/followupTaskSystem.js";
import { resolveMiniDeliverable } from "./systems/miniDeliverableSystem.js";
import { resolveBusinessReview } from "./systems/businessReviewSystem.js";
import { advanceSimulationTime } from "./systems/clockEngine.js";
import { dismissNotification, dismissVisibleNotifications, pushNotification, sweepExpiredNotifications } from "./systems/notificationSystem.js";
import { updateReportDraft, submitReport, destroyChart } from "./systems/reportEngine.js";
import * as validationEngineModule from "./systems/validationEngine.js";
import * as progressionSystemModule from "./systems/progressionSystem.js";
import { createSqlRuntime } from "./systems/sqlEngine.js";
import { getMissionById, getPrimaryMissionId } from "./data/missions.js";

const appRoot = document.getElementById("app");
const sqlRuntime = createSqlRuntime();

function getCapturePreset() {
  return new URLSearchParams(window.location.search).get("capture") || "";
}

const baseState = createInitialState();
const persistedState = getCapturePreset() ? null : loadPersistedState();
const initialState = mergePersistedState(baseState, persistedState);
const store = createStore(initialState);
const PRIMARY_MISSION_ID = getPrimaryMissionId();
const SIMULATOR_TITLE = "Data Analyst Career Simulator";
const ONBOARDING_SESSION_KEY = "lm.dacs.onboarding.seen";

if (!window.location.hash) {
  window.location.hash = `#${VIEW_KEYS.HOME}`;
}

appRoot.innerHTML = renderShell({
  title: SIMULATOR_TITLE,
  tagline: "Simulador de carrera, SQL y decisiones de negocio"
});

const slots = {
  status: document.getElementById("status-slot"),
  dock: document.getElementById("dock-slot"),
  context: document.getElementById("context-slot"),
  view: document.getElementById("view-slot"),
  taskbar: document.getElementById("taskbar-slot"),
  toast: document.getElementById("toast-host"),
  modal: document.getElementById("modal-host"),
  boot: document.getElementById("boot-overlay")
};

function dismissInboxNotifications() {
  const changed = dismissVisibleNotifications(store);
  if (changed) {
    renderChrome();
  }
}

const router = createRouter(store, (nextView) => {
  if (nextView === VIEW_KEYS.INBOX) {
    dismissInboxNotifications();
  }
});

let persistTimer = null;
function schedulePersist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistState(store.getState());
  }, 250);
}

function renderChrome() {
  const state = store.getState();
  const desktopModel = buildDesktopModel(state);
  const fileSummary = buildFileSummary(state);
  const terminalModel = buildTerminalModel(state);

  slots.status.innerHTML = renderStatusBar(state, { desktop: desktopModel });
  slots.dock.innerHTML = renderDock(state, { desktop: desktopModel });
  slots.context.innerHTML = renderContextPanel(state, {
    desktop: desktopModel,
    fileSummary,
    terminal: terminalModel
  });
  slots.taskbar.innerHTML = renderTaskbar(state);
  slots.toast.innerHTML = renderToasts(state);
  slots.modal.innerHTML = renderModal(state);
}

function renderActiveView() {
  const state = store.getState();
  const runtimeSnapshot = sqlRuntime.getRuntimeSnapshot();
  const currentView = state.ui.activeView;
  const frameBody = slots.view.closest(".window-frame__body");
  let html = "";
  let afterRender = null;

  if (currentView === VIEW_KEYS.HOME) {
    html = renderDesktopHome(state);
  } else if (currentView === VIEW_KEYS.PROJECTS) {
    html = renderProjectsView(state);
  } else if (currentView === VIEW_KEYS.INBOX) {
    html = renderInboxView(state);
  } else if (currentView === VIEW_KEYS.FILES) {
    html = renderFilesView(state, runtimeSnapshot);
  } else if (currentView === VIEW_KEYS.TERMINAL) {
    html = renderTerminalView(state, runtimeSnapshot);
  } else if (currentView === VIEW_KEYS.REPORT) {
    html = renderReportView(state);
    afterRender = () => afterRenderReport(state);
  } else if (currentView === VIEW_KEYS.CAREER) {
    html = renderCareerView(state);
  } else {
    html = renderDesktopHome(state);
  }

  slots.view.innerHTML = html;
  slots.view.dataset.activeView = currentView;
  if (frameBody) {
    frameBody.dataset.activeView = currentView;
  }
  if (typeof afterRender === "function") {
    afterRender();
  } else {
    destroyChart();
  }
}

function renderAll() {
  renderChrome();
  renderActiveView();
}

function setBootVisible(visible) {
  if (!slots.boot) {
    return;
  }
  if (visible) {
    slots.boot.hidden = false;
    slots.boot.classList.add("is-visible");
    return;
  }

  slots.boot.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!slots.boot.classList.contains("is-visible")) {
      slots.boot.hidden = true;
    }
  }, 360);
}

function showNotification(title, message, level = "info") {
  pushNotification(store, {
    title,
    message,
    level,
    ttl: 6200
  });
  renderChrome();
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch (_error) {
    return null;
  }
}

function hasStartedSimulator(state) {
  return Boolean(
    state.missions.activeId ||
    state.missions.completedIds.length ||
    state.analysis.databaseReady ||
    state.terminal.queryHistory.length ||
    state.report.lastSubmission
  );
}

function markOnboardingSeen() {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(ONBOARDING_SESSION_KEY, "1");
  } catch (_error) {
    // Ignore privacy mode issues.
  }
}

function clearOnboardingSeen() {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(ONBOARDING_SESSION_KEY);
  } catch (_error) {
    // Ignore privacy mode issues.
  }
}

function shouldShowOnboarding() {
  if (getCapturePreset()) {
    return false;
  }
  const state = store.getState();
  const storage = getSessionStorage();
  if (storage?.getItem(ONBOARDING_SESSION_KEY)) {
    return false;
  }
  return !hasStartedSimulator(state) && [VIEW_KEYS.HOME, VIEW_KEYS.INBOX].includes(state.ui.activeView);
}

function openOnboardingModal({ markSeen = true } = {}) {
  if (markSeen) {
    markOnboardingSeen();
  }

  store.setState((state) => {
    state.ui.modal = {
      title: "Primeros pasos del simulador",
      body: [
        "1. Entra a Correo y abre la solicitud comercial.",
        "2. Acepta la mision para desbloquear el dataset.",
        "3. Revisa Archivos y ejecuta SQL sobre sales_clean.",
        "4. En Reporte, convierte el hallazgo en una recomendacion ejecutiva."
      ].join("\n"),
      actions: [
        { id: "accept-onboarding", label: "Empezar en Correo", primary: true },
        { id: "close-modal", label: "Cerrar" }
      ]
    };
  }, { silent: true });
  renderAll();
}

function openResetConfirmation() {
  store.setState((state) => {
    state.ui.modal = {
      title: "Reiniciar progreso local",
      body: "Esto borra la mision activa, historial SQL, reporte, feedback y progreso guardado en este navegador. No elimina archivos del proyecto.",
      actions: [
        { id: "confirm-reset-simulator-progress", label: "Reiniciar", primary: true },
        { id: "close-modal", label: "Cancelar" }
      ]
    };
  }, { silent: true });
  renderAll();
}

async function applyCapturePreset() {
  const preset = getCapturePreset();
  if (!preset) {
    return;
  }

  markOnboardingSeen();
  store.setState((state) => {
    state.ui.modal = null;
  }, { silent: true });

  if (preset === "sql" || preset === "report") {
    if (!store.getState().missions.activeId) {
      acceptMission(store, PRIMARY_MISSION_ID);
    }
    await loadMissionWorkspace(PRIMARY_MISSION_ID);
    runTerminalQuery(store, sqlRuntime, store.getState().ui.terminalQuery || DEFAULT_TERMINAL_QUERY);
    ensureReportSuggestion();
    router.navigate(preset === "report" ? VIEW_KEYS.REPORT : VIEW_KEYS.TERMINAL);
    store.setState((state) => {
      state.notifications.items = [];
      state.ui.modal = null;
    }, { silent: true });
    renderAll();
    return;
  }

  router.navigate(VIEW_KEYS.INBOX);
  store.setState((state) => {
    state.notifications.items = [];
    state.ui.modal = null;
  }, { silent: true });
  renderAll();
}

function replaceStoreState(nextState) {
  store.setState((state) => {
    for (const key of Object.keys(state)) {
      delete state[key];
    }
    Object.assign(state, nextState);
  }, { silent: true });
}

function resetSimulatorProgress() {
  destroyChart();
  sqlRuntime.reset();
  clearPersistedState();
  clearOnboardingSeen();
  replaceStoreState(createInitialState());
  router.navigate(VIEW_KEYS.HOME);
  showNotification("Progreso reiniciado", "El simulador volvio al inicio con bandeja, SQL y reporte limpios.", "success");
  openOnboardingModal({ markSeen: false });
}

function maybeShowOnboarding() {
  if (!shouldShowOnboarding()) {
    return;
  }
  window.setTimeout(() => {
    if (shouldShowOnboarding()) {
      openOnboardingModal();
    }
  }, 200);
}

async function loadMissionWorkspace(missionId) {
  const mission = getMissionById(missionId);
  if (!mission) {
    return;
  }

  try {
    const snapshot = await sqlRuntime.loadMissionDataset(missionId);
    store.setState((state) => {
      const defaultAssetId = state.ui.selectedFileId || getDefaultAssetId(missionId);
      state.analysis.databaseReady = true;
      state.analysis.loadedMissionId = missionId;
      state.analysis.tables = snapshot.tables;
      state.analysis.summary = snapshot.summary;
      state.analysis.lastLoadError = null;
      state.files.activeBundleId = missionId;
      state.ui.selectedFileId = defaultAssetId;
      state.files.bundleStates[missionId] = {
        ...(state.files.bundleStates[missionId] || {}),
        status: "ready",
        ready: true,
        rowCount: snapshot.summary.rawRows,
        qualityNotes: snapshot.summary.qualityNotes
      };
      state.files.previewCache[missionId] = {
        rawPreview: snapshot.rawPreview,
        cleanPreview: snapshot.cleanPreview
      };
    }, { silent: true });

    showNotification("Dataset listo", `${mission.title} quedó preparado para análisis.`, "success");
    renderAll();
  } catch (error) {
    store.setState((state) => {
      state.analysis.lastLoadError = error.message || String(error);
    }, { silent: true });
    showNotification("Fallo al cargar dataset", error.message || String(error), "error");
    renderAll();
  }
}

async function acceptMissionFlow(missionId) {
  const result = acceptMission(store, missionId);
  if (!result) {
    return;
  }

  showNotification("Misión aceptada", `${result.mission.title} quedó activa.`, "info");
  await loadMissionWorkspace(missionId);
  router.navigate(VIEW_KEYS.FILES);
  renderAll();
}

function ensureReportSuggestion() {
  const state = store.getState();
  if (state.ui.report.conclusion.trim()) {
    return;
  }
  const missionId = state.missions.activeId || state.analysis.loadedMissionId || PRIMARY_MISSION_ID;
  const mission = getMissionById(missionId);
  const result = state.terminal.lastResult;
  const firstRow = result?.rows?.[0] || null;
  const keyCandidates = ["sales_channel", "product_category", "region", "channel", "category", "segment"];
  const primaryKey = firstRow ? keyCandidates.find((key) => Object.prototype.hasOwnProperty.call(firstRow, key)) || result?.columns?.[0] : null;
  const primaryFinding = primaryKey ? String(firstRow?.[primaryKey] ?? "").trim() : "";
  if (primaryFinding) {
    const audience = mission?.executiveAudience || "el siguiente corte";
    updateReportDraft(store, {
      conclusion: `Hallazgo principal: ${primaryFinding}. Conviene priorizarlo en la comunicación ejecutiva para ${audience.toLowerCase()}.`
    });
    return;
  }
  const summary = state.analysis.summary;
  if (!summary || !summary.winningChannel) {
    return;
  }
  updateReportDraft(store, {
    conclusion: `La semana pasada, ${summary.winningChannel} lideró las ventas y es el canal que conviene comunicar al comité.`
  });
}

function handleAction(action, target) {
  const state = store.getState();

  switch (action) {
    case "open-onboarding": {
      openOnboardingModal();
      break;
    }
    case "accept-onboarding": {
      store.setState((next) => {
        next.ui.modal = null;
      }, { silent: true });
      router.navigate(VIEW_KEYS.INBOX);
      renderAll();
      break;
    }
    case "reset-simulator-progress": {
      openResetConfirmation();
      break;
    }
    case "confirm-reset-simulator-progress": {
      resetSimulatorProgress();
      break;
    }
    case "open-attachment": {
      const attachmentId = target.dataset.attachmentId || "";
      const attachmentPath = target.dataset.attachmentPath || "";
      const missionId = target.dataset.missionId || state.missions.activeId || state.analysis.loadedMissionId || PRIMARY_MISSION_ID;
      if (/sales_dirty\.csv$/i.test(attachmentPath) || /mission\.json$/i.test(attachmentPath) || /schema\.json$/i.test(attachmentPath)) {
        selectDataset(store, attachmentId || getDefaultAssetId(missionId), missionId);
        router.navigate(VIEW_KEYS.FILES);
        renderAll();
      }
      break;
    }
    case "select-thread": {
      const threadId = target.dataset.threadId;
      if (threadId) {
        selectThread(store, threadId);
        dismissInboxNotifications();
        router.navigate(VIEW_KEYS.INBOX);
      }
      break;
    }
    case "accept-mission": {
      const missionId = target.dataset.missionId || PRIMARY_MISSION_ID;
      void acceptMissionFlow(missionId);
      break;
    }
    case "respond-checkin": {
      const checkinId = target.dataset.checkinId;
      const result = checkinId ? respondToCheckin(store, checkinId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        showNotification('Estado enviado', 'El check-in quedó respondido con una actualización ejecutiva.', 'success');
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "attend-agenda": {
      const agendaId = target.dataset.agendaId;
      const result = agendaId ? attendAgendaItem(store, agendaId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        const followup = createFollowupTaskFromAgenda(store, result);
        advanceSimulationTime(store, 'review_mail', result.durationMinutes);
        showNotification('Reunión atendida', followup ? 'La reunión dejó una tarea derivada real para el siguiente bloque.' : 'La reunión quedó registrada y el hilo se actualizó.', 'success');
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "reprogram-agenda": {
      const agendaId = target.dataset.agendaId;
      const result = agendaId ? reprogramAgendaItem(store, agendaId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        showNotification("Reunion reprogramada", "Moviste el espacio al siguiente hueco para bajar la friccion de agenda.", "info");
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "deprioritize-agenda": {
      const agendaId = target.dataset.agendaId;
      const result = agendaId ? deprioritizeAgendaItem(store, agendaId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        showNotification("Reunion desplazada", "El espacio quedo fuera del bloque actual y ya genero costo de coordinacion.", "warning");
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "resolve-followup-task": {
      const taskId = target.dataset.followupTaskId;
      const result = taskId ? resolveFollowupTask(store, taskId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        showNotification('Follow-up resuelto', 'La tarea derivada quedó cerrada y registrada.', 'success');
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "resolve-business-review": {
      const reviewId = target.dataset.businessReviewId;
      const optionId = target.dataset.businessReviewOption;
      const result = reviewId && optionId ? resolveBusinessReview(store, reviewId, optionId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        showNotification('Respuesta de negocio resuelta', 'La decisión posterior ya quedó registrada y aplicada.', 'success');
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "resolve-mini-deliverable": {
      const itemId = target.dataset.miniDeliverableId;
      const result = itemId ? resolveMiniDeliverable(store, itemId) : null;
      if (result?.threadId) {
        selectThread(store, result.threadId);
        showNotification('Mini-entregable listo', 'El output corto quedó preparado y registrado.', 'success');
        router.navigate(VIEW_KEYS.INBOX);
        renderAll();
      }
      break;
    }
    case "start-focus": {
      const result = startFocusWindow(store);
      if (result) {
        showNotification('Foco activo', 'Se abrió una ventana de foco para avanzar con menos fricción.', 'success');
        renderAll();
      }
      break;
    }
    case "select-dataset": {
      const datasetId = target.dataset.datasetId || getDefaultAssetId(state.files.activeBundleId || state.analysis.loadedMissionId || state.missions.activeId || PRIMARY_MISSION_ID);
      selectDataset(store, datasetId);
      break;
    }
    case "run-query": {
      if (!sqlRuntime.getLoadedMissionId()) {
        showNotification("Misión no preparada", "Acepta la misión antes de ejecutar SQL.", "warning");
        router.navigate(VIEW_KEYS.INBOX);
        break;
      }

      const result = runTerminalQuery(store, sqlRuntime, state.ui.terminalQuery || DEFAULT_TERMINAL_QUERY);
      if (result.ok) {
        ensureReportSuggestion();
        showNotification("Consulta ejecutada", `${result.result.rows.length} fila(s) devueltas.`, "success");
      } else {
        showNotification("Error SQL", result.error.message || String(result.error), "error");
      }
      renderAll();
      break;
    }
    case "reset-query": {
      resetTerminalQuery(store);
      renderAll();
      break;
    }
    case "reuse-query": {
      const query = target.dataset.query || DEFAULT_TERMINAL_QUERY;
      setTerminalQuery(store, query);
      router.navigate(VIEW_KEYS.TERMINAL);
      renderAll();
      break;
    }
    case "submit-report": {
      submitReport(store, {
        runtime: sqlRuntime,
        validationEngine: validationEngineModule,
        progressionSystem: progressionSystemModule,
        notificationSystem: { pushNotification }
      });
      router.navigate(VIEW_KEYS.INBOX);
      renderAll();
      break;
    }
    case "dismiss-notification": {
      const notificationId = target.dataset.notificationId;
      if (notificationId) {
        dismissNotification(store, notificationId);
        renderChrome();
      }
      break;
    }
    case "close-modal": {
      store.setState((next) => {
        next.ui.modal = null;
      }, { silent: true });
      renderAll();
      break;
    }
    default:
      break;
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.matches("[data-input='terminal-query']")) {
    setTerminalQuery(store, target.value);
  } else if (target.matches("[data-input='report-conclusion']")) {
    updateReportDraft(store, { conclusion: target.value });
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.matches("[data-input='report-metric']")) {
    updateReportDraft(store, { selectedMetric: target.value });
    renderAll();
  } else if (target.matches("[data-input='report-chart-type']")) {
    updateReportDraft(store, { chartType: target.value });
    renderAll();
  }
}

function handleClick(event) {
  const target = event.target instanceof Element ? event.target.closest("[data-action], [data-nav]") : null;
  if (!target) {
    const miniThread = event.target instanceof Element ? event.target.closest("[data-thread-id]") : null;
    if (miniThread?.dataset?.threadId) {
      selectThread(store, miniThread.dataset.threadId);
      router.navigate(VIEW_KEYS.INBOX);
      renderAll();
    }
    return;
  }

  const threadId = target.dataset.threadId;
  if (threadId) {
    selectThread(store, threadId);
    dismissInboxNotifications();
    router.navigate(VIEW_KEYS.INBOX);
    renderAll();
    return;
  }

  const nav = target.dataset.nav;
  if (nav) {
    if (nav === VIEW_KEYS.INBOX) {
      dismissInboxNotifications();
    }
    router.navigate(nav);
    return;
  }

  const action = target.dataset.action;
  if (action) {
    event.preventDefault();
    handleAction(action, target);
  }
}

appRoot.addEventListener("click", handleClick);
appRoot.addEventListener("input", handleInput);
appRoot.addEventListener("change", handleChange);

store.subscribe((_state, meta) => {
  schedulePersist();
  if (!meta?.silent) {
    renderAll();
  }
});

async function bootstrap() {
  setBootVisible(true);
  try {
    await sqlRuntime.init();
    const persistedMissionId = store.getState().missions.activeId || store.getState().analysis.loadedMissionId || store.getState().files.activeBundleId;
    if (persistedMissionId) {
      await loadMissionWorkspace(persistedMissionId);
    } else {
      renderAll();
    }
    if (getCapturePreset()) {
      await applyCapturePreset();
    } else {
      maybeShowOnboarding();
    }
  } catch (error) {
    renderAll();
    showNotification("Carga inicial incompleta", error?.message || String(error), "error");
  } finally {
    window.setTimeout(() => {
      setBootVisible(false);
    }, 700);
  }
}

window.setInterval(() => {
  const changed = sweepExpiredNotifications(store);
  if (changed) {
    schedulePersist();
  }
  slots.toast.innerHTML = renderToasts(store.getState());
}, 1000);

bootstrap();

window.__LABORATORIO_MEGAZZONIA__ = {
  store,
  sqlRuntime,
  router,
  renderAll
};
