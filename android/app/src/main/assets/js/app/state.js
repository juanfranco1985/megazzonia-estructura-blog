import { APP_NAME, DEFAULT_PLAYER, DEFAULT_SIM_CLOCK, DEFAULT_TERMINAL_QUERY, VIEW_KEYS } from "./constants.js";
import { parseTimeLabelToMinutes } from "../systems/clockEngine.js";
import { deepClone } from "./utils.js";
import { cloneMailThreads } from "../data/mailThreads.js";
import { missions } from "../data/missions.js";
import { createMissionStates, syncMissionAvailability } from "../systems/missions/missionRuntime.js";
import { createStakeholderRelationshipStates } from "../systems/stakeholders/stakeholderEngine.js";
import { createAreaReputationState } from "../systems/careerImpactSystem.js";

function createBundleStates(catalog) {
  return Object.fromEntries(
    catalog.map((mission) => [
      mission.id,
      {
        status: "locked",
        ready: false,
        rowCount: 0,
        qualityNotes: []
      }
    ])
  );
}

export function createInitialState() {
  const initialThreads = cloneMailThreads();
  const missionStates = syncMissionAvailability(createMissionStates(missions), []);
  const visibleThreads = initialThreads.filter((thread) => !thread.missionId || missionStates[thread.missionId]?.isVisible);
  const defaultSelectedThreadId = visibleThreads[0]?.id || null;

  return {
    app: {
      name: APP_NAME,
      version: "0.1.0"
    },
    player: {
      name: DEFAULT_PLAYER.name,
      role: DEFAULT_PLAYER.role,
      prestige: 0,
      technicalScore: 0,
      skillLevels: {},
      skills: [],
      successRate: 0,
      deadlineMisses: 0,
      onTimeDeliveries: 0,
      areaReputation: createAreaReputationState(),
      trajectory: {
        dominantAreaId: 'commercial',
        dominantTrackLabel: 'Commercial Analyst',
        readinessTier: 'Base estable',
        totalSignals: 0,
        lastUpdatedAt: null
      },
      seniority: {
        tier: 1,
        label: "Junior Analyst",
        currentTitle: "Junior Data Analyst",
        promotionReadiness: "Base estable",
        lastUpdatedAt: null
      },
      compensation: {
        salary: 1200,
        currency: "USD sim",
        bandLabel: "Band 1",
        lastUpdatedAt: null
      },
      workload: {
        loadScore: 0,
        loadLabel: "Manejable",
        burnoutRisk: 8,
        burnoutLabel: "Bajo",
        note: "Sin saturacion persistente.",
        lastUpdatedAt: null
      },
      performanceReviews: [],
      performanceReviewMeta: {
        lastReviewedCompletedMissions: 0,
        lastReviewedDeadlineMisses: 0
      }
    },
    sim: {
      week: DEFAULT_SIM_CLOCK.week,
      dayLabel: DEFAULT_SIM_CLOCK.dayLabel,
      timeLabel: DEFAULT_SIM_CLOCK.timeLabel,
      dateLabel: DEFAULT_SIM_CLOCK.dateLabel,
      workdayLabel: "Day 1",
      shiftLabel: "Morning shift",
      totalMinutes: parseTimeLabelToMinutes(DEFAULT_SIM_CLOCK.timeLabel),
      elapsedMinutes: 0
    },
    ui: {
      activeView: VIEW_KEYS.HOME,
      selectedFileId: null,
      terminalQuery: DEFAULT_TERMINAL_QUERY,
      modal: null,
      report: {
        selectedMetric: "total_amount",
        chartType: "bar",
        conclusion: "",
        notes: ""
      }
    },
    missions: {
      catalog: deepClone(missions),
      states: missionStates,
      activeId: null,
      completedIds: []
    },
    mail: {
      selectedThreadId: defaultSelectedThreadId,
      threads: initialThreads
    },
    files: {
      activeBundleId: null,
      unlockedBundleIds: [],
      bundleStates: createBundleStates(missions),
      previewCache: {}
    },
    terminal: {
      queryHistory: [],
      lastQueryText: DEFAULT_TERMINAL_QUERY,
      lastResult: null,
      lastError: null
    },
    report: {
      lastValidation: null,
      lastSubmission: null
    },
    analysis: {
      loadedMissionId: null,
      databaseReady: false,
      tables: [],
      summary: null,
      lastLoadError: null
    },
    activity: [
      {
        id: "activity_welcome",
        label: "Sesión iniciada en la workstation corporativa.",
        tone: "info",
        time: "08:40"
      }
    ],
    feedback: [],
    followupTasks: {
      items: [],
      pendingIds: [],
      completedIds: []
    },
    miniDeliverables: {
      items: [],
      pendingIds: [],
      completedIds: []
    },
    businessReviews: {
      items: [],
      pendingIds: [],
      completedIds: []
    },
    checkins: {
      items: [],
      pendingIds: [],
      completedIds: [],
      missedIds: []
    },
    agenda: {
      items: [],
      pendingIds: [],
      completedIds: [],
      missedIds: [],
      focusWindow: null
    },
    stakeholders: {
      relationships: createStakeholderRelationshipStates()
    },
    events: {
      firedIds: [],
      log: []
    },
    notifications: {
      items: [
        {
          id: "notif_welcome",
          title: "Bandeja lista",
          message: "Tienes 2 mensajes internos visibles y una solicitud comercial por revisar.",
          level: "info",
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + 5200,
          unread: true
        }
      ]
    }
  };
}

export function createStore(initialState) {
  const state = deepClone(initialState);
  const listeners = new Set();

  function notify(meta = {}) {
    for (const listener of listeners) {
      listener(state, meta);
    }
  }

  return {
    getState() {
      return state;
    },
    setState(mutator, meta = {}) {
      if (typeof mutator === "function") {
        mutator(state);
      } else if (mutator && typeof mutator === "object") {
        Object.assign(state, mutator);
      }
      notify(meta);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
