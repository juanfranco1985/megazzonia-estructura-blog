import { STORAGE_KEY, VIEW_KEYS } from "./constants.js";
import { deepClone } from "./utils.js";

const RESTORABLE_PORTFOLIO_VIEWS = new Set([
  VIEW_KEYS.HOME,
  VIEW_KEYS.PROJECTS
]);

function safeStorage() {
  try {
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function normalizeSelectedFileId(candidate) {
  if (!candidate) {
    return null;
  }
  const text = String(candidate);
  return text.startsWith("mission_") ? null : text;
}

function normalizeNotificationItems(items = []) {
  return items.map((item) => ({
    ...deepClone(item),
    read: item?.read ?? !item?.unread
  }));
}

export function loadPersistedState() {
  const storage = safeStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function clearPersistedState() {
  const storage = safeStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // Ignore privacy mode issues.
  }
}

function mergeThreadState(baseThreads, persistedThreads = []) {
  const baseById = new Map(baseThreads.map((thread) => [thread.id, thread]));
  const persistedById = new Map((persistedThreads || []).map((thread) => [thread.id, thread]));
  const merged = [];

  for (const persisted of persistedThreads || []) {
    const base = baseById.get(persisted.id);
    merged.push({
      ...(base ? deepClone(base) : {}),
      ...deepClone(persisted),
      labels: deepClone(persisted.labels || base?.labels || []),
      attachments: deepClone(persisted.attachments || base?.attachments || []),
      messages: deepClone(persisted.messages || base?.messages || [])
    });
  }

  for (const thread of baseThreads) {
    if (!persistedById.has(thread.id)) {
      merged.push(deepClone(thread));
    }
  }

  return merged;
}

export function mergePersistedState(baseState, persistedState) {
  if (!persistedState) {
    return baseState;
  }

  const next = deepClone(baseState);

  if (persistedState.player) {
    Object.assign(next.player, persistedState.player);
  }

  if (persistedState.sim) {
    Object.assign(next.sim, persistedState.sim);
  }

  if (persistedState.ui) {
    next.ui.activeView = RESTORABLE_PORTFOLIO_VIEWS.has(persistedState.ui.activeView)
      ? persistedState.ui.activeView
      : VIEW_KEYS.HOME;
    next.ui.terminalQuery = persistedState.ui.terminalQuery || next.ui.terminalQuery;
    next.ui.modal = null;

    const selectedFileId = persistedState.ui.selectedFileId || normalizeSelectedFileId(persistedState.ui.selectedDatasetId);
    if (selectedFileId) {
      next.ui.selectedFileId = selectedFileId;
    }

    if (persistedState.ui.report) {
      Object.assign(next.ui.report, persistedState.ui.report);
    }
  }

  if (persistedState.missions) {
    Object.assign(next.missions, persistedState.missions);
    if (persistedState.missions.states) {
      next.missions.states = {
        ...next.missions.states,
        ...persistedState.missions.states
      };
    }
  }

  if (persistedState.mail) {
    next.mail = {
      ...next.mail,
      ...persistedState.mail,
      selectedThreadId: persistedState.mail.selectedThreadId || persistedState.ui?.selectedThreadId || next.mail.selectedThreadId,
      threads: mergeThreadState(next.mail.threads, persistedState.mail.threads)
    };
  } else if (persistedState.ui?.selectedThreadId) {
    next.mail.selectedThreadId = persistedState.ui.selectedThreadId;
  }

  if (persistedState.files) {
    next.files.activeBundleId = persistedState.files.activeBundleId ?? persistedState.files.activeDatasetId ?? next.files.activeBundleId;
    next.files.unlockedBundleIds = persistedState.files.unlockedBundleIds ?? persistedState.files.unlockedDatasetIds ?? next.files.unlockedBundleIds;
    next.files.previewCache = {
      ...next.files.previewCache,
      ...(persistedState.files.previewCache || {})
    };

    const persistedBundleStates = persistedState.files.bundleStates || persistedState.files.datasetStates;
    if (persistedBundleStates) {
      next.files.bundleStates = {
        ...next.files.bundleStates,
        ...persistedBundleStates
      };
    }
  }

  if (persistedState.terminal) {
    Object.assign(next.terminal, persistedState.terminal);
  }

  if (persistedState.report) {
    next.report.lastValidation = persistedState.report.lastValidation ?? next.report.lastValidation;
    next.report.lastSubmission = persistedState.report.lastSubmission ?? next.report.lastSubmission;

    if (persistedState.report.draft) {
      Object.assign(next.ui.report, persistedState.report.draft);
    }
  }

  if (persistedState.analysis) {
    Object.assign(next.analysis, persistedState.analysis);
    if (!next.analysis.loadedMissionId && persistedState.analysis.activeMissionId) {
      next.analysis.loadedMissionId = persistedState.analysis.activeMissionId;
    }
  }

  if (persistedState.activity) {
    next.activity = persistedState.activity;
  }

  if (persistedState.feedback) {
    next.feedback = persistedState.feedback;
  }

  if (persistedState.followupTasks) {
    next.followupTasks = {
      ...next.followupTasks,
      ...deepClone(persistedState.followupTasks),
      items: deepClone(persistedState.followupTasks.items || next.followupTasks.items),
      pendingIds: deepClone(persistedState.followupTasks.pendingIds || next.followupTasks.pendingIds),
      completedIds: deepClone(persistedState.followupTasks.completedIds || next.followupTasks.completedIds)
    };
  }

  if (persistedState.miniDeliverables) {
    next.miniDeliverables = {
      ...next.miniDeliverables,
      ...deepClone(persistedState.miniDeliverables),
      items: deepClone(persistedState.miniDeliverables.items || next.miniDeliverables.items),
      pendingIds: deepClone(persistedState.miniDeliverables.pendingIds || next.miniDeliverables.pendingIds),
      completedIds: deepClone(persistedState.miniDeliverables.completedIds || next.miniDeliverables.completedIds)
    };
  }

  if (persistedState.businessReviews) {
    next.businessReviews = {
      ...next.businessReviews,
      ...deepClone(persistedState.businessReviews),
      items: deepClone(persistedState.businessReviews.items || next.businessReviews.items),
      pendingIds: deepClone(persistedState.businessReviews.pendingIds || next.businessReviews.pendingIds),
      completedIds: deepClone(persistedState.businessReviews.completedIds || next.businessReviews.completedIds)
    };
  }

  if (persistedState.checkins) {
    next.checkins = {
      ...next.checkins,
      ...deepClone(persistedState.checkins),
      items: deepClone(persistedState.checkins.items || next.checkins.items),
      pendingIds: deepClone(persistedState.checkins.pendingIds || next.checkins.pendingIds),
      completedIds: deepClone(persistedState.checkins.completedIds || next.checkins.completedIds),
      missedIds: deepClone(persistedState.checkins.missedIds || next.checkins.missedIds)
    };
  }

  if (persistedState.agenda) {
    next.agenda = {
      ...next.agenda,
      ...deepClone(persistedState.agenda),
      items: deepClone(persistedState.agenda.items || next.agenda.items),
      pendingIds: deepClone(persistedState.agenda.pendingIds || next.agenda.pendingIds),
      completedIds: deepClone(persistedState.agenda.completedIds || next.agenda.completedIds),
      missedIds: deepClone(persistedState.agenda.missedIds || next.agenda.missedIds),
      focusWindow: deepClone(persistedState.agenda.focusWindow ?? next.agenda.focusWindow)
    };
  }

  if (persistedState.stakeholders) {
    next.stakeholders = {
      ...next.stakeholders,
      ...deepClone(persistedState.stakeholders),
      relationships: {
        ...next.stakeholders.relationships,
        ...(deepClone(persistedState.stakeholders.relationships) || {})
      }
    };
  }

  if (persistedState.events) {
    next.events = {
      ...next.events,
      ...deepClone(persistedState.events),
      firedIds: deepClone(persistedState.events.firedIds || next.events.firedIds),
      log: deepClone(persistedState.events.log || next.events.log)
    };
  }

  if (persistedState.notifications) {
    next.notifications = {
      ...next.notifications,
      ...deepClone(persistedState.notifications),
      items: normalizeNotificationItems(persistedState.notifications.items || next.notifications.items)
    };
  }

  return next;
}

export function createPersistedSnapshot(state) {
  return {
    player: state.player,
    sim: state.sim,
    ui: {
      activeView: state.ui.activeView,
      selectedFileId: state.ui.selectedFileId,
      report: state.ui.report,
      terminalQuery: state.ui.terminalQuery
    },
    missions: {
      activeId: state.missions.activeId,
      completedIds: state.missions.completedIds,
      states: state.missions.states
    },
    mail: {
      selectedThreadId: state.mail.selectedThreadId,
      threads: deepClone(state.mail.threads)
    },
    files: {
      activeBundleId: state.files.activeBundleId,
      unlockedBundleIds: state.files.unlockedBundleIds,
      bundleStates: state.files.bundleStates,
      previewCache: state.files.previewCache
    },
    terminal: {
      queryHistory: state.terminal.queryHistory,
      lastQueryText: state.terminal.lastQueryText,
      lastResult: state.terminal.lastResult,
      lastError: state.terminal.lastError
    },
    report: {
      lastValidation: state.report.lastValidation,
      lastSubmission: state.report.lastSubmission
    },
    analysis: state.analysis,
    activity: state.activity.slice(0, 30),
    feedback: state.feedback.slice(0, 20),
    followupTasks: deepClone(state.followupTasks),
    miniDeliverables: deepClone(state.miniDeliverables),
    businessReviews: deepClone(state.businessReviews),
    checkins: deepClone(state.checkins),
    agenda: deepClone(state.agenda),
    stakeholders: {
      relationships: deepClone(state.stakeholders.relationships)
    },
    events: {
      firedIds: deepClone(state.events.firedIds),
      log: deepClone(state.events.log).slice(0, 50)
    },
    notifications: {
      items: normalizeNotificationItems(state.notifications.items).slice(0, 20)
    }
  };
}

export function persistState(state) {
  const storage = safeStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(createPersistedSnapshot(state)));
  } catch (_error) {
    // Ignore quota or privacy mode issues in the MVP.
  }
}
