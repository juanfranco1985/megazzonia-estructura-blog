import { VIEW_KEYS } from "./constants.js";

const VALID_VIEWS = new Set(Object.values(VIEW_KEYS));

export function normalizeViewName(value) {
  if (!value) {
    return VIEW_KEYS.HOME;
  }
  const clean = String(value).replace(/^#/, "").trim().toLowerCase();
  return VALID_VIEWS.has(clean) ? clean : VIEW_KEYS.HOME;
}

export function createRouter(store, onRouteChange) {
  function syncFromHash() {
    const nextView = normalizeViewName(window.location.hash);
    const currentState = store.getState();
    if (currentState.ui.activeView !== nextView) {
      store.setState((state) => {
        state.ui.activeView = nextView;
      }, { route: true });
    }
    if (typeof onRouteChange === "function") {
      onRouteChange(nextView);
    }
  }

  function navigate(view) {
    const nextView = normalizeViewName(view);
    if (window.location.hash !== `#${nextView}`) {
      window.location.hash = `#${nextView}`;
    } else {
      syncFromHash();
    }
  }

  window.addEventListener("hashchange", syncFromHash);
  syncFromHash();

  return {
    navigate,
    syncFromHash,
    destroy() {
      window.removeEventListener("hashchange", syncFromHash);
    }
  };
}
