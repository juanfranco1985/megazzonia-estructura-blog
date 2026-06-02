import { VIEW_KEYS } from "./app/constants.js?v=megazzonia-20260513a";
import { normalizeViewName } from "./app/router.js?v=megazzonia-20260513a";
import { renderShell, renderStatusBar, renderContextPanel } from "./ui/shellView.js?v=megazzonia-20260513a";
import { renderDock, renderTaskbar } from "./ui/tabsView.js?v=megazzonia-20260513a";
import { renderDesktopHome } from "./ui/desktopHomeView.js?v=megazzonia-20260513a";
import { renderProjectsView } from "./ui/projectsView.js?v=megazzonia-20260513a";

const PORTFOLIO_VIEWS = new Set([
  VIEW_KEYS.HOME,
  VIEW_KEYS.PROJECTS
]);

const appRoot = document.getElementById("app");
const state = {
  mail: {
    threads: []
  },
  notifications: {
    items: []
  },
  report: {
    lastValidation: null
  },
  terminal: {
    lastResult: null,
    lastError: null
  },
  projectFilters: {
    query: "",
    category: "all",
    stack: "all",
    availability: "all",
    curation: "all"
  },
  ui: {
    activeView: VIEW_KEYS.HOME
  }
};

function getPortfolioView() {
  const nextView = normalizeViewName(window.location.hash);
  return PORTFOLIO_VIEWS.has(nextView) ? nextView : VIEW_KEYS.HOME;
}

function replaceHash(view) {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#${view}`
  );
}

if (!window.location.hash || !PORTFOLIO_VIEWS.has(normalizeViewName(window.location.hash))) {
  replaceHash(VIEW_KEYS.HOME);
}

appRoot.innerHTML = renderShell();

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

function renderChrome() {
  slots.status.innerHTML = renderStatusBar(state);
  slots.dock.innerHTML = renderDock(state);
  slots.context.innerHTML = renderContextPanel(state);
  slots.taskbar.innerHTML = renderTaskbar(state);
  slots.toast.innerHTML = "";
  slots.modal.innerHTML = "";
}

function renderActiveView() {
  const frameBody = slots.view.closest(".window-frame__body");
  const currentView = state.ui.activeView;
  const html = currentView === VIEW_KEYS.PROJECTS
    ? renderProjectsView(state)
    : renderDesktopHome(state);

  slots.view.dataset.activeView = currentView;
  if (frameBody) {
    frameBody.dataset.activeView = currentView;
  }
  slots.view.innerHTML = html;
}

function renderAll() {
  state.ui.activeView = getPortfolioView();
  renderChrome();
  renderActiveView();
}

function navigate(view) {
  if (!PORTFOLIO_VIEWS.has(view)) {
    return;
  }
  if (window.location.hash !== `#${view}`) {
    window.location.hash = `#${view}`;
  } else {
    renderAll();
  }
}

function updateProjectFilter(name, value) {
  const shouldRestoreSearch = name === "query";
  const selectionStart = shouldRestoreSearch ? document.activeElement?.selectionStart ?? value.length : null;
  const selectionEnd = shouldRestoreSearch ? document.activeElement?.selectionEnd ?? value.length : null;

  state.projectFilters = {
    ...state.projectFilters,
    [name]: value
  };
  renderAll();

  if (shouldRestoreSearch) {
    const searchInput = document.querySelector("[data-project-filter='query']");
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(selectionStart, selectionEnd);
    }
  }
}

document.addEventListener("click", (event) => {
  const resetTarget = event.target.closest("[data-action='reset-project-filters']");
  if (resetTarget) {
    event.preventDefault();
    state.projectFilters = {
      query: "",
      category: "all",
      stack: "all",
      availability: "all",
      curation: "all"
    };
    renderAll();
    return;
  }

  const navTarget = event.target.closest("[data-nav]");
  if (!navTarget) {
    return;
  }

  const view = navTarget.dataset.nav;
  if (!PORTFOLIO_VIEWS.has(view)) {
    return;
  }

  event.preventDefault();
  navigate(view);
});

document.addEventListener("input", (event) => {
  const target = event.target.closest("[data-project-filter]");
  if (!target || target.dataset.projectFilter !== "query") {
    return;
  }
  updateProjectFilter("query", target.value);
});

document.addEventListener("change", (event) => {
  const target = event.target.closest("[data-project-filter]");
  if (!target || target.dataset.projectFilter === "query") {
    return;
  }
  updateProjectFilter(target.dataset.projectFilter, target.value);
});

window.addEventListener("hashchange", renderAll);
renderAll();

window.setTimeout(() => {
  if (slots.boot) {
    slots.boot.hidden = true;
    slots.boot.setAttribute("aria-hidden", "true");
  }
}, 250);

window.__LABORATORIO_MEGAZZONIA__ = {
  renderAll,
  navigate
};




