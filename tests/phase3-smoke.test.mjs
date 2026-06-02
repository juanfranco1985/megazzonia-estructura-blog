import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const repoRoot = process.cwd();
const assetsRoot = path.join(repoRoot, "android", "app", "src", "main", "assets");
const require = createRequire(import.meta.url);

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(repoRoot, relativePath)).href);
}

function installRuntimeStubs() {
  const initSqlJs = require(path.join(assetsRoot, "libs", "sql-wasm.js"));
  global.window = {
    initSqlJs: (config = {}) => initSqlJs({
      ...config,
      locateFile: () => path.join(assetsRoot, "libs", "sql-wasm.wasm")
    })
  };
  global.fetch = async (assetPath) => {
    const full = path.join(assetsRoot, assetPath);
    if (!fs.existsSync(full)) {
      return { ok: false, text: async () => "" };
    }
    return {
      ok: true,
      text: async () => fs.readFileSync(full, "utf8")
    };
  };
}

test("mission flow keeps bundle and progress state coherent", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { applyMissionOutcome, buildCareerModel } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");

  let state = store.getState();
  assert.equal(state.missions.activeId, "mission_001_sales_cleaning");
  assert.equal(state.files.activeBundleId, "mission_001_sales_cleaning");
  assert.equal(state.ui.selectedFileId, "sales_dirty_csv");

  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    message: "ok"
  });

  state = store.getState();
  const career = buildCareerModel(state);

  assert.equal(state.missions.activeId, null);
  assert.deepEqual(state.missions.completedIds, ["mission_001_sales_cleaning"]);
  assert.equal(state.player.successRate, 33);
  assert.equal(career.currentMissionLabel, "Sin misión activa");
});

test("accepting mission 002 switches the active bundle and starter query", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");

  const store = createStore(createInitialState());
  const attemptBeforeUnlock = acceptMission(store, "mission_002_web_category_mix");
  let state = store.getState();

  assert.equal(attemptBeforeUnlock, null);
  assert.equal(state.missions.activeId, null);
  assert.equal(state.missions.states["mission_002_web_category_mix"].isUnlocked, false);

  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    message: "ok"
  });

  state = store.getState();
  assert.equal(state.missions.states["mission_002_web_category_mix"].isUnlocked, true);

  acceptMission(store, "mission_002_web_category_mix");
  state = store.getState();

  assert.equal(state.missions.activeId, "mission_002_web_category_mix");
  assert.equal(state.files.activeBundleId, "mission_002_web_category_mix");
  assert.match(state.ui.terminalQuery, /sales_channel = 'Web'/);
});



test("stakeholder trust and reputation update after mission outcomes", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  let state = store.getState();
  assert.equal(state.stakeholders.relationships.carla_mendez.trust > 50, true);
  assert.equal(state.stakeholders.relationships.carla_mendez.reputation > 0, true);
  assert.equal(state.stakeholders.relationships.mariana_soto.trust > 50, true);

  applyMissionOutcome(store, "mission_002_web_category_mix", {
    success: false,
    prestigeDelta: 18,
    prestigeDeltaFailure: -2,
    scoreDelta: 10,
    scoreDeltaFailure: 1,
    message: "revisar",
    strengths: [],
    issues: ["chart", "summary"],
    completedDeliverables: { sql: true, chart: false, executiveSummary: false }
  });

  state = store.getState();
  assert.equal(state.stakeholders.relationships.nico_ortega.trust < 50, true);
  assert.equal(state.stakeholders.relationships.nico_ortega.revisionCount, 1);
});

test("stakeholder memory increases penalty on repeated missed visibility", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { applyStakeholderInteraction } = await importModule("android/app/src/main/assets/js/systems/stakeholders/stakeholderEngine.js");

  const store = createStore(createInitialState());
  store.setState((state) => {
    applyStakeholderInteraction(state, "carla_mendez", {
      trustDelta: -3,
      reputationDelta: -1,
      outcomeLabel: "status_update_missed"
    });
    applyStakeholderInteraction(state, "carla_mendez", {
      trustDelta: -3,
      reputationDelta: -1,
      outcomeLabel: "status_update_missed"
    });
  }, { silent: true });

  const relationship = store.getState().stakeholders.relationships.carla_mendez;
  assert.equal(relationship.trust, 43);
  assert.equal(relationship.notes[0].repeatPenalty, 1);
  assert.equal(relationship.lastPatternLabel, "Visibilidad intermitente");
});



test("accepting a mission sets operational deadline and advances sim time", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  const state = store.getState();

  assert.equal(state.sim.timeLabel, "08:52");
  assert.equal(state.missions.states["mission_001_sales_cleaning"].deadlineAtMinutes > state.sim.totalMinutes, true);
});

test("overdue missions are flagged and penalized on delivery", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "submit_report", 500);

  let state = store.getState();
  assert.equal(state.missions.states["mission_001_sales_cleaning"].isOverdue, true);

  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  state = store.getState();
  assert.equal(state.player.deadlineMisses, 1);
  assert.equal(state.player.prestige, 21);
});

test("sql runtime loads the real bundle and returns the expected winner", async () => {
  installRuntimeStubs();

  const { createSqlRuntime } = await importModule("android/app/src/main/assets/js/systems/sqlEngine.js");
  const runtime = createSqlRuntime();

  await runtime.init();
  const snapshot = await runtime.loadMissionDataset("mission_001_sales_cleaning");
  const result = runtime.runQuery(
    "SELECT sales_channel, SUM(amount) AS total_amount, COUNT(*) AS orders FROM sales_clean WHERE status_norm = 'completed' AND sale_date >= '2026-04-06' AND sale_date <= '2026-04-12' GROUP BY sales_channel ORDER BY total_amount DESC;"
  );

  assert.deepEqual(snapshot.tables.sort(), ["sales_clean", "sales_raw"]);
  assert.equal(snapshot.summary.rawRows, 50);
  assert.equal(snapshot.summary.cleanRows, 49);
  assert.equal(snapshot.summary.winningChannel, "Web");
  assert.equal(result.rows[0].sales_channel, "Web");
});

test("mission 002 dataset supports category winner inside Web", async () => {
  installRuntimeStubs();

  const { createSqlRuntime } = await importModule("android/app/src/main/assets/js/systems/sqlEngine.js");
  const runtime = createSqlRuntime();

  await runtime.init();
  await runtime.loadMissionDataset("mission_002_web_category_mix");
  const result = runtime.runQuery(
    "SELECT product_category, SUM(amount) AS total_amount, COUNT(*) AS orders FROM sales_clean WHERE status_norm = 'completed' AND sale_date >= '2026-04-06' AND sale_date <= '2026-04-12' AND sales_channel = 'Web' GROUP BY product_category ORDER BY total_amount DESC;"
  );

  assert.equal(result.rows[0].product_category, "SaaS");
});


test("mission follow-up interruptions appear as time advances", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "review_files", 50);

  const state = store.getState();
  const followup = state.mail.threads.find((thread) => thread.id === "thread_mission_001_sales_cleaning_loading_reminder");

  assert.equal(Boolean(followup), true);
  assert.equal(followup.threadType, "followup");
  assert.equal(state.events.firedIds.includes("mission_001_sales_cleaning_loading_reminder"), true);
});

test("overdue escalation creates explicit pressure thread", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "submit_report", 500);

  const state = store.getState();
  const escalation = state.mail.threads.find((thread) => thread.id === "thread_mission_001_sales_cleaning_overdue_escalation");

  assert.equal(Boolean(escalation), true);
  assert.equal(escalation.priority, "high");
  assert.equal(state.events.firedIds.includes("mission_001_sales_cleaning_overdue_escalation"), true);
});


test("contextual feedback reflects quality and relationship state", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");
  const { buildContextualFeedback } = await importModule("android/app/src/main/assets/js/systems/feedbackEngine.js");
  const { getMissionById } = await importModule("android/app/src/main/assets/js/data/missions.js");

  const store = createStore(createInitialState());
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    totalScore: 93,
    breakdown: { technical: 100, reporting: 100, businessCommunication: 100 },
    message: "ok",
    strengths: ["La consulta usa la tabla sales_clean del workspace."],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  const state = store.getState();
  const mission = getMissionById("mission_001_sales_cleaning");
  const feedback = buildContextualFeedback(state, mission, {
    success: true,
    totalScore: 93,
    breakdown: { technical: 100, reporting: 100, businessCommunication: 100 },
    strengths: ["La consulta usa la tabla sales_clean del workspace."],
    issues: []
  });

  assert.equal(feedback.qualityLabel, "excellent");
  assert.equal(feedback.timingLabel, "on_time");
  assert.match(feedback.body, /confianza/i);
});

test("contextual feedback raises urgency when delivery is late", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");
  const { buildContextualFeedback } = await importModule("android/app/src/main/assets/js/systems/feedbackEngine.js");
  const { getMissionById } = await importModule("android/app/src/main/assets/js/data/missions.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "submit_report", 500);
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    totalScore: 88,
    breakdown: { technical: 100, reporting: 100, businessCommunication: 50 },
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  const state = store.getState();
  const mission = getMissionById("mission_001_sales_cleaning");
  const feedback = buildContextualFeedback(state, mission, {
    success: true,
    totalScore: 88,
    breakdown: { technical: 100, reporting: 100, businessCommunication: 50 },
    strengths: ["sql"],
    issues: []
  });

  assert.equal(feedback.timingLabel, "late");
  assert.equal(feedback.priority, "high");
  assert.match(feedback.subject, /fuera de horario|llegamos tarde|aunque fuera de horario/i);
});


test("failed submission keeps mission active for revision and tracks cycles", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: false,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    totalScore: 48,
    message: "revisar",
    strengths: [],
    issues: ["sql", "summary"],
    completedDeliverables: { sql: true, chart: false, executiveSummary: false }
  });

  const state = store.getState();
  const missionState = state.missions.states["mission_001_sales_cleaning"];
  assert.equal(state.missions.activeId, "mission_001_sales_cleaning");
  assert.equal(missionState.status, "revision_required");
  assert.equal(missionState.needsRevision, true);
  assert.equal(missionState.revisionRequests, 1);
  assert.equal(missionState.currentRevisionRound, 1);
});

test("feedback thread is reused across revision and approval", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { submitReport } = await importModule("android/app/src/main/assets/js/systems/reportEngine.js");
  const validationEngine = await importModule("android/app/src/main/assets/js/systems/validationEngine.js");
  const progressionSystem = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");

  store.setState((state) => {
    state.analysis.summary = {};
    state.terminal.lastResult = { columns: ["sales_channel", "total_amount"], rows: [{ sales_channel: "Retail", total_amount: 10 }] };
    state.terminal.lastQueryText = "select sales_channel, sum(amount) as total_amount from sales_clean group by sales_channel";
    state.ui.terminalQuery = state.terminal.lastQueryText;
    state.ui.report.chartType = "line";
    state.ui.report.selectedMetric = "orders";
    state.ui.report.conclusion = "Retail";
  }, { silent: true });

  submitReport(store, { validationEngine, runtime: {}, progressionSystem, notificationSystem: { pushNotification() {} } });
  let state = store.getState();
  let thread = state.mail.threads.find((item) => item.missionId === "mission_001_sales_cleaning" && item.threadType === "feedback");
  assert.equal(Boolean(thread), true);
  assert.equal(thread.messages.length, 1);
  assert.equal(state.missions.states["mission_001_sales_cleaning"].status, "revision_required");

  store.setState((state) => {
    state.terminal.lastResult = { columns: ["sales_channel", "total_amount", "orders"], rows: [{ sales_channel: "Web", total_amount: 1200, orders: 7 }] };
    state.terminal.lastQueryText = "SELECT sales_channel, SUM(amount) AS total_amount, COUNT(*) AS orders FROM sales_clean WHERE status_norm = 'completed' AND sale_date >= '2026-04-06' AND sale_date <= '2026-04-12' GROUP BY sales_channel ORDER BY total_amount DESC;";
    state.ui.terminalQuery = state.terminal.lastQueryText;
    state.ui.report.chartType = "bar";
    state.ui.report.selectedMetric = "total_amount";
    state.ui.report.conclusion = "El canal Web fue el ganador del corte semanal.";
  }, { silent: true });

  submitReport(store, { validationEngine, runtime: {}, progressionSystem, notificationSystem: { pushNotification() {} } });
  state = store.getState();
  thread = state.mail.threads.find((item) => item.missionId === "mission_001_sales_cleaning" && item.threadType === "feedback");
  assert.equal(thread.messages.length, 2);
  assert.match(thread.subject, /versión corregida aprobada|cierre aprobado/i);
  assert.equal(state.missions.states["mission_001_sales_cleaning"].status, "completed");
  assert.equal(state.missions.states["mission_001_sales_cleaning"].resolvedAfterRevision, true);
});


test("priority conflict unlocks mission 003 while mission 002 is active", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  acceptMission(store, "mission_002_web_category_mix");
  advanceSimulationTime(store, "review_mail", 40);

  const state = store.getState();
  assert.equal(state.missions.states["mission_003_ops_risk_region"].isUnlocked, true);
  assert.equal(Boolean(state.mail.threads.find((thread) => thread.id === "thread_mission_003_ops_interrupt")), true);
});

test("accepting urgent mission queues previous active mission", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { applyMissionOutcome } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });
  acceptMission(store, "mission_002_web_category_mix");
  advanceSimulationTime(store, "review_mail", 40);
  acceptMission(store, "mission_003_ops_risk_region");

  const state = store.getState();
  assert.equal(state.missions.activeId, "mission_003_ops_risk_region");
  assert.equal(state.missions.states["mission_002_web_category_mix"].status, "queued");
});

test("mission 003 dataset supports operational risk winner by region", async () => {
  installRuntimeStubs();

  const { createSqlRuntime } = await importModule("android/app/src/main/assets/js/systems/sqlEngine.js");
  const runtime = createSqlRuntime();

  await runtime.init();
  await runtime.loadMissionDataset("mission_003_ops_risk_region");
  const result = runtime.runQuery(
    "SELECT region, COUNT(*) AS issue_orders, SUM(amount) AS impacted_amount FROM sales_clean WHERE sale_date >= '2026-04-06' AND sale_date <= '2026-04-12' AND status_norm IN ('pending', 'refunded', 'cancelled') GROUP BY region ORDER BY issue_orders DESC, impacted_amount DESC;"
  );

  assert.equal(result.rows[0].region, "East");
});


test("executive status check-in appears after mission stays active long enough", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "run_query", 90);

  const state = store.getState();
  const thread = state.mail.threads.find((item) => item.id === "thread_checkin_mission_001_sales_cleaning_executive_status");
  assert.equal(Boolean(thread), true);
  assert.equal(thread.threadType, "checkin");
  assert.equal(state.checkins.pendingIds.includes("checkin_mission_001_sales_cleaning_executive_status"), true);
});

test("responding to check-in closes pending state and appends conversation", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { respondToCheckin } = await importModule("android/app/src/main/assets/js/systems/checkinSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "run_query", 90);
  const result = respondToCheckin(store, "checkin_mission_001_sales_cleaning_executive_status");

  const state = store.getState();
  const thread = state.mail.threads.find((item) => item.id === result.threadId);
  assert.equal(state.checkins.pendingIds.includes("checkin_mission_001_sales_cleaning_executive_status"), false);
  assert.equal(state.checkins.completedIds.includes("checkin_mission_001_sales_cleaning_executive_status"), true);
  assert.equal(thread.labels.includes("answered"), true);
  assert.equal(thread.messages.length >= 3, true);
});

test("agenda schedules a standup and attending it closes the meeting", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { attendAgendaItem } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "review_files", 45);

  let state = store.getState();
  const meeting = state.agenda.items.find((item) => item.id === "agenda_midmorning_standup");
  assert.equal(Boolean(meeting), true);
  assert.equal(meeting.status, "pending");

  attendAgendaItem(store, "agenda_midmorning_standup");
  state = store.getState();
  const attended = state.agenda.items.find((item) => item.id === "agenda_midmorning_standup");
  assert.equal(attended.status, "completed");
  assert.equal(state.agenda.completedIds.includes("agenda_midmorning_standup"), true);
});

test("focus window reduces operational action cost while active", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { startFocusWindow } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");
  const { getActionCost } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  const normalCost = getActionCost("run_query");
  const started = startFocusWindow(store);
  assert.equal(Boolean(started), true);
  const focusedCost = getActionCost("run_query", store.getState());
  assert.equal(focusedCost < normalCost, true);
});

test("queued workload schedules an overlapping priority-sync meeting", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  store.setState((state) => {
    state.missions.states["mission_002_web_category_mix"].isUnlocked = true;
    state.missions.states["mission_002_web_category_mix"].isVisible = true;
    state.missions.states["mission_002_web_category_mix"].status = "queued";
  }, { silent: true });

  advanceSimulationTime(store, "review_files", 55);
  const state = store.getState();
  const standup = state.agenda.items.find((item) => item.id === "agenda_midmorning_standup");
  const prioritySync = state.agenda.items.find((item) => item.id === "agenda_priority_sync_mission_002_web_category_mix");

  assert.ok(standup);
  assert.ok(prioritySync);
  assert.equal(standup.conflictIds.includes(prioritySync.id), true);
  assert.equal(prioritySync.conflictIds.includes(standup.id), true);
});

test("reprogramming a meeting keeps it pending and moves the slot", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { reprogramAgendaItem } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "review_files", 55);

  const before = store.getState().agenda.items.find((item) => item.id === "agenda_midmorning_standup");
  const previousStart = before.scheduledForMinutes;
  const moved = reprogramAgendaItem(store, "agenda_midmorning_standup");
  const state = store.getState();
  const after = state.agenda.items.find((item) => item.id === "agenda_midmorning_standup");
  const thread = state.mail.threads.find((item) => item.id === moved.threadId);

  assert.ok(moved);
  assert.equal(after.status, "pending");
  assert.equal(after.rescheduleCount, 1);
  assert.equal(after.scheduledForMinutes > previousStart, true);
  assert.equal(thread.labels.includes("reprogrammed_meeting"), true);
});

test("conflicting agenda interrupts an active focus window", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { startFocusWindow } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  startFocusWindow(store, 70);
  store.setState((state) => {
    state.missions.states["mission_002_web_category_mix"].isUnlocked = true;
    state.missions.states["mission_002_web_category_mix"].isVisible = true;
    state.missions.states["mission_002_web_category_mix"].status = "queued";
  }, { silent: true });

  advanceSimulationTime(store, "review_files", 55);
  const state = store.getState();

  assert.equal(state.agenda.focusWindow?.active, false);
  assert.equal(Boolean(state.agenda.focusWindow?.interruptedByAgendaId), true);
  assert.equal(["agenda_conflict", "urgent_meeting"].includes(state.agenda.focusWindow?.interruptionReason), true);
});

test("missing a conflicted meeting under overload penalizes stakeholder trust", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  store.setState((state) => {
    state.missions.states["mission_002_web_category_mix"].isUnlocked = true;
    state.missions.states["mission_002_web_category_mix"].isVisible = true;
    state.missions.states["mission_002_web_category_mix"].status = "queued";
  }, { silent: true });

  advanceSimulationTime(store, "review_files", 55);
  advanceSimulationTime(store, "review_mail", 20);
  const state = store.getState();
  const meeting = state.agenda.items.find((item) => item.id === "agenda_midmorning_standup");

  assert.equal(meeting.status, "missed");
  assert.equal(state.stakeholders.relationships.mariana_soto.trust <= 46, true);
});

test("attending mission review creates a derived follow-up task", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { attendAgendaItem } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");
  const { createFollowupTaskFromAgenda } = await importModule("android/app/src/main/assets/js/systems/followupTaskSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "run_query", 130);

  const meetingResult = attendAgendaItem(store, "agenda_review_mission_001_sales_cleaning");
  const created = createFollowupTaskFromAgenda(store, meetingResult);
  const state = store.getState();

  assert.equal(Boolean(created), true);
  assert.equal(state.followupTasks.pendingIds.length, 1);
  assert.equal(state.mail.threads.some((thread) => thread.followupTaskId === created.taskId), true);
});

test("resolving executive cut follow-up updates mission scope and closes task", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { attendAgendaItem } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");
  const { createFollowupTaskFromAgenda, resolveFollowupTask } = await importModule("android/app/src/main/assets/js/systems/followupTaskSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "run_query", 130);

  const meetingResult = attendAgendaItem(store, "agenda_review_mission_001_sales_cleaning");
  const created = createFollowupTaskFromAgenda(store, meetingResult);
  resolveFollowupTask(store, created.taskId);
  const state = store.getState();

  assert.equal(state.followupTasks.pendingIds.includes(created.taskId), false);
  assert.equal(state.followupTasks.completedIds.includes(created.taskId), true);
  assert.equal(state.missions.states["mission_001_sales_cleaning"].scopeMode, "executive_cut");
  assert.match(state.ui.report.notes, /Recorte para comite/);
});


test("resolving executive-cut follow-up opens a committee mini-deliverable", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { acceptMission } = await importModule("android/app/src/main/assets/js/systems/missionSystem.js");
  const { advanceSimulationTime } = await importModule("android/app/src/main/assets/js/systems/clockEngine.js");
  const { attendAgendaItem } = await importModule("android/app/src/main/assets/js/systems/agendaSystem.js");
  const { createFollowupTaskFromAgenda, resolveFollowupTask } = await importModule("android/app/src/main/assets/js/systems/followupTaskSystem.js");

  const store = createStore(createInitialState());
  acceptMission(store, "mission_001_sales_cleaning");
  advanceSimulationTime(store, "run_query", 130);
  const attended = attendAgendaItem(store, "agenda_review_mission_001_sales_cleaning");
  createFollowupTaskFromAgenda(store, attended);
  const task = store.getState().followupTasks.items.find((item) => item.taskType === 'executive_cut');
  resolveFollowupTask(store, task.id);

  const state = store.getState();
  const mini = state.miniDeliverables.items.find((item) => item.deliverableType === 'committee_summary');
  assert.equal(Boolean(mini), true);
  assert.equal(state.mail.threads.some((thread) => thread.miniDeliverableId === mini.id), true);
});

test("resolving committee mini-deliverable prepares executive summary output", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { resolveMiniDeliverable, createMiniDeliverableFromFollowup } = await importModule("android/app/src/main/assets/js/systems/miniDeliverableSystem.js");

  const store = createStore(createInitialState());
  createMiniDeliverableFromFollowup(store, {
    id: 'task_exec_cut_test',
    taskType: 'executive_cut',
    missionId: 'mission_001_sales_cleaning',
    requesterId: 'mariana_soto'
  });
  const item = store.getState().miniDeliverables.items[0];
  resolveMiniDeliverable(store, item.id);

  const state = store.getState();
  assert.equal(state.missions.states['mission_001_sales_cleaning'].committeeSummaryReady, true);
  assert.match(state.ui.report.conclusion, /Resumen comité:/);
});


test("mission outcomes build area reputation and trajectory", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { applyMissionOutcome, buildCareerModel } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    totalScore: 91,
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  const state = store.getState();
  const career = buildCareerModel(state);

  assert.equal(state.player.areaReputation.commercial.score > 0, true);
  assert.equal(state.player.areaReputation.leadership.score > 0, true);
  assert.equal(career.trajectory.totalSignals > 0, true);
  assert.match(career.trajectory.dominantTrackLabel, /Analyst|Reporting/);
});

test("career model exposes seniority salary and performance reviews", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { applyMissionOutcome, buildCareerModel } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  applyMissionOutcome(store, "mission_001_sales_cleaning", {
    success: true,
    prestigeDelta: 25,
    prestigeDeltaFailure: -2,
    scoreDelta: 12,
    scoreDeltaFailure: 1,
    totalScore: 91,
    message: "ok",
    strengths: ["sql"],
    issues: [],
    completedDeliverables: { sql: true, chart: true, executiveSummary: true }
  });

  const career = buildCareerModel(store.getState());
  assert.equal(career.seniority.label, "Analyst II");
  assert.equal(career.compensation.salary > 1200, true);
  assert.equal(career.performance.ratingScore > 0, true);
  assert.equal(career.performanceReviews.length >= 1, true);
});

test("follow-ups and mini deliverables deepen leadership and operations trajectory", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { createFollowupTaskFromAgenda, resolveFollowupTask } = await importModule("android/app/src/main/assets/js/systems/followupTaskSystem.js");
  const { resolveMiniDeliverable } = await importModule("android/app/src/main/assets/js/systems/miniDeliverableSystem.js");

  const store = createStore(createInitialState());
  createFollowupTaskFromAgenda(store, {
    id: 'agenda_test_review',
    agendaType: 'mission_review',
    missionId: 'mission_001_sales_cleaning',
    requesterId: 'mariana_soto'
  });

  let state = store.getState();
  const followupId = state.followupTasks.pendingIds[0];
  assert.equal(Boolean(followupId), true);

  resolveFollowupTask(store, followupId);
  state = store.getState();
  const miniId = state.miniDeliverables.pendingIds[0];
  assert.equal(Boolean(miniId), true);

  resolveMiniDeliverable(store, miniId);
  state = store.getState();

  assert.equal(state.player.areaReputation.leadership.score >= 10, true);
  assert.equal(state.player.trajectory.totalSignals >= 2, true);
  assert.equal(state.missions.states['mission_001_sales_cleaning'].committeeSummaryReady, true);
});

test("organizational model flags cross-area tension and priority risk", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { applyStakeholderInteraction } = await importModule("android/app/src/main/assets/js/systems/stakeholders/stakeholderEngine.js");
  const { buildCareerModel } = await importModule("android/app/src/main/assets/js/systems/progressionSystem.js");

  const store = createStore(createInitialState());
  store.setState((state) => {
    state.missions.states["mission_002_web_category_mix"].isUnlocked = true;
    state.missions.states["mission_002_web_category_mix"].isVisible = true;
    state.missions.states["mission_002_web_category_mix"].status = "queued";

    for (let i = 0; i < 3; i += 1) {
      applyStakeholderInteraction(state, "mariana_soto", {
        trustDelta: -4,
        reputationDelta: -2,
        outcomeLabel: "needs_method_review"
      });
      applyStakeholderInteraction(state, "lucia_ferraro", {
        trustDelta: -4,
        reputationDelta: -1,
        outcomeLabel: "meeting_deprioritized"
      });
    }
  }, { silent: true });

  const career = buildCareerModel(store.getState());
  assert.equal(career.organization.priorityRisk, true);
  assert.equal(career.organization.strained.length >= 2, true);
  assert.equal(career.organization.tensionAlerts.length >= 1, true);
});

test("committee summary triggers business review and risk-note request", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { createMiniDeliverableFromFollowup, resolveMiniDeliverable } = await importModule("android/app/src/main/assets/js/systems/miniDeliverableSystem.js");
  const { resolveBusinessReview } = await importModule("android/app/src/main/assets/js/systems/businessReviewSystem.js");

  const store = createStore(createInitialState());
  createMiniDeliverableFromFollowup(store, {
    id: 'task_exec_cut_1',
    missionId: 'mission_001_sales_cleaning',
    requesterId: 'mariana_soto',
    taskType: 'executive_cut'
  });

  let state = store.getState();
  const mini = state.miniDeliverables.items.find((item) => item.deliverableType === 'committee_summary');
  assert.ok(mini);

  resolveMiniDeliverable(store, mini.id);
  state = store.getState();
  const review = state.businessReviews.items.find((item) => item.sourceMiniDeliverableId === mini.id);
  assert.ok(review);
  assert.equal(review.reviewType, 'committee_summary_review');

  resolveBusinessReview(store, review.id, 'request_risk_note');
  state = store.getState();
  const riskNote = state.miniDeliverables.items.find((item) => item.sourceReviewId === review.id && item.deliverableType === 'risk_note');
  assert.ok(riskNote);
  assert.equal(state.missions.states['mission_001_sales_cleaning'].committeeReviewStatus, 'risk_note_requested');
});

test("business response can bring queued mission back to focus", async () => {
  const { createInitialState, createStore } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { createMiniDeliverableFromFollowup, resolveMiniDeliverable } = await importModule("android/app/src/main/assets/js/systems/miniDeliverableSystem.js");
  const { resolveBusinessReview } = await importModule("android/app/src/main/assets/js/systems/businessReviewSystem.js");

  const store = createStore(createInitialState());
  store.setState((state) => {
    state.missions.activeId = 'mission_001_sales_cleaning';
    state.missions.states['mission_001_sales_cleaning'].status = 'active';
    state.missions.states['mission_002_web_category_mix'].isUnlocked = true;
    state.missions.states['mission_002_web_category_mix'].isVisible = true;
    state.missions.states['mission_002_web_category_mix'].status = 'queued';
  }, { silent: true });

  createMiniDeliverableFromFollowup(store, {
    id: 'task_queue_align_1',
    missionId: 'mission_002_web_category_mix',
    requesterId: 'lucia_ferraro',
    taskType: 'queued_alignment'
  });

  let state = store.getState();
  const mini = state.miniDeliverables.items.find((item) => item.deliverableType === 'internal_handoff');
  assert.ok(mini);
  resolveMiniDeliverable(store, mini.id);
  state = store.getState();
  const review = state.businessReviews.items.find((item) => item.sourceMiniDeliverableId === mini.id);
  assert.ok(review);

  resolveBusinessReview(store, review.id, 'bring_forward_now');
  state = store.getState();
  assert.equal(state.missions.activeId, 'mission_002_web_category_mix');
  assert.equal(state.missions.states['mission_001_sales_cleaning'].status, 'queued');
});

test("mission 003 validation requires all problematic statuses explicitly", async () => {
  const { createInitialState } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { getMissionById } = await importModule("android/app/src/main/assets/js/data/missions.js");
  const { validateMissionReport } = await importModule("android/app/src/main/assets/js/systems/validationEngine.js");

  const state = createInitialState();
  state.missions.activeId = "mission_003_ops_risk_region";
  state.terminal.lastResult = {
    columns: ["region", "issue_orders", "impacted_amount"],
    rows: [{ region: "East", issue_orders: 4, impacted_amount: 1000 }]
  };
  state.terminal.lastQueryText = "SELECT region, COUNT(*) AS issue_orders, SUM(amount) AS impacted_amount FROM sales_clean WHERE sale_date >= '2026-04-06' AND sale_date <= '2026-04-12' AND status_norm IN ('pending', 'cancelled') GROUP BY region ORDER BY issue_orders DESC;";
  state.ui.terminalQuery = state.terminal.lastQueryText;
  state.ui.report.selectedMetric = "issue_orders";
  state.ui.report.chartType = "bar";
  state.ui.report.conclusion = "East concentra el riesgo operativo.";

  const validation = validateMissionReport({
    state,
    runtime: {},
    mission: getMissionById("mission_003_ops_risk_region")
  });

  assert.equal(validation.success, false);
  assert.equal(validation.issues.some((issue) => /refunded/i.test(issue)), true);
});

test("every declarative mission rule is supported by the validator", async () => {
  const { missionDefinitions } = await importModule("android/app/src/main/assets/js/data/missions/index.js");
  const { SUPPORTED_RULE_TYPES } = await importModule("android/app/src/main/assets/js/systems/missions/missionValidator.js");

  for (const mission of missionDefinitions) {
    for (const rule of mission.validation?.rules || []) {
      assert.equal(
        SUPPORTED_RULE_TYPES.has(rule.type),
        true,
        `Unsupported rule type in ${mission.id}: ${rule.type}`
      );
    }
  }
});

test("persisted snapshot restores dynamic systems and generated mail threads", async () => {
  const { createInitialState } = await importModule("android/app/src/main/assets/js/app/state.js");
  const { createPersistedSnapshot, mergePersistedState } = await importModule("android/app/src/main/assets/js/app/storage.js");

  const state = createInitialState();
  state.mail.selectedThreadId = "thread_checkin_test";
  state.mail.threads.unshift({
    id: "thread_checkin_test",
    missionId: "mission_001_sales_cleaning",
    checkinId: "checkin_test",
    threadType: "checkin",
    senderId: "carla_mendez",
    senderName: "Carla Méndez",
    senderRole: "Gerente Comercial",
    subject: "Estado rápido",
    preview: "Necesito visibilidad.",
    priority: "high",
    timestamp: "Mon 10:15",
    unread: true,
    labels: ["checkin"],
    attachments: [],
    messages: [{ id: "message_checkin_test", from: "Carla Méndez", role: "Gerente Comercial", body: "Pásame estado." }]
  });
  state.followupTasks = {
    items: [{ id: "task_1", missionId: "mission_001_sales_cleaning", status: "pending", taskType: "executive_cut", threadId: "thread_task_1" }],
    pendingIds: ["task_1"],
    completedIds: []
  };
  state.miniDeliverables = {
    items: [{ id: "mini_1", missionId: "mission_001_sales_cleaning", status: "pending", deliverableType: "committee_summary", threadId: "thread_mini_1" }],
    pendingIds: ["mini_1"],
    completedIds: []
  };
  state.businessReviews = {
    items: [{ id: "review_1", missionId: "mission_001_sales_cleaning", status: "pending", reviewType: "committee_summary_review", threadId: "thread_review_1" }],
    pendingIds: ["review_1"],
    completedIds: []
  };
  state.checkins = {
    items: [{ id: "checkin_test", missionId: "mission_001_sales_cleaning", status: "pending", threadId: "thread_checkin_test" }],
    pendingIds: ["checkin_test"],
    completedIds: [],
    missedIds: []
  };
  state.agenda = {
    items: [{ id: "agenda_test", missionId: "mission_001_sales_cleaning", status: "pending", threadId: "thread_agenda_test" }],
    pendingIds: ["agenda_test"],
    completedIds: [],
    missedIds: [],
    focusWindow: { active: true, startedAtMinutes: 540, endsAtMinutes: 585, durationMinutes: 45, missionId: "mission_001_sales_cleaning" }
  };
  state.stakeholders.relationships.carla_mendez.trust = 72;
  state.stakeholders.relationships.carla_mendez.reputation = 18;
  state.events.firedIds.push("agenda_midmorning_standup_day1");
  state.events.log.unshift({ id: "event_1", eventId: "agenda_midmorning_standup_day1", createdAt: "2026-04-20T10:00:00.000Z" });
  state.notifications.items.unshift({
    id: "notif_test",
    title: "Persistir",
    message: "Debe sobrevivir al merge",
    level: "info",
    createdAt: "2026-04-20T10:00:00.000Z",
    expiresAt: Date.now() + 10000,
    unread: true
  });

  const restored = mergePersistedState(createInitialState(), createPersistedSnapshot(state));

  assert.equal(restored.mail.selectedThreadId, "thread_checkin_test");
  assert.equal(restored.mail.threads.some((thread) => thread.id === "thread_checkin_test"), true);
  assert.deepEqual(restored.followupTasks.pendingIds, ["task_1"]);
  assert.deepEqual(restored.miniDeliverables.pendingIds, ["mini_1"]);
  assert.deepEqual(restored.businessReviews.pendingIds, ["review_1"]);
  assert.deepEqual(restored.checkins.pendingIds, ["checkin_test"]);
  assert.deepEqual(restored.agenda.pendingIds, ["agenda_test"]);
  assert.equal(restored.agenda.focusWindow?.active, true);
  assert.equal(restored.stakeholders.relationships.carla_mendez.trust, 72);
  assert.equal(restored.events.firedIds.includes("agenda_midmorning_standup_day1"), true);
  assert.equal(restored.notifications.items.some((item) => item.id === "notif_test" && item.read === false), true);
});
